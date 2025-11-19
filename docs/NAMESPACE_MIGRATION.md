# Namespace Migration Guide

## Overview

This document describes the migration from single `user_id` namespace to multi-namespace arrays.

## Changes Made

### 1. Type Definitions (`backend/src/core/types.ts`)
- Changed `add_req.namespace` from `string` to `namespaces?: string[]`
- Changed `q_req.namespace` from `string` to `namespaces?: string[]`
- Changed `ingest_req.namespace` from `string` to `namespaces?: string[]`
- Changed `mem_row.user_id` from `string | null` to `namespaces: string` (JSON array)
- Added `DEFAULT_NAMESPACES = ["global"]` constant

### 2. Core Memory Functions (`backend/src/memory/hsg.ts`)
- `add_hsg_memory()`: Changed parameter from `user_id?: string` to `namespaces?: string[]`
  - Defaults to `["global"]` if not provided
  - Stores namespaces as JSON array in database
- `hsg_query()`: Changed filter from `user_id?: string` to `namespaces?: string[]`
  - Filters memories by namespace membership
- `update_memory()`: Now retrieves and uses namespaces from existing memory
- All waypoint functions updated to use JSON namespaces

### 3. API Routes (`backend/src/server/routes/memory.ts`)
- All endpoints now accept optional `namespaces` array parameter
- Defaults to `["global"]` if not provided
- `/memory/query`: Searches across specified namespaces
- `/memory/add`: Stores memory in multiple namespaces
- `/memory/all`: Filters by namespace membership
- `/memory/:id`: Checks namespace access before returning

### 4. Ingest Functions (`backend/src/ops/ingest.ts`)
- Updated all functions to accept `namespaces?: string[]` instead of `user_id?: string | null`
- Defaults to `["global"]`

### 5. MCP Tools (`backend/src/ai/mcp-proxy.ts` and `backend/src/ai/mcp.ts`)
- `query_memory`: Now accepts `namespaces?: string[]`
- `store_memory`: Now accepts `namespaces?: string[]`
- All tools default to `["global"]` if not provided

### 6. Chat Integration (`backend/src/memory/chat_integration.ts`)
- Updated to use `namespaces?: string[]`

## Database Schema

### Current State
The `user_id` column in the memories table is reused to store namespaces as JSON:
- Before: `user_id = "my-namespace"` (single string)
- After: `user_id = '["global","project-alpha"]'` (JSON array stored as string)

### Column Renaming (Recommended)
For clarity, the column should be renamed:
```sql
-- For SQLite
ALTER TABLE memories RENAME COLUMN user_id TO namespaces;

-- For PostgreSQL
ALTER TABLE "openmemory_memories" RENAME COLUMN user_id TO namespaces;
```

### Data Migration
Existing data with single user_id values should be converted to JSON arrays:
```sql
-- For SQLite
UPDATE memories 
SET user_id = json_array(user_id) 
WHERE user_id IS NOT NULL 
  AND json_valid(user_id) = 0;

UPDATE memories 
SET user_id = '["global"]' 
WHERE user_id IS NULL;

-- For PostgreSQL  
UPDATE "openmemory_memories"
SET user_id = jsonb_build_array(user_id)::text
WHERE user_id IS NOT NULL 
  AND user_id !~ '^\[.*\]$';

UPDATE "openmemory_memories"
SET user_id = '["global"]'
WHERE user_id IS NULL;
```

## Default Namespace

All operations now default to `["global"]` namespace if no namespaces are specified:
- Memory storage: Stored in `["global"]`
- Memory queries: Search in `["global"]`
- API calls without namespaces parameter: Use `["global"]`

## Multi-Namespace Support

Memories can now belong to multiple namespaces simultaneously:
```javascript
// Store memory in both "global" and "project-alpha"
await add_hsg_memory(
  "Important project decision",
  [],
  {},
  ["global", "project-alpha"]
);

// Query across multiple namespaces
const results = await hsg_query(
  "project decisions",
  10,
  { namespaces: ["global", "project-alpha", "team-engineering"] }
);
```

## API Changes

### Before (Single Namespace)
```json
POST /memory/add
{
  "content": "Memory content",
  "namespace": "my-namespace"
}

POST /memory/query
{
  "query": "search term",
  "namespace": "my-namespace"
}
```

### After (Multi-Namespace)
```json
POST /memory/add
{
  "content": "Memory content",
  "namespaces": ["global", "project-alpha"]
}

POST /memory/query
{
  "query": "search term",
  "namespaces": ["global", "project-alpha"]
}
```

## Backward Compatibility

The API maintains backward compatibility:
1. Omitting `namespaces` defaults to `["global"]`
2. Existing memories with single user_id values are treated as single-namespace
3. All code properly parses JSON namespace arrays with fallback to `["global"]`

## Testing Recommendations

1. **Test default namespace**: Ensure operations without `namespaces` parameter use `["global"]`
2. **Test single namespace**: Pass `namespaces: ["test"]` and verify isolation
3. **Test multiple namespaces**: Store memory in multiple namespaces and query across them
4. **Test namespace filtering**: Verify memories only appear in their assigned namespaces
5. **Test migration**: Convert existing user_id data and verify it works as namespaces

## Removed Features

- **User Management**: All user-specific endpoints and logic removed
- **User Registration**: No longer needed; namespaces created on-demand
- **Authentication**: Moved to external OIDC proxy responsibility

## Next Steps

1. Run database migration to convert user_id to namespaces JSON arrays
2. Optionally rename user_id column to namespaces for clarity
3. Update dashboard UI to support multiple namespace selection
4. Update documentation with new namespace model
5. Test all MCP tools with new namespace arrays
