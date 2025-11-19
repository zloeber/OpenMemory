# Namespace Enhancement Summary

## Overview

Enhanced namespace functionality to support:
- ✅ **Auto-creation on first use**
- ✅ **Explicit API creation with configuration**
- ✅ **Ontology profile association**
- ✅ **Custom metadata storage**
- ✅ **Full CRUD operations via API**

## Changes Made

### 1. Database Schema (`backend/src/core/db.ts`)
- Added `ontology_profile` TEXT column to `namespace_groups`
- Added `metadata` TEXT (JSON) column to `namespace_groups`
- Updated all namespace queries to support new fields
- Added `upd_namespace_full` query for complete updates

### 2. Namespace Service (`backend/src/services/namespace.ts`) - NEW
Created centralized service for namespace management:
- `create_namespace()` - Create with ontology profile & metadata
- `get_namespace()` - Retrieve namespace details
- `list_namespaces()` - List all active namespaces
- `update_namespace()` - Update configuration
- `ensure_namespace_exists()` - Auto-create if needed
- `deactivate_namespace()` - Soft delete
- `delete_namespace()` - Hard delete

### 3. Middleware (`backend/src/server/middleware/namespace.ts`)
- Updated to use new namespace service
- Simplified auto-creation logic
- Better error handling

### 4. API Routes (`backend/src/server/proxy.ts`)
Enhanced namespace endpoints:
- `GET /api/namespaces` - List with ontology info
- `GET /api/namespaces/:namespace` - Get details
- `POST /api/namespaces` - Create with ontology profile
- `PUT /api/namespaces/:namespace` - Update configuration (**NEW**)
- `DELETE /api/namespaces/:namespace` - Deactivate

### 5. Swagger Documentation (`backend/src/server/swagger.ts`)
- Updated OpenAPI spec for all namespace endpoints
- Added request/response schemas for ontology profiles
- Documented metadata field
- Added PUT endpoint documentation

### 6. Migration Script
- `backend/migrations/003_add_namespace_ontology.sql`
- Adds new columns to existing databases
- Supports both SQLite and PostgreSQL

### 7. Examples
- `examples/js-sdk/namespace-ontology-examples.ts`
- Demonstrates 8 different usage patterns
- Shows all ontology profiles
- Includes auto-creation examples

### 8. Documentation
- `docs/NAMESPACE_ONTOLOGY_PROFILES.md`
- Complete guide to ontology profiles
- API usage examples
- Best practices
- Custom ontology creation guide

## API Examples

### Create with Ontology Profile
```bash
POST /api/namespaces
{
  "namespace": "dungeon-master-01",
  "description": "Fantasy RPG campaign",
  "ontology_profile": "fantasy_dungeon_master_ontology",
  "metadata": {
    "game_system": "D&D 5e",
    "campaign": "Lost Mines"
  }
}
```

### Auto-Create on First Use
```bash
POST /memory/add
{
  "content": "User prefers dark mode",
  "namespaces": ["user-prefs-auto"],  # Created automatically
  "tags": ["preferences"]
}
```

### Update Namespace
```bash
PUT /api/namespaces/dungeon-master-01
{
  "description": "Updated description",
  "metadata": {
    "game_system": "Pathfinder 2e"
  }
}
```

## Available Ontology Profiles

1. **default_agentic_memory_ontology** - General agent tasks
2. **fantasy_dungeon_master_ontology** - RPG game management
3. **therapy_psychology_ontology** - Mental health support

See `backend/config/ontology.*.yml` for full definitions.

## Migration Instructions

### For SQLite:
```bash
cd backend
sqlite3 data/openmemory.sqlite < migrations/003_add_namespace_ontology.sql
```

### For PostgreSQL:
```bash
psql -U postgres -d openmemory -f backend/migrations/003_add_namespace_ontology.sql
```

## Testing

Run the example script:
```bash
cd examples/js-sdk
ts-node namespace-ontology-examples.ts
```

Or test individual endpoints:
```bash
# Create namespace
curl -X POST http://localhost:8080/api/namespaces \
  -H "x-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "test-space",
    "ontology_profile": "default_agentic_memory_ontology"
  }'

# List namespaces
curl http://localhost:8080/api/namespaces \
  -H "x-api-key: your-key"

# Update namespace
curl -X PUT http://localhost:8080/api/namespaces/test-space \
  -H "x-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

## Backward Compatibility

✅ **Fully backward compatible**
- Existing namespaces work without changes
- Ontology profile is optional
- Metadata is optional
- Auto-creation behavior unchanged
- All existing endpoints remain functional

## Key Benefits

1. **Domain-Specific Memory Structure** - Ontology profiles optimize memory organization for your use case
2. **Flexible Configuration** - Metadata supports arbitrary configuration per namespace
3. **Simplified Workflows** - Auto-creation reduces manual setup
4. **Better Organization** - Explicit ontology profiles improve memory categorization
5. **Multi-Tenant Support** - Metadata enables per-tenant configuration

## Files Modified

```
backend/src/core/db.ts                          # Schema + queries
backend/src/services/namespace.ts               # NEW - Service layer
backend/src/server/middleware/namespace.ts      # Updated middleware
backend/src/server/proxy.ts                     # Enhanced API routes
backend/src/server/swagger.ts                   # Updated OpenAPI spec
backend/migrations/003_add_namespace_ontology.sql # NEW - Migration
examples/js-sdk/namespace-ontology-examples.ts  # NEW - Examples
docs/NAMESPACE_ONTOLOGY_PROFILES.md             # NEW - Documentation
```

## Next Steps

1. Run migration on your database
2. Review available ontology profiles
3. Update namespace creation calls to use ontology profiles
4. Consider creating custom ontology profiles for your domain
5. Use metadata for per-namespace configuration

## Questions?

- See `docs/NAMESPACE_ONTOLOGY_PROFILES.md` for full documentation
- Review `backend/config/ontology.*.yml` for ontology schemas
- Check `examples/js-sdk/namespace-ontology-examples.ts` for usage patterns
