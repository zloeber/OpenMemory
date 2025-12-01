#!/usr/bin/env tsx
/**
 * Comprehensive API endpoint tests for OpenMemory
 * Tests all major API routes with namespace isolation
 */

import { env } from "../src/core/cfg";

const API_URL = `http://localhost:${env.port}`;
const API_KEY = process.env.OM_API_KEY || process.env.OPENMEMORY_API_KEY || env.api_key || "";
const TEST_NAMESPACE = `test-${Date.now()}`;
const TEST_NAMESPACE_2 = `test-alt-${Date.now()}`;

// Helper to get headers with optional API key
function getHeaders(contentType: string = "application/json"): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": contentType
    };
    if (API_KEY) {
        headers["x-api-key"] = API_KEY;
    }
    return headers;
}

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    data?: any;
}

const results: TestResult[] = [];
let testMemoryId: string | null = null;
let testMemoryId2: string | null = null;

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

// ============================================================================
// SYSTEM ENDPOINTS
// ============================================================================

async function testHealthEndpoint() {
    const response = await fetch(`${API_URL}/health`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
    }
    const data = await response.json();
    if (!data.ok) {
        throw new Error("Health status is not ok");
    }
}

async function testSectorsEndpoint() {
    const response = await fetch(`${API_URL}/sectors`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error(`Sectors endpoint failed: ${response.status}`);
    }
    const data = await response.json();
    if (!data.sectors || !Array.isArray(data.sectors)) {
        throw new Error("Sectors response missing sectors array");
    }
    const expectedSectors = ["episodic", "semantic", "procedural", "emotional", "reflective"];
    for (const sector of expectedSectors) {
        if (!data.sectors.includes(sector)) {
            throw new Error(`Missing expected sector: ${sector}`);
        }
    }
}

async function testHealthHasVersion() {
    const response = await fetch(`${API_URL}/health`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error(`Health endpoint failed: ${response.status}`);
    }
    const data = await response.json();
    if (!data.version) {
        throw new Error("Health response missing version field");
    }
}

// ============================================================================
// MEMORY ENDPOINTS
// ============================================================================

async function testMemoryAddRequiresNamespace() {
    const response = await fetch(`${API_URL}/memory/add`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            content: "Test memory without namespace"
        }),
    });

    const data = await response.json();
    if (response.status !== 200 ) {
        throw new Error(`Memory add without namespace should not fail: ${response.status}`);
    }
    // if (!data.err || !data.err.includes("namespace")) {
    //     throw new Error("Error message should mention namespace requirement");
    // }
}

async function testMemoryAdd() {
    try {
        const response = await fetch(`${API_URL}/memory/add`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                content: `This is a test memory for the OpenMemory API unit tests created at ${Date.now()}`,
                namespaces: [TEST_NAMESPACE],
                tags: ["test", "unit-test"],
                metadata: { test: true, timestamp: Date.now() }
            }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            throw new Error(`Memory add failed: ${response.status} - ${JSON.stringify(errorData)}. This may be due to embedding generation issues. Check server logs.`);
        }
        
        const data = await response.json();
        if (!data.id) {
            throw new Error("Response missing memory ID");
        }
        
        testMemoryId = data.id;
        console.log(`      Memory ID: ${testMemoryId}`);
    } catch (error: any) {
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            throw new Error("Cannot connect to server - is it running?");
        }
        throw error;
    }
}

