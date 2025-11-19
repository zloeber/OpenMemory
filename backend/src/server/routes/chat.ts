import { process_chat_history } from "../../memory/chat_integration";
import type { chat_integration_req } from "../../core/types";

export function chat_routes(app: any) {
    /**
     * Process chat history and extract memories
     *
     * @route POST /api/chat/integrate
     * @param {chat_integration_req} req.body - Chat messages and configuration
     * @returns {Object} - Created memories and extraction details
     */
    app.post("/api/chat/integrate", async (req: any, res: any) => {
        const body = req.body as chat_integration_req;

        // Validate request
        if (!body?.messages || !Array.isArray(body.messages)) {
            return res.status(400).json({
                error: "messages array is required",
            });
        }

        if (body.messages.length === 0) {
            return res.status(400).json({
                error: "messages array cannot be empty",
            });
        }

        // Validate message format
        for (const msg of body.messages) {
            if (!msg.role || !msg.content) {
                return res.status(400).json({
                    error: "Each message must have role and content",
                });
            }
            if (!["user", "assistant", "system"].includes(msg.role)) {
                return res.status(400).json({
                    error: "Message role must be user, assistant, or system",
                });
            }
        }

        try {
            // Use namespaces from body (defaults to ["global"])
            const namespaces = body.namespaces && body.namespaces.length > 0 ? body.namespaces : ["global"];

            // Process chat history
            const result = await process_chat_history(
                body.messages,
                namespaces,
                body.model,
            );

            res.json({
                success: true,
                memories_created: result.memories.length,
                memories: result.memories,
                extracted: result.extracted,
            });
        } catch (error: any) {
            console.error("[chat_routes] Error processing chat:", error);
            res.status(500).json({
                error: "Failed to process chat history",
                message: error.message,
            });
        }
    });

    /**
     * Get LLM configuration
     *
     * @route GET /api/chat/config
     * @returns {Object} - Current LLM configuration
     */
    app.get("/api/chat/config", async (req: any, res: any) => {
        const { env } = await import("../../core/cfg");

        res.json({
            provider: env.llm_chat_provider,
            model: env.llm_chat_model,
            temperature: env.llm_chat_temperature,
            max_tokens: env.llm_chat_max_tokens,
            ollama_url: env.ollama_url,
        });
    });
}
