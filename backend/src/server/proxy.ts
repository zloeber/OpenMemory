import type { IncomingMessage, ServerResponse } from "http";
import { mcp_proxy } from "../ai/mcp-proxy";
import { env } from "../core/cfg";
import { q } from "../core/db";

/**
 * Middleware to enforce proxy-only mode
 * Blocks requests to non-proxy endpoints when OM_PROXY_ONLY_MODE is enabled
 */
export const proxy_only_mode_middleware = (req: any, res: any, next: any) => {
    if (!env.proxy_only_mode) {
        return next();
    }
    
    const path = req.path || req.url;
    
    // Allow proxy endpoints, Swagger, dashboard, system endpoints, and temporal API
    const allowedPaths = [
        '/mcp-proxy',
        '/api/namespaces',
        '/api/proxy-info',
        '/api/proxy-health',
        '/api/temporal',
        '/api-docs',
        '/swagger',
        '/health',
        '/sectors',
        '/dashboard',
        '/'
    ];
    
    // Check if path starts with any allowed path
    const isAllowed = allowedPaths.some(allowed => path.startsWith(allowed));
    
    if (isAllowed) {
        return next();
    }
    
    // Block all other routes in proxy-only mode
    res.status(403).json({
        error: "Forbidden",
        message: "This endpoint is not available in proxy-only mode. Only MCP proxy, namespace management, and monitoring endpoints are accessible.",
        available_endpoints: allowedPaths
    });
};

export const proxy_routes = (app: any) => {
    // MCP proxy HTTP endpoint
    app.post("/mcp-proxy", async (req: IncomingMessage, res: ServerResponse) => {
        try {
            mcp_proxy.handleHTTP(req, res);
        } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ 
                error: "Proxy service error", 
                message: error instanceof Error ? error.message : String(error)
            }));
        }
    });

    app.options("/mcp-proxy", (_req: any, res: any) => {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers", 
            "Content-Type,Authorization,Mcp-Session-Id"
        );
        res.end();
    });

    const methodNotAllowed = (_req: IncomingMessage, res: ServerResponse) => {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { 
                code: -32600, 
                message: "Method not supported. Use POST /mcp-proxy with JSON payload." 
            },
            id: null
        }));
    };
    
    app.get("/mcp-proxy", methodNotAllowed);
    app.put("/mcp-proxy", methodNotAllowed);
    app.delete("/mcp-proxy", methodNotAllowed);

    // REST endpoints for namespace management
    app.get("/api/namespaces", async (req: any, res: any) => {
        try {
            const namespaces = await q.all_namespaces.all();
            res.json({ 
                namespaces: namespaces.map(ns => ({
                    namespace: ns.namespace,
                    description: ns.description,
                    created_at: new Date(ns.created_at * 1000).toISOString(),
                    updated_at: new Date(ns.updated_at * 1000).toISOString()
                })), 
                total: namespaces.length 
            });
        } catch (error) {
            res.status(500).json({ 
                error: "Failed to list namespaces", 
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.get("/api/namespaces/:namespace", async (req: any, res: any) => {
        try {
            const { namespace } = req.params;
            const ns = await q.get_namespace.get(namespace);
            
            if (!ns) {
                return res.status(404).json({ error: "Namespace not found" });
            }

            res.json({
                namespace: ns.namespace,
                description: ns.description,
                created_at: new Date(ns.created_at * 1000).toISOString(),
                updated_at: new Date(ns.updated_at * 1000).toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                error: "Failed to get namespace", 
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.post("/api/namespaces", async (req: any, res: any) => {
        try {
            const { namespace, description = '' } = req.body;

            // Validate required fields
            if (!namespace) {
                return res.status(400).json({ 
                    error: "Missing required fields", 
                    message: "namespace is required" 
                });
            }

            // Validate namespace format
            if (!/^[a-zA-Z0-9_-]+$/.test(namespace)) {
                return res.status(400).json({ 
                    error: "Invalid namespace", 
                    message: "namespace must contain only alphanumeric characters, hyphens, and underscores" 
                });
            }

            const now = Math.floor(Date.now() / 1000);

            // Idempotent: insert or update
            await q.ins_namespace.run(
                namespace,
                description,
                now,
                now,
                1 // active
            );

            res.json({
                success: true,
                namespace: namespace,
                description: description,
                message: `Namespace '${namespace}' created successfully`
            });

        } catch (error) {
            console.error('[NAMESPACE CREATE] Error:', error);
            res.status(500).json({ 
                error: "Failed to create namespace", 
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.delete("/api/namespaces/:namespace", async (req: any, res: any) => {
        const { namespace } = req.params;

        if (!namespace) {
            return res.status(400).json({ error: "Namespace is required" });
        }

        try {
            const ns = await q.get_namespace.get(namespace);
            if (!ns) {
                return res.status(404).json({ error: "Namespace not found" });
            }

            const now = Math.floor(Date.now() / 1000);
            await q.deactivate_namespace.run(namespace, now);

            res.json({
                success: true,
                namespace,
                message: `Namespace '${namespace}' deactivated`
            });
        } catch (error) {
            console.error('[NAMESPACE DEACTIVATE] Error:', error);
            res.status(500).json({
                error: "Failed to deactivate namespace",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.get("/api/proxy-info", async (_req: any, res: any) => {
        try {
            const namespaces = await q.all_namespaces.all();
            
            res.json({
                service: "OpenMemory MCP Proxy",
                version: "2.0.0",
                architecture: "namespace-based",
                description: "Authentication-agnostic memory API with namespace isolation",
                mcp_protocol: "2025-06-18",
                endpoints: {
                    mcp_proxy: "/mcp-proxy",
                    namespaces: "/api/namespaces",
                    proxy_info: "/api/proxy-info",
                    proxy_health: "/api/proxy-health"
                },
                statistics: {
                    total_namespaces: namespaces.length
                },
                features: [
                    "Namespace-based isolation",
                    "On-demand namespace creation",
                    "Temporal knowledge graph",
                    "MCP protocol support",
                    "Ready for OIDC proxy integration"
                ]
            });
        } catch (error) {
            res.status(500).json({
                error: "Failed to get proxy info",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.get("/api/proxy-health", async (_req: any, res: any) => {
        try {
            const namespaces = await q.all_namespaces.all();
            
            res.json({
                status: "healthy",
                service: "openmemory-mcp-proxy",
                version: "2.0.0",
                architecture: "namespace-based",
                timestamp: new Date().toISOString(),
                namespaces_active: namespaces.length
            });
        } catch (error) {
            res.status(503).json({
                status: "unhealthy",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
};
