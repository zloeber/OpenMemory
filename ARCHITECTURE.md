# OpenMemory Architecture - Namespace-Based Design

## Overview

OpenMemory 2.0 uses a **namespace-based architecture** that eliminates agent registration complexity while maintaining complete isolation between different tenants/contexts.

## Core Principles

### 1. **Namespace as Primary Isolation**

- **No agent registration required** - Namespaces are created on-demand
- **Namespace = Isolation boundary** - All memories, embeddings, and relationships are scoped to namespaces
- **Simple and scalable** - Reduces complexity while enabling multi-tenant SaaS deployments

### 2. **Authentication-Agnostic Design**

OpenMemory focuses solely on memory operations. Authentication and authorization are handled by an external layer:

```
┌─────────────────┐
│  OIDC Proxy     │ ← Handles authentication, maps users to namespaces
│  (External)     │
└────────┬────────┘
         │
         ↓ (injects namespace)
┌─────────────────┐
│  OpenMemory     │ ← Namespace-scoped memory operations
│  API Service    │
└─────────────────┘
```

### 3. **On-Demand Namespace Creation**

Namespaces are automatically created when first accessed. No pre-registration needed.

## API Design

### Namespace Specification

Namespace can be provided via:

1. **X-Namespace header** (preferred for OIDC proxy integration)
   ```
   X-Namespace: project-alpha
   ```

2. **Request body**
   ```json
   {
     "namespace": "project-alpha",
     "content": "..."
   }
   ```

3. **Query parameter**
   ```
   /memory/query?namespace=project-alpha
   ```

### Memory Operations

All memory operations use `user_id` field internally, which maps to namespace:

```bash
# Store a memory
curl -X POST http://localhost:8080/memory/add \
  -H "Content-Type: application/json" \
  -H "X-Namespace: research-project" \
  -d '{
    "content": "Important research finding...",
    "metadata": {"type": "research"}
  }'

# Query memories
curl -X POST http://localhost:8080/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "research findings",
    "filters": {"user_id": "research-project"},
    "k": 5
  }'
```

### MCP Protocol Support

The MCP proxy provides namespace-aware tools:

- `query_memory` - Search memories in a namespace
- `store_memory` - Store memories with namespace parameter
- `reinforce_memory` - Boost memory salience
- `store_temporal_fact` - Store time-bound facts
- `query_temporal_facts` - Query facts at specific time
- `list_namespaces` - List all namespaces

All MCP tools require `namespace` parameter.

## Metrics & Monitoring

### Metrics API

Three levels of metrics tracking:

1. **System-wide**: `GET /api/metrics/summary`
   - Total namespaces, memories, embeddings
   - Sector distribution
   - Most active namespaces

2. **Per-namespace**: `GET /api/metrics/namespaces/:namespace`
   - Memory counts by sector
   - Average salience
   - Recent activity
   - Graph waypoints

3. **Filtered**: `GET /api/metrics?namespace=:name`
   - Detailed stats for specific namespace

### Example Response

```json
{
  "timestamp": "2025-11-17T23:30:00.000Z",
  "service": "OpenMemory",
  "version": "2.0.0",
  "architecture": "namespace-based",
  "namespaces": {
    "total": 2,
    "active": 2
  },
  "memories": {
    "total": 21,
    "by_namespace": {
      "research-project": 10,
      "product-development": 11
    },
    "by_sector": {
      "semantic": 8,
      "episodic": 7,
      "procedural": 6
    }
  },
  "embeddings": {
    "total": 105
  }
}
```

## Database Schema

### Simplified Schema

```sql
-- Namespace tracking (optional metadata)
CREATE TABLE namespace_groups (
    namespace TEXT PRIMARY KEY,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
);

-- Memories (user_id = namespace)
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    user_id TEXT,  -- This is the namespace
    content TEXT NOT NULL,
    primary_sector TEXT NOT NULL,
    salience REAL,
    -- ... other fields
);

-- Vectors (user_id = namespace)
CREATE TABLE vectors (
    id TEXT NOT NULL,
    sector TEXT NOT NULL,
    user_id TEXT,  -- This is the namespace
    v BLOB NOT NULL,
    dim INTEGER NOT NULL,
    PRIMARY KEY(id, sector)
);

-- Waypoints (user_id = namespace)
CREATE TABLE waypoints (
    src_id TEXT NOT NULL,
    dst_id TEXT NOT NULL,
    user_id TEXT,  -- This is the namespace
    weight REAL,
    PRIMARY KEY(src_id, user_id)
);
```

### Removed Tables

The following tables have been removed in 2.0:

- ❌ `agent_registrations` - No longer needed
- ❌ `agent_access_log` - Access logging moved to external layer
- ❌ Agent-specific fields in `namespace_groups` (e.g., `created_by`)

## Migration from Agent-Based Architecture

### v1.x (Agent-Based)

