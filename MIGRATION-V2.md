# Migration Guide: Agent-Based to Namespace-Based Architecture

## Overview

OpenMemory 2.0 simplifies the architecture by eliminating agent registration entirely. This guide helps you migrate from the agent-based v1.x to the namespace-based v2.0.

## What Changed

### Removed
- ❌ Agent registration endpoints (`/api/agents/*`)
- ❌ Agent registration tools in MCP proxy
- ❌ `agent_registrations` database table
- ❌ `agent_access_log` database table
- ❌ Agent-specific fields in `namespace_groups`

### Added
- ✅ Namespace validation middleware
- ✅ Metrics API endpoints
- ✅ Bootstrap script for testing
- ✅ On-demand namespace creation
- ✅ X-Namespace header support

### Changed
- 🔄 All memory operations use `namespace` instead of `agent_id`
- 🔄 MCP tools require `namespace` parameter
- 🔄 Namespace is primary isolation mechanism

## Migration Steps

### 1. Database Migration

Run the migration script to update your database schema:

```bash
cd backend
npm run migrate
```

This runs `migrations/007_remove_agent_registration.sql` which:
- Drops `agent_registrations` table
- Drops `agent_access_log` table  
- Removes `created_by` column from `namespace_groups`

### 2. Update API Calls

**Before (v1.x)**:
```javascript
// Register agent first
await fetch('/api/agents', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: 'research-bot',
    namespace: 'research-project',
    permissions: ['read', 'write']
  })
});

// Use agent_id in operations
await fetch('/memory/add', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: 'research-bot',
    content: 'Important finding...'
  })
});
```

**After (v2.0)**:
```javascript
// No registration needed!

// Use namespace directly
await fetch('/memory/add', {
  method: 'POST',
  headers: {
    'X-Namespace': 'research-project'  // Preferred method
  },
  body: JSON.stringify({
    content: 'Important finding...'
  })
});

// Or in request body
await fetch('/memory/add', {
  method: 'POST',
  body: JSON.stringify({
    user_id: 'research-project',  // Maps to namespace
    content: 'Important finding...'
  })
});
```

### 3. Update MCP Tool Calls

**Before (v1.x)**:
```javascript
// MCP tools with agent_id
{
  "tool": "register_agent",
  "params": {
    "agent_id": "research-bot",
    "namespace": "research-project"
  }
}

{
  "tool": "query_memory",
  "params": {
    "agent_id": "research-bot",
    "query": "findings"
  }
}
```

**After (v2.0)**:
```javascript
// No registration tool exists

// Just use namespace parameter
{
  "tool": "query_memory",
  "params": {
    "namespace": "research-project",
    "query": "findings"
  }
}

{
  "tool": "store_memory",
  "params": {
    "namespace": "research-project",
    "content": "Important finding..."
  }
}
```

### 4. Update Client Code

**Python SDK** (if using custom client):

```python
# Before
client = OpenMemoryClient()
client.register_agent(agent_id="bot", namespace="project")
client.store_memory(agent_id="bot", content="...")

# After
client = OpenMemoryClient()
# No registration needed
client.store_memory(namespace="project", content="...")
```

**JavaScript/TypeScript**:

```typescript
// Before
const client = new OpenMemoryClient();
await client.registerAgent({ 
  agentId: "bot", 
  namespace: "project" 
});
await client.storeMemory({ 
  agentId: "bot", 
  content: "..." 
});

// After
const client = new OpenMemoryClient();
// No registration needed
await client.storeMemory({ 
  namespace: "project", 
  content: "..." 
});
```

### 5. Testing Your Migration

Use the bootstrap script to verify everything works:

```bash
cd backend/scripts
node bootstrap-memories.js
```

This will:
1. Create two test namespaces
2. Load realistic memory sequences
3. Display metrics for verification

Check the results:

```bash
# View all namespaces
curl http://localhost:8080/api/namespaces

# View metrics
curl http://localhost:8080/api/metrics/summary

# Query memories
curl -X POST http://localhost:8080/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "research",
    "filters": {"user_id": "research-project"}
  }'
```

## Configuration Changes

### Environment Variables

No new environment variables required. Existing configuration works as-is.

### Docker Deployment

No changes needed for Docker deployment. The simplified architecture has fewer moving parts:

