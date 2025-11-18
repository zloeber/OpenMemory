# API Tests - Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Set API key (if server requires it)
export OM_API_KEY="your-api-key-here"

# 2. Make sure server is NOT in proxy-only mode
export OM_PROXY_ONLY_MODE=false

# 3. Start server
cd backend && npm run dev

# 4. Run tests (in new terminal)
cd backend && npm test
```

## ⚙️ Environment Variables

### Required for Tests
```bash
OM_PROXY_ONLY_MODE=false    # MUST be false!
```

### Optional (if server needs auth)
```bash
OM_API_KEY="your-key"       # Primary option
# or
OPENMEMORY_API_KEY="your-key"  # Alternative
```

### Recommended for Fast Tests
```bash
OM_EMBEDDINGS=synthetic     # No API keys needed
OM_VECTOR_BACKEND=sqlite    # No Qdrant needed
OM_METADATA_BACKEND=sqlite  # No PostgreSQL needed
```

## 🔍 Verify Setup

```bash
# Check server mode
curl http://localhost:3695/ | jq .mode
# Should show: "standard" (not "proxy-only")

# Check health
curl http://localhost:3695/health | jq .
# Should return: { "ok": true, ... }

# Check with API key
curl -H "x-api-key: your-key" http://localhost:3695/health
```

## ✅ Expected Test Output

```
🧪 OpenMemory API Endpoint Tests
==================================================
Test namespace: test-1234567890
Second namespace: test-alt-1234567890
API Key: ✓ Configured                    ← Should see checkmark

🔍 Checking if server is ready...
✅ Server is ready

📋 System Endpoints
--------------------------------------------------
✓ GET /health
✓ GET /sectors
✓ GET /health includes version

... [more tests] ...

📊 Test Results
==================================================
✅ Passed: 39/39
❌ Failed: 0/39

🎉 All tests passed!
```

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `401 authentication_required` | No API key | `export OM_API_KEY="your-key"` |
| `404` on most endpoints | Proxy-only mode | `export OM_PROXY_ONLY_MODE=false` |
| `fetch failed` | Server not running | `npm run dev` |
| `ECONNREFUSED` | Wrong port | Check `OM_PORT` matches |

## 📦 Test Coverage

- ✅ **39+ tests** covering all major endpoints
- ✅ **System** - Health, sectors (3 tests)
- ✅ **Memory** - Full CRUD with namespace isolation (20 tests)
- ✅ **Chat** - Integration & validation (3 tests)
- ✅ **Compression** - Text compression (2 tests)
- ✅ **Metrics** - System & namespace stats (3 tests)
- ✅ **Dashboard** - Stats & health (2 tests)
- ✅ **Namespaces** - Management (3 tests)
- ✅ **Proxy** - Info & health (2 tests)
- ✅ **Temporal** - Facts stats (1 test)

## 📝 Test Files

- `api-endpoints.test.ts` - Main test suite
- `QUICKSTART.md` - Quick setup guide
- `README.md` - Full documentation
- `TROUBLESHOOTING.md` - Detailed debugging
- `API_KEY_CHANGES.md` - Auth implementation details

## 🔐 API Key Detection Order

1. `OM_API_KEY` env var (primary)
2. `OPENMEMORY_API_KEY` env var (alternative)
3. `env.api_key` from config (fallback)
4. Empty string (no auth)

## 🧪 Test Commands

```bash
# Standard run
npm test

# With API key inline
OM_API_KEY="your-key" npm test

# With custom port
PORT=3696 npm test

# Direct execution
npx tsx tests/api-endpoints.test.ts

# With all env vars
OM_API_KEY="key" OM_PROXY_ONLY_MODE=false npm test
```

## 🛠️ Minimal Test Setup

**For quickest test run:**

```bash
# .env file
OM_PORT=3695
OM_PROXY_ONLY_MODE=false
OM_API_KEY=test-key-123
OM_EMBEDDINGS=synthetic
OM_VECTOR_BACKEND=sqlite
OM_METADATA_BACKEND=sqlite

# Start & test
npm run dev &
sleep 5
OM_API_KEY=test-key-123 npm test
```

## 📚 Documentation

- **QUICKSTART.md** - 2 min setup
- **README.md** - Full guide
- **TROUBLESHOOTING.md** - Problem solving
- **API_KEY_CHANGES.md** - Auth details
- **API_TESTS.md** - Detailed test docs

## 💡 Tips

1. **Always check API key status** in test output
2. **Verify proxy-only mode is OFF** before testing
3. **Use synthetic embeddings** for speed
4. **Run server first** before tests
5. **Check logs** if tests fail

## 🎯 Success Checklist

- [ ] `OM_PROXY_ONLY_MODE=false` set
- [ ] API key exported (if required)
- [ ] Server running on correct port
- [ ] Health endpoint returns 200
- [ ] Server mode is "standard"
- [ ] Tests show "API Key: ✓ Configured"
- [ ] All 39 tests pass

---

**Need help?** See `TROUBLESHOOTING.md` for detailed solutions.
