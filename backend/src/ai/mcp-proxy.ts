import type { IncomingMessage, ServerResponse } from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { env } from "../core/cfg";
import {
    add_hsg_memory,
    hsg_query,
    reinforce_memory,
} from "../memory/hsg";
import { q, get_async } from "../core/db";
import type { sector_type } from "../core/types";
import { insert_fact, update_fact, invalidate_fact } from "../temporal_graph/store";
import { query_facts_at_time, get_current_fact, search_facts, get_facts_by_subject } from "../temporal_graph/query";
import { get_subject_timeline, compare_time_points } from "../temporal_graph/timeline";

interface NamespaceGroup {
    namespace: string;
    description?: string;
    created_at: number;
}

const sec_enum = z.enum([
    "episodic",
    "semantic", 
    "procedural",
    "emotional",
    "reflective",
] as const);

const trunc = (val: string, max = 200) =>
    val.length <= max ? val : `${val.slice(0, max).trimEnd()}...`;

const fmt_matches = (matches: Awaited<ReturnType<typeof hsg_query>>) =>
    matches
        .map((m: any, idx: any) => {
            const prev = trunc(m.content.replace(/\s+/g, " ").trim(), 200);
            return `${idx + 1}. [${m.primary_sector}] score=${m.score.toFixed(3)} salience=${m.salience.toFixed(3)} id=${m.id}\n${prev}`;
        })
        .join("\n\n");

export class OpenMemoryMCPProxy {
    private namespaces = new Map<string, NamespaceGroup>();
    private srv: McpServer;
    private transport?: StreamableHTTPServerTransport;

    constructor() {
        this.srv = new McpServer(
            {
                name: "openmemory-proxy",
                version: "2.0.0",
                protocolVersion: "2025-06-18",
            },
            { capabilities: { tools: {}, resources: {}, logging: {} } },
        );
        this.setupTools();
        this.loadPersistedData();
    }

    private setupTools() {
        // Get proxy information
        this.srv.tool("get_proxy_info",
            "Get information about the proxy service capabilities and configuration",
            {},
            async () => {
                return { content: [{ type: "text", text: this.getProxyInfo() }] };
            }
        );

        // Namespaced memory operations
        this.srv.tool("query_memory",
            "Query memories from a specific namespace",
            {
                query: z.string().min(1).describe("Search query"),
                namespace: z.string().min(1).describe("Target namespace (required)"),
                k: z.number().int().min(1).max(32).default(8).describe("Number of results to return"),
                sector: sec_enum.optional().describe("Restrict search to a specific sector"),
                min_salience: z.number().min(0).max(1).optional().describe("Minimum salience threshold")
            },
            async (params: any) => {
                const { query, namespace, k, sector, min_salience } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for all memory operations");
                }
                
                // Auto-create namespace if it doesn't exist
                await this.ensureNamespaceExists(namespace);

                // Build filters with namespace as user_id
                const filters = {
                    user_id: namespace,
                    ...(sector ? { sectors: [sector as sector_type] } : {}),
                    ...(min_salience !== undefined ? { minSalience: min_salience } : {})
                };

                const matches = await hsg_query(query, k, filters);
                const summary = matches.length
                    ? fmt_matches(matches)
                    : "No memories matched the supplied query.";

                const payload = matches.map((m: any) => ({
                    id: m.id,
                    score: Number(m.score.toFixed(4)),
                    primary_sector: m.primary_sector,
                    sectors: m.sectors,
                    salience: Number(m.salience.toFixed(4)),
                    last_seen_at: m.last_seen_at,
                    path: m.path,
                    content: m.content,
                }));

                return { 
                    content: [
                        { type: "text", text: summary }
                    ],
                    meta: {
                        namespace,
                        total_results: matches.length,
                        results: payload
                    }
                };
            }
        );