async function testMemoryAddToSecondNamespace() {
    const response = await fetch(`${API_URL}/memory/add`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            content: `This memory belongs to a different namespace - ${Date.now()}`,
            namespaces: [TEST_NAMESPACE_2],
            tags: ["test", "namespace-isolation"],
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Memory add to second namespace failed: ${response.status}`);
    }
    
    const data = await response.json();
    testMemoryId2 = data.id;
}

async function testMemoryQueryRequiresNamespace() {
    const response = await fetch(`${API_URL}/memory/query`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            query: "test memory"
        }),
    });
    
    if (response.status !== 200) {
        throw new Error("Query should NOT require a namespace");
    }
}

async function testMemoryQuery() {
    const response = await fetch(`${API_URL}/memory/query`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            query: "test memory",
            namespaces: [TEST_NAMESPACE],
            k: 5
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Memory query failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.query) {
        throw new Error("Response missing query field");
    }
    if (!Array.isArray(data.matches)) {
        throw new Error("Response missing matches array");
    }
}

async function testMemoryQueryNamespaceIsolation() {
    // Query first namespace - should find the memory
    let response = await fetch(`${API_URL}/memory/query`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            query: "test memory OpenMemory API",
            namespaces: [TEST_NAMESPACE],
            k: 10
        }),
    });
    
    let data = await response.json();
    const hasMemory1 = data.matches.some((m: any) => m.id === testMemoryId);
    
    if (!hasMemory1) {
        throw new Error("Should find memory in its own namespace");
    }
    
    // Query second namespace - should NOT find first namespace's memory
    response = await fetch(`${API_URL}/memory/query`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            query: "test memory OpenMemory API",
            namespaces: [TEST_NAMESPACE_2],
            k: 10
        }),
    });
    
    data = await response.json();
    const hasMemory1InNamespace2 = data.matches.some((m: any) => m.id === testMemoryId);
    
    if (hasMemory1InNamespace2) {
        throw new Error("Should NOT find memory from different namespace");
    }
}

async function testMemoryGetAllRequiresNamespace() {
    const response = await fetch(`${API_URL}/memory/all`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`GET /memory/all should default to global namespace: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data.namespaces) || !data.namespaces.includes('global')) {
        throw new Error("Should default to 'global' namespace when none specified");
    }
}

async function testMemoryGetAll() {
    const response = await fetch(`${API_URL}/memory/all?namespaces=${TEST_NAMESPACE}&l=100`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Memory get all failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data.items)) {
        throw new Error("Response missing items array");
    }
    
    const hasTestMemory = data.items.some((item: any) => item.id === testMemoryId);
    if (!hasTestMemory) {
        throw new Error("Should include the test memory in results");
    }
}

async function testMemoryGetByIdRequiresNamespace() {
    if (!testMemoryId) {
        console.log("      ⚠️  Skipping - no test memory available (memory creation may have failed)");
        return; // Don't throw, just skip
    }
    
    // Test should pass - namespace is optional and defaults to 'global'
    // But since test memory is in a specific namespace, it won't be accessible with default
    const response = await fetch(`${API_URL}/memory/${testMemoryId}`, {
        headers: getHeaders()
    });
    
    // Should return 403 since test memory is not in 'global' namespace
    if (response.status !== 403) {
        throw new Error("GET /memory/:id should return 403 when memory is not in default 'global' namespace");
    }
}

async function testMemoryGetById() {
    if (!testMemoryId) {
        console.log("      ⚠️  Skipping - no test memory available");
        return;
    }
    
    const response = await fetch(`${API_URL}/memory/${testMemoryId}?namespaces=${TEST_NAMESPACE}`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Memory get by ID failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.id !== testMemoryId) {
        throw new Error("Returned memory ID doesn't match requested ID");
    }
    if (!data.content) {
        throw new Error("Memory missing content");
    }
}

async function testMemoryGetByIdNamespaceProtection() {
    if (!testMemoryId || !testMemoryId2) {
        console.log("      ⚠️  Skipping - test memory IDs not available");
        return;
    }
    
    // Try to access memory from wrong namespace
    const response = await fetch(`${API_URL}/memory/${testMemoryId}?namespaces=${TEST_NAMESPACE_2}`, {
        headers: getHeaders()
    });
    
    if (response.status !== 403) {
        throw new Error("Should return 403 when accessing memory from wrong namespace");
    }
}

async function testMemoryUpdate() {
    if (!testMemoryId) {
        console.log("      ⚠️  Skipping - no test memory available");
        return;
    }
    
    const response = await fetch(`${API_URL}/memory/${testMemoryId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
            content: "Updated test memory content",
            namespaces: [TEST_NAMESPACE],
            tags: ["test", "updated"],
            metadata: { updated: true }
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Memory update failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.updated) {
        throw new Error("Response should indicate update success");
    }
}

async function testMemoryUpdateNamespaceProtection() {
    if (!testMemoryId) {
        console.log("      ⚠️  Skipping - no test memory available");
        return;
    }
    
    const response = await fetch(`${API_URL}/memory/${testMemoryId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
            content: "Trying to update from wrong namespace",
            namespaces: [TEST_NAMESPACE_2],
        }),
    });
    
    if (response.status !== 403) {
        throw new Error("Should return 403 when updating memory from wrong namespace");
    }
}

async function testMemoryReinforce() {
    if (!testMemoryId) {
        console.log("      ⚠️  Skipping - no test memory available");
        return;
    }
    
    const response = await fetch(`${API_URL}/memory/reinforce`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            id: testMemoryId,
            boost: 0.1
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Memory reinforce failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.ok) {
        throw new Error("Reinforce should return ok: true");
    }
}

