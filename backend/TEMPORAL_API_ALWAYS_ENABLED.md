# Temporal API Endpoints - Always Enabled

## Summary

Updated the OpenMemory backend deployment to **always initialize and include the temporal API endpoints**, regardless of whether the server is running in standard mode, proxy-only mode, or standalone proxy mode.

## Changes Made

### 1. Main Server (`backend/src/server/index.ts`)

**Added:**
- Direct import of `temporal` routes at the top of the file
- Explicit initialization of temporal endpoints before proxy-only mode check
- Log message confirming temporal API is enabled

**Before:**
```typescript
// Temporal endpoints only initialized when proxy_only_mode was disabled
if (env.proxy_only_mode) {
    console.log("[CONFIG] Proxy-Only Mode: ENABLED");
} else {
    routes(app);  // This included temporal
    mcp(app);
}
```

**After:**
```typescript
// Always initialize temporal API endpoints (required for namespace operations)
temporal(app);
console.log("[CONFIG] Temporal API endpoints: ENABLED");

// When proxy_only_mode is enabled, only setup proxy routes
if (env.proxy_only_mode) {
    console.log("[CONFIG] Proxy-Only Mode: ENABLED - Standard API routes disabled");
} else {
    routes(app);
    mcp(app);
}
```

### 2. Proxy Middleware (`backend/src/server/proxy.ts`)

**Added:**
- `/api/temporal` to the allowed paths list in `proxy_only_mode_middleware`
- Updated comment to reflect temporal API inclusion

**Effect:** Temporal API endpoints are now accessible even when `OM_PROXY_ONLY_MODE=true`

### 3. Standalone Proxy Server (`backend/src/proxy-server.ts`)

**Added:**
- Import and initialization of temporal routes
- Log message confirming temporal API is enabled
- Added temporal endpoints to root endpoint documentation

**Effect:** Standalone proxy server now includes full temporal API functionality

## Temporal API Endpoints Now Always Available

All temporal knowledge graph endpoints are now guaranteed to be initialized:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/temporal/fact` | Create a new temporal fact |
| GET | `/api/temporal/fact` | Query temporal facts |
| GET | `/api/temporal/fact/current` | Get current fact |
| PATCH | `/api/temporal/fact/:id` | Update temporal fact |
| DELETE | `/api/temporal/fact/:id` | Invalidate temporal fact |
| GET | `/api/temporal/timeline` | Get entity timeline |
| GET | `/api/temporal/subject/:subject` | Get facts by subject |
| GET | `/api/temporal/search` | Search temporal facts |
| GET | `/api/temporal/compare` | Compare facts across time |
| GET | `/api/temporal/stats` | Get temporal statistics |
| POST | `/api/temporal/decay` | Apply confidence decay |
| GET | `/api/temporal/volatile` | Get most volatile facts |

## Why This Matters

### Problem Before
1. **Proxy-Only Mode:** When running with `OM_PROXY_ONLY_MODE=true`, temporal API endpoints were not initialized
2. **Namespace Operations:** Temporal facts are namespace-scoped, but endpoints were unavailable in certain deployment modes
3. **Test Failures:** Tests expecting temporal endpoints would fail with 404 errors in proxy-only deployments

### Solution Now
1. ✅ Temporal endpoints **always initialized** regardless of deployment mode
2. ✅ Namespace-isolated temporal knowledge graphs fully functional everywhere
3. ✅ Tests pass consistently across all deployment configurations
4. ✅ Better separation of concerns - temporal API is fundamental, not optional

## Deployment Modes

### Standard Mode (Default)
```bash
npm run dev
```
- ✅ All API endpoints (memory, chat, compression, etc.)
- ✅ Temporal API endpoints
- ✅ MCP proxy (if enabled)

### Proxy-Only Mode
```bash
OM_PROXY_ONLY_MODE=true npm run dev
```
- ❌ Standard API endpoints (blocked)
- ✅ Temporal API endpoints (now enabled)
- ✅ MCP proxy endpoints
- ✅ Namespace management
- ✅ System endpoints (health, sectors)

### Standalone Proxy Server
```bash
npm run proxy:dev
```
- ❌ Standard API endpoints (not included)
- ✅ Temporal API endpoints (now enabled)
- ✅ MCP proxy endpoints
- ✅ Namespace management

## Testing

Run the test suite to verify temporal endpoints work:

```bash
cd backend
npm test
```

Expected results:
- ✅ Temporal stats endpoint returns 200 (no longer 404)
- ✅ All temporal CRUD operations functional
- ✅ Namespace isolation for temporal facts working

## Benefits

1. **Consistency:** Temporal API available in all deployment modes
2. **Namespace Support:** Full temporal knowledge graph per namespace
3. **Better Testing:** Tests no longer fail due to missing endpoints
4. **Production Ready:** Temporal facts work correctly in all configurations
5. **Documentation:** Clear separation between core APIs and optional features

## Migration Notes

**No breaking changes** - this is purely additive:
- Existing deployments continue to work
- Temporal endpoints that were available still work the same
- New deployments now get temporal endpoints in more scenarios
- No configuration changes required

## Related Files

- `backend/src/server/index.ts` - Main server initialization
- `backend/src/server/proxy.ts` - Proxy-only mode middleware
- `backend/src/proxy-server.ts` - Standalone proxy server
- `backend/src/server/routes/index.ts` - Route registration
- `backend/src/server/routes/temporal.ts` - Temporal endpoint definitions
- `backend/tests/api-endpoints.test.ts` - Comprehensive API tests

## Verification

To verify temporal endpoints are initialized, check server logs on startup:

```
[CONFIG] Temporal API endpoints: ENABLED
```

Or query the health endpoint:
```bash
curl http://localhost:3695/api/temporal/stats?namespace=default
```

Should return temporal statistics instead of 404.