        this.srv.tool("store_memory",
            "Store a memory in a namespace",
            {
                content: z.string().min(1).describe("Memory content to store"),
                namespace: z.string().min(1).describe("Target namespace (required)"),
                sector: sec_enum.optional().describe("Memory sector classification"),
                salience: z.number().min(0).max(1).optional().describe("Memory importance (0-1)"),
                metadata: z.record(z.any()).optional().describe("Additional metadata")
            },
            async (params: any) => {
                const { content, namespace, sector, salience, metadata } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for all memory operations");
                }
                
                // Auto-create namespace if it doesn't exist
                await this.ensureNamespaceExists(namespace);

                // Store memory using namespace as user_id
                const memory = await add_hsg_memory(
                    content,
                    JSON.stringify([]),
                    metadata || {},
                    namespace  // Use namespace as user_id
                );

                return {
                    content: [{
                        type: "text",
                        text: `✅ Memory stored successfully\n\nID: ${memory.id}\nNamespace: ${namespace}\nPrimary Sector: ${memory.primary_sector}`
                    }],
                    meta: {
                        memory_id: memory.id,
                        namespace,
                        primary_sector: memory.primary_sector
                    }
                };
            }
        );

        this.srv.tool("reinforce_memory",
            "Boost the salience of an existing memory",
            {
                memory_id: z.string().min(1).describe("Memory ID to reinforce"),
                namespace: z.string().min(1).describe("Namespace containing the memory"),
                salience_boost: z.number().min(0).max(1).default(0.2).describe("Amount to increase salience (0-1)")
            },
            async (params: any) => {
                const { memory_id, namespace, salience_boost } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for all memory operations");
                }
                
                await this.ensureNamespaceExists(namespace);

                // Reinforce the memory
                await reinforce_memory(memory_id);

                return {
                    content: [{
                        type: "text",
                        text: `✅ Memory ${memory_id} reinforced (+${salience_boost} salience)`
                    }],
                    meta: {
                        memory_id,
                        namespace,
                        salience_boost
                    }
                };
            }
        );

        // Temporal graph operations
        this.srv.tool("store_temporal_fact",
            "Store or update a time-bound fact in the temporal knowledge graph",
            {
                subject: z.string().min(1).describe("Subject entity"),
                predicate: z.string().min(1).describe("Relationship or property"),
                object: z.string().min(1).describe("Object or value"),
                namespace: z.string().min(1).describe("Namespace for isolation"),
                valid_from: z.string().optional().describe("When fact became true (ISO 8601 date)"),
                valid_to: z.string().optional().describe("When fact stopped being true (ISO 8601 date)"),
                confidence: z.number().min(0).max(1).default(0.95).describe("Confidence level (0-1)")
            },
            async (params: any) => {
                const { subject, predicate, object, namespace, valid_from, valid_to, confidence } = params;
                
                await this.ensureNamespaceExists(namespace);

                const fact_id = await insert_fact(
                    subject,
                    predicate,
                    object,
                    namespace,
                    valid_from,
                    valid_to,
                    confidence
                );

                return {
                    content: [{
                        type: "text",
                        text: `✅ Temporal fact stored\n\nFact ID: ${fact_id}\nSubject: ${subject}\nPredicate: ${predicate}\nObject: ${object}\nNamespace: ${namespace}`
                    }],
                    meta: {
                        fact_id,
                        subject,
                        predicate,
                        object,
                        namespace
                    }
                };
            }
        );

        this.srv.tool("query_temporal_facts",
            "Query facts valid at a specific time",
            {
                subject: z.string().optional().describe("Filter by subject"),
                predicate: z.string().optional().describe("Filter by predicate"),
                namespace: z.string().min(1).describe("Namespace to query"),
                at_time: z.string().optional().describe("Query time point (ISO 8601, defaults to now)")
            },
            async (params: any) => {
                const { subject, predicate, namespace, at_time } = params;
                
                await this.ensureNamespaceExists(namespace);

                const facts = await query_facts_at_time(
                    subject,
                    predicate,
                    at_time,
                    namespace
                );

                const summary = facts.length
                    ? facts.map((f: any, idx: number) => 
                        `${idx + 1}. ${f.subject} ${f.predicate} ${f.object} (confidence: ${f.confidence})`
                      ).join("\n")
                    : "No facts found for the specified criteria.";

                return {
                    content: [{ type: "text", text: summary }],
                    meta: {
                        namespace,
                        at_time: at_time || new Date().toISOString(),
                        total_results: facts.length,
                        facts
                    }
                };
            }
        );

        this.srv.tool("get_current_temporal_fact",
            "Get the current value for a subject-predicate pair",
            {
                subject: z.string().min(1).describe("Subject entity"),
                predicate: z.string().min(1).describe("Property or relationship"),
                namespace: z.string().min(1).describe("Namespace to query")
            },
            async (params: any) => {
                const { subject, predicate, namespace } = params;
                
                await this.ensureNamespaceExists(namespace);

                const fact = await get_current_fact(subject, predicate, namespace);

                if (!fact) {
                    return {
                        content: [{
                            type: "text",
                            text: `No current fact found for ${subject} ${predicate} in namespace ${namespace}`
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text",
                        text: `Current: ${subject} ${predicate} ${fact.object} (confidence: ${fact.confidence})`
                    }],
                    meta: {
                        subject,
                        predicate,
                        namespace,
                        fact
                    }
                };
            }
        );

        this.srv.tool("get_temporal_timeline",
            "Get complete timeline of changes for a subject-predicate pair",
            {
                subject: z.string().min(1).describe("Subject entity"),
                predicate: z.string().min(1).describe("Property or relationship"),
                namespace: z.string().min(1).describe("Namespace to query")
            },
            async (params: any) => {
                const { subject, predicate, namespace } = params;
                
                await this.ensureNamespaceExists(namespace);

                const timeline = await get_subject_timeline(subject, predicate, namespace);

                const summary = timeline.length
                    ? timeline.map((f: any, idx: number) => {
                        const from = new Date(f.valid_from).toISOString().split('T')[0];
                        const to = f.valid_to ? new Date(f.valid_to).toISOString().split('T')[0] : 'present';
                        return `${idx + 1}. ${from} → ${to}: ${f.object}`;
                      }).join("\n")
                    : `No timeline found for ${subject} ${predicate}`;

                return {
                    content: [{ type: "text", text: summary }],
                    meta: {
                        subject,
                        predicate,
                        namespace,
                        timeline_length: timeline.length,
                        timeline
                    }
                };
            }
        );

        this.srv.tool("search_temporal_facts",
            "Search facts by pattern or keyword",
            {
                search_term: z.string().min(1).describe("Search term for subject, predicate, or object"),
                namespace: z.string().min(1).describe("Namespace to search")
            },
            async (params: any) => {
                const { search_term, namespace } = params;
                
                await this.ensureNamespaceExists(namespace);

                const facts = await search_facts(search_term, namespace);

                const summary = facts.length
                    ? facts.map((f: any, idx: number) => 
                        `${idx + 1}. ${f.subject} ${f.predicate} ${f.object}`
                      ).join("\n")
                    : `No facts found matching "${search_term}"`;

                return {
                    content: [{ type: "text", text: summary }],
                    meta: {
                        search_term,
                        namespace,
                        total_results: facts.length,
                        facts
                    }
                };
            }
        );

        // List namespaces
        this.srv.tool("list_namespaces",
            "List all available namespaces",
            {},
            async () => {
                const namespaces = await q.all_namespaces.all();
                
                const summary = namespaces.length
                    ? namespaces.map((ns: any, idx: number) => 
                        `${idx + 1}. ${ns.namespace}${ns.description ? ` - ${ns.description}` : ''}`
                      ).join("\n")
                    : "No namespaces found";

                return {
                    content: [{ type: "text", text: summary }],
                    meta: {
                        total_namespaces: namespaces.length,
                        namespaces: namespaces.map((ns: any) => ({
                            namespace: ns.namespace,
                            description: ns.description,
                            created_at: new Date(ns.created_at * 1000).toISOString()
                        }))
                    }
                };
            }
        );
    }

    private async ensureNamespaceExists(namespace: string) {
        if (!this.namespaces.has(namespace)) {
            const now = Math.floor(Date.now() / 1000);
            const namespaceGroup: NamespaceGroup = {
                namespace,
                description: `Auto-created namespace: ${namespace}`,
                created_at: Date.now()
            };

            try {
                await q.ins_namespace.run(
                    namespace,
                    namespaceGroup.description,
                    now,
                    now,
                    1 // active
                );
            } catch (e) {
                // Namespace might already exist in database, that's OK
                console.log(`[MCP PROXY] Namespace ${namespace} already exists or error:`, e);
            }

            this.namespaces.set(namespace, namespaceGroup);
        }
    }

    private async loadPersistedData() {
        try {
            const namespaces = await q.all_namespaces.all();
            namespaces.forEach((ns: any) => {
                this.namespaces.set(ns.namespace, {
                    namespace: ns.namespace,
                    description: ns.description,
                    created_at: ns.created_at * 1000
                });
            });
            console.log(`[MCP PROXY] Loaded ${namespaces.length} namespaces`);
        } catch (error) {
            console.warn("[MCP PROXY] Could not load persisted namespaces:", error);
        }
    }

    private getProxyInfo(): string {
        return `# OpenMemory MCP Proxy
Version: 2.0.0 (Namespace-based Architecture)
Protocol: MCP 2025-06-18

## Architecture
OpenMemory is designed as an authentication-agnostic API service that uses **namespace** as the primary isolation mechanism.

- No agent registration required
- Namespaces created on-demand
- All operations scoped to namespaces
- Ready for external OIDC proxy layer

## Available Tools

### Memory Operations
- \`query_memory\` - Search memories in a namespace
- \`store_memory\` - Store new memories
- \`reinforce_memory\` - Boost memory salience

### Temporal Knowledge Graph
- \`store_temporal_fact\` - Store time-bound facts
- \`query_temporal_facts\` - Query facts at specific time
- \`get_current_temporal_fact\` - Get current fact value
- \`get_temporal_timeline\` - View fact evolution
- \`search_temporal_facts\` - Search facts by pattern

### Namespace Management
- \`list_namespaces\` - List all namespaces

## Usage Pattern

1. Choose or create a namespace (e.g., "project-alpha", "team-research")
2. Use memory and temporal tools with that namespace parameter
3. All data is isolated per namespace

## External Authentication

This service is designed to run behind an OIDC authentication proxy that:
- Handles tenant authentication
- Maps authenticated users to namespace(s)
- Injects namespace into requests
- Validates namespace access permissions

The core service focuses solely on namespaced memory operations.

---
Namespaces Loaded: ${this.namespaces.size}`;
    }

    // HTTP endpoint handler
    handleHTTP(req: IncomingMessage, res: ServerResponse) {
        if (!this.transport) {
            this.transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined  // Stateless mode
            });
        }
        this.transport.handleRequest(req, res, this.srv);
    }

    // Stdio mode for Claude Desktop etc.
    async runStdio() {
        const transport = new StdioServerTransport();
        await this.srv.connect(transport);
        console.error("[MCP PROXY] Running in stdio mode");
    }
}

// Export singleton
export const mcp_proxy = new OpenMemoryMCPProxy();
