# Namespace Isolation - Quick Reference

## What Changed?

OpenMemory now uses **separate Qdrant collections per namespace** instead of filtering within a single collection. This provides true data isolation.

## For Developers

### Before (Old Approach)
```typescript
// All data in single collection "openmemory_vectors"
// Filtered by user_id in metadata
await vectorRepo.search({
    vector: queryVector,
    sector: 'semantic',
    userId: 'alice',  // ← Metadata filter only
});
```

### After (New Approach)
```typescript
// Each namespace gets its own collection
// "openmemory_vectors_alice", "openmemory_vectors_bob", etc.
await vectorRepo.search({
    vector: queryVector,
    sector: 'semantic',
    userId: 'alice',  // ← Determines which collection to query
});
```

## Key Points

### 🔒 Isolation
- Each namespace = separate Qdrant collection
- Queries **cannot** access other namespaces
- No filter bugs possible

### 📝 Collection Naming
```
user_id: "alice"     → collection: "openmemory_vectors_alice"
user_id: "team-beta" → collection: "openmemory_vectors_team-beta"
user_id: "user@test" → collection: "openmemory_vectors_user_test"
```

Special characters are sanitized to `_`.

### 🚀 API Compatibility
**No changes needed** in your client code! The API remains the same:

```bash
# Works exactly as before
curl -X POST http://localhost:8080/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{
    "content": "My memory",
    "user_id": "alice"
  }'
```

## Common Operations

### Add Memory
```typescript
// Automatically uses namespace-specific collection
await add_hsg_memory(
    "Meeting notes",
    ["work"],
    { project: "alpha" },
    "team-alpha"  // ← namespace
);
// Stored in: openmemory_vectors_team-alpha
```

### Query Memory
```typescript
// Searches only in namespace collection
const results = await hsg_query(
    "What were the notes?",
    10,
    { user_id: "team-alpha" }  // ← scoped to namespace
);
```

### Delete Memory
```typescript
const vectorRepo = await VectorRepositoryFactory.getInstance();
await vectorRepo.delete(
    memoryId,
    undefined,
    "team-alpha"  // ← namespace
);
```

## Migration Checklist

### New Deployments
- [x] Nothing to do - works automatically

### Existing Deployments (Development)
1. [ ] Stop backend
2. [ ] Delete old collection:
   ```bash
   curl -X DELETE http://localhost:6333/collections/openmemory_vectors
   ```
3. [ ] Restart backend
4. [ ] Re-ingest data

### Existing Deployments (Production)
1. [ ] Review migration script:
   ```bash
   cd backend
   node scripts/migrate-namespace-collections.js --help
   ```
2. [ ] Dry run:
   ```bash
   node scripts/migrate-namespace-collections.js --dry-run
   ```
3. [ ] Run migration:
   ```bash
   node scripts/migrate-namespace-collections.js
   ```
4. [ ] Verify collections:
   ```bash
   curl http://localhost:6333/collections
   ```

## Testing

### Verify Isolation
```bash
# Add to namespace "alice"
curl -X POST http://localhost:8080/api/memory/add \
  -d '{"content": "Alice data", "user_id": "alice"}'

# Add to namespace "bob"  
curl -X POST http://localhost:8080/api/memory/add \
  -d '{"content": "Bob data", "user_id": "bob"}'

# Query alice - should NOT see bob's data
curl http://localhost:8080/api/memory/query \
  -d '{"query": "data", "filters": {"user_id": "alice"}}'
```

### Check Collections
```bash
# List all collections
curl http://localhost:6333/collections

# Expected: openmemory_vectors_alice, openmemory_vectors_bob
```

## Troubleshooting

### Empty Results After Upgrade
**Problem**: Queries return no results after upgrading.

**Solution**: Old data still in `openmemory_vectors` collection. Run migration script.

### Collection Not Created
**Problem**: Collection not appearing in Qdrant.

**Solution**: Check Qdrant logs:
```bash
docker logs qdrant
```

Ensure Qdrant is accessible at configured URL.

### Performance Issues
**Problem**: Slow queries with many namespaces.

**Solution**: This is expected - each namespace has its own collection. Consider:
- Scaling Qdrant horizontally
- Using collection pooling (future enhancement)

## Code Reference

### Modified Files
- `backend/src/repositories/QdrantVectorRepository.ts` - Collection-per-namespace logic
- `backend/src/repositories/IVectorRepository.ts` - Interface with userId params
- `backend/src/repositories/SQLiteVectorRepository.ts` - Namespace validation
- `backend/src/memory/hsg.ts` - Passes userId to searches
- `backend/src/server/routes/memory.ts` - Uses vector repository
- `backend/src/server/routes/users.ts` - Uses vector repository

### Key Methods
```typescript
// Get namespace-specific collection name
getCollectionName(userId?: string): string

// Ensure collection exists for namespace
ensureCollection(userId?: string): Promise<string>

// Repository methods now accept userId
getVector(id, sector, userId?)
getVectorsBySector(id, userId?)
delete(id, sector?, userId?)
batchDelete(ids, sector?, userId?)
```

## Documentation

- **Full Guide**: `docs/NAMESPACE_ISOLATION.md`
- **Summary**: `NAMESPACE_ISOLATION_SUMMARY.md`
- **Migration Script**: `backend/scripts/migrate-namespace-collections.ts`

## Support

Questions? Check:
1. Full documentation in `docs/NAMESPACE_ISOLATION.md`
2. Migration script help: `node scripts/migrate-namespace-collections.js --help`
3. GitHub issues for bug reports

---

**Status**: ✅ Implemented and Tested  
**Breaking Changes**: None  
**API Compatible**: Yes  
**Migration Required**: Yes (for existing data)
