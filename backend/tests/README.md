# OpenMemory Tests

This directory contains all tests for the OpenMemory backend.

## 📚 Documentation Index

### 🚀 Quick Start
- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
- **[setup-test-env.sh](setup-test-env.sh)** - Automated setup script
- **[SUMMARY.md](SUMMARY.md)** - Current status & quick fixes ⭐ **START HERE**

### 📊 Status & Results  
- **[TEST_RESULTS.md](TEST_RESULTS.md)** - Detailed test results (33/40 passing)
- **[ROOT_CAUSE_ANALYSIS.md](ROOT_CAUSE_ANALYSIS.md)** - Technical deep dive

### 🔧 Troubleshooting
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues & solutions

### 📖 Reference
- **[API_TESTS.md](API_TESTS.md)** - Complete test descriptions
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - One-page cheat sheet
- **[API_KEY_CHANGES.md](API_KEY_CHANGES.md)** - Authentication details

---

## 🚨 Action Required

**Current Status:** 33/40 tests passing (82.5%)

**Two issues blocking remaining tests:**

### Issue 1: Database Migrations Not Run
```bash
docker exec <container-name> npm run migrate
```

### Issue 2: Embeddings Not Configured  
Add to `docker-compose.yml`:
```yaml
environment:
  - OM_EMBEDDINGS=synthetic
  - OM_TIER=fast
```

**See [SUMMARY.md](SUMMARY.md) for complete fix instructions.**

---

## Test Types

### 1. API Endpoint Tests
**File:** `api-endpoints.test.ts`

Comprehensive tests for all API endpoints covering:
- System endpoints (health, sectors, version)
- Memory operations (CRUD, query, ingest, reinforce)
- Chat integration
- Compression
- Metrics & monitoring
- Dashboard
- Namespace management
- Proxy endpoints
- Temporal facts

**Run:** `npm test`

### 2. Repository Pattern Tests
- `QdrantVectorRepository.test.ts` - Unit tests for Qdrant backend
- `SQLiteVectorRepository.test.ts` - Unit tests for SQLite backend
- `VectorRepositoryFactory.test.ts` - Factory pattern tests

### 3. Integration Tests
- `integration/` - End-to-end integration tests

## Running Tests

### Quick Start

```bash
# Start the server (in one terminal)
cd backend
npm run dev

# Set API key if required (in another terminal)
export OM_API_KEY="your-api-key-here"

# Run all API tests
cd backend
npm test
```

### API Endpoint Tests

```bash
# Run comprehensive API test suite
npm test

# Or directly with tsx
npx tsx tests/api-endpoints.test.ts
```

**Test Coverage:** 39+ tests covering:
- ✅ All memory CRUD operations
- ✅ Namespace isolation and protection
- ✅ Error handling (400, 403, 404)
- ✅ System and monitoring endpoints
- ✅ Chat, compression, metrics endpoints

### API Authentication

If your OpenMemory server requires API key authentication (configured via `OM_API_KEY` in server environment), you must provide the API key for tests:

```bash
# Set API key before running tests
export OM_API_KEY="your-api-key-here"
# or
export OPENMEMORY_API_KEY="your-api-key-here"

# Then run tests
npm test
```

The test suite will:
- Automatically detect the API key from `OM_API_KEY` or `OPENMEMORY_API_KEY` environment variables
- Include it in the `x-api-key` header for all requests
- Show API key status when tests start

If API key is not set and server requires it, you'll see authentication errors:
```
❌ POST /memory/add: Memory add failed: 401 - {"error":"authentication_required"}
```

### Repository Tests

### Prerequisites

1. Install test dependencies:
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest
```

2. For Qdrant tests, start Qdrant server:
```bash
docker run -p 6333:6333 qdrant/qdrant:v1.7.4
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test QdrantVectorRepository.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Configuration

### API Tests
- Uses custom test runner with `tsx`
- No Jest dependency required
- Simple async/await pattern with fetch
- Real HTTP requests to running server
- Automatic namespace isolation
- Cleanup after execution

### Repository Tests
Tests use Jest with TypeScript support. Configuration in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

## Manual Testing

You can also manually test the repositories using the integration example:

```bash
tsx src/repositories/integration-example.ts
```

## Test Coverage Goals

- Line coverage: >85%
- Branch coverage: >85%
- Function coverage: >85%

## CI/CD Integration

Tests are automatically run in GitHub Actions on:
- Pull requests
- Commits to main branch
- Release builds

See `.github/workflows/test.yml` for CI configuration.
