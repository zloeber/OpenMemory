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

interface AgentRegistration {
    agent_id: string;
    namespace: string;
    permissions: ('read' | 'write' | 'admin')[];
    description?: string;
    registration_date: number;
    last_access: number;
}

interface NamespaceGroup {
    namespace: string;
    description?: string;
    created_by?: string;
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
    private agents = new Map<string, AgentRegistration>();
    private namespaces = new Map<string, NamespaceGroup>();
    private srv: McpServer;
    private transport?: StreamableHTTPServerTransport;

    constructor() {
        this.srv = new McpServer(
            {
                name: "openmemory-proxy",
                version: "1.0.0",
                protocolVersion: "2025-06-18",
            },
            { capabilities: { tools: {}, resources: {}, logging: {} } },
        );
        this.setupTools();
        this.loadPersistedData();
    }

    private setupTools() {
        // Get registration template
        this.srv.tool("get_registration_template",
            "Get a template for registering an agent with OpenMemory",
            {
                format: z.enum(["json", "curl", "prompt", "example"]).default("json")
                    .describe("Format for the registration template")
            },
            async (params: any) => {
                const { format } = params;
                return { content: [{ type: "text", text: this.getRegistrationTemplate(format) }] };
            }
        );

        // Get configuration info
        this.srv.tool("get_proxy_info",
            "Get information about the proxy service capabilities and configuration",
            {},
            async () => {
                return { content: [{ type: "text", text: this.getProxyInfo() }] };
            }
        );

        // Register agent
        this.srv.tool("register_agent",
            "Register an agent for namespace access",
            {
                agent_id: z.string().min(1).describe("Unique identifier for the agent"),
                namespace: z.string().min(1).describe("Primary namespace for agent memories"),
                permissions: z.array(z.enum(["read", "write", "admin"])).default(["read", "write"])
                    .describe("Permissions for the primary namespace"),
                description: z.string().optional().describe("Agent description for documentation")
            },
            async (params: any) => {
                const { agent_id, namespace, permissions, description } = params;
                
                if (this.agents.has(agent_id)) {
                    throw new Error(`Agent ${agent_id} is already registered`);
                }

                const registration: AgentRegistration = {
                    agent_id,
                    namespace,
                    permissions,
                    description,
                    registration_date: Date.now(),
                    last_access: Date.now()
                };

                // Save to database
                const now = Math.floor(Date.now() / 1000); // Unix timestamp
                await q.ins_agent.run(
                    agent_id,
                    namespace,
                    JSON.stringify(permissions),
                    description,
                    now,
                    now,
                    1 // active
                );

                // Update in-memory storage
                this.agents.set(agent_id, registration);
                
                // Create namespace if it doesn't exist
                if (!this.namespaces.has(namespace)) {
                    const namespaceGroup: NamespaceGroup = {
                        namespace,
                        description: `Private namespace for agent ${agent_id}`,
                        created_by: agent_id,
                        created_at: Date.now()
                    };

                    await q.ins_namespace.run(
                        namespace,
                        namespaceGroup.description,
                        agent_id,
                        now,
                        now,
                        1 // active
                    );

                    this.namespaces.set(namespace, namespaceGroup);
                }

                await this.persistAgentData();
                
                return { 
                    content: [{ 
                        type: "text", 
                        text: this.formatRegistrationResponse(registration)
                    }] 
                };
            }
        );

        // List registered agents
        this.srv.tool("list_agents",
            "List all registered agents and their namespaces",
            {
                agent_id: z.string().optional().describe("Filter to specific agent")
            },
            async (params: any) => {
                const { agent_id } = params;
                
                let agentsToShow = Array.from(this.agents.values());
                
                if (agent_id) {
                    agentsToShow = agentsToShow.filter(a => a.agent_id === agent_id);
                }

                const agents = agentsToShow.map(agent => ({
                    agent_id: agent.agent_id,
                    namespace: agent.namespace,
                    permissions: agent.permissions,
                    description: agent.description,
                    registration_date: new Date(agent.registration_date).toISOString(),
                    last_access: new Date(agent.last_access).toISOString()
                }));

                return { 
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify(agents, null, 2)
                    }] 
                };
            }
        );

        // Get specific agent details
        this.srv.tool("get_agent",
            "Get detailed information about a specific agent",
            {
                agent_id: z.string().min(1).describe("Agent ID to retrieve"),
                include_access_log: z.boolean().default(false).describe("Whether to include recent access log entries")
            },
            async (params: any) => {
                const { agent_id, include_access_log } = params;
                
                const agent = this.agents.get(agent_id);
                if (!agent) {
                    throw new Error(`Agent '${agent_id}' not found`);
                }

                const agentDetails: any = {
                    agent_id: agent.agent_id,
                    namespace: agent.namespace,
                    permissions: agent.permissions,
                    description: agent.description,
                    registration_date: new Date(agent.registration_date).toISOString(),
                    last_access: new Date(agent.last_access).toISOString(),
                    status: "active"
                };

                // Add access log if requested
                if (include_access_log) {
                    try {
                        const accessLogs = await q.get_agent_access_log.all(agent_id, 10); // Last 10 entries
                        agentDetails.recent_access_log = accessLogs.map(log => ({
                            action: log.action,
                            namespace: log.namespace,
                            timestamp: new Date(log.timestamp * 1000).toISOString(),
                            success: log.success === 1,
                            error_message: log.error_message
                        }));
                    } catch (error) {
                        console.warn(`[MCP PROXY] Could not fetch access log for agent ${agent_id}:`, error);
                        agentDetails.recent_access_log = [];
                    }
                }

                return { 
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify(agentDetails, null, 2)
                    }] 
                };
            }
        );

        // Namespaced memory operations
        this.srv.tool("query_memory",
            "Query memories from agent's authorized namespaces",
            {
                query: z.string().min(1).describe("Search query"),
                namespace: z.string().describe("Target namespace (required)"),
                agent_id: z.string().optional().describe("Requesting agent ID (optional, for logging)"),
                k: z.number().int().min(1).max(32).default(8).describe("Number of results to return"),
                sector: sec_enum.optional().describe("Restrict search to a specific sector"),
                min_salience: z.number().min(0).max(1).optional().describe("Minimum salience threshold")
            },
            async (params: any) => {
                const { agent_id, query, namespace, k, sector, min_salience } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for all memory operations");
                }
                
                const target_ns = namespace;
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        // Log the access
                        await q.ins_access_log.run(
                            agent_id,
                            'query',
                            target_ns,
                            Math.floor(Date.now() / 1000),
                            1, // success
                            null // no error
                        );
                    }
                }
                
                // Auto-create namespace if it doesn't exist
                if (!this.namespaces.has(target_ns)) {
                    const now = Math.floor(Date.now() / 1000);
                    const namespaceGroup: NamespaceGroup = {
                        namespace: target_ns,
                        description: `Auto-created namespace: ${target_ns}`,
                        created_by: agent_id,
                        created_at: Date.now()
                    };

                    await q.ins_namespace.run(
                        target_ns,
                        namespaceGroup.description,
                        agent_id || null,
                        now,
                        now,
                        1 // active
                    );

                    this.namespaces.set(target_ns, namespaceGroup);
                }

                // Build filters with namespace as user_id
                const filters = {
                    user_id: target_ns,
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
                        namespace: target_ns,
                        agent_id,
                        total_results: matches.length,
                        results: payload
                    }
                };
            }
        );

        this.srv.tool("store_memory",
            "Store a memory in agent's namespace",
            {
                content: z.string().min(1).describe("Memory content to store"),
                namespace: z.string().describe("Target namespace (required)"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)"),
                sector: sec_enum.optional().describe("Memory sector classification"),
                salience: z.number().min(0).max(1).optional().describe("Memory importance (0-1)"),
                metadata: z.record(z.any()).optional().describe("Additional metadata")
            },
            async (params: any) => {
                const { agent_id, content, namespace, sector, salience, metadata } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for all memory operations");
                }
                
                const target_ns = namespace;
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        // Log the access
                        await q.ins_access_log.run(
                            agent_id,
                            'store',
                            target_ns,
                            Math.floor(Date.now() / 1000),
                            1, // success
                            null // no error
                        );
                    }
                }
                
                // Auto-create namespace if it doesn't exist
                if (!this.namespaces.has(target_ns)) {
                    const now = Math.floor(Date.now() / 1000);
                    const namespaceGroup: NamespaceGroup = {
                        namespace: target_ns,
                        description: `Auto-created namespace: ${target_ns}`,
                        created_by: agent_id,
                        created_at: Date.now()
                    };

                    await q.ins_namespace.run(
                        target_ns,
                        namespaceGroup.description,
                        agent_id || null,
                        now,
                        now,
                        1 // active
                    );

                    this.namespaces.set(target_ns, namespaceGroup);
                }

                // Store memory with namespace as user_id - fix the function signature
                const memory_id = await add_hsg_memory(
                    content,
                    metadata ? JSON.stringify(metadata) : undefined,
                    undefined, // metadata parameter
                    target_ns   // user_id parameter
                );

                return {
                    content: [{
                        type: "text",
                        text: `Memory stored successfully in namespace '${target_ns}' with ID: ${memory_id}`
                    }],
                    meta: {
                        memory_id,
                        namespace: target_ns,
                        agent_id
                    }
                };
            }
        );

        this.srv.tool("reinforce_memory",
            "Reinforce the salience of a specific memory",
            {
                memory_id: z.string().describe("ID of memory to reinforce"),
                namespace: z.string().describe("Namespace containing the memory (required)"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)")
            },
            async (params: any) => {
                const { agent_id, memory_id, namespace } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for all memory operations");
                }
                
                // Verify the memory exists
                const memory = await q.get_mem.get(memory_id);
                if (!memory) {
                    throw new Error(`Memory ${memory_id} not found`);
                }
                
                // Verify the memory belongs to the specified namespace
                if (memory.user_id !== namespace) {
                    throw new Error(`Memory ${memory_id} does not belong to namespace '${namespace}'`);
                }
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        // Log the access
                        await q.ins_access_log.run(
                            agent_id,
                            'reinforce',
                            namespace,
                            Math.floor(Date.now() / 1000),
                            1, // success
                            null // no error
                        );
                    }
                }

                await reinforce_memory(memory_id);

                return {
                    content: [{
                        type: "text",
                        text: `Memory ${memory_id} reinforced successfully`
                    }]
                };
            }
        );

        // Temporal fact operations
        this.srv.tool("store_temporal_fact",
            "Store a temporal fact in agent's namespace with time bounds",
            {
                namespace: z.string().describe("Target namespace (required)"),
                subject: z.string().describe("Fact subject (e.g., 'OpenAI', 'user')"),
                predicate: z.string().describe("Fact predicate (e.g., 'has_CEO', 'prefers')"),
                object: z.string().describe("Fact object/value (e.g., 'Sam Altman', 'coffee')"),
                valid_from: z.string().optional().describe("ISO date when fact becomes valid (default: now)"),
                confidence: z.number().min(0).max(1).optional().describe("Confidence level (0-1, default: 1.0)"),
                metadata: z.record(z.any()).optional().describe("Additional metadata"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)")
            },
            async (params: any) => {
                const { namespace, subject, predicate, object, valid_from, confidence, metadata, agent_id } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for temporal fact operations");
                }
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        await q.ins_access_log.run(
                            agent_id,
                            'store_temporal_fact',
                            namespace,
                            Math.floor(Date.now() / 1000),
                            1,
                            null
                        );
                    }
                }
                
                const valid_from_date = valid_from ? new Date(valid_from) : new Date();
                const conf = confidence !== undefined ? confidence : 1.0;
                
                const fact_id = await insert_fact(namespace, subject, predicate, object, valid_from_date, conf, metadata);
                
                return {
                    content: [{
                        type: "text",
                        text: `Temporal fact stored: ${subject} ${predicate} ${object} (valid from ${valid_from_date.toISOString()}, confidence: ${conf}, id: ${fact_id})`
                    }],
                    meta: {
                        fact_id,
                        namespace,
                        subject,
                        predicate,
                        object,
                        valid_from: valid_from_date.toISOString(),
                        confidence: conf
                    }
                };
            }
        );

        this.srv.tool("query_temporal_facts",
            "Query temporal facts from agent's namespace at a specific time",
            {
                namespace: z.string().describe("Target namespace (required)"),
                subject: z.string().optional().describe("Filter by subject"),
                predicate: z.string().optional().describe("Filter by predicate"),
                object: z.string().optional().describe("Filter by object"),
                at: z.string().optional().describe("ISO date to query (default: now)"),
                min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)")
            },
            async (params: any) => {
                const { namespace, subject, predicate, object, at, min_confidence, agent_id } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for temporal fact operations");
                }
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        await q.ins_access_log.run(
                            agent_id,
                            'query_temporal_facts',
                            namespace,
                            Math.floor(Date.now() / 1000),
                            1,
                            null
                        );
                    }
                }
                
                const at_date = at ? new Date(at) : new Date();
                const facts = await query_facts_at_time(namespace, subject, predicate, object, at_date, min_confidence || 0.1);
                
                const summary = facts.length > 0
                    ? facts.map((f, idx) => 
                        `${idx + 1}. ${f.subject} ${f.predicate} ${f.object} (confidence: ${f.confidence.toFixed(2)}, valid from: ${f.valid_from.toISOString()})`
                      ).join('\n')
                    : 'No temporal facts found matching the query';
                
                return {
                    content: [{
                        type: "text",
                        text: summary
                    }],
                    meta: {
                        namespace,
                        query: { subject, predicate, object, at: at_date.toISOString() },
                        count: facts.length,
                        facts: facts.map(f => ({
                            id: f.id,
                            subject: f.subject,
                            predicate: f.predicate,
                            object: f.object,
                            confidence: f.confidence,
                            valid_from: f.valid_from.toISOString(),
                            valid_to: f.valid_to?.toISOString()
                        }))
                    }
                };
            }
        );

        this.srv.tool("get_current_temporal_fact",
            "Get the current value of a temporal fact",
            {
                namespace: z.string().describe("Target namespace (required)"),
                subject: z.string().describe("Fact subject"),
                predicate: z.string().describe("Fact predicate"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)")
            },
            async (params: any) => {
                const { namespace, subject, predicate, agent_id } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for temporal fact operations");
                }
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        await q.ins_access_log.run(
                            agent_id,
                            'get_current_temporal_fact',
                            namespace,
                            Math.floor(Date.now() / 1000),
                            1,
                            null
                        );
                    }
                }
                
                const fact = await get_current_fact(namespace, subject, predicate);
                
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
                        text: `${subject} ${predicate} ${fact.object} (confidence: ${fact.confidence.toFixed(2)}, valid from: ${fact.valid_from.toISOString()})`
                    }],
                    meta: {
                        fact: {
                            id: fact.id,
                            subject: fact.subject,
                            predicate: fact.predicate,
                            object: fact.object,
                            confidence: fact.confidence,
                            valid_from: fact.valid_from.toISOString(),
                            valid_to: fact.valid_to?.toISOString()
                        }
                    }
                };
            }
        );

        this.srv.tool("get_temporal_timeline",
            "Get the complete timeline of a subject's temporal facts",
            {
                namespace: z.string().describe("Target namespace (required)"),
                subject: z.string().describe("Fact subject to get timeline for"),
                predicate: z.string().optional().describe("Filter by specific predicate"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)")
            },
            async (params: any) => {
                const { namespace, subject, predicate, agent_id } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for temporal fact operations");
                }
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        await q.ins_access_log.run(
                            agent_id,
                            'get_temporal_timeline',
                            namespace,
                            Math.floor(Date.now() / 1000),
                            1,
                            null
                        );
                    }
                }
                
                const timeline = await get_subject_timeline(namespace, subject, predicate);
                
                const summary = timeline.length > 0
                    ? timeline.map((entry, idx) =>
                        `${idx + 1}. [${entry.change_type}] ${entry.timestamp.toISOString()}: ${entry.subject} ${entry.predicate} ${entry.object}`
                      ).join('\n')
                    : `No timeline entries found for ${subject}${predicate ? ` ${predicate}` : ''}`;
                
                return {
                    content: [{
                        type: "text",
                        text: summary
                    }],
                    meta: {
                        namespace,
                        subject,
                        predicate,
                        count: timeline.length,
                        timeline: timeline.map(entry => ({
                            timestamp: entry.timestamp.toISOString(),
                            subject: entry.subject,
                            predicate: entry.predicate,
                            object: entry.object,
                            change_type: entry.change_type,
                            confidence: entry.confidence
                        }))
                    }
                };
            }
        );

        this.srv.tool("search_temporal_facts",
            "Search temporal facts by pattern in subject, predicate, or object",
            {
                namespace: z.string().describe("Target namespace (required)"),
                pattern: z.string().describe("Search pattern"),
                field: z.enum(["subject", "predicate", "object"]).default("subject").describe("Field to search in"),
                at: z.string().optional().describe("ISO date to query (default: now)"),
                agent_id: z.string().optional().describe("Agent ID (optional, for logging)")
            },
            async (params: any) => {
                const { namespace, pattern, field, at, agent_id } = params;
                
                if (!namespace) {
                    throw new Error("namespace is required for temporal fact operations");
                }
                
                // If agent_id provided, validate and log
                if (agent_id) {
                    const agent = this.agents.get(agent_id);
                    if (agent) {
                        agent.last_access = Date.now();
                        await q.upd_agent_access.run(agent_id, Math.floor(Date.now() / 1000));
                        
                        await q.ins_access_log.run(
                            agent_id,
                            'search_temporal_facts',
                            namespace,
                            Math.floor(Date.now() / 1000),
                            1,
                            null
                        );
                    }
                }
                
                const at_date = at ? new Date(at) : undefined;
                const facts = await search_facts(namespace, pattern, field as any, at_date);
                
                const summary = facts.length > 0
                    ? facts.map((f, idx) =>
                        `${idx + 1}. ${f.subject} ${f.predicate} ${f.object} (confidence: ${f.confidence.toFixed(2)})`
                      ).join('\n')
                    : `No facts found matching '${pattern}' in ${field}`;
                
                return {
                    content: [{
                        type: "text",
                        text: summary
                    }],
                    meta: {
                        namespace,
                        pattern,
                        field,
                        count: facts.length,
                        facts: facts.map(f => ({
                            id: f.id,
                            subject: f.subject,
                            predicate: f.predicate,
                            object: f.object,
                            confidence: f.confidence
                        }))
                    }
                };
            }
        );
    }

    private getRegistrationTemplate(format: string): string {
        const baseTemplate = {
            agent_id: "my-ai-agent-v1",
            namespace: "agent-workspace",
            permissions: ["read", "write"],
            description: "AI assistant for project management tasks"
        };

        switch (format) {
            case "json":
                return JSON.stringify(baseTemplate, null, 2);
                
            case "curl":
                return `# Register via MCP tool call
# Use your MCP client to call: register_agent

${JSON.stringify(baseTemplate, null, 2)}`;
                
            case "prompt":
                return `# OpenMemory Agent Registration Guide

To register an agent with OpenMemory proxy, provide these parameters:

## Required Parameters

**agent_id**: Unique identifier for your agent
- Examples: "my-ai-agent-v1", "customer-support-bot", "data-analyst-ai"
- Must be unique across all registered agents

**namespace**: Primary workspace for your agent's memories  
- Examples: "agent-workspace", "customer-data", "research-notes"
- This is your agent's private memory space
- Choose descriptive names that reflect the agent's purpose

## Optional Parameters

**permissions**: What your agent can do in its namespace (default: ["read", "write"])
- "read": Query and retrieve memories
- "write": Store new memories and update existing ones  
- "admin": Full control including deletion and namespace management

**description**: Human-readable description of your agent's purpose
- Helps with documentation and management
- Examples: "Customer support chatbot", "Research assistant for papers"

Use the 'register_agent' tool with these parameters to complete registration.`;
                
            case "example":
                return `# Example Agent Registrations

## Research Assistant
\`\`\`json
{
  "agent_id": "research-assistant-v2",
  "namespace": "research-data",
  "permissions": ["read", "write"],
  "description": "AI assistant for academic research and paper analysis"
}
\`\`\`

## Customer Support Bot
\`\`\`json
{
  "agent_id": "support-bot-prod",
  "namespace": "customer-interactions", 
  "permissions": ["read", "write"],
  "description": "Customer support chatbot with access to knowledge base"
}
\`\`\``;
                
            default:
                return JSON.stringify(baseTemplate, null, 2);
        }
    }

    private getProxyInfo(): string {
        return `# OpenMemory MCP Proxy Service

## Overview
Namespace-aware proxy for OpenMemory that provides secure multi-agent access with isolation. Multiple agents can use the same namespace for collaboration.

## Capabilities
- **Agent Registration**: Each agent is associated with a single namespace
- **Namespace Sharing**: Multiple agents can use the same namespace for collaboration  
- **Permission Management**: Read/write/admin access controls
- **Memory Operations**: Query, store, reinforce memories with namespace awareness
- **Temporal Knowledge**: Store and query time-bound facts with automatic versioning
- **API Key Authentication**: Secure agent identification
- **Template Generation**: Built-in registration guidance

## Available Tools

### Registration & Management
- \`get_registration_template\` - Get registration examples and templates
- \`get_proxy_info\` - This information
- \`register_agent\` - Register a new agent with namespace access
- \`list_agents\` - View all registered agents
- \`get_agent\` - Get detailed information about a specific agent

### Memory Operations  
- \`query_memory\` - Search memories in authorized namespaces
- \`store_memory\` - Store new memories in agent namespace
- \`reinforce_memory\` - Boost salience of specific memories

### Temporal Knowledge Operations
- \`store_temporal_fact\` - Store time-bound facts (e.g., "OpenAI has_CEO Sam Altman from 2023-01-01")
- \`query_temporal_facts\` - Query facts at a specific point in time
- \`get_current_temporal_fact\` - Get the current value of a fact
- \`get_temporal_timeline\` - View complete history of changes for a subject
- \`search_temporal_facts\` - Search for facts by pattern

## Current Configuration
- Port: ${env.port}
- Rate Limiting: ${env.rate_limit_enabled ? 'Enabled' : 'Disabled'}
- Database: ${env.db_path}

## Usage Workflow
1. \`get_registration_template\` -> Get registration guidance
2. \`register_agent\` -> Register your agent
3. Save API key for authenticated operations
4. Use \`query_memory\` and \`store_memory\` for operations
5. Use temporal fact tools for time-aware knowledge management

Ready to start building intelligent memory-aware applications! 🚀`;
    }

    private formatRegistrationResponse(registration: AgentRegistration): string {
        return `# Agent Registration Successful ✅

**Agent ID**: ${registration.agent_id}
**Namespace**: ${registration.namespace}
**Permissions**: ${registration.permissions.join(', ')}
**Registration Date**: ${new Date(registration.registration_date).toISOString()}
${registration.description ? `**Description**: ${registration.description}` : ''}

## Next Steps

### Query Memories
\`\`\`json
{
  "namespace": "${registration.namespace}",
  "query": "test query"
}
\`\`\`

### Store First Memory
\`\`\`json
{
  "namespace": "${registration.namespace}",
  "content": "This is my first memory in OpenMemory"
}
\`\`\`

Ready to start using OpenMemory! 🚀`;
    }

    private validateAgent(agent_id: string): AgentRegistration {
        const agent = this.agents.get(agent_id);
        if (!agent) {
            throw new Error(`Agent '${agent_id}' is not registered`);
        }
        return agent;
    }

    private validateNamespaceAccess(
        agent: AgentRegistration, 
        namespace: string, 
        operation: string = 'read'
    ): void {
        const isPrimaryNamespace = namespace === agent.namespace;
        
        if (!isPrimaryNamespace) {
            throw new Error(`Access denied: Agent '${agent.agent_id}' can only access its namespace '${agent.namespace}'`);
        }
        
        // Admin operations require admin permission
        if (operation === 'admin' && !agent.permissions.includes('admin')) {
            throw new Error(`Admin access denied: Agent '${agent.agent_id}' lacks admin permissions`);
        }
        
        // Write operations require write permission
        if (operation === 'write' && !agent.permissions.includes('write')) {
            throw new Error(`Write access denied: Agent '${agent.agent_id}' lacks write permissions`);
        }
    }

    private async loadPersistedData(): Promise<void> {
        try {
            // Check if agent_registrations table exists before trying to load data
            const tableExists = await this.checkTableExists('agent_registrations');
            if (!tableExists) {
                this.agents.clear();
                this.namespaces.clear();
                console.log(`[MCP Proxy] Agent registration tables not found, skipping data load. Run migration to create tables.`);
                return;
            }

            this.agents.clear();
            this.namespaces.clear();

            // Load agents from database
            const agents = await q.all_agents.all();
            for (const agent of agents) {
                this.agents.set(agent.agent_id, {
                    agent_id: agent.agent_id,
                    namespace: agent.namespace,
                    permissions: JSON.parse(agent.permissions),
                    description: agent.description,
                    registration_date: agent.registration_date * 1000, // Convert from Unix timestamp
                    last_access: agent.last_access * 1000
                });
            }

            // Load namespaces from database
            const namespaces = await q.all_namespaces.all();
            for (const ns of namespaces) {
                this.namespaces.set(ns.namespace, {
                    namespace: ns.namespace,
                    description: ns.description,
                    created_by: ns.created_by,
                    created_at: ns.created_at * 1000
                });
            }

            console.log(`[MCP Proxy] Loaded ${agents.length} agents and ${namespaces.length} namespaces from database`);
        } catch (error) {
            console.warn("[MCP Proxy] Failed to load persisted data:", error);
        }
    }

    public async refreshCache(): Promise<void> {
        await this.loadPersistedData();
    }

    private async checkTableExists(tableName: string): Promise<boolean> {
        try {
            if (env.metadata_backend === "postgres") {
                const schema = process.env.OM_PG_SCHEMA || "public";
                const qualified = tableName.includes(".")
                    ? tableName
                    : `${schema}.${tableName}`;
                const result = await get_async(
                    "SELECT to_regclass($1) as tbl",
                    [qualified],
                );
                return !!result?.tbl;
            }

            const result = await get_async(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [tableName],
            );
            return !!result;
        } catch (error) {
            console.warn("[MCP Proxy] checkTableExists failed:", error);
            return false;
        }
    }

    private async persistAgentData(): Promise<void> {
        // Data is automatically persisted via database operations in the MCP tool handlers
        // This method is kept for compatibility but doesn't need to do anything
    }

    private setHeaders(res: ServerResponse): void {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type,Authorization,Mcp-Session-Id",
        );
    }

    private sendError(
        res: ServerResponse,
        code: number,
        message: string,
        id: number | string | null = null,
        status = 400,
    ): void {
        if (!res.headersSent) {
            res.statusCode = status;
            this.setHeaders(res);
            res.end(
                JSON.stringify({
                    jsonrpc: "2.0",
                    error: { code, message },
                    id,
                }),
            );
        }
    }

    private async extractPayload(req: IncomingMessage): Promise<any> {
        if ((req as any).body !== undefined) {
            if (typeof (req as any).body === "string") {
                if (!(req as any).body.trim()) return undefined;
                return JSON.parse((req as any).body);
            }
            if (typeof (req as any).body === "object" && (req as any).body !== null) return (req as any).body;
            return undefined;
        }
        const raw = await new Promise<string>((resolve, reject) => {
            let buf = "";
            req.on("data", (chunk) => {
                buf += chunk;
            });
            req.on("end", () => resolve(buf));
            req.on("error", reject);
        });
        if (!raw.trim()) return undefined;
        return JSON.parse(raw);
    }

    public getServer(): McpServer {
        return this.srv;
    }

    public async httpHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
        try {
            // Extract JSON payload from request
            const pay = await this.extractPayload(req);
            if (!pay || typeof pay !== "object") {
                this.sendError(res, -32600, "Request body must be a JSON object");
                return;
            }
            
            console.log("[MCP PROXY] Incoming request:", JSON.stringify(pay));
            this.setHeaders(res);
            
            // Use transport to handle the request
            if (!this.transport) {
                this.transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined,
                    enableJsonResponse: true,
                });
                await this.srv.connect(this.transport);
            }
            
            await this.transport.handleRequest(req, res, pay);
        } catch (error) {
            console.error("[MCP PROXY] Error handling request:", error);
            if (error instanceof SyntaxError) {
                this.sendError(res, -32600, "Invalid JSON payload");
                return;
            }
            if (!res.headersSent) {
                this.sendError(
                    res,
                    -32603,
                    "Internal server error",
                    (error as any)?.id ?? null,
                    500,
                );
            }
        }
    }

    public async stdioHandler(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.srv.connect(transport);
    }
}

export const create_proxy_srv = () => new OpenMemoryMCPProxy();