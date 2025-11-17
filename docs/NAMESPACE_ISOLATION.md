# Namespace Isolation Implementation

## Overview

OpenMemory now implements **true namespace isolation** using separate Qdrant collections per namespace. This ensures complete data separation between different users/namespaces, providing enhanced security and preventing any possibility of cross-namespace data access.

## Architecture Changes

### Previous Implementation (Metadata Filtering)
- **Single Qdrant collection** (`openmemory_vectors`) for all data
- Filtered by `user_id` in payload metadata
- **Security concern**: Bugs or missing filters could expose data across namespaces

### Current Implementation (Collection-Per-Namespace)
- **Separate Qdrant collection** per namespace: `openmemory_vectors_{sanitized_user_id}`
- No `user_id` filtering needed - isolation is structural
- **True isolation**: Queries cannot accidentally access other namespaces

## Key Changes

### 1. QdrantVectorRepository

The `QdrantVectorRepository` now:

- **Dynamically creates collections** per namespace using `getCollectionName(userId)`
- **Sanitizes namespace identifiers** for collection naming (alphanumeric + `_` and `-`)
- **Caches initialized collections** to avoid redundant creation attempts
- **Handles missing collections** gracefully (returns empty results for non-existent namespaces)

#### Collection Naming Convention
```typescript
// Example namespace: "team-alpha"
// Collection name: "openmemory_vectors_team-alpha"

// Example namespace: "user@example.com"
// Collection name: "openmemory_vectors_user_example_com"
```

### 2. Updated Methods

All vector repository methods now support a `userId` parameter for namespace isolation:

```typescript
// Interface changes
async getVector(id: string, sector: string, userId?: string): Promise<Float32Array | null>
async getVectorsBySector(id: string, userId?: string): Promise<Map<string, Float32Array>>
async delete(id: string, sector?: string, userId?: string): Promise<void>
async batchDelete(ids: string[], sector?: string, userId?: string): Promise<number>
```

### 3. API Endpoints Updated

The following API endpoints now use the vector repository with namespace isolation:

- `DELETE /memory/:id` - Deletes memory vectors in namespace-specific collection
- `DELETE /users/:user_id/memories` - Batch deletes all user memories in their namespace

### 4. Memory Operations

`hsg_query()` now passes `userId` to vector search operations:

```typescript
const searchResults = await vectorRepo.search({
    vector: new Float32Array(qv),
    sector: s,
    userId: f?.user_id,  // ← Ensures namespace isolation
    limit: 1000,
    withVectors: true,
});
```

## Benefits

### 🔒 Enhanced Security
- **No metadata filtering** - isolation is built into data structure
- **Impossible to accidentally query wrong namespace** - queries are scoped to collection
- **Clear audit trail** - each namespace has its own collection

### 🚀 Better Performance
- **Smaller search space** - queries only scan relevant namespace collection
- **Optimized indices** - each collection has its own optimized index
- **Parallel scaling** - namespaces can be distributed across Qdrant nodes

### 🛠️ Easier Maintenance
- **Clear data boundaries** - easy to identify which data belongs to which namespace
- **Simplified backups** - can backup/restore individual namespaces
- **Easier cleanup** - delete entire collection to remove namespace

## Migration Path

### For New Deployments
No migration needed - the system will automatically create namespace-specific collections as data is added.

### For Existing Deployments

If you have existing data in a single `openmemory_vectors` collection, you have two options:

#### Option 1: Fresh Start (Recommended for development)
1. Stop the backend service
2. Delete the existing Qdrant collection:
   ```bash
   curl -X DELETE http://localhost:6333/collections/openmemory_vectors
   ```
3. Restart backend - new collections will be created per namespace
4. Re-ingest data through the API

#### Option 2: Migrate Existing Data (Production)
A migration script is needed to:
1. Read all vectors from `openmemory_vectors`
2. Group by `user_id`
3. Create new namespace-specific collections
4. Insert vectors into appropriate collections
5. Verify migration
6. Delete old collection

**Note**: Migration script will be provided in a future update.

## Code Examples

### Adding Memory (Automatic Namespace Isolation)
```typescript
// The add_hsg_memory function automatically uses the user_id for isolation
const result = await add_hsg_memory(
    "Meeting notes from standup",
    ["work", "notes"],
    { project: "alpha" },
    "team-alpha"  // ← This becomes the namespace
);
// Vector stored in collection: openmemory_vectors_team-alpha
```

