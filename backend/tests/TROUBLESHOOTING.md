# Test Troubleshooting Guide

## Common Test Failures and Solutions

### Issue: "authentication_required" or 401 errors

**Symptoms:**
```
❌ POST /memory/add: Memory add failed: 401 - {"error":"authentication_required","message":"API key required"}
```

**Root Cause:** Server requires API key authentication but no API key was provided.

**Solutions:**

1. **Check if server requires authentication:**
   ```bash
   # Check server environment
   echo $OM_API_KEY
   ```

2. **Set API key for tests:**
   ```bash
   # Option 1: Export to current shell
   export OM_API_KEY="your-api-key-here"
   
   # Option 2: Alternative environment variable name
   export OPENMEMORY_API_KEY="your-api-key-here"
   
   # Option 3: One-liner with test command
   OM_API_KEY="your-api-key-here" npm test
   ```

3. **Disable authentication on server (for testing):**
   ```bash
   # Unset API key and restart server
   unset OM_API_KEY
   npm run dev
   ```

4. **Verify API key is detected:**
   When you run tests, you should see:
   ```
   API Key: ✓ Configured
   ```
   
   If you see:
   ```
   API Key: ✗ Not set (using OM_API_KEY or OPENMEMORY_API_KEY)
   ```
   Then the test suite couldn't find the API key.

5. **Test API key manually:**
   ```bash
   curl -X POST http://localhost:3695/memory/add \
     -H "Content-Type: application/json" \
     -H "x-api-key: your-api-key-here" \
     -d '{
       "content": "Test",
       "namespace": "test"
     }'
   ```

---

### Issue: "fetch failed" or Memory Operation 500 Errors

**Symptoms:**
```
❌ POST /memory/add: Memory add failed: 500 - {"err":"fetch failed"}
❌ POST /memory/add: Internal server error
❌ Memory operations returning 500 status codes
```

**Root Causes & Solutions:**

#### 1. Server Not Running
```bash
cd backend
npm run dev
```

Check server is accessible:
```bash
curl http://localhost:3695/health
```

#### 2. Embedding Generation Failures (Most Common)

The server requires embedding providers to be configured. For **testing**, use synthetic embeddings (no API keys required):

```bash
# In backend/.env
OM_EMBEDDINGS=synthetic
OM_TIER=fast

# Or as environment variables
export OM_EMBEDDINGS=synthetic
export OM_TIER=fast

# Restart server
npm run dev
```

**Why this works:** Synthetic embeddings generate local embeddings without requiring external services or API keys.

**Alternative configurations:**

**Using OpenAI:**
```bash
export OM_EMBEDDINGS=openai
export OPENAI_API_KEY=sk-your-key-here
export OM_TIER=smart
```

**Using Ollama (local):**
```bash
# Start Ollama first
ollama serve

# Configure server
export OM_EMBEDDINGS=ollama
export OM_TIER=hybrid
```

**Check current embedding config:**
Server logs on startup show: `"Embeddings: [provider]"` and `"Tier: [tier]"`

#### 3. Database Not Initialized
```bash
cd backend
npm run migrate
```

#### 4. Qdrant Not Running (if using Qdrant vectors)
```bash
docker-compose up -d qdrant
```

#### 4. Database Not Migrated

**Symptom:** Temporal stats errors: `SQLITE_ERROR: no such column: namespace`

**Solution:** Run database migrations:

```bash
cd backend
npm run migrate
```

For Docker deployments:
```bash
# Run migrations in the backend container
docker-compose exec openmemory npm run migrate

# Or docker exec
docker exec -it openmemory-1 npm run migrate
```

**What migrations do:**
- Add namespace column to temporal_facts table
- Add namespace column to temporal_edges table
- Create required indexes
- Update schema to latest version

#### 5. Check Server Logs

Server console shows detailed errors including:
- Embedding provider errors
- Database connection errors
- Network/fetch errors
- Stack traces for debugging

---

### Issue: Multiple 404 errors (version, namespace, metrics, etc.)

**Symptoms:**
```
❌ GET /version: Version endpoint failed: 404
❌ GET /api/namespaces/:namespace: Namespace get failed: 404
❌ GET /api/metrics/namespaces/:namespace: Namespace metrics failed: 404
```

**Root Cause:** Server is running in **proxy-only mode**, which disables standard API routes.

**Solution:**

1. **Check your environment variables:**
   ```bash
   # In backend/.env or root .env
   cat .env | grep PROXY_ONLY
   ```