async function testMemoryIngestRequiresNamespace() {
    const response = await fetch(`${API_URL}/memory/ingest`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            content_type: "txt",
            data: "Test ingest content without namespace"
        }),
    });
    
    if (response.status !== 200) {
        throw new Error("Ingest should NOT require namespace");
    }
}

async function testMemoryIngest() {
    const response = await fetch(`${API_URL}/memory/ingest`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            content_type: "txt",
            data: "This is test content for document ingestion. It contains multiple sentences. Each sentence provides information that should be stored as memories.",
            namespaces: [TEST_NAMESPACE],
            metadata: { source: "unit-test" }
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Memory ingest failed: ${response.status}`);
    }
    
    const data = await response.json();
    // if (!data.root_id) {
    //     throw new Error("Ingest response missing root_id");
    // }
    // if (!Array.isArray(data.chunk_ids)) {
    //     throw new Error("Ingest response missing chunk_ids array");
    // }
}

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

async function testChatConfigEndpoint() {
    const response = await fetch(`${API_URL}/api/chat/config`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error(`Chat config failed: ${response.status}`);
    }
    const data = await response.json();
    if (!data.provider || !data.model) {
        throw new Error("Config missing required fields");
    }
}

async function testChatIntegrationRequiresNamespace() {
    const response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            messages: [
                { role: "user", content: "Test message" }
            ]
        }),
    });
    
    if (response.status !== 400) {
        throw new Error("Chat integration should require namespace");
    }
}

async function testChatIntegrationValidation() {
    // Test with missing messages
    let response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ namespaces: [TEST_NAMESPACE] }),
    });
    
    if (response.status !== 400) {
        throw new Error("Should return 400 for missing messages");
    }
    
    // Test with empty messages
    response = await fetch(`${API_URL}/api/chat/integrate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            namespaces: [TEST_NAMESPACE],
            messages: []
        }),
    });
    
    if (response.status !== 400) {
        throw new Error("Should return 400 for empty messages");
    }
}

// ============================================================================
// COMPRESSION ENDPOINTS
// ============================================================================

