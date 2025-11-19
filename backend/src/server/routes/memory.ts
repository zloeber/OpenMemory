import { q } from "../../core/db";
import { now, rid, j, p } from "../../utils";
import {
    add_hsg_memory,
    hsg_query,
    reinforce_memory,
    update_memory,
} from "../../memory/hsg";
import { ingestDocument, ingestURL } from "../../ops/ingest";
import { env } from "../../core/cfg";
import { VectorRepositoryFactory } from "../../repositories/VectorRepositoryFactory";
import { insert_fact } from "../../temporal_graph/store";
import type {
    add_req,
    q_req,
    ingest_req,
    ingest_url_req,
    sector_type,
} from "../../core/types";

export function mem(app: any) {
    app.post("/memory/add", async (req: any, res: any) => {
        const b = req.body as add_req;
        if (!b?.content) return res.status(400).json({ err: "content required" });
        
        // Default to ["global"] if no namespaces provided
        const namespaces = b.namespaces && b.namespaces.length > 0 ? b.namespaces : ["global"];
        
        try {
            const m = await add_hsg_memory(
                b.content,
                j(b.tags || []),
                b.metadata,
                namespaces,
            );
            res.json({ ...m, namespaces });
        } catch (e: any) {
            res.status(500).json({ err: e.message });
        }
    });

    app.post("/memory/ingest", async (req: any, res: any) => {
        const b = req.body as ingest_req;
        if (!b?.content_type || !b?.data)
            return res.status(400).json({ err: "missing content_type or data" });
        
        const namespaces = b.namespaces && b.namespaces.length > 0 ? b.namespaces : ["global"];
        
        try {
            const r = await ingestDocument(
                b.content_type,
                b.data,
                b.metadata,
                b.config,
                namespaces,
            );
            res.json(r);
        } catch (e: any) {
            res.status(500).json({ err: "ingest_fail", msg: e.message });
        }
    });

    app.post("/memory/ingest/url", async (req: any, res: any) => {
        const b = req.body as ingest_url_req;
        if (!b?.url) return res.status(400).json({ err: "no_url" });
        
        const namespaces = b.namespaces && b.namespaces.length > 0 ? b.namespaces : ["global"];
        
        try {
            const r = await ingestURL(b.url, b.metadata, b.config, namespaces);
            res.json(r);
        } catch (e: any) {
            res.status(500).json({ err: "url_fail", msg: e.message });
        }
    });

    app.post("/memory/query", async (req: any, res: any) => {
        const b = req.body as q_req;
        const k = b.k || 8;
        const namespaces = b.namespaces && b.namespaces.length > 0 ? b.namespaces : ["global"];
        
        try {
            const f = {
                sectors: b.filters?.sector ? [b.filters.sector] : undefined,
                minSalience: b.filters?.min_score,
                namespaces,
            };
            const m = await hsg_query(b.query, k, f);
            res.json({
                query: b.query,
                namespaces,
                matches: m.map((x: any) => ({
                    id: x.id,
                    content: x.content,
                    score: x.score,
                    sectors: x.sectors,
                    primary_sector: x.primary_sector,
                    path: x.path,
                    salience: x.salience,
                    last_seen_at: x.last_seen_at,
                })),
            });
        } catch (e: any) {
            res.json({ query: b.query, namespaces, matches: [] });
        }
    });

    app.post("/memory/reinforce", async (req: any, res: any) => {
        const b = req.body as { id: string; boost?: number };
        if (!b?.id) return res.status(400).json({ err: "id" });
        try {
            await reinforce_memory(b.id, b.boost);
            res.json({ ok: true });
        } catch (e: any) {
            res.status(404).json({ err: "nf" });
        }
    });

    app.patch("/memory/:id", async (req: any, res: any) => {
        const id = req.params.id;
        const b = req.body as {
            content?: string;
            tags?: string[];
            metadata?: any;
            namespaces?: string[];
        };
        if (!id) return res.status(400).json({ err: "id required" });
        
        const check_namespaces = b.namespaces && b.namespaces.length > 0 ? b.namespaces : ["global"];
        
        try {
            // Check if memory exists and namespace matches
            const m = await q.get_mem.get(id);
            if (!m) return res.status(404).json({ err: "not found" });

            // Check namespace ownership - parse namespaces from JSON
            const mem_namespaces = JSON.parse(m.namespaces || '["global"]');
            const hasAccess = check_namespaces.some(ns => mem_namespaces.includes(ns));
            
            if (!hasAccess) {
                return res.status(403).json({ err: "forbidden: namespace mismatch" });
            }

            const r = await update_memory(id, b.content, b.tags, b.metadata);
            res.json(r);
        } catch (e: any) {
            if (e.message.includes("not found")) {
                res.status(404).json({ err: "not found" });
            } else {
                res.status(500).json({ err: "internal" });
            }
        }
    });

    app.get("/memory/all", async (req: any, res: any) => {
        try {
            const namespaces_param = req.query.namespaces;
            const namespaces = namespaces_param 
                ? (Array.isArray(namespaces_param) ? namespaces_param : [namespaces_param])
                : ["global"];
            
            const u = req.query.u ? parseInt(req.query.u) : 0;
            const l = req.query.l ? parseInt(req.query.l) : 100;
            const s = req.query.sector;

            // Get all memories and filter by namespace membership
            let r = await q.all_mem.all(l, u);
            
            // Filter to only memories that belong to requested namespaces
            r = r.filter((x: any) => {
                const mem_ns = JSON.parse(x.namespaces || '["global"]');
                return namespaces.some(ns => mem_ns.includes(ns));
            });
            
            if (s) {
                r = r.filter((x: any) => x.primary_sector === s);
            }

            const i = r.map((x: any) => ({
                id: x.id,
                content: x.content,
                tags: p(x.tags),
                metadata: p(x.meta),
                namespaces: JSON.parse(x.namespaces || '["global"]'),
                created_at: x.created_at,
                updated_at: x.updated_at,
                last_seen_at: x.last_seen_at,
                salience: x.salience,
                decay_lambda: x.decay_lambda,
                primary_sector: x.primary_sector,
                version: x.version,
            }));
            res.json({ items: i, namespaces });
        } catch (e: any) {
            res.status(500).json({ err: "internal" });
        }
    });

    app.get("/memory/:id", async (req: any, res: any) => {
        try {
            const id = req.params.id;
            const namespaces_param = req.query.namespaces;
            const check_namespaces = namespaces_param
                ? (Array.isArray(namespaces_param) ? namespaces_param : [namespaces_param])
                : ["global"];
            
            const m = await q.get_mem.get(id);
            if (!m) return res.status(404).json({ err: "not found" });

            // Check namespace access
            const mem_namespaces = JSON.parse(m.namespaces || '["global"]');
            const hasAccess = check_namespaces.some(ns => mem_namespaces.includes(ns));
            
            if (!hasAccess) {
                return res.status(403).json({ err: "forbidden: namespace mismatch" });
            }

            const v = await q.get_vecs_by_id.all(id);
            const sec = v.map((x: any) => x.sector);
            res.json({
                id: m.id,
                content: m.content,
                primary_sector: m.primary_sector,
                sectors: sec,
                tags: p(m.tags),
                metadata: p(m.meta),
                namespaces: mem_namespaces,
                created_at: m.created_at,
                updated_at: m.updated_at,
                last_seen_at: m.last_seen_at,
                salience: m.salience,
                decay_lambda: m.decay_lambda,
                version: m.version,
            });
        } catch (e: any) {
            res.status(500).json({ err: "internal" });
        }
    });

    app.delete("/memory/:id", async (req: any, res: any) => {
        try {
            const id = req.params.id;
            const namespaces_param = req.query.namespaces || req.body.namespaces;
            const check_namespaces = namespaces_param
                ? (Array.isArray(namespaces_param) ? namespaces_param : [namespaces_param])
                : ["global"];
            
            const m = await q.get_mem.get(id);
            if (!m) return res.status(404).json({ err: "not found" });

            // Check namespace access
            const mem_namespaces = JSON.parse(m.namespaces || '["global"]');
            const hasAccess = check_namespaces.some(ns => mem_namespaces.includes(ns));
            
            if (!hasAccess) {
                return res.status(403).json({ err: "forbidden: namespace mismatch" });
            }

            await q.del_mem.run(id);
            
            // Use vector repository for namespace-isolated deletion
            const vectorRepo = await VectorRepositoryFactory.getInstance();
            await vectorRepo.delete(id, undefined, mem_namespaces[0]);
            
            await q.del_waypoints.run(id, id);
            res.json({ ok: true });
        } catch (e: any) {
            res.status(500).json({ err: "internal" });
        }
    });

    // GET endpoint to return the LLM prompt for intelligent memory classification
    app.get("/memory/ingest/intelligent/prompt", async (req: any, res: any) => {
        const namespaces_param = req.query.namespaces;
        const namespaces = namespaces_param
            ? (Array.isArray(namespaces_param) ? namespaces_param : [namespaces_param])
            : ["global"];

        const prompt = build_intelligent_ingest_prompt();
        const endpoints = {
            hsg_memory: {
                method: "POST",
                url: "/memory/add",
                description: "Store in Hierarchical Semantic Graph (HSG) - episodic, semantic, procedural, emotional, or reflective memory",
                required: ["content"],
                optional: ["namespaces", "tags", "metadata"],
                sectors: ["episodic", "semantic", "procedural", "emotional", "reflective"]
            },
            temporal_fact: {
                method: "POST",
                url: "/api/temporal/fact",
                description: "Store temporal knowledge graph fact - time-bound assertions about entities",
                required: ["namespace", "subject", "predicate", "object"],
                optional: ["valid_from", "confidence", "metadata"]
            }
        };

        res.json({
            namespaces,
            prompt,
            endpoints,
            instructions: "Use the prompt to analyze content and determine the appropriate memory type and endpoint to call. The LLM should return a JSON response indicating which endpoint to use and with what parameters.",
            example_response: {
                memory_type: "hsg_memory",
                endpoint: "/memory/add",
                params: {
                    content: "The meeting concluded with consensus on Q1 priorities",
                    namespaces: namespaces,
                    tags: ["meeting", "Q1", "priorities"],
                    metadata: { sector: "episodic", confidence: 0.95 }
                }
            }
        });
    });

    // POST endpoint that uses LLM to classify and route memory storage
    app.post("/memory/ingest/intelligent", async (req: any, res: any) => {
        const { content, namespaces, metadata } = req.body;
        
        if (!content) {
            return res.status(400).json({ err: "content required" });
        }
        
        const ns = namespaces && namespaces.length > 0 ? namespaces : ["global"];

        try {
            // Use LLM to analyze content and determine memory type
            const classification = await classify_memory_with_llm(content);
            
            const results: any[] = [];
            
            // Process each classified memory item
            for (const item of classification.items) {
                try {
                    if (item.memory_type === "temporal_fact") {
                        // Store as temporal fact (temporal facts still use single namespace)
                        const fact_id = await insert_fact(
                            ns[0],
                            item.subject,
                            item.predicate,
                            item.object,
                            item.valid_from ? new Date(item.valid_from) : new Date(),
                            item.confidence || 1.0,
                            { ...metadata, ...item.metadata, source: "intelligent_ingest" }
                        );
                        results.push({
                            type: "temporal_fact",
                            id: fact_id,
                            subject: item.subject,
                            predicate: item.predicate,
                            object: item.object
                        });
                    } else {
                        // Store as HSG memory (default)
                        const memory = await add_hsg_memory(
                            item.content,
                            j(item.tags || []),
                            { 
                                ...metadata, 
                                ...item.metadata, 
                                sector: item.sector,
                                source: "intelligent_ingest"
                            },
                            ns
                        );
                        results.push({
                            type: "hsg_memory",
                            id: memory.id,
                            sector: item.sector,
                            content: item.content.substring(0, 100) + "..."
                        });
                    }
                } catch (itemError: any) {
                    console.error("[intelligent_ingest] Failed to store item:", itemError.message);
                    results.push({
                        type: "error",
                        error: itemError.message,
                        item_content: item.content?.substring(0, 50)
                    });
                }
            }

            res.json({
                namespaces: ns,
                classification_summary: classification.summary,
                items_processed: results.length,
                results,
                llm_model: env.llm_chat_model,
                llm_provider: env.llm_chat_provider
            });
        } catch (e: any) {
            console.error("[intelligent_ingest] Error:", e.message);
            res.status(500).json({ 
                err: "intelligent_ingest_fail", 
                msg: e.message,
                fallback: "Consider using /memory/add or /memory/ingest directly"
            });
        }
    });
}

