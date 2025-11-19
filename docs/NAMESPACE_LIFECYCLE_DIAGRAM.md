# Namespace Lifecycle with Ontology Profiles

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Application                          │
│  (Agent, Dashboard, SDK, Direct API Call)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /api/namespaces                                     │  │
│  │  - namespace (required)                                   │  │
│  │  - description (optional)                                 │  │
│  │  - ontology_profile (optional)                           │  │
│  │  - metadata (optional)                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PUT /api/namespaces/:namespace                          │  │
│  │  - Update configuration                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /memory/add                                         │  │
│  │  - namespaces: ["my-namespace"]                          │  │
│  │  - Auto-creates if doesn't exist                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Namespace Service                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ create_namespace(config)                                  │  │
│  │ ├─ Validate namespace format                             │  │
│  │ ├─ Store ontology_profile                                │  │
│  │ ├─ Store metadata as JSON                                │  │
│  │ └─ Return NamespaceInfo                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ensure_namespace_exists(namespace)                        │  │
│  │ ├─ Check if exists                                       │  │
│  │ ├─ Auto-create with default config if missing           │  │
│  │ └─ Return { namespace, created: boolean }               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  namespace_groups Table                                   │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ namespace           TEXT PRIMARY KEY                │  │  │
│  │  │ description         TEXT                            │  │  │
│  │  │ ontology_profile    TEXT         ◄── NEW           │  │  │
│  │  │ metadata            TEXT (JSON)  ◄── NEW           │  │  │
│  │  │ created_at          INTEGER                         │  │  │
│  │  │ updated_at          INTEGER                         │  │  │
│  │  │ active              INTEGER                         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Examples

### 1. Explicit Creation with Ontology

```
User Request
    │
    ▼
POST /api/namespaces
{
  namespace: "rpg-campaign",
  ontology_profile: "fantasy_dungeon_master_ontology",
  metadata: { game: "D&D 5e" }
}
    │
    ▼
Namespace Service
├─ Validate format
├─ Insert/Update DB
└─ Return namespace info
    │
    ▼
Response
{
  success: true,
  namespace: "rpg-campaign",
  ontology_profile: "fantasy_dungeon_master_ontology",
  metadata: { game: "D&D 5e" },
  created_at: "2025-11-18T...",
  message: "Namespace created"
}
```

### 2. Auto-Creation on Memory Add

```
User Request
    │
    ▼
POST /memory/add
{
  content: "Player found sword",
  namespaces: ["new-campaign"]  ◄── Doesn't exist yet
}
    │
    ▼
Namespace Middleware
├─ Extract namespace: "new-campaign"
├─ Call ensure_namespace_exists()
│   │
│   ▼
│   Namespace Service
│   ├─ Check DB: not found
│   ├─ Auto-create:
│   │   namespace: "new-campaign"
│   │   description: "Auto-created..."
│   │   ontology_profile: null
│   │   metadata: null
│   └─ Return { created: true }
│
└─ Continue with memory storage
    │
    ▼
Memory stored in "new-campaign" namespace
```

### 3. Update Namespace Configuration

```
User Request
    │
    ▼
PUT /api/namespaces/rpg-campaign
{
  description: "Updated desc",
  metadata: { 
    game: "Pathfinder 2e",
    session: 5
  }
}
    │
    ▼
Namespace Service
├─ Get existing namespace
├─ Merge updates
├─ Update DB
└─ Return updated info
    │
    ▼
Response
{
  success: true,
  namespace: "rpg-campaign",
  description: "Updated desc",
  ontology_profile: "fantasy_dungeon_master_ontology",
  metadata: { game: "Pathfinder 2e", session: 5 },
  updated_at: "2025-11-18T...",
  message: "Namespace updated"
}
```

## Ontology Profile Resolution

```
Namespace Created
    │
    ▼
Has ontology_profile?
    │
    ├─ YES ──► Load profile from backend/config/
    │          │
    │          ▼
    │      ontology.profile.{name}.yml
    │          │
    │          ├─ Entity definitions
    │          ├─ Relationship types
    │          ├─ Memory type mappings
    │          ├─ Validation rules
    │          └─ Inference rules
    │              │
    │              ▼
    │      Apply to memory operations
    │
    └─ NO ──► Use default memory structure
               │
               ▼
           Standard HSG sectors
           (semantic, episodic, procedural,
            reflective, emotional)
```

## Use Case Flow: Multi-Agent System

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Team Setup                         │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    Agent A         Agent B         Agent C
    (Research)      (Coding)        (Testing)
         │               │               │
         └───────────────┼───────────────┘
                         ▼
              POST /api/namespaces
              {
                namespace: "team-project-x",
                ontology: "default_agentic_memory_ontology",
                metadata: {
                  team: ["agent-a", "agent-b", "agent-c"],
                  project: "feature-xyz",
                  lead: "agent-a"
                }
              }
                         │
                         ▼
         ┌───────────────┴───────────────┐
         │     Shared Namespace          │
         │   "team-project-x"            │
         │                               │
         │  Ontology: agentic_memory     │
         │  Entities: Task, Goal, Tool   │
         │  Relationships: assigned_to,  │
         │                depends_on      │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    Store Tasks    Store Code      Store Tests
    Store Goals    Store Bugs      Store Results
         │               │               │
         └───────────────┼───────────────┘
                         ▼
              All memories organized
              by ontology structure
              in shared namespace
```

## Benefits Summary

```
┌─────────────────────────────────────────────────────────────┐
│  Traditional Namespaces    │  Enhanced with Ontologies      │
├────────────────────────────┼────────────────────────────────┤
│  Simple isolation          │  Domain-specific structure     │
│  Generic memory storage    │  Typed entities & relations    │
│  Manual categorization     │  Automatic classification      │
│  No validation             │  Schema validation             │
│  Limited metadata          │  Rich configuration            │
│  One-size-fits-all         │  Profile per use case          │
└─────────────────────────────────────────────────────────────┘
```

## Migration Path

```
Existing Setup
    │
    ├─ Namespaces without profiles
    │  (continue working as before)
    │
    ▼
Run Migration
    │
    ├─ Add ontology_profile column
    ├─ Add metadata column
    └─ Existing data unchanged (NULL values)
    │
    ▼
Update Namespaces (Optional)
    │
    ├─ PUT /api/namespaces/{ns}
    │   { ontology_profile: "..." }
    │
    └─ Existing memories work with new structure
    │
    ▼
New Features Available
    │
    ├─ Create with ontology profiles
    ├─ Store rich metadata
    └─ Benefit from domain structure
```
