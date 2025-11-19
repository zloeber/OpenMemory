# Namespace Ontology Profiles

## Overview

OpenMemory now supports **ontology profiles** for namespaces, allowing you to configure how memories are structured, categorized, and related within each namespace. This enables domain-specific memory organization tailored to your use case.

## Features

✅ **Auto-Creation**: Namespaces are created automatically on first use  
✅ **Explicit API Creation**: Create namespaces via API with full configuration  
✅ **Ontology Profiles**: Associate namespaces with predefined ontology schemas  
✅ **Custom Metadata**: Store arbitrary metadata per namespace  
✅ **Update Support**: Modify namespace configuration after creation  

## What are Ontology Profiles?

Ontology profiles define:
- **Entity types** (e.g., Task, Goal, User, Monster, Emotion)
- **Relationships** between entities (e.g., "owns_pet", "therapist_of")
- **Memory type mappings** (semantic, episodic, procedural, reflective, emotional, temporal)
- **Validation rules** and inference logic
- **Domain-specific attributes** and constraints

## Available Ontology Profiles

### 1. Default Agentic Memory (`default_agentic_memory_ontology`)
**Domain**: General agent frameworks  
**Best For**: Task automation, tool-using agents, multi-agent systems

**Entity Types**:
- Agent, User, Goal, Task, Tool, Procedure, Event, Insight, Knowledge

**Use Cases**:
- Task execution tracking
- Agent collaboration
- Tool usage logging
- Goal management
- Learning from experience

### 2. Fantasy Dungeon Master (`fantasy_dungeon_master_ontology`)
**Domain**: RPG game management  
**Best For**: AI dungeon masters, game state tracking

**Entity Types**:
- Character, Monster, Quest, Location, Item, Skill, Event, WorldState

**Use Cases**:
- Campaign management
- Character relationship tracking
- Quest progression
- Combat history
- World state evolution

### 3. Therapy & Psychology (`therapy_psychology_ontology`)
**Domain**: Mental health support  
**Best For**: AI therapy assistants, mood tracking, therapeutic conversations

**Entity Types**:
- Patient, Therapist, Session, Emotion, Coping Strategy, Treatment Plan, Insight

**Use Cases**:
- Session history
- Emotional pattern tracking
- Treatment progress monitoring
- Coping strategy recommendations
- Therapeutic insights

## API Usage

### Create Namespace with Ontology Profile

```bash
POST /api/namespaces
Content-Type: application/json
x-api-key: your-api-key

{
  "namespace": "my-dungeon-master",
  "description": "Fantasy RPG campaign memory",
  "ontology_profile": "fantasy_dungeon_master_ontology",
  "metadata": {
    "game_system": "D&D 5e",
    "campaign": "Lost Mines",
    "max_players": 6
  }
}
```

**Response**:
```json
{
  "success": true,
  "namespace": "my-dungeon-master",
  "description": "Fantasy RPG campaign memory",
  "ontology_profile": "fantasy_dungeon_master_ontology",
  "metadata": {
    "game_system": "D&D 5e",
    "campaign": "Lost Mines",
    "max_players": 6
  },
  "created_at": "2025-11-18T10:30:00Z",
  "updated_at": "2025-11-18T10:30:00Z",
  "message": "Namespace 'my-dungeon-master' created successfully"
}
```

### Create Simple Namespace (No Ontology)

```bash
POST /api/namespaces
Content-Type: application/json

{
  "namespace": "project-alpha",
  "description": "Team collaboration space"
}
```

Namespaces without ontology profiles use the default memory structure.

### Update Namespace Configuration

```bash
PUT /api/namespaces/my-dungeon-master
Content-Type: application/json

{
  "description": "Updated description",
  "metadata": {
    "game_system": "Pathfinder 2e",
    "campaign": "Abomination Vaults",
    "max_players": 4
  }
}
```

### List All Namespaces

```bash
GET /api/namespaces
```

**Response**:
```json
{
  "namespaces": [
    {
      "namespace": "my-dungeon-master",
      "description": "Fantasy RPG campaign memory",
      "ontology_profile": "fantasy_dungeon_master_ontology",
      "metadata": { "game_system": "D&D 5e" },
      "created_at": "2025-11-18T10:30:00Z",
      "updated_at": "2025-11-18T10:30:00Z",
      "active": 1
    }
  ],
  "total": 1
}
```

### Get Namespace Details

