# Quick Start: Running API Tests

## Overview
Comprehensive test suite for all OpenMemory API endpoints (39+ tests).

## Important: Server Configuration

⚠️ **The server must NOT be in proxy-only mode for tests to work!**

### Required Configuration

**1. Disable Proxy-Only Mode**

Make sure `OM_PROXY_ONLY_MODE` is set to `false` (or unset):

```bash
# In backend/.env file or environment
OM_PROXY_ONLY_MODE=false
```

**2. Configure Embeddings (Important!)**

For reliable test execution, use **synthetic embeddings** (no API keys required):

```bash
# In backend/.env file
OM_EMBEDDINGS=synthetic
OM_TIER=fast
```

Or as environment variables:
```bash
export OM_EMBEDDINGS=synthetic
export OM_TIER=fast
```

**Why synthetic embeddings?**
- No API keys required
- Fast and reliable
- Perfect for testing
- No external service dependencies

**Alternative configurations:**
- OpenAI: `OM_EMBEDDINGS=openai` (requires `OPENAI_API_KEY`)
- Ollama: `OM_EMBEDDINGS=ollama` (requires Ollama running locally)
- Gemini: `OM_EMBEDDINGS=gemini` (requires `GOOGLE_API_KEY`)

**3. Start Server**

```bash
# With recommended test configuration
OM_PROXY_ONLY_MODE=false OM_EMBEDDINGS=synthetic OM_TIER=fast npm run dev
```

Or update backend/.env and run:
```bash
npm run dev
```

**Why?** 
- Proxy-only mode disables standard API routes (memory, chat, etc.)
- Missing embedding config causes 500 errors on memory operations
- Synthetic embeddings are the most reliable for testing

## Prerequisites

1. **Database migrations must be run:**
   ```bash
   cd backend
   npm run migrate
   ```

2. **Server must be running** on port 3695 (or custom PORT) with standard API routes enabled.

### API Key Authentication

If your server requires API key authentication, set one of these environment variables:

```bash
# Option 1: Using OM_API_KEY
export OM_API_KEY="your-api-key-here"

# Option 2: Using OPENMEMORY_API_KEY
export OPENMEMORY_API_KEY="your-api-key-here"
```

Tests will automatically detect and use the API key if set.

## Run Tests

### Step 0: Run Database Migrations (First Time Only)

**For local development:**
```bash
cd backend
npm run migrate
```

**For Docker deployment:**
```bash
# Run migrations in the backend container
docker-compose exec openmemory npm run migrate

# Or using docker exec
docker exec -it openmemory-1 npm run migrate
```

**What this does:**
- Creates/updates database schema
- Adds namespace columns to temporal tables
- Creates required indexes

### Step 1: Start Server with Test Configuration
```bash
# Terminal 1
cd backend

# Option 1: Using environment variables (recommended)
OM_PROXY_ONLY_MODE=false OM_EMBEDDINGS=synthetic OM_TIER=fast npm run dev

# Option 2: Using .env file
# Edit backend/.env to include:
#   OM_PROXY_ONLY_MODE=false
#   OM_EMBEDDINGS=synthetic
#   OM_TIER=fast
# Then:
npm run dev
```

Wait for: `Server running on http://localhost:3695`

You should also see in logs:
```
Embeddings: synthetic
Tier: fast
```

### Step 2: Set API Key (if required)
```bash
# Terminal 2 - Set API key if server requires authentication
export OM_API_KEY="your-api-key-here"
```

### Step 3: Run Tests
```bash
# Terminal 2
cd backend
npm test
```

## What Tests Cover

✅ **System** - Health, sectors, version (3 tests)  
✅ **Memory CRUD** - Create, read, update, delete (20 tests)  
✅ **Namespace Isolation** - Data isolation & protection  
✅ **Chat** - Integration & validation (3 tests)  
✅ **Compression** - Text compression (2 tests)  
✅ **Metrics** - System & namespace metrics (3 tests)  
✅ **Dashboard** - Stats & health (2 tests)  
✅ **Namespaces** - Management (3 tests)  
✅ **Proxy** - Info & health (2 tests)  
✅ **Temporal** - Temporal facts (1 test)  

## Expected Output

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
...

📊 Test Results
==================================================
✅ Passed: 39/39
❌ Failed: 0/39

🎉 All tests passed!
```

## Troubleshooting

### Server Not Running
```
❌ Server not available: connect ECONNREFUSED
```
**Fix:** Start server first: `npm run dev`

### Port In Use
```bash
# Use different port
PORT=3696 npm run dev   # Terminal 1
PORT=3696 npm test      # Terminal 2
```

### Tests Fail
1. Check database is running
2. Check Qdrant is running (for vector ops)
3. Verify environment variables
4. Check server logs for errors

## Test Details

See full documentation:
- `API_TESTS.md` - Detailed test descriptions
- `TEST_SUMMARY.md` - Test coverage summary
- `README.md` - Overall test structure

## CI/CD

```yaml
- name: Test
  run: |
    cd backend
    npm run dev &
    sleep 10
    npm test
```

## Test Files

- `tests/api-endpoints.test.ts` - Main test suite (863 lines)
- Tests run with `tsx` (no Jest required)
- Uses fetch for real HTTP requests
- Automatic cleanup after tests

## Need Help?

1. Check server is running: `curl http://localhost:3695/health`
2. Check test file: `cat tests/api-endpoints.test.ts`
3. Review logs: Server terminal shows request logs
4. Read docs: `API_TESTS.md` has detailed troubleshooting