### Querying Memory (Namespace-Scoped)
```typescript
const results = await hsg_query(
    "What were the meeting notes?",
    10,
    {
        sectors: ["episodic"],
        user_id: "team-alpha"  // ← Query only this namespace
    }
);
// Search performed ONLY in openmemory_vectors_team-alpha collection
```

### Deleting Memory (Namespace-Scoped)
```typescript
const vectorRepo = await VectorRepositoryFactory.getInstance();
await vectorRepo.delete(
    memoryId,
    undefined,  // all sectors
    "team-alpha"  // ← Delete only from this namespace
);
// Deletion scoped to openmemory_vectors_team-alpha collection
```

## SQLite Compatibility

The `SQLiteVectorRepository` implementation also supports namespace isolation:

- **Metadata filtering** is used (SQLite doesn't have collection concept)
- **Access control enforced** on read/write/delete operations
- **Consistent interface** with Qdrant implementation

## Testing Namespace Isolation

You can verify namespace isolation is working:

### 1. Create Memories in Different Namespaces
```bash
# Namespace: alice
curl -X POST http://localhost:8080/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Alice secret data",
    "user_id": "alice"
  }'

# Namespace: bob
curl -X POST http://localhost:8080/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Bob secret data",
    "user_id": "bob"
  }'
```

### 2. Verify Isolation
```bash
# Query Alice's namespace - should NOT return Bob's data
curl http://localhost:8080/api/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "secret data",
    "filters": { "user_id": "alice" }
  }'
```

### 3. Check Qdrant Collections
```bash
# List all collections - should see separate collections
curl http://localhost:6333/collections

# Expected output:
# {
#   "collections": [
#     {"name": "openmemory_vectors_alice"},
#     {"name": "openmemory_vectors_bob"}
#   ]
# }
```

## Configuration

Namespace isolation is enabled by default. No configuration changes needed.

### Environment Variables
```bash
# Qdrant connection (existing)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key-here

# Vector backend selection (existing)
VECTOR_BACKEND=qdrant  # or 'sqlite'
```

## Troubleshooting

### Collections Not Being Created

**Symptom**: Queries return empty results even after adding memories.

**Solution**: Check Qdrant logs for collection creation errors:
```bash
docker logs qdrant
```

### Collection Name Conflicts

**Symptom**: Error creating collection due to name collision.

**Solution**: Namespace IDs are sanitized to alphanumeric + `_` and `-`. If two different IDs sanitize to the same name, they will share a collection. Choose unique namespace identifiers.

### Migration Issues

**Symptom**: Old data not visible after upgrading.

**Solution**: Old data remains in `openmemory_vectors` collection. Use migration script (coming soon) or re-ingest data.

## Performance Considerations

### Collection Overhead
- Each collection has ~2-5MB overhead in Qdrant
- For systems with 1000+ namespaces, consider hardware scaling

### Index Configuration
Each collection inherits optimized HNSW settings:
- `m: 16` (graph connections)
- `ef_construct: 100` (index quality)

### Batch Operations
Batch operations automatically group by namespace for efficiency:
```typescript
// These vectors are automatically grouped by namespace
await vectorRepo.batchUpsert([
    { id: "1", sector: "semantic", userId: "alice", vector: [...] },
    { id: "2", sector: "semantic", userId: "alice", vector: [...] },
    { id: "3", sector: "semantic", userId: "bob", vector: [...] },
]);
// Creates/updates in 2 collections efficiently
```

## Future Enhancements

1. **Migration Script**: Automated migration from single collection to namespace-isolated collections
2. **Collection Pooling**: Reuse collections for very small namespaces to reduce overhead
3. **Multi-tenancy**: Support for hierarchical namespaces (e.g., `org/team/user`)
4. **Collection Aliases**: Human-readable names mapped to sanitized collection names

## Summary

The namespace isolation implementation provides **true data separation** at the storage level, eliminating the risk of cross-namespace data access while improving performance and maintainability. The change is backward-compatible with the API and requires no client code modifications.

For new deployments, namespace isolation works automatically. For existing deployments with data, follow the migration path outlined above.

## Related Documentation

- [Repository Pattern](./REPOSITORY_QUICKSTART.md)
- [Qdrant Integration](./DOCKER_INTEGRATION_SUMMARY.md)
- [Architecture Overview](./ARCHITECTURE.md)
