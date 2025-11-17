# Removal of Shared Namespaces

## Overview
This update removes the shared namespaces feature from OpenMemory. Instead of agents having access to multiple namespaces via shared_namespaces, each agent is now associated with a single namespace. Multiple agents can use the same namespace to enable collaboration.

## Changes

### Database Schema
- **Removed Column**: `shared_namespaces` from `agent_registrations` table
- **Migration**: `004_remove_shared_namespaces.sql` handles the schema update

### API Changes

#### POST /api/agents (Agent Registration)
**Before:**
```json
{
  "agent_id": "my-agent",
  "namespace": "my-namespace",
  "permissions": ["read", "write"],
  "shared_namespaces": ["public-data", "team-workspace"],
  "description": "My agent description"
}
```

**After:**
```json
{
  "agent_id": "my-agent",
  "namespace": "my-namespace",
  "permissions": ["read", "write"],
  "description": "My agent description"
}
```

#### GET /api/agents
The response no longer includes `shared_namespaces` field for each agent.

#### GET /api/namespaces/summary
- Removed `shared_agent_count` from namespace summary
- Only `primary_agent_count` is now provided (renamed to just `agent_count`)

### MCP Proxy Tools

#### register_agent
**Removed Parameter**: `shared_namespaces`

**Before:**
```json
{
  "agent_id": "research-agent",
  "namespace": "research-data",
  "shared_namespaces": ["public-papers", "team-docs"]
}
```

**After:**
```json
{
  "agent_id": "research-agent",
  "namespace": "research-data"
}
```

### Python SDK

#### OpenMemoryAgent
**Removed Parameters:**
- `shared_namespaces` from `__init__()`
- `shared_namespaces` from `register()`

**Before:**
```python
agent = OpenMemoryAgent(
    agent_id="my-agent",
    namespace="my-workspace",
    shared_namespaces=["team-knowledge", "public-data"]
)
```

**After:**
```python
agent = OpenMemoryAgent(
    agent_id="my-agent",
    namespace="my-workspace"
)
```

#### register_agent() helper
**Removed Parameter**: `shared_namespaces`

### Dashboard UI
- Removed "Shared Namespaces" field from agent registration/edit form
- Removed "Shared Access" column from namespace summary table
- Updated agent details display to show single namespace only

## Migration Guide

### For Existing Deployments

1. **Run Migration**: Apply migration `004_remove_shared_namespaces.sql`
   ```bash
   # The migration will automatically remove the shared_namespaces column
   # while preserving all other agent data
   ```

2. **Update Client Code**: Remove shared_namespaces from agent registration calls
   ```python
   # Before
   agent = OpenMemoryAgent(
       agent_id="agent1",
       namespace="workspace",
       shared_namespaces=["team-data"]  # Remove this
   )
   
   # After
   agent = OpenMemoryAgent(
       agent_id="agent1",
       namespace="workspace"
   )
   ```

3. **Enable Collaboration**: If agents need to share data, have them use the same namespace
   ```python
   # Agent 1
   agent1 = OpenMemoryAgent(agent_id="agent1", namespace="team-workspace")
   
   # Agent 2 - uses same namespace for collaboration
   agent2 = OpenMemoryAgent(agent_id="agent2", namespace="team-workspace")
   ```

### Collaboration Pattern

**Old Approach (Shared Namespaces):**
```python
agent1 = OpenMemoryAgent(
    agent_id="researcher",
    namespace="researcher-private",
    shared_namespaces=["team-project"]
)
agent2 = OpenMemoryAgent(
    agent_id="analyst", 
    namespace="analyst-private",
    shared_namespaces=["team-project"]
)
```

**New Approach (Same Namespace):**
```python
agent1 = OpenMemoryAgent(
    agent_id="researcher",
    namespace="team-project"
)
agent2 = OpenMemoryAgent(
    agent_id="analyst",
    namespace="team-project"
)
```

## Benefits

1. **Simplified Architecture**: Easier to understand and maintain
2. **Clearer Collaboration Model**: Multiple agents in the same namespace is more intuitive
3. **Reduced Complexity**: Fewer edge cases and access control checks
4. **Better Performance**: Simpler namespace validation logic

## Breaking Changes

⚠️ **This is a breaking change** for:
- API clients using `shared_namespaces` parameter
- Python SDK code using `shared_namespaces`
- Dashboard configurations expecting shared namespace fields
- Any custom integrations querying the `agent_registrations` table

## Support

If you have questions or need help migrating, please open an issue on the OpenMemory repository.