2. **Disable proxy-only mode:**
   ```bash
   # Option 1: Update .env file
   OM_PROXY_ONLY_MODE=false

   # Option 2: Start server with flag
   OM_PROXY_ONLY_MODE=false npm run dev

   # Option 3: Unset the variable
   unset OM_PROXY_ONLY_MODE
   npm run dev
   ```

3. **Verify server is in standard mode:**
   ```bash
   curl http://localhost:3695/ | jq .
   ```
   
   Should see:
   ```json
   {
     "service": "OpenMemory",
     "mode": "standard",
     ...
   }
   ```
   
   NOT:
   ```json
   {
     "service": "OpenMemory MCP Proxy",
     "mode": "proxy-only",
     ...
   }
   ```

4. **Restart the server** after changing the environment variable.

---

### Issue: "Response missing compressed text" or compression errors

**Symptoms:**
```
❌ POST /api/compression/compress: Response missing compressed text
```

**Root Cause:** Compression is disabled or compression engine not initialized.

**Solutions:**
1. **Enable compression in environment:**
   ```bash
   OM_COMPRESSION_ENABLED=true npm run dev
   ```

2. **Check compression response structure:**
   The endpoint returns:
   ```json
   {
     "ok": true,
     "compressed": "...",
     "stats": { ... }
   }
   ```

---

### Issue: "Temporal stats failed: 400"

**Symptoms:**
```
❌ GET /api/temporal/stats: Temporal stats failed: 400
```

**Root Cause:** Temporal stats endpoint requires `namespace` parameter.

**Solution:** The test should already include namespace parameter. If still failing:

1. **Check if temporal tables exist:**
   ```bash
   # For SQLite
   sqlite3 backend/data/openmemory.sqlite "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'temporal%';"

   # For PostgreSQL
   psql -d openmemory -c "\dt temporal*"
   ```

2. **Run migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

---

### Issue: "Dashboard stats missing total_memories"

**Symptoms:**
```
❌ GET /dashboard/stats: Dashboard stats missing total_memories
```

**Root Cause:** Response structure uses nested `memories.total` instead of flat `total_memories`.

**Solution:** Tests have been updated. If still failing, check response structure:
```bash
curl http://localhost:3695/dashboard/stats | jq .
```

Expected structure:
```json
{
  "memories": {
    "total": 123,
    ...
  },
  ...
}
```

---

### Issue: Database connection errors

**Symptoms:**
```
❌ Various tests failing with database errors
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solutions:**

1. **Check database path exists:**
   ```bash
   ls -la backend/data/
   ```

2. **Check permissions:**
   ```bash
   chmod 755 backend/data
   chmod 644 backend/data/openmemory.sqlite
   ```

3. **Initialize database:**
   ```bash
   cd backend
   npm run migrate
   ```

4. **For PostgreSQL, check connection:**
   ```bash
   psql -h $OM_PG_HOST -p $OM_PG_PORT -U $OM_PG_USER -d $OM_PG_DB -c "SELECT 1;"
   ```

---

### Issue: Qdrant connection errors

**Symptoms:**
```
❌ Memory operations failing with vector store errors
```

**Solutions:**

1. **Start Qdrant:**
   ```bash
   # Using Docker
   docker run -p 6333:6333 qdrant/qdrant:latest

   # Or use docker-compose
   docker-compose up qdrant
   ```

2. **Check Qdrant is accessible:**
   ```bash
   curl http://localhost:6333/health
   ```

3. **Check Qdrant URL in config:**
   ```bash
   echo $OM_QDRANT_URL
   # Should be: http://localhost:6333 (or http://qdrant:6333 in Docker)
   ```

4. **Use SQLite vector backend instead:**
   ```bash
   OM_VECTOR_BACKEND=sqlite npm run dev
   ```

---

### Issue: Embedding generation errors

**Symptoms:**
```
❌ Memory add operations timing out or failing
```

**Solutions:**

1. **Check embedding provider:**
   ```bash
   echo $OM_EMBEDDINGS
   # Options: synthetic, openai, ollama, gemini
   ```

2. **For OpenAI:**
   ```bash
   echo $OPENAI_API_KEY
   # Make sure API key is set
   ```

3. **For Ollama:**
   ```bash
   # Check Ollama is running
   curl http://localhost:11434/api/tags
   ```

4. **Use synthetic embeddings for testing:**
   ```bash
   OM_EMBEDDINGS=synthetic npm run dev
   ```

---

### Issue: Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3695
```

**Solutions:**

