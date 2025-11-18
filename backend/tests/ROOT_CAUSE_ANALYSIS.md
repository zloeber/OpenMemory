# Backend Test Failures - Root Cause Analysis & Solutions

## TL;DR - Quick Fixes

### Issue 1: Temporal Stats Error - `SQLITE_ERROR: no such column: namespace`

**Root Cause:** Database migrations not run. The `temporal_facts` table is missing the `namespace` column.

**Fix:**
```bash
# Local development
cd backend
npm run migrate

# Docker
docker exec <container-name> npm run migrate
# Or restart containers (migrations run automatically)
```

### Issue 2: Memory Operations Failing - "fetch failed" 500 Errors

**Root Cause:** Embedding generation is attempting to use an external provider (OpenAI, Gemini, Ollama) that's not configured or unavailable.

**Fix:** Use synthetic embeddings for testing (no API keys required):
```bash
# Start server with synthetic embeddings
cd backend
OM_EMBEDDINGS=synthetic OM_TIER=fast npm run dev
```

Or add to `backend/.env`:
```
OM_EMBEDDINGS=synthetic
OM_TIER=fast
```

---

## Detailed Analysis

### Server Log Errors Explained

```
[TEMPORAL API] Error getting stats: [Error: SQLITE_ERROR: no such column: namespace]
```

**What's happening:**
1. Tests call `GET /api/temporal/stats?namespace=test-xxx`
2. Server's `get_temporal_stats()` function calls `get_active_facts_count(namespace)`
3. That function queries: `SELECT COUNT(*) FROM temporal_facts WHERE namespace = ?`
4. But the `temporal_facts` table was created before namespace support was added
5. Migration 006 adds the namespace column but wasn't run

**Why migrations weren't run:**
- Fresh database or container started without running migrations
- Migrations need to be explicitly run via `npm run migrate`
- Docker containers may need migrations run inside them

**Schema before migration:**
```sql
CREATE TABLE temporal_facts (
    id TEXT PRIMARY KEY,
    -- namespace column missing!
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    ...
)
```

**Schema after migration:**
```sql
CREATE TABLE temporal_facts (
    id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL DEFAULT 'default',  -- ✓ Added
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    ...
)
```

### Memory Operations "fetch failed"

**What's happening:**
1. Tests call `POST /memory/add` with memory content
2. Server's `add_hsg_memory()` function processes the memory
3. Server calls `embedForSector()` to generate embeddings for the content
4. Embedding system checks `env.emb_kind` (provider) and `env.tier`
5. If provider is `openai`, `gemini`, or `ollama`, it makes an API/HTTP call
6. If that API key is missing or service unavailable, fetch fails
7. Error bubbles up as generic "fetch failed" 500 error

**Embedding providers and their requirements:**

| Provider   | Requirement                      | Test-Friendly? |
|-----------|----------------------------------|----------------|
| synthetic | None (pure Node.js)              | ✅ Yes         |
| local     | `@xenova/transformers` installed | ⚠️ Slow        |
| openai    | `OPENAI_API_KEY` env var         | ❌ No          |
| gemini    | `GOOGLE_API_KEY` env var         | ❌ No          |
| ollama    | Ollama service running locally   | ⚠️ Maybe       |

**Why synthetic is recommended for tests:**
- No external dependencies
- No API keys required
- Fast execution
- Deterministic (same input = same output)
- Works offline
- Perfect for CI/CD

---

## Test Environment Setup

### Automated Setup (Recommended)

Run the setup script:
```bash
cd backend/tests
./setup-test-env.sh
```

This script:
1. Runs database migrations
2. Creates/checks `.env` configuration
3. Validates test-ready settings
4. Optionally starts the server

### Manual Setup

**1. Run migrations:**
```bash
cd backend
npm run migrate
```

**2. Configure embeddings:**
```bash
# Create/edit backend/.env
cat >> backend/.env << 'EOF'
OM_EMBEDDINGS=synthetic
OM_TIER=fast
OM_PROXY_ONLY_MODE=false
EOF
```

**3. Start server:**
```bash
cd backend
npm run dev
```

**4. Run tests:**
```bash
cd backend
npm test
```

### Docker Setup

**1. Run migrations in container:**
```bash
# Find your container name
docker ps

# Run migrations
docker exec <container-name> npm run migrate

# Or via docker-compose
docker-compose exec openmemory npm run migrate
```