```yaml
# docker-compose.yml - no changes needed
services:
  openmemory:
    image: openmemory:2.0
    ports:
      - "8080:8080"
    environment:
      - OM_DB_PATH=/data/openmemory.sqlite
```

## Backward Compatibility

### Breaking Changes

1. **Agent Registration Endpoints Removed**
   - `/api/agents` - No longer exists
   - `/api/agents/:id` - No longer exists
   - `/api/registration-template` - No longer exists

2. **MCP Tools Removed**
   - `register_agent` - No longer exists
   - `list_agents` - No longer exists
   - `get_agent` - No longer exists

3. **Database Schema**
   - `agent_registrations` table removed
   - `agent_access_log` table removed

### Migration for Existing Data

**Namespaces are preserved!** The migration only removes agent tracking:

```sql
-- Your existing namespaces remain intact
SELECT * FROM namespace_groups;

-- Your existing memories remain intact  
SELECT * FROM memories;
```

The `user_id` field in memories already maps to namespaces, so no data migration is needed.

## OIDC Proxy Integration

For production SaaS deployments, add an authentication layer:

### Example Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    location /api/ {
        # Validate JWT token
        auth_request /auth/validate;
        
        # Extract namespace from JWT claims
        auth_request_set $namespace $upstream_http_x_namespace;
        
        # Inject namespace header
        proxy_set_header X-Namespace $namespace;
        
        # Forward to OpenMemory
        proxy_pass http://openmemory:8080;
    }
    
    location = /auth/validate {
        internal;
        proxy_pass http://auth-service/validate;
        proxy_pass_request_body off;
    }
}
```

### Example Authentication Service

```javascript
// auth-service/validate endpoint
app.post('/validate', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify JWT
  const decoded = jwt.verify(token, SECRET);
  
  // Map user to namespace (your logic here)
  const namespace = `org-${decoded.org_id}`;
  
  // Return namespace for injection
  res.setHeader('X-Namespace', namespace);
  res.status(200).send();
});
```

## Rollback Plan

If you need to rollback to v1.x:

1. **Restore database backup** (from before migration)
2. **Redeploy v1.x code**
3. **Restore agent registration data** (if needed)

Always backup your database before running migrations!

## Common Issues

### Issue: "Namespace required" error

**Cause**: Request doesn't include namespace parameter

**Solution**: Add namespace via header, body, or query parameter

```bash
# Use X-Namespace header
curl -H "X-Namespace: my-project" http://localhost:8080/memory/add

# Or in request body
curl -X POST http://localhost:8080/memory/add \
  -d '{"user_id": "my-project", "content": "..."}'
```

### Issue: Existing clients still using agent_id

**Cause**: Old client code not updated

**Solution**: Update client to use namespace instead:

```diff
- body: { agent_id: "bot", content: "..." }
+ body: { user_id: "namespace", content: "..." }
```

or

```diff
+ headers: { "X-Namespace": "namespace" }
  body: { content: "..." }
```

### Issue: Can't find old agent endpoints

**Cause**: Endpoints removed in v2.0

**Solution**: Remove agent registration logic from your application. Namespaces are created automatically.

## Benefits of New Architecture

✅ **Simpler** - No registration ceremony
✅ **Faster** - Fewer database operations
✅ **Scalable** - Unlimited namespaces
✅ **Flexible** - Works with any auth mechanism
✅ **Secure** - Clear isolation boundaries

## Support

For migration assistance:

- **GitHub Issues**: https://github.com/zloeber/OpenMemory/issues
- **Discord**: https://discord.gg/P7HaRayqTh
- **Documentation**: See ARCHITECTURE.md

## Checklist

Use this checklist to track your migration:

- [ ] Backup database
- [ ] Run migration 007
- [ ] Verify database schema changes
- [ ] Update API calls to use namespace
- [ ] Update MCP tool calls
- [ ] Remove agent registration code
- [ ] Test with bootstrap script
- [ ] Verify metrics endpoint
- [ ] Update production deployment
- [ ] Monitor for issues
- [ ] Update documentation

## Timeline

Estimated migration time:
- **Small deployment** (1-10 instances): 1-2 hours
- **Medium deployment** (10-100 instances): 4-8 hours  
- **Large deployment** (100+ instances): 1-2 days

Plan for testing and gradual rollout in production environments.
