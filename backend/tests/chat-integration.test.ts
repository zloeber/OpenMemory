#!/usr/bin/env tsx
/**
 * Test script for chat integration API
 */

import { env } from "../src/core/cfg";

const API_URL = `http://localhost:${env.port}`;

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    data?: any;
}

const results: TestResult[] = [];

async function test(
    name: string,
    fn: () => Promise<void>,
): Promise<void> {
    try {
        await fn();
        results.push({ name, passed: true });
        console.log(`✓ ${name}`);
    } catch (error: any) {
        results.push({ name, passed: false, message: error.message });
        console.error(`✗ ${name}: ${error.message}`);
    }
}

async function testConfigEndpoint() {
    const response = await fetch(`${API_URL}/api/chat/config`);
    if (!response.ok) {
        throw new Error(`Config endpoint failed: ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.provider || !data.model) {
        throw new Error("Config missing required fields");
    }
    
    console.log("  Config:", JSON.stringify(data, null, 2));
}

async function testChatIntegrationValidation() {
    // Test with missing messages
    let response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    
    if (response.status !== 400) {
        throw new Error("Should return 400 for missing messages");
    }
    
    // Test with empty messages array
    response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
    });
    
    if (response.status !== 400) {
        throw new Error("Should return 400 for empty messages");
    }
    
    // Test with invalid message format
    response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ invalid: "format" }],
        }),
    });
    
    if (response.status !== 400) {
        throw new Error("Should return 400 for invalid message format");
    }
    
    console.log("  Validation checks passed");
}

async function testChatIntegrationWithMockData() {
    // This test will fail if Ollama is not running, which is expected
    // It verifies the endpoint exists and processes the request
    const testMessages = [
        {
            role: "user" as const,
            content: "I prefer dark mode for coding",
            timestamp: Date.now(),
        },
        {
            role: "assistant" as const,
            content: "I've noted your preference for dark mode. Is there anything else you'd like to configure?",
            timestamp: Date.now(),
        },
        {
            role: "user" as const,
            content: "Yes, I also like to use TypeScript for all projects",
            timestamp: Date.now(),
        },
    ];
    
    const response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: testMessages,
            user_id: "test-user-123",
        }),
    });
    
    const data = await response.json();
    
    if (response.status === 500 && data.message?.includes("ECONNREFUSED")) {
        console.log("  ⚠ Ollama not running - endpoint exists but cannot connect to LLM");
        return; // This is expected in test environment
    }
    
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} - ${JSON.stringify(data)}`);
    }
    
    if (!data.success) {
        throw new Error("Response should indicate success");
    }
    
    console.log("  Response:", JSON.stringify(data, null, 2));
}

async function runTests() {
    console.log("\n🧪 Running Chat Integration API Tests\n");
    
    await test("GET /api/chat/config returns configuration", testConfigEndpoint);
    await test("POST /api/chat/integrate validates input", testChatIntegrationValidation);
    await test("POST /api/chat/integrate processes chat (if Ollama running)", testChatIntegrationWithMockData);
    
    console.log("\n📊 Test Results:");
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed < total) {
        console.log("\nFailed tests:");
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.message}`);
        });
    }
    
    process.exit(passed === total ? 0 : 1);
}

runTests().catch(error => {
    console.error("Test runner error:", error);
    process.exit(1);
});