**2. Set environment variables:**

Edit `docker-compose.yml` or add to container environment:
```yaml
services:
  openmemory:
    environment:
      - OM_EMBEDDINGS=synthetic
      - OM_TIER=fast
      - OM_PROXY_ONLY_MODE=false
```

**3. Restart container:**
```bash
docker-compose restart openmemory
```

---

## Why These Issues Occurred

### Database Schema Evolution

OpenMemory v2.0 introduced **namespace isolation** - every memory, fact, and operation belongs to a namespace. This required:
- Adding `namespace` columns to existing tables
- Creating namespace-aware indexes
- Updating all queries to filter by namespace

Migration 006 (`006_add_namespace_to_temporal.sql`) handles this for temporal tables.

### Embedding System Complexity

OpenMemory supports multiple embedding providers to give users flexibility:
- Production: OpenAI (best quality)
- Self-hosted: Ollama (local LLMs)
- Testing: Synthetic (fast, no dependencies)

The system defaults to "smart" tier which may try to use OpenAI. For testing, "fast" tier with synthetic embeddings is better.

---

## Expected Test Results After Fixes

With migrations run and synthetic embeddings configured:

```
📊 Test Results
==================================================
✅ Passed: 38-40/40 (95-100%)
❌ Failed: 0-2/40

Possible remaining failures:
- Compression compress (response structure)
- Dashboard stats (response structure)
```

These are minor response format mismatches, not blocking issues.

---

## Files Updated

### Documentation
- ✅ `TROUBLESHOOTING.md` - Added migration and embedding sections
- ✅ `QUICKSTART.md` - Added migration step to prerequisites
- ✅ `TEST_RESULTS.md` - Updated with migration guidance
- ✅ `ROOT_CAUSE_ANALYSIS.md` - This comprehensive analysis

### Test Code
- ✅ `api-endpoints.test.ts` - Added namespace pre-creation, better error handling

### Scripts
- ✅ `setup-test-env.sh` - Automated test environment setup

---

## Prevention for Future

### For Developers

**Always run migrations after pulling:**
```bash
git pull
cd backend
npm run migrate
npm run dev
```

**Use test-friendly configuration locally:**
```bash
# Add to backend/.env
OM_EMBEDDINGS=synthetic
OM_TIER=fast
```

### For CI/CD

Add migration step to pipeline:
```yaml
# Example GitHub Actions
- name: Run migrations
  run: |
    cd backend
    npm run migrate
    
- name: Start server
  run: |
    cd backend
    OM_EMBEDDINGS=synthetic OM_TIER=fast npm run dev &
    
- name: Run tests
  run: |
    cd backend
    npm test
```

### For Docker

Ensure migrations run on container startup:
```dockerfile
# Add to Dockerfile
CMD ["sh", "-c", "npm run migrate && npm start"]
```

Or in `docker-compose.yml`:
```yaml
services:
  openmemory:
    command: sh -c "npm run migrate && npm start"
```

---

## Questions & Answers

**Q: Why not auto-run migrations on server startup?**

A: Migrations modify database schema. In production with multiple instances or during rollbacks, this could cause race conditions or data issues. Explicit migration control is safer.

**Q: Why not default to synthetic embeddings?**

A: Synthetic embeddings have lower quality for production use cases. OpenAI/Gemini provide much better semantic understanding. We optimize for production by default.

**Q: Will these issues affect production deployments?**

A: Not if:
1. Migrations are run as part of deployment process
2. Proper embedding provider is configured (OpenAI/Gemini with API keys)
3. Environment variables are set correctly

**Q: How do I know if migrations are needed?**

A: Check migration status:
```bash
# Count migrations run
sqlite3 backend/data/openmemory.sqlite "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='temporal_facts';"

# Check schema
sqlite3 backend/data/openmemory.sqlite ".schema temporal_facts"
# Should include: namespace TEXT NOT NULL DEFAULT 'default'
```

---

## Additional Resources

- Migration files: `backend/migrations/*.sql`
- Embedding system: `backend/src/memory/embed.ts`
- Temporal API: `backend/src/server/routes/temporal.ts`
- Test suite: `backend/tests/api-endpoints.test.ts`
- Setup script: `backend/tests/setup-test-env.sh`
