#!/usr/bin/env tsx
/**
 * Demonstration script for chat integration API
 * This shows how the API works with a mock LLM that returns predictable results
 */

import { env } from "../src/core/cfg";
import { parse_llm_response, build_extraction_prompt } from "../src/memory/chat_integration";

// Mock LLM response for demonstration
const MOCK_LLM_RESPONSE = JSON.stringify([
    {
        content: "User prefers dark mode for coding",
        sector: "semantic",
        tags: ["preference", "ui", "coding"],
        metadata: { type: "user_preference" }
    },
    {
        content: "User uses TypeScript for all projects",
        sector: "procedural",
        tags: ["programming", "typescript", "workflow"],
        metadata: { type: "workflow_preference" }
    },
    {
        content: "Discussion about setting up a new project on 2024-11-18",
        sector: "episodic",
        tags: ["project", "planning"],
        metadata: { date: "2024-11-18" }
    }
]);

// Sample conversation
const SAMPLE_CONVERSATION = [
    {
        role: "user" as const,
        content: "I prefer using dark mode when I'm coding",
    },
    {
        role: "assistant" as const,
        content: "I've noted your preference for dark mode. It can reduce eye strain during long coding sessions.",
    },
    {
        role: "user" as const,
        content: "Yes, exactly. Also, I always use TypeScript for my projects.",
    },
    {
        role: "assistant" as const,
        content: "TypeScript is a great choice for type safety. Are you starting a new project?",
    },
    {
        role: "user" as const,
        content: "Yes, I'm planning to start a new web application today.",
    },
];

async function demonstrateAPI() {
    console.log("🎯 Chat Integration API Demonstration\n");
    console.log("=" .repeat(60));
    
    // 1. Show configuration
    console.log("\n1️⃣  LLM Configuration");
    console.log("-".repeat(60));
    console.log(`Provider: ${env.llm_chat_provider}`);
    console.log(`Model: ${env.llm_chat_model}`);
    console.log(`Temperature: ${env.llm_chat_temperature}`);
    console.log(`Max Tokens: ${env.llm_chat_max_tokens}`);
    console.log(`Ollama URL: ${env.ollama_url}`);
    
    // 2. Show sample conversation
    console.log("\n2️⃣  Sample Conversation");
    console.log("-".repeat(60));
    SAMPLE_CONVERSATION.forEach((msg, i) => {
        const role = msg.role.toUpperCase();
        const content = msg.content;
        console.log(`\n[${role}]`);
        console.log(`${content}`);
    });
    
    // 3. Demonstrate prompt building
    console.log("\n3️⃣  Generated Prompt for LLM");
    console.log("-".repeat(60));
    const prompt = build_extraction_prompt(SAMPLE_CONVERSATION);
    const promptPreview = prompt.length > 300 
        ? prompt.substring(0, 300) + "...[truncated]" 
        : prompt;
    console.log(promptPreview);
    
    // 4. Show mock LLM response
    console.log("\n4️⃣  Mock LLM Response (Extracted Memories)");
    console.log("-".repeat(60));
    const extracted = JSON.parse(MOCK_LLM_RESPONSE);
    extracted.forEach((memory, i) => {
        console.log(`\n  Memory ${i + 1}:`);
        console.log(`    Content: ${memory.content}`);
        console.log(`    Sector: ${memory.sector}`);
        console.log(`    Tags: ${memory.tags.join(", ")}`);
        console.log(`    Metadata:`, JSON.stringify(memory.metadata));
    });
    
    // 5. Show API request format
    console.log("\n5️⃣  API Request Format");
    console.log("-".repeat(60));
    const apiRequest = {
        messages: SAMPLE_CONVERSATION,
        user_id: "demo-user-123",
        metadata: {
            source: "demo_script",
            timestamp: Date.now()
        }
    };
    console.log(JSON.stringify(apiRequest, null, 2));
    
    // 6. Show expected API response format
    console.log("\n6️⃣  Expected API Response");
    console.log("-".repeat(60));
    const expectedResponse = {
        success: true,
        memories_created: 3,
        memories: [
            {
                id: "mem-uuid-1",
                primary_sector: "semantic",
                sectors: ["semantic"],
                chunks: 1
            },
            {
                id: "mem-uuid-2",
                primary_sector: "procedural",
                sectors: ["procedural"],
                chunks: 1
            },
            {
                id: "mem-uuid-3",
                primary_sector: "episodic",
                sectors: ["episodic"],
                chunks: 1
            }
        ],
        extracted: extracted
    };
    console.log(JSON.stringify(expectedResponse, null, 2));
    
    // 7. Show usage examples
    console.log("\n7️⃣  Usage Examples");
    console.log("-".repeat(60));
    console.log("\nCURL Example:");
    console.log(`
curl -X POST http://localhost:${env.port}/api/chat/integrate \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(apiRequest)}'
    `.trim());
    
    console.log("\n\nJavaScript/TypeScript Example:");
    console.log(`
const response = await fetch('http://localhost:${env.port}/api/chat/integrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [...],
    user_id: 'user123'
  })
});

const result = await response.json();
console.log(\`Created \${result.memories_created} memories\`);
    `.trim());
    
    console.log("\n\n" + "=".repeat(60));
    console.log("✅ Demonstration Complete!");
    console.log("\nTo test the actual API:");
    console.log(`1. Ensure server is running on port ${env.port}`);
    console.log("2. Ensure Ollama is running with a model installed");
    console.log("3. Run: npm run dev");
    console.log("4. Use the curl command above to test");
    console.log("\nDocumentation: docs/CHAT_INTEGRATION.md");
    console.log("=".repeat(60) + "\n");
}

// Export for use in tests
export function build_extraction_prompt(messages: any[]): string {
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

export function parse_llm_response(response: string): any[] {
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn("No JSON array found in response");
            return [];
        }
        return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
        console.error("Failed to parse LLM response:", error.message);
        return [];
    }
}

if (require.main === module) {
    demonstrateAPI().catch(error => {
        console.error("Error running demonstration:", error);
        process.exit(1);
    });
}
