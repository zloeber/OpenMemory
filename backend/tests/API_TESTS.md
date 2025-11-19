# API Endpoint Tests - Detailed Documentation

## Overview

Comprehensive test suite for all OpenMemory API endpoints with focus on namespace-based isolation.

## Test Statistics

- **Total Tests:** 39+
- **Coverage:** All major API routes
- **Test Framework:** Custom tsx-based runner (no Jest required)
- **Test Pattern:** Async/await with fetch
- **Isolation:** Namespace-based per test run

## Test Categories

### 1. System Endpoints (3 tests)

#### GET /health
Tests server health check endpoint.

**Validates:**
- Response status 200
- Response contains `ok: true`

**Example:**
```typescript
const response = await fetch(`${API_URL}/health`);
const data = await response.json();
// data = { ok: true, ... }
```

#### GET /sectors
Tests memory sector retrieval.

**Validates:**
- Response status 200
- Returns array of sectors
- Contains expected sectors: episodic, semantic, procedural, emotional, reflective

**Example:**
```typescript
const response = await fetch(`${API_URL}/sectors`);
const data = await response.json();
// data = { sectors: ["episodic", "semantic", ...] }
```

#### GET /version
Tests API version endpoint.

**Validates:**
- Response status 200
- Contains version field

---

### 2. Memory Endpoints (20 tests)

#### POST /memory/add - Namespace Requirement
Tests that memory creation requires namespace parameter.

**Validates:**
- Returns 400 status without namespace
- Error message mentions namespace requirement

**Example:**
```typescript
// Should fail
const response = await fetch(`${API_URL}/memory/add`, {
    method: "POST",
    body: JSON.stringify({ content: "test" })
});
// response.status === 400
```

#### POST /memory/add - Success
Tests successful memory creation with namespace.

**Validates:**
- Response status 200
- Returns memory ID
- Returns primary_sector
- Returns sectors array
- Stores test memory ID for subsequent tests

**Example:**
```typescript
const response = await fetch(`${API_URL}/memory/add`, {
    method: "POST",
    body: JSON.stringify({
        content: "Test memory",
        namespace: "test-123",
        tags: ["test"],
        metadata: { test: true }
    })
});
const data = await response.json();
// data = { id: "uuid", primary_sector: "episodic", sectors: [...] }
```

#### POST /memory/add - Second Namespace
Creates memory in different namespace for isolation testing.

**Validates:**
- Can create memory in second namespace
- Returns memory ID
- Stores second memory ID for isolation tests

#### POST /memory/query - Namespace Requirement
Tests that query requires namespace parameter.

**Validates:**
- Returns 400 without namespace
- Error message indicates missing namespace

#### POST /memory/query - Success
Tests semantic search functionality.

**Validates:**
- Response status 200
- Returns query field
- Returns matches array
- Works with namespace parameter

**Example:**
```typescript
const response = await fetch(`${API_URL}/memory/query`, {
    method: "POST",
    body: JSON.stringify({
        query: "test memory",
        namespace: "test-123",
        k: 5
    })
});
const data = await response.json();
// data = { query: "test memory", matches: [...] }
```

#### POST /memory/query - Namespace Isolation
Tests that queries only return results from specified namespace.

**Validates:**
- Memory found in its own namespace
- Memory NOT found when querying different namespace
- Namespace isolation is enforced

**Test Flow:**
1. Query namespace A for memory created in namespace A → Found ✓
2. Query namespace B for memory created in namespace A → Not Found ✓

#### GET /memory/all - Namespace Requirement
Tests that listing memories requires namespace.

**Validates:**
- Returns 400 without namespace parameter
- Error message indicates requirement

#### GET /memory/all - Success
Tests listing all memories in namespace.

**Validates:**
- Response status 200
- Returns items array
- Test memory is included in results
- Only returns memories from specified namespace

**Example:**
```typescript
const response = await fetch(
    `${API_URL}/memory/all?namespace=test-123&l=100`
);
const data = await response.json();
// data = { items: [...], total: N }
```

#### GET /memory/:id - Namespace Requirement
Tests that retrieving specific memory requires namespace.

**Validates:**
- Returns 400 without namespace parameter

#### GET /memory/:id - Success
Tests retrieving memory by ID.

**Validates:**
- Response status 200
- Returned ID matches requested ID
- Memory has content field
- Namespace parameter works correctly

**Example:**
```typescript
const response = await fetch(
    `${API_URL}/memory/${memoryId}?namespace=test-123`
);
const data = await response.json();
// data = { id: "uuid", content: "...", ... }
```