1. **Find process using port:**
   ```bash
   lsof -i :3695
   ```

2. **Kill the process:**
   ```bash
   kill -9 <PID>
   ```

3. **Use different port:**
   ```bash
   PORT=3696 npm run dev   # Terminal 1
   PORT=3696 npm test      # Terminal 2
   ```

---

### Issue: Tests pass but server shows errors

**Symptoms:** Tests complete successfully but server logs show errors.

**Solution:** This is often due to:
1. **Expected 404 errors** - Tests verify 404 responses work correctly
2. **Expected 400 errors** - Tests verify validation works
3. **Expected 403 errors** - Tests verify namespace protection works

These are **normal** and indicate the tests are working correctly.

---

## Environment Variables Checklist

For tests to work, ensure these are set correctly:

```bash
# Core Configuration
OM_PORT=3695                    # Or your custom port
OM_PROXY_ONLY_MODE=false        # MUST BE FALSE for tests
OM_API_KEY=your-key-here        # If server requires authentication

# Database
OM_METADATA_BACKEND=sqlite      # or postgresql
OM_DB_PATH=/path/to/db.sqlite

# Vector Storage
OM_VECTOR_BACKEND=sqlite        # or qdrant
# OM_QDRANT_URL=http://localhost:6333  # If using qdrant

# Embeddings (optional for testing)
OM_EMBEDDINGS=synthetic         # Fast, no API keys needed
# OPENAI_API_KEY=sk-...         # If using OpenAI
# OM_OLLAMA_URL=http://localhost:11434  # If using Ollama
```

### For Running Tests

If server requires authentication:
```bash
# Set in test environment
export OM_API_KEY="your-api-key-here"
# or
export OPENMEMORY_API_KEY="your-api-key-here"
```

---

## Complete Test Run Checklist

Before running tests:

- [ ] Server is installed: `npm install` in backend directory
- [ ] Database is initialized: `npm run migrate`
- [ ] Environment variables are set correctly
- [ ] `OM_PROXY_ONLY_MODE=false` or unset
- [ ] Qdrant is running (if using qdrant backend)
- [ ] Server starts successfully: `npm run dev`
- [ ] Health check passes: `curl http://localhost:3695/health`
- [ ] Run tests: `npm test`

---

## Debugging Individual Tests

To debug a specific test:

1. **Check the endpoint manually:**
   ```bash
   # Example: Test memory add
   curl -X POST http://localhost:3695/memory/add \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Test memory",
       "namespace": "test-debug"
     }'
   ```

2. **Check server logs** in the terminal running `npm run dev`

3. **Enable debug logging:**
   ```bash
   OM_LOG_AUTH=true npm run dev
   ```

4. **Test with verbose output:**
   ```bash
   npm test 2>&1 | tee test-output.log
   ```

---

## Getting Help

If tests still fail after trying these solutions:

1. **Capture full error output:**
   ```bash
   npm test > test-results.txt 2>&1
   ```

2. **Capture server logs:**
   ```bash
   npm run dev > server-logs.txt 2>&1
   ```

3. **Check server configuration:**
   ```bash
   curl http://localhost:3695/ | jq . > server-info.json
   ```

4. **Share the files above when asking for help**

---

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|--------|
| 401 authentication errors | Set API key: `export OM_API_KEY="your-key"` |
| fetch failed | Start server: `npm run dev` |
| 404 errors | Set `OM_PROXY_ONLY_MODE=false` |
| Port in use | Use different port: `PORT=3696` |
| DB errors | Run migrations: `npm run migrate` |
| Qdrant errors | Use SQLite: `OM_VECTOR_BACKEND=sqlite` |
| Slow tests | Use synthetic embeddings: `OM_EMBEDDINGS=synthetic` |

---

## Test Environment Template

Create a `.env.test` file for testing:

```bash
# .env.test - Optimal settings for running tests
OM_PORT=3695
OM_PROXY_ONLY_MODE=false
OM_API_KEY=your-test-api-key-here
OM_METADATA_BACKEND=sqlite
OM_DB_PATH=./data/openmemory.sqlite
OM_VECTOR_BACKEND=sqlite
OM_EMBEDDINGS=synthetic
OM_VEC_DIM=256
OM_MODE=standard
OM_TIER=hybrid
OM_COMPRESSION_ENABLED=true
```

Then run tests with:
```bash
cp .env.test .env
npm run dev &
sleep 5
# Make sure to export API key for tests
export OM_API_KEY="your-test-api-key-here"
npm test
```