/**
 * Build the system prompt for intelligent memory classification
 */
function build_intelligent_ingest_prompt(): string {
    return `You are an intelligent memory classification system. Analyze the provided content and classify it into appropriate memory storage types.

MEMORY TYPES:

1. HSG (Hierarchical Semantic Graph) Memory - For general memories with sectors:
   - episodic: Events, experiences, specific interactions, dated occurrences
   - semantic: Facts, concepts, definitions, general knowledge, procedures
   - procedural: Step-by-step instructions, how-to knowledge, workflows
   - emotional: Feelings, sentiments, emotional states, user preferences
   - reflective: Meta-thoughts, insights, reasoning, lessons learned

2. Temporal Facts - For time-bound assertions about entities:
   - Use when content describes facts that are valid within a specific time period
   - Format: (subject, predicate, object) triples with temporal validity
   - Examples: "User works at Company X", "Project status is active", "System version is 2.0"

TASK:
Analyze the content and return a JSON response with classified memory items.

RESPONSE FORMAT:
{
  "summary": "Brief description of what was classified",
  "items": [
    {
      "memory_type": "hsg_memory" | "temporal_fact",
      "content": "The actual memory content (for HSG)",
      "sector": "episodic|semantic|procedural|emotional|reflective (for HSG)",
      "subject": "entity subject (for temporal facts)",
      "predicate": "relationship/property (for temporal facts)",
      "object": "value/target entity (for temporal facts)",
      "tags": ["relevant", "tags"],
      "confidence": 0.0-1.0,
      "metadata": {},
      "valid_from": "ISO date string (optional, for temporal facts)"
    }
  ]
}

GUIDELINES:
- Extract multiple memory items if content contains distinct pieces of information
- Choose HSG for narrative, experiential, or complex content
- Choose temporal facts for structured, time-bound assertions about entities
- Always include confidence score (0.0-1.0)
- Add relevant tags for better retrieval
- If unsure, default to HSG with semantic sector

Return ONLY valid JSON, no additional text.`;
}

/**
 * Classify content using LLM and return structured memory items
 */
async function classify_memory_with_llm(content: string): Promise<any> {
    const provider = env.llm_chat_provider;
    const model = env.llm_chat_model;

    const system_prompt = build_intelligent_ingest_prompt();
    const user_prompt = `Analyze and classify the following content:\n\n${content}`;

    let response_text = "";

    if (provider === "ollama") {
        const response = await fetch(`${env.ollama_url}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                prompt: `${system_prompt}\n\n${user_prompt}`,
                stream: false,
                temperature: 0.3,
                options: { num_predict: 2000 }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        response_text = data.response;
    } else if (provider === "openai") {
        const response = await fetch(`${env.openai_base_url}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.openai_key}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: system_prompt },
                    { role: "user", content: user_prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        response_text = data.choices?.[0]?.message?.content || "";
    } else {
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    // Parse JSON response
    const jsonMatch = response_text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("LLM did not return valid JSON");
    }

    const classification = JSON.parse(jsonMatch[0]);
    
    // Validate classification structure
    if (!classification.items || !Array.isArray(classification.items)) {
        throw new Error("Invalid classification response: missing items array");
    }

    return classification;
}