```bash
GET /api/namespaces/my-dungeon-master
```

### Deactivate Namespace

```bash
DELETE /api/namespaces/my-dungeon-master
```

## Auto-Creation on First Use

Namespaces are **automatically created** when first referenced in memory operations:

```bash
POST /memory/add
Content-Type: application/json

{
  "content": "Player discovered the hidden treasure",
  "namespaces": ["new-campaign-auto"],  # Will be auto-created
  "tags": ["discovery", "treasure"]
}
```

The namespace `new-campaign-auto` will be created with:
- Description: `"Auto-created namespace: new-campaign-auto"`
- No ontology profile (uses default structure)
- No metadata

## Metadata Examples

### Game Master Namespace
```json
{
  "game_system": "D&D 5e",
  "campaign": "Curse of Strahd",
  "difficulty": "hard",
  "max_players": 6,
  "session_count": 12,
  "current_level": 5
}
```

### Therapy Agent Namespace
```json
{
  "specialization": "cognitive-behavioral-therapy",
  "patient_demographics": "adults",
  "session_length": 50,
  "privacy_level": "maximum",
  "treatment_focus": ["anxiety", "depression"]
}
```

### Task Automation Agent
```json
{
  "agent_type": "task-automation",
  "capabilities": ["web-search", "file-ops", "api-calls"],
  "priority": "high",
  "owner": "team-engineering",
  "model": "gpt-4"
}
```

## Custom Ontology Profiles

You can create your own ontology profiles by adding YAML files to `backend/config/`:

```yaml
# backend/config/ontology.profile.myprofile.yml
ontology:
  name: "my_custom_ontology"
  version: "1.0"
  domain: "my_domain"
  description: "Custom ontology for my use case"
  
  memory_mappings:
    semantic: ["Entity", "Concept"]
    episodic: ["Event", "Interaction"]
    procedural: ["Workflow", "Action"]
    
  entities:
    - name: "MyEntity"
      description: "Custom entity type"
      attributes:
        - name: "property1"
          type: "string"
      memory_type: "semantic"
      
  relationships:
    - name: "related_to"
      description: "Generic relationship"
      from: "MyEntity"
      to: "MyEntity"
      type: "association"
```

Then reference it when creating namespaces:
```json
{
  "namespace": "my-custom-space",
  "ontology_profile": "my_custom_ontology"
}
```

## Migration

If you have existing namespaces, run the migration to add the new columns:

```bash
cd backend
sqlite3 data/openmemory.sqlite < migrations/003_add_namespace_ontology.sql
```

Or for PostgreSQL:
```bash
psql -U postgres -d openmemory -f migrations/003_add_namespace_ontology.sql
```

## Best Practices

1. **Choose the right ontology profile** for your use case
2. **Use metadata** to store configuration and context
3. **Auto-creation is convenient** but explicit creation gives more control
4. **Update namespaces** as your requirements evolve
5. **Document your custom ontologies** if creating new profiles
6. **Use descriptive namespace names** (e.g., `therapy-patient-001`, `rpg-campaign-strahd`)

## Use Case Examples

### Multi-Tenant AI Platform
```javascript
// Create tenant-specific namespaces with profiles
await createNamespace({
  namespace: `tenant-${tenantId}-therapy`,
  ontology_profile: 'therapy_psychology_ontology',
  metadata: { tenant_id: tenantId, plan: 'premium' }
});
```

### RPG Game Server
```javascript
// Create campaign namespace
await createNamespace({
  namespace: `campaign-${campaignId}`,
  ontology_profile: 'fantasy_dungeon_master_ontology',
  metadata: { 
    dm: userId,
    players: playerIds,
    system: 'D&D 5e'
  }
});
```

### Agent Swarm Coordination
```javascript
// Create team namespace with agent capabilities
await createNamespace({
  namespace: 'agent-team-alpha',
  ontology_profile: 'default_agentic_memory_ontology',
  metadata: {
    team_lead: 'coordinator-agent',
    capabilities: ['research', 'coding', 'testing'],
    project: 'feature-xyz'
  }
});
```

## See Also

- [Ontology Schema Documentation](ontology.schema.yml)
- [Namespace Isolation Guide](NAMESPACE_ISOLATION.md)
- [Example Implementations](../examples/js-sdk/namespace-ontology-examples.ts)
- [Migration Guide](MIGRATION-V2.md)
