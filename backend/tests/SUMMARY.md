# Backend Test Issues - Summary & Action Items

## Issues Found

### 1. Temporal API Error - `SQLITE_ERROR: no such column: namespace`

**Logs show:**
```
[TEMPORAL API] Error getting stats: [Error: SQLITE_ERROR: no such column: namespace]
  errno: 1,
  code: 'SQLITE_ERROR'
```

**Root cause:** Database migrations haven't been run. Migration 006 adds namespace column to temporal_facts table.

**Fix:** Run migrations in your Docker container:
```bash
# Find container name
docker ps

# Run migrations (adjust container name as needed)
docker exec openmemory-1 npm run migrate

# Or via docker-compose
docker-compose exec openmemory npm run migrate
```

### 2. Memory Operations Failing - "fetch failed"

**Logs show:**
```
[EMBED] Advanced mode (1 calls)
❌ POST /memory/add: Memory add failed: 500 - {"err":"fetch failed"}
```

**Root cause:** Server is trying to use an embedding provider (likely OpenAI or Gemini) without API keys configured.

**Fix:** Configure server to use synthetic embeddings (no API keys needed):

**Option 1 - Environment variables:**
```bash
# Add to your docker-compose.yml environment section:
environment:
  - OM_EMBEDDINGS=synthetic
  - OM_TIER=fast
```

**Option 2 - .env file:**
```bash
# Add to backend/.env:
OM_EMBEDDINGS=synthetic
OM_TIER=fast
```

Then restart the container:
```bash
docker-compose restart openmemory
```

### 3. Qdrant Warnings (Non-blocking)

**Logs show:**
```
Api key is used with unsecure connection.
Failed to obtain server version. Unable to check client-server compatibility.
[Qdrant] Creating collection 'openmemory_vectors_test-xxx' for namespace isolation
```

**Impact:** These are warnings, not errors. Tests still work but:
- Using insecure connection (HTTP instead of HTTPS)
- Version check failing (connection issue)

**Fix (optional):**
- Use `OM_VECTOR_STORAGE=sqlite` for testing (simpler, no Qdrant needed)
- Or ensure Qdrant is running: `docker-compose up -d qdrant`

---

## Action Plan

### Step 1: Run Migrations (Required)

```bash
# For Docker deployment
docker exec <your-container-name> npm run migrate

# Or via docker-compose
docker-compose exec openmemory npm run migrate
```

**Verify it worked:**
```bash
docker logs <container-name> | grep MIGRATE
# Should see: [MIGRATE] Migration complete
```

### Step 2: Configure Synthetic Embeddings (Required)

**Edit docker-compose.yml:**
```yaml
services:
  openmemory:
    environment:
      - OM_EMBEDDINGS=synthetic
      - OM_TIER=fast
      - OM_PROXY_ONLY_MODE=false
      - OM_VECTOR_STORAGE=sqlite  # Optional: simplifies testing
```

**Restart container:**
```bash
docker-compose restart openmemory
```

### Step 3: Run Tests Again

```bash
cd backend
npm test
```

**Expected result:**
- 38-40 out of 40 tests passing (95-100%)
- No more "fetch failed" errors
- No more namespace column errors

---

## Alternative: Use Setup Script (Local Development)

If running locally (not Docker):

```bash
cd backend/tests
./setup-test-env.sh
```

This automates:
1. Running migrations
2. Creating/checking .env configuration
3. Starting server with test-friendly settings

---

## Quick Reference

### Embedding Providers

| Provider  | For Testing | For Production | Requires |
|-----------|------------|----------------|----------|
| synthetic | ✅ Best    | ❌ No          | Nothing  |
| openai    | ❌ No      | ✅ Best        | API key  |
| gemini    | ❌ No      | ✅ Good        | API key  |
| ollama    | ⚠️ Maybe   | ✅ Good        | Service  |

### Environment Variables for Testing

```bash
OM_EMBEDDINGS=synthetic        # Use fast, local embeddings
OM_TIER=fast                   # Use fastest embedding mode
OM_PROXY_ONLY_MODE=false       # Enable full API (not just MCP proxy)
OM_VECTOR_STORAGE=sqlite       # Use SQLite for vectors (simpler than Qdrant)
OM_METADATA_BACKEND=sqlite     # Use SQLite for metadata
```

### Migration Commands

```bash
# Local
cd backend && npm run migrate

# Docker
docker exec <container> npm run migrate
docker-compose exec openmemory npm run migrate

# Check if migrations ran
docker logs <container> | grep "temporal_facts"
# Should show table created with namespace column
```

---

## Documentation Created

1. **ROOT_CAUSE_ANALYSIS.md** - Detailed technical analysis
2. **TROUBLESHOOTING.md** - Updated with migration steps
3. **QUICKSTART.md** - Updated with migration prerequisites
4. **TEST_RESULTS.md** - Updated with current status
5. **SUMMARY.md** - This quick reference
6. **setup-test-env.sh** - Automated setup script

---

## Current Test Status

**Before fixes:** 33/40 passing (82.5%)

**After migration + embedding fixes:** Expected 38-40/40 passing (95-100%)

**Main blockers:**
1. ❌ Migrations not run → Temporal API errors
2. ❌ Embeddings not configured → Memory operations fail

**Once fixed, remaining issues (minor):**
- Compression endpoint response format
- Dashboard stats response format

These are non-critical and tests handle them gracefully (warnings, not failures).

---

## Need Help?

1. Check logs: `docker logs <container-name>`
2. Verify migrations: `docker exec <container> npm run migrate`
3. Check environment: `docker exec <container> env | grep OM_`
4. Review docs: `backend/tests/ROOT_CAUSE_ANALYSIS.md`

---

**Next Steps:**
1. Run migrations in your Docker container
2. Add `OM_EMBEDDINGS=synthetic` and `OM_TIER=fast` to environment
3. Restart container
4. Run tests again
5. Should see 95%+ pass rate! 🎉
