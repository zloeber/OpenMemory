/**
 * Namespace Validation Middleware
 * 
 * Validates that namespace parameters are properly formatted and exist
 * Prepares OpenMemory for integration with external OIDC proxy layer
 */

import { q } from "../../core/db";

/**
 * Validates namespace format (alphanumeric, hyphens, underscores only)
 */
export function validate_namespace_format(namespace: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(namespace);
}

/**
 * Middleware to validate namespace from request header or body
 * This middleware extracts and validates the namespace, making it available
 * on req.namespace for subsequent handlers
 */
export function namespace_validation_middleware(req: any, res: any, next: any) {
    // Skip validation for certain endpoints that don't require namespace
    const skipPaths = [
        '/health',
        '/sectors',
        '/api/metrics/summary',
        '/api/namespaces',
        '/api/proxy-info',
        '/api/proxy-health',
        '/swagger',
        '/api-docs',
        '/',
        '/dashboard'
    ];

    const path = req.path || req.url;
    
    // Check if this path should skip namespace validation
    if (skipPaths.some(skip => path.startsWith(skip))) {
        return next();
    }

    // Extract namespace from various sources (prioritized)
    let namespace = null;

    // 1. Check X-Namespace header (preferred for OIDC proxy injection)
    namespace = req.headers['x-namespace'];

    // 2. Check request body (for POST/PUT requests)
    if (!namespace && req.body) {
        namespace = req.body.namespace || req.body.user_id;
    }

    // 3. Check query parameters
    if (!namespace && req.query) {
        namespace = req.query.namespace || req.query.user_id;
    }

    // 4. Check route parameters
    if (!namespace && req.params) {
        namespace = req.params.namespace;
    }

    // For memory operations, user_id is treated as namespace
    if (!namespace && req.body?.filters?.user_id) {
        namespace = req.body.filters.user_id;
    }

    // If no namespace found, it's required for most operations
    if (!namespace) {
        // Allow pass-through for some endpoints
        if (path.includes('/api/namespaces') || path.includes('/mcp-proxy')) {
            return next();
        }

        return res.status(400).json({
            error: "Namespace required",
            message: "A namespace must be specified via X-Namespace header, request body, or query parameter",
            suggestion: "Include 'X-Namespace' header or 'namespace' in request body"
        });
    }

    // Validate namespace format
    if (!validate_namespace_format(namespace)) {
        return res.status(400).json({
            error: "Invalid namespace format",
            message: "Namespace must contain only alphanumeric characters, hyphens, and underscores",
            namespace: namespace
        });
    }

    // Store validated namespace on request object for downstream use
    req.namespace = namespace;

    // Ensure user_id matches namespace for consistency
    if (req.body) {
        req.body.user_id = namespace;
        if (req.body.filters) {
            req.body.filters.user_id = namespace;
        }
    }

    next();
}

/**
 * Middleware to ensure namespace exists before allowing operations
 * This is optional and creates namespace on-demand if it doesn't exist
 */
export async function ensure_namespace_exists_middleware(req: any, res: any, next: any) {
    const namespace = req.namespace;

    if (!namespace) {
        // No namespace to check, skip
        return next();
    }

    try {
        // Check if namespace exists
        let ns = await q.get_namespace.get(namespace);

        // If namespace doesn't exist, create it automatically
        if (!ns) {
            console.log(`[NAMESPACE] Auto-creating namespace: ${namespace}`);
            const now = Math.floor(Date.now() / 1000);
            
            await q.ins_namespace.run(
                namespace,
                `Auto-created namespace: ${namespace}`,
                now,
                now,
                1 // active
            );

            // Set flag to indicate namespace was created
            req.namespace_created = true;
        }

        next();
    } catch (error) {
        console.error(`[NAMESPACE] Error checking/creating namespace ${namespace}:`, error);
        return res.status(500).json({
            error: "Namespace validation failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Middleware to check namespace exists (strict mode - no auto-creation)
 * Returns 404 if namespace doesn't exist
 */
export async function require_existing_namespace_middleware(req: any, res: any, next: any) {
    const namespace = req.namespace;

    if (!namespace) {
        return res.status(400).json({
            error: "Namespace required",
            message: "A namespace must be specified"
        });
    }

    try {
        const ns = await q.get_namespace.get(namespace);

        if (!ns) {
            return res.status(404).json({
                error: "Namespace not found",
                message: `Namespace '${namespace}' does not exist`,
                namespace: namespace
            });
        }

        // Store namespace details on request for downstream use
        req.namespace_details = ns;

        next();
    } catch (error) {
        console.error(`[NAMESPACE] Error checking namespace ${namespace}:`, error);
        return res.status(500).json({
            error: "Namespace validation failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Utility function to extract namespace from request
 * Can be used in route handlers
 */
export function get_namespace_from_request(req: any): string | null {
    return req.namespace || 
           req.headers['x-namespace'] ||
           req.body?.namespace ||
           req.body?.user_id ||
           req.query?.namespace ||
           req.query?.user_id ||
           req.params?.namespace ||
           req.body?.filters?.user_id ||
           null;
}