#### GET /memory/:id - Namespace Protection
Tests that memories cannot be accessed from wrong namespace.

**Validates:**
- Returns 403 when namespace doesn't match memory's namespace
- Cross-namespace access is blocked

**Test Flow:**
1. Create memory in namespace A
2. Try to access memory with namespace B → 403 Forbidden ✓

#### PATCH /memory/:id - Success
Tests updating memory content and metadata.

**Validates:**
- Response status 200
- Returns updated: true
- Content and metadata can be updated
- Tags can be modified

**Example:**
```typescript
const response = await fetch(`${API_URL}/memory/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify({
        content: "Updated content",
        namespace: "test-123",
        tags: ["updated"],
        metadata: { updated: true }
    })
});
const data = await response.json();
// data = { updated: true }
```

#### PATCH /memory/:id - Namespace Protection
Tests that memories cannot be updated from wrong namespace.

**Validates:**
- Returns 403 when trying to update with wrong namespace
- Update protection enforced

#### POST /memory/reinforce
Tests memory reinforcement (strength boost).

**Validates:**
- Response status 200
- Returns ok: true
- Memory strength can be increased

**Example:**
```typescript
const response = await fetch(`${API_URL}/memory/reinforce`, {
    method: "POST",
    body: JSON.stringify({
        id: memoryId,
        boost: 0.1
    })
});
const data = await response.json();
// data = { ok: true }
```

#### POST /memory/ingest - Namespace Requirement
Tests that document ingestion requires namespace.

**Validates:**
- Returns 400 without namespace
- Error indicates missing namespace

#### POST /memory/ingest - Success
Tests document ingestion with automatic chunking.

**Validates:**
- Response status 200
- Returns root_id for document
- Returns chunk_ids array
- Creates multiple memories from chunks
- Metadata is preserved

**Example:**
```typescript
const response = await fetch(`${API_URL}/memory/ingest`, {
    method: "POST",
    body: JSON.stringify({
        content_type: "txt",
        data: "Long document with multiple sentences...",
        namespace: "test-123",
        metadata: { source: "test" }
    })
});
const data = await response.json();
// data = { root_id: "uuid", chunk_ids: ["uuid1", "uuid2", ...] }
```

#### DELETE /memory/:id - Success
Tests memory deletion.

**Validates:**
- Response status 200
- Returns ok: true
- Memory is deleted from database
- Memory removed from vector store

**Example:**
```typescript
const response = await fetch(
    `${API_URL}/memory/${memoryId}?namespace=test-123`,
    { method: "DELETE" }
);
const data = await response.json();
// data = { ok: true }
```

#### DELETE /memory/:id - Second Namespace
Tests deleting memory from second namespace (cleanup).

**Validates:**
- Can delete memory from its own namespace
- Cleanup works correctly

#### DELETE /memory/:id - Namespace Protection
Tests deletion protection across namespaces.

**Validates:**
- Returns 404 for non-existent memory
- Cannot delete memories from wrong namespace

---

### 3. Chat Endpoints (3 tests)

#### GET /api/chat/config
Tests chat configuration retrieval.

**Validates:**
- Response status 200
- Returns provider field
- Returns model field
- Configuration is accessible

**Example:**
```typescript
const response = await fetch(`${API_URL}/api/chat/config`);
const data = await response.json();
// data = { provider: "openai", model: "gpt-4", ... }
```

#### POST /api/chat/integrate - Namespace Requirement
Tests that chat integration requires namespace.

**Validates:**
- Returns 400 without namespace
- Error indicates missing namespace

#### POST /api/chat/integrate - Validation
Tests chat integration input validation.

**Validates:**
- Returns 400 for missing messages
- Returns 400 for empty messages array
- Proper validation error messages

**Test Cases:**
```typescript
// Missing messages
{ namespace: "test-123" } → 400

// Empty messages
{ namespace: "test-123", messages: [] } → 400