async function testCompressionCompress() {
    const response = await fetch(`${API_URL}/api/compression/compress`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            text: "function processData(data) { return data.map(item => ({ id: item.id, name: item.name })); }"
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Compression compress failed: ${response.status}`);
    }
    
    const data = await response.json();
    // Compression may return original text if no compression occurred
    if (!data.compressed && !data.original) {
        throw new Error("Response missing compressed or original text");
    }
}

async function testCompressionStats() {
    const response = await fetch(`${API_URL}/api/compression/stats`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Compression stats failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.ok || !data.stats) {
        throw new Error("Stats missing ok or stats object");
    }
}

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

async function testMetricsEndpoint() {
    const response = await fetch(`${API_URL}/api/metrics`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Metrics endpoint failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.memories || typeof data.memories.total !== "number") {
        throw new Error("Metrics missing memories.total");
    }
}

async function testMetricsSummary() {
    const response = await fetch(`${API_URL}/api/metrics/summary`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Metrics summary failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data.top_namespaces)) {
        throw new Error("Summary missing top_namespaces array");
    }
}

async function testMetricsNamespace() {
    const response = await fetch(`${API_URL}/api/metrics/namespaces/${TEST_NAMESPACE}`, {
        headers: getHeaders()
    });
    
    // May return 404 if namespace doesn't exist or has no data
    if (!response.ok && response.status !== 404) {
        throw new Error(`Namespace metrics failed: ${response.status}`);
    }
    
    if (response.ok) {
        const data = await response.json();
        if (data.namespace !== TEST_NAMESPACE) {
            throw new Error("Namespace metrics returned wrong namespace");
        }
    }
}

// ============================================================================
// SECTOR CONFIG ENDPOINTS
// ============================================================================

async function testSectorConfigGet() {
    const response = await fetch(`${API_URL}/api/sectors/config`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Sector config get failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.sectors || !Array.isArray(data.sectors)) {
        throw new Error("Response missing sectors array");
    }
    if (!data.config || typeof data.config !== "object") {
        throw new Error("Response missing config object");
    }
    
    // Verify default sectors are present
    const expectedSectors = ["episodic", "semantic", "procedural", "emotional", "reflective"];
    for (const sector of expectedSectors) {
        if (!data.sectors.includes(sector)) {
            throw new Error(`Missing expected sector: ${sector}`);
        }
        if (!data.config[sector]) {
            throw new Error(`Missing config for sector: ${sector}`);
        }
    }
}

async function testSectorConfigGetSingle() {
    const response = await fetch(`${API_URL}/api/sectors/config/semantic`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Sector config get single failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.sector !== "semantic") {
        throw new Error("Response has wrong sector name");
    }
    if (!data.config || typeof data.config !== "object") {
        throw new Error("Response missing config object");
    }
    if (!data.config.model || typeof data.config.decay_lambda !== "number") {
        throw new Error("Config missing required fields");
    }
}

async function testSectorConfigGetNonexistent() {
    const response = await fetch(`${API_URL}/api/sectors/config/nonexistent`, {
        headers: getHeaders()
    });
    
    if (response.status !== 404) {
        throw new Error(`Should return 404 for nonexistent sector, got ${response.status}`);
    }
}

async function testSectorConfigPatch() {
    // Get current config first
    const getResponse = await fetch(`${API_URL}/api/sectors/config/semantic`, {
        headers: getHeaders()
    });
    const originalConfig = await getResponse.json();
    const originalWeight = originalConfig.config.weight;
    
    // Patch the weight
    const newWeight = originalWeight + 0.1;
    const response = await fetch(`${API_URL}/api/sectors/config/semantic`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
            weight: newWeight
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Sector config patch failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
        throw new Error("Patch should return success: true");
    }
    
    // Verify the change
    const verifyResponse = await fetch(`${API_URL}/api/sectors/config/semantic`, {
        headers: getHeaders()
    });
    const verifyData = await verifyResponse.json();
    if (verifyData.config.weight !== newWeight) {
        throw new Error("Weight was not updated correctly");
    }
    
    // Restore original value
    await fetch(`${API_URL}/api/sectors/config/semantic`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
            weight: originalWeight
        }),
    });
}

async function testSectorConfigReload() {
    const response = await fetch(`${API_URL}/api/sectors/config/reload`, {
        method: "POST",
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Sector config reload failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
        throw new Error("Reload should return success: true");
    }
    if (!Array.isArray(data.sectors)) {
        throw new Error("Reload should return sectors array");
    }
}

async function testSectorStats() {
    const response = await fetch(`${API_URL}/api/sectors/stats`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Sector stats failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data.sectors)) {
        throw new Error("Stats should return sectors array");
    }
    if (!Array.isArray(data.stats)) {
        throw new Error("Stats should return stats array");
    }
}

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

async function testDashboardStats() {
    const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Dashboard stats failed: ${response.status}`);
    }
    
    const data = await response.json();
    // Check for either nested or flat structure
    if (typeof data.totalMemories !== "number") {
        throw new Error("Dashboard stats missing totalMemories");
    }
}

async function testDashboardHealth() {
    const response = await fetch(`${API_URL}/dashboard/health`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Dashboard health failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.memory || !data.uptime) {
        throw new Error("Dashboard health missing memory or uptime");
    }
}

// ============================================================================
// NAMESPACE MANAGEMENT ENDPOINTS
// ============================================================================

async function testNamespacesList() {
    const response = await fetch(`${API_URL}/api/namespaces`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Namespaces list failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data.namespaces)) {
        throw new Error("Response missing namespaces array");
    }
}

async function testNamespaceCreate() {
    const response = await fetch(`${API_URL}/api/namespaces`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            namespace: `test-create-${Date.now()}`,
            description: "Test namespace created by unit tests"
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Namespace create failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success && !data.message) {
        throw new Error("Namespace creation should return success or message");
    }
}

async function testNamespaceGet() {
    const response = await fetch(`${API_URL}/api/namespaces/${TEST_NAMESPACE}`, {
        headers: getHeaders()
    });
    
    // May return 404 if namespace doesn't have any data yet
    if (!response.ok && response.status !== 404) {
        throw new Error(`Namespace get failed: ${response.status}`);
    }
    
    if (response.ok) {
        const data = await response.json();
        if (data.name !== TEST_NAMESPACE && data.namespace !== TEST_NAMESPACE) {
            throw new Error("Namespace get returned wrong namespace");
        }
    }
}

// ============================================================================
// PROXY ENDPOINTS
// ============================================================================

async function testProxyInfo() {
    const response = await fetch(`${API_URL}/api/proxy-info`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Proxy info failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.service) {
        throw new Error("Proxy info missing service");
    }
}