```javascript
// Old: Required agent registration
POST /api/agents
{
  "agent_id": "research-bot",
  "namespace": "research-project",
  "permissions": ["read", "write"]
}

// Old: Agent ID tracked in requests
POST /memory/add
{
  "agent_id": "research-bot",
  "content": "..."
}
```

### v2.0 (Namespace-Based)

```javascript
// New: No registration needed, just use namespace
POST /memory/add
{
  "user_id": "research-project",  // or use X-Namespace header
  "content": "..."
}
```

### Migration Steps

1. Run migration: `migrations/007_remove_agent_registration.sql`
2. Update client code to use namespaces instead of agent_id
3. Remove agent registration logic from applications
4. Optional: Set up OIDC proxy for authentication

## External Authentication Integration

### OIDC Proxy Responsibilities

When deploying with authentication, the external OIDC proxy should:

1. **Authenticate users** - Validate JWT/OAuth tokens
2. **Map to namespaces** - Extract or determine user's namespace(s)
3. **Inject namespace** - Add `X-Namespace` header to proxied requests
4. **Enforce access control** - Validate namespace permissions

### Example OIDC Proxy Flow

```
User Request
     ↓
[OIDC Proxy]
     ├─ Authenticate JWT token
     ├─ Extract user claims (e.g., user_id, org_id)
     ├─ Determine namespace (e.g., org-{org_id})
     ├─ Validate namespace access
     ├─ Inject X-Namespace header
     ↓
[OpenMemory API]
     ├─ Extract namespace from header
     ├─ Perform memory operations
     └─ Return results (namespace-scoped)
```

### Reference Implementation

```nginx
# Nginx example for OIDC proxy
location /api/ {
    # Validate JWT
    auth_request /auth/validate;
    
    # Extract namespace from JWT claims
    auth_request_set $namespace $upstream_http_x_namespace;
    
    # Inject namespace header
    proxy_set_header X-Namespace $namespace;
    
    # Forward to OpenMemory
    proxy_pass http://openmemory:8080;
}
```

## Bootstrap Script

### Quick Start with Sample Data

```bash
cd backend/scripts
node bootstrap-memories.js
```

This creates two namespaces with realistic memory sequences:

1. **research-project** - Academic research team (10 memories)
2. **product-development** - Software development team (11 memories)

### Custom Bootstrap

```javascript
// Using the API directly
const namespace = "my-project";

// Store memories
await fetch('http://localhost:8080/memory/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Namespace': namespace
  },
  body: JSON.stringify({
    content: "Important project decision...",
    metadata: { type: "decision", date: "2025-11-17" }
  })
});

// Query memories
await fetch('http://localhost:8080/memory/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "project decisions",
    filters: { user_id: namespace },
    k: 5
  })
});
```

## Best Practices

### Namespace Naming

- ✅ Use descriptive, hierarchical names: `org-company-project-alpha`
- ✅ Include context: `research-nlp-2024`, `product-docs-v2`
- ✅ Alphanumeric with hyphens/underscores: `team-engineering`
- ❌ Avoid generic names: `data`, `temp`, `test`

### Namespace Lifecycle

1. **Creation** - Automatically created on first use
2. **Active Use** - Memories, embeddings, waypoints added
3. **Archival** - Set `active=0` via `/api/namespaces/:id`
4. **Deletion** - Remove via `DELETE /api/namespaces/:id`

### Multi-Tenancy

For SaaS deployments:

```
Tenant Organization → Multiple Namespaces

acme-corp
  ├─ acme-corp-research
  ├─ acme-corp-engineering
  └─ acme-corp-product

globex
  ├─ globex-sales
  └─ globex-support
```

## Performance Characteristics

- **Namespace overhead**: Minimal (indexed on user_id)
- **Cross-namespace queries**: Not supported (by design for isolation)
- **Namespace count**: Scales to 10,000+ namespaces
- **Per-namespace performance**: Same as single-tenant (100k+ memories)

## Security Considerations

1. **Namespace isolation** - Guaranteed at database query level
2. **No cross-namespace leakage** - All queries filtered by user_id
3. **Authentication** - Delegated to external layer
4. **Authorization** - Handled by OIDC proxy (namespace mapping)
5. **Audit logging** - Can be implemented in proxy layer

## Future Enhancements

- Namespace quotas and rate limiting
- Namespace-level configuration (retention policies, etc.)
- Namespace sharing/collaboration mechanisms
- Namespace backup/export tools

## Summary

OpenMemory's namespace-based architecture provides:

- ✅ **Simplicity** - No agent registration complexity
- ✅ **Scalability** - Supports unlimited namespaces
- ✅ **Isolation** - Complete tenant separation
- ✅ **Flexibility** - Works with any auth mechanism
- ✅ **Performance** - Minimal overhead for multi-tenancy
- ✅ **Security** - Clear isolation boundaries

The design is optimized for SaaS deployments while remaining simple enough for single-user local installations.