// Valid request
{
    namespace: "test-123",
    messages: [
        { role: "user", content: "Hello" }
    ]
} → 200
```

---

### 4. Compression Endpoints (2 tests)

#### POST /api/compression/compress
Tests text compression functionality.

**Validates:**
- Response status 200
- Returns compressed text
- Compression works on code samples

**Example:**
```typescript
const response = await fetch(`${API_URL}/api/compression/compress`, {
    method: "POST",
    body: JSON.stringify({
        text: "function processData(data) { return data.map(x => x); }"
    })
});
const data = await response.json();
// data = { compressed: "shortened text...", ratio: 0.7 }
```

#### GET /api/compression/stats
Tests compression statistics endpoint.

**Validates:**
- Response status 200
- Returns totalRequests count
- Statistics tracking works

---

### 5. Metrics Endpoints (3 tests)

#### GET /api/metrics
Tests overall system metrics.

**Validates:**
- Response status 200
- Returns total_memories count
- Metrics calculation works

**Example:**
```typescript
const response = await fetch(`${API_URL}/api/metrics`);
const data = await response.json();
// data = { total_memories: N, total_namespaces: M, ... }
```

#### GET /api/metrics/summary
Tests metrics summary endpoint.

**Validates:**
- Response status 200
- Returns top_namespaces array
- Summary aggregation works

#### GET /api/metrics/namespaces/:namespace
Tests namespace-specific metrics.

**Validates:**
- Response status 200
- Returned namespace matches requested
- Per-namespace metrics available

**Example:**
```typescript
const response = await fetch(
    `${API_URL}/api/metrics/namespaces/test-123`
);
const data = await response.json();
// data = { namespace: "test-123", memory_count: N, ... }
```

---

### 6. Dashboard Endpoints (2 tests)

#### GET /dashboard/stats
Tests dashboard statistics.

**Validates:**
- Response status 200
- Returns total_memories
- Dashboard data available

#### GET /dashboard/health
Tests dashboard health check.

**Validates:**
- Response status 200
- Returns status field
- Health monitoring works

---

### 7. Namespace Management (3 tests)

#### GET /api/namespaces
Tests listing all namespaces.

**Validates:**
- Response status 200
- Returns namespaces array
- List includes test namespaces

#### POST /api/namespaces
Tests namespace creation.

**Validates:**
- Response status 200
- Returns ok: true
- Namespace is created
- Description is stored

**Example:**
```typescript
const response = await fetch(`${API_URL}/api/namespaces`, {
    method: "POST",
    body: JSON.stringify({
        namespace: "new-namespace",
        description: "Test namespace"
    })
});
const data = await response.json();
// data = { ok: true }
```

#### GET /api/namespaces/:namespace
Tests retrieving namespace details.

**Validates:**
- Response status 200
- Returned namespace matches requested
- Namespace details available

---

### 8. Proxy Endpoints (2 tests)

#### GET /api/proxy-info
Tests proxy information endpoint.

**Validates:**
- Response status 200
- Returns name field
- Proxy info accessible

#### GET /api/proxy-health
Tests proxy health check.

**Validates:**
- Response status 200
- Returns status field
- Proxy monitoring works

---

### 9. Temporal Endpoints (1 test)

#### GET /api/temporal/stats
Tests temporal facts statistics.

**Validates:**
- Response status 200
- Returns total_facts count
- Temporal tracking works

---

## Test Execution Flow

### 1. Server Ready Check
```typescript
// Verify server is running before tests
const response = await fetch(`${API_URL}/health`);
if (!response.ok) {
    console.error("Server not available");
    process.exit(1);
}
```

### 2. Namespace Creation
```typescript
const TEST_NAMESPACE = `test-${Date.now()}`;
const TEST_NAMESPACE_2 = `test-alt-${Date.now()}`;
```

### 3. Test Execution
Tests run in logical order:
1. System health checks
2. Memory creation
3. Memory queries
4. Memory updates
5. Other endpoints
6. Memory deletion (cleanup)

### 4. Results Collection
```typescript
const results: TestResult[] = [];

await test("Test name", async () => {
    // Test logic
    if (!condition) {
        throw new Error("Test failed");
    }
});

// Results tracked automatically
```

### 5. Summary Report
```
📊 Test Results
==================================================
✅ Passed: 37/39
❌ Failed: 2/39

💥 Failed Tests:
   - Test name: Error message
```

---

## Namespace Isolation Architecture

### Design Principles

1. **Namespace-First:** Every memory operation requires namespace
2. **Data Isolation:** Namespaces cannot access each other's data
3. **Protection:** Cross-namespace operations return 403
4. **Validation:** Missing namespace returns 400

### Test Validation

#### Requirement Tests
Ensure namespace parameter is required:
```typescript
// Without namespace → 400
await fetch(`${API_URL}/memory/add`, {
    body: JSON.stringify({ content: "test" })
});
// Expected: 400 Bad Request
```

#### Isolation Tests
Ensure data is isolated by namespace:
```typescript
// Create in namespace A
POST /memory/add { namespace: "A", content: "test" }