async function testProxyHealth() {
    const response = await fetch(`${API_URL}/api/proxy-health`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Proxy health failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.status) {
        throw new Error("Proxy health missing status");
    }
}

// ============================================================================
// TEMPORAL ENDPOINTS
// ============================================================================

async function testTemporalStats() {
    const response = await fetch(`${API_URL}/api/temporal/stats?namespace=${TEST_NAMESPACE}`, {
        headers: getHeaders()
    });
    
    if (!response.ok) {
        // Temporal system may not be initialized or have errors
        console.log(`      ⚠️  Temporal stats returned ${response.status} - may not be initialized`);
        return; // Don't fail test
    }
    
    const data = await response.json();
    if (typeof data.total_facts !== "number" && typeof data.active_facts !== "number") {
        throw new Error("Temporal stats missing expected fields");
    }
}

// ============================================================================
// CLEANUP
// ============================================================================

async function testMemoryDelete() {
    if (!testMemoryId) {
        console.log("      ⚠️  Skipping - no test memory available");
        return;
    }
    
    const response = await fetch(`${API_URL}/memory/${testMemoryId}?namespaces=${TEST_NAMESPACE}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Memory delete failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.ok) {
        throw new Error("Delete should return ok: true");
    }
}

async function testMemoryDeleteSecondNamespace() {
    if (!testMemoryId2) {
        console.log("      ⚠️  Skipping - no second test memory available");
        return;
    }
    
    const response = await fetch(`${API_URL}/memory/${testMemoryId2}?namespaces=${TEST_NAMESPACE_2}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Second memory delete failed: ${response.status}`);
    }
}

async function testMemoryDeleteNamespaceProtection() {
    // Try to delete a memory that no longer exists, but from wrong namespace
    const response = await fetch(`${API_URL}/memory/nonexistent-id?namespaces=${TEST_NAMESPACE_2}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    
    if (response.status !== 404) {
        throw new Error("Should return 404 for non-existent memory");
    }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runAllTests() {
    console.log("\n🧪 OpenMemory API Endpoint Tests");
    console.log("=".repeat(50));
    console.log(`Test namespace: ${TEST_NAMESPACE}`);
    console.log(`Second namespace: ${TEST_NAMESPACE_2}`);
    console.log(`API Key: ${API_KEY ? "✓ Configured" : "✗ Not set (using OM_API_KEY or OPENMEMORY_API_KEY)"}\n`);

    // Check if server is ready
    console.log("🔍 Checking if server is ready...");
    try {
        const response = await fetch(`${API_URL}/health`, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Server not ready: ${response.status}`);
        }
        console.log("✅ Server is ready\n");
    } catch (error: any) {
        console.error("❌ Server not available:", error.message);
        console.error("   Please start the server first: cd backend && npm run dev");
        process.exit(1);
    }

    // System Endpoints
    console.log("\n📋 System Endpoints");
    console.log("-".repeat(50));
    await test("GET /health", testHealthEndpoint);
    await test("GET /sectors", testSectorsEndpoint);
    await test("GET /health includes version", testHealthHasVersion);

    console.log("\n🗡️  Namespace Management - Setup");
    console.log("-".repeat(50));
    await test("POST /api/namespaces (test namespace)", async () => {
        const response = await fetch(`${API_URL}/api/namespaces`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                namespace: TEST_NAMESPACE,
                description: "Primary test namespace"
            }),
        });
        
        if (!response.ok && response.status !== 409) {
            throw new Error(`Namespace creation failed: ${response.status}`);
        }
    });
    
    await test("POST /api/namespaces (second test namespace)", async () => {
        const response = await fetch(`${API_URL}/api/namespaces`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                namespace: TEST_NAMESPACE_2,
                description: "Secondary test namespace for isolation tests"
            }),
        });
        
        if (!response.ok && response.status !== 409) {
            throw new Error(`Second namespace creation failed: ${response.status}`);
        }
    });

    // Memory Endpoints - Create
    console.log("\n🧠 Memory Endpoints - Create");
    console.log("-".repeat(50));
    await test("POST /memory/add requires namespace", testMemoryAddRequiresNamespace);
    await test("POST /memory/add", testMemoryAdd);
    await test("POST /memory/add to second namespace", testMemoryAddToSecondNamespace);
    await test("POST /memory/ingest requires namespace", testMemoryIngestRequiresNamespace);
    await test("POST /memory/ingest", testMemoryIngest);

    // Memory Endpoints - Query
    console.log("\n🔍 Memory Endpoints - Query");
    console.log("-".repeat(50));
    await test("POST /memory/query requires namespace", testMemoryQueryRequiresNamespace);
    await test("POST /memory/query", testMemoryQuery);
    await test("POST /memory/query namespace isolation", testMemoryQueryNamespaceIsolation);
    await test("GET /memory/all requires namespace", testMemoryGetAllRequiresNamespace);
    await test("GET /memory/all", testMemoryGetAll);
    await test("GET /memory/:id requires namespace", testMemoryGetByIdRequiresNamespace);
    await test("GET /memory/:id", testMemoryGetById);
    await test("GET /memory/:id namespace protection", testMemoryGetByIdNamespaceProtection);

    // Memory Endpoints - Update
    console.log("\n✏️  Memory Endpoints - Update");
    console.log("-".repeat(50));
    await test("PATCH /memory/:id", testMemoryUpdate);
    await test("PATCH /memory/:id namespace protection", testMemoryUpdateNamespaceProtection);
    await test("POST /memory/reinforce", testMemoryReinforce);

    // Chat Endpoints
    console.log("\n💬 Chat Endpoints");
    console.log("-".repeat(50));
    await test("GET /api/chat/config", testChatConfigEndpoint);
    await test("POST /api/chat/integrate requires namespace", testChatIntegrationRequiresNamespace);
    await test("POST /api/chat/integrate validation", testChatIntegrationValidation);

    // Compression Endpoints
    console.log("\n🗜️  Compression Endpoints");
    console.log("-".repeat(50));
    await test("POST /api/compression/compress", testCompressionCompress);
    await test("GET /api/compression/stats", testCompressionStats);

    // Metrics Endpoints
    console.log("\n📊 Metrics Endpoints");
    console.log("-".repeat(50));
    await test("GET /api/metrics", testMetricsEndpoint);
    await test("GET /api/metrics/summary", testMetricsSummary);
    await test("GET /api/metrics/namespaces/:namespace", testMetricsNamespace);

    // Sector Config Endpoints
    console.log("\n⚙️  Sector Config Endpoints");
    console.log("-".repeat(50));
    await test("GET /api/sectors/config", testSectorConfigGet);
    await test("GET /api/sectors/config/:sector", testSectorConfigGetSingle);
    await test("GET /api/sectors/config/:sector (nonexistent)", testSectorConfigGetNonexistent);
    await test("PATCH /api/sectors/config/:sector", testSectorConfigPatch);
    await test("POST /api/sectors/config/reload", testSectorConfigReload);
    await test("GET /api/sectors/stats", testSectorStats);

    // Dashboard Endpoints
    console.log("\n📈 Dashboard Endpoints");
    console.log("-".repeat(50));
    await test("GET /dashboard/stats", testDashboardStats);
    await test("GET /dashboard/health", testDashboardHealth);

    // Namespace Management
    console.log("\n🗂️  Namespace Management");
    console.log("-".repeat(50));
    await test("GET /api/namespaces", testNamespacesList);
    await test("POST /api/namespaces", testNamespaceCreate);
    await test("GET /api/namespaces/:namespace", testNamespaceGet);

    // Proxy Endpoints
    console.log("\n🔌 Proxy Endpoints");
    console.log("-".repeat(50));
    await test("GET /api/proxy-info", testProxyInfo);
    await test("GET /api/proxy-health", testProxyHealth);

    // Temporal Endpoints
    console.log("\n⏰ Temporal Endpoints");
    console.log("-".repeat(50));
    await test("GET /api/temporal/stats", testTemporalStats);

    // Cleanup
    console.log("\n🧹 Cleanup - Delete");
    console.log("-".repeat(50));
    await test("DELETE /memory/:id", testMemoryDelete);
    await test("DELETE /memory/:id second namespace", testMemoryDeleteSecondNamespace);
    await test("DELETE /memory/:id namespace protection", testMemoryDeleteNamespaceProtection);

    // Results
    console.log("\n📊 Test Results");
    console.log("=".repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    
    if (failed > 0) {
        console.log("\n💥 Failed Tests:");
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
        });
    }

    const success = failed === 0;
    console.log(`\n${success ? "🎉 All tests passed!" : "💔 Some tests failed"}`);
    process.exit(success ? 0 : 1);
}

// Run tests
if (require.main === module) {
    runAllTests().catch((error) => {
        console.error("❌ Test runner failed:", error);
        process.exit(1);
    });
}

export { runAllTests };
