import { env } from "../core/cfg";
import type {
    chat_message,
    extracted_memory,
    sector_type,
} from "../core/types";
import { add_hsg_memory } from "./hsg";

/**
 * Process chat history and extract memories using an LLM
 */
export async function process_chat_history(
    messages: chat_message[],
    user_id?: string,
    model_override?: string,
): Promise<{ memories: any[]; extracted: extracted_memory[] }> {
    // Extract memories using LLM
    const extracted = await extract_memories_from_chat(messages, model_override);

    // Store each memory
    const memories = [];
    for (const item of extracted) {
        try {
            const memory = await add_hsg_memory(
                item.content,
                item.tags ? JSON.stringify(item.tags) : "[]",
                item.metadata || {},
                user_id,
            );
            memories.push(memory);
        } catch (error: any) {
            console.error(
                "[chat_integration] Failed to store memory:",
                error.message,
            );
        }
    }

    return { memories, extracted };
}

/**
 * Call LLM to extract structured memories from chat conversation
 */
async function extract_memories_from_chat(
    messages: chat_message[],
    model_override?: string,
): Promise<extracted_memory[]> {
    const provider = env.llm_chat_provider;
    const model = model_override || env.llm_chat_model;

    if (provider === "ollama") {
        return await extract_with_ollama(messages, model);
    } else if (provider === "openai") {
        return await extract_with_openai(messages, model);
    } else {
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

/**
 * Extract memories using Ollama
 */
async function extract_with_ollama(
    messages: chat_message[],
    model: string,
): Promise<extracted_memory[]> {
    const prompt = build_extraction_prompt(messages);

    try {
        const response = await fetch(`${env.ollama_url}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                temperature: env.llm_chat_temperature,
                options: {
                    num_predict: env.llm_chat_max_tokens,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(
                `Ollama API error: ${response.status} - ${error}`,
            );
        }

        const data = await response.json();
        return parse_llm_response(data.response);
    } catch (error: any) {
        console.error("[chat_integration] Ollama error:", error.message);
        throw error;
    }
}

/**
 * Extract memories using OpenAI-compatible API
 */
async function extract_with_openai(
    messages: chat_message[],
    model: string,
): Promise<extracted_memory[]> {
    const prompt = build_extraction_prompt(messages);

    try {
        const response = await fetch(
            `${env.openai_base_url}/chat/completions`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.openai_key}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a helpful assistant that extracts important information from conversations.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: env.llm_chat_temperature,
                    max_tokens: env.llm_chat_max_tokens,
                }),
            },
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(
                `OpenAI API error: ${response.status} - ${error}`,
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        return parse_llm_response(content);
    } catch (error: any) {
        console.error("[chat_integration] OpenAI error:", error.message);
        throw error;
    }
}

/**
 * Build the prompt for memory extraction
 */
function build_extraction_prompt(messages: chat_message[]): string {
    const conversation = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

    return `Analyze the following conversation and extract important facts, decisions, preferences, learnings, and other notable information that should be stored as memories.

For each memory item, determine the appropriate memory type (sector):
- episodic: Specific events, experiences, or interactions
- semantic: Facts, concepts, definitions, or general knowledge
- procedural: How-to knowledge, processes, or step-by-step instructions
- emotional: Emotional states, feelings, or sentiment-laden information
- reflective: Meta-thoughts, insights, or self-awareness

Return ONLY a valid JSON array of memory objects. Each object must have:
- "content": The memory content (string)
- "sector": The memory type (one of: episodic, semantic, procedural, emotional, reflective)
- "tags": Optional array of relevant tags (array of strings)
- "metadata": Optional metadata object (object)

CONVERSATION:
${conversation}

Return only the JSON array, with no additional text or explanation:`;
}

/**
 * Parse the LLM response to extract memories
 */
function parse_llm_response(response: string): extracted_memory[] {
    try {
        // Try to find JSON array in the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn(
                "[chat_integration] No JSON array found in response:",
                response,
            );
            return [];
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(parsed)) {
            console.warn(
                "[chat_integration] Response is not an array:",
                parsed,
            );
            return [];
        }

        // Validate and clean up each memory
        return parsed
            .filter((item: any) => item && typeof item.content === "string")
            .map((item: any) => ({
                content: item.content,
                sector: validate_sector(item.sector),
                tags: Array.isArray(item.tags) ? item.tags : undefined,
                metadata:
                    item.metadata && typeof item.metadata === "object"
                        ? item.metadata
                        : undefined,
            }));
    } catch (error: any) {
        console.error(
            "[chat_integration] Failed to parse LLM response:",
            error.message,
        );
        console.error("[chat_integration] Response was:", response);
        return [];
    }
}

/**
 * Validate and return a valid sector type
 */
function validate_sector(sector: any): sector_type | undefined {
    const valid_sectors: sector_type[] = [
        "episodic",
        "semantic",
        "procedural",
        "emotional",
        "reflective",
    ];

    if (typeof sector === "string" && valid_sectors.includes(sector as any)) {
        return sector as sector_type;
    }

    return undefined; // Let HSG auto-classify if sector is invalid
}