// Query from namespace B
POST /memory/query { namespace: "B", query: "test" }
// Expected: Empty results (not found)
```

#### Protection Tests
Ensure cross-namespace access is blocked:
```typescript
// Create in namespace A, ID = abc123
POST /memory/add { namespace: "A", content: "test" }

// Try to access from namespace B
GET /memory/abc123?namespace=B
// Expected: 403 Forbidden
```

---

## Running Tests

### Prerequisites
```bash
# Start server
cd backend
npm run dev
```

### Execute Tests
```bash
# Run all tests
npm test

# Or directly
npx tsx tests/api-endpoints.test.ts
```

### Expected Output
```
🧪 OpenMemory API Endpoint Tests
==================================================
Test namespace: test-1234567890
Second namespace: test-alt-1234567890

🔍 Checking if server is ready...
✅ Server is ready

📋 System Endpoints
--------------------------------------------------
✓ GET /health
✓ GET /sectors
✓ GET /version

🧠 Memory Endpoints - Create
--------------------------------------------------
✓ POST /memory/add requires namespace
✓ POST /memory/add
✓ POST /memory/add to second namespace
✓ POST /memory/ingest requires namespace
✓ POST /memory/ingest

[... more test output ...]

📊 Test Results
==================================================
✅ Passed: 39/39
❌ Failed: 0/39

🎉 All tests passed!
```

---

## Troubleshooting

### Server Not Running
```
❌ Server not available: connect ECONNREFUSED
   Please start the server first: cd backend && npm run dev
```

**Solution:** Start server before running tests.

### Port Conflicts
```bash
# Change server port
PORT=3696 npm run dev

# Change test port
PORT=3696 npm test
```

### Test Failures

**Check:**
1. Database is running (PostgreSQL or SQLite)
2. Qdrant is running (for vector operations)
3. Environment variables are set correctly
4. No stale test data interfering

### Cleanup Test Data
```sql
-- PostgreSQL / SQLite
DELETE FROM openmemory_facts WHERE user_id LIKE 'test-%';
```

---

## Adding New Tests

### 1. Create Test Function
```typescript
async function testNewFeature() {
    const response = await fetch(`${API_URL}/new-endpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            namespace: TEST_NAMESPACE,
            data: "test"
        })
    });
    
    if (!response.ok) {
        throw new Error(`Test failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.expectedField) {
        throw new Error("Missing expected field");
    }
}
```

### 2. Add to Runner
```typescript
console.log("\n🆕 New Feature Tests");
console.log("-".repeat(50));
await test("POST /new-endpoint", testNewFeature);
```

### 3. Update Documentation
- Add test description to this file
- Update test count
- Document validation rules

---

## Best Practices

### Test Independence
- Each test should work standalone
- No dependencies between tests
- Cleanup after execution

### Clear Assertions
```typescript
// ❌ Bad
if (!data) throw new Error("Failed");

// ✅ Good
if (!data.id) throw new Error("Response missing memory ID");
```

### Namespace Usage
```typescript
// ❌ Bad - shared namespace
const namespace = "test";

// ✅ Good - unique per run
const namespace = `test-${Date.now()}`;
```

### Error Handling
```typescript
// Test both success and failure
await test("Success case", testSuccess);
await test("Missing param case", testMissingParam);
await test("Invalid param case", testInvalidParam);
```

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      
      qdrant:
        image: qdrant/qdrant:v1.7.4
        ports:
          - 6333:6333
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Start server
        run: |
          cd backend
          npm run dev &
          sleep 10
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/openmemory
          QDRANT_URL: http://localhost:6333
      
      - name: Run tests
        run: |
          cd backend
          npm test
```

---

## Future Enhancements

### Planned Test Additions

1. **Performance Tests**
   - Load testing
   - Query performance benchmarks
   - Concurrent request handling

2. **Integration Tests**
   - Multi-service workflows
   - External API integration
   - Database migration testing

3. **Security Tests**
   - Authentication validation
   - Authorization enforcement
   - Input sanitization

4. **Temporal Tests**
   - Full temporal fact CRUD
   - Temporal queries
   - Fact updates and relationships

### Test Coverage Goals

- Current: 39 tests, ~60% endpoint coverage
- Goal: 60+ tests, 90%+ endpoint coverage
- Target: All endpoints with success + error cases
