# Bootstrap Demo Data Script

This script automatically loads realistic demo data into OpenMemory to demonstrate namespace isolation and memory management.

## Important Notes

⚠️ **Current Limitation**: This script requires the backend server to be running in **full mode** (not proxy-only mode) for memory storage to work properly.

- ✅ **Agent Registration**: Works in both modes
- ❌ **Memory Storage**: Requires full mode (not proxy-only mode)

If your server is in proxy-only mode (`OM_PROXY_ONLY_MODE=true`), you'll need to disable that setting or use a different approach for loading demo data.

## What It Does

Creates two separate agents with their own isolated namespaces and loads realistic memory sequences for each:

### Agent 1: alice-dev (Software Engineering Team Lead)
- **Namespace**: `alice-dev-namespace`
- **20 Memories** covering:
  - Production incident responses
  - Architecture decisions (microservices, event-driven systems)
  - Code review feedback
  - Team management (1-on-1s, sprint planning)
  - Performance optimization
  - Security practices

### Agent 2: bob-research (AI/NLP Research Scientist)
- **Namespace**: `bob-research-namespace`
- **20 Memories** covering:
  - Research paper reviews (BERT, GPT, T5, etc.)
  - Experiment results (fine-tuning, training)
  - Conference presentations (NeurIPS, ACL, EMNLP)
  - Model development
  - Dataset curation
  - Collaboration with universities

## Prerequisites

1. Backend server must be running:
   ```bash
   cd backend
   npm run dev
   # or
   npm start
   ```

2. Server should be accessible at `http://localhost:8080` (or set `BASE_URL` environment variable)

## Usage

### Load Demo Data

```bash
# From the backend directory
node scripts/bootstrap-demo-data.js

# Or from project root
node backend/scripts/bootstrap-demo-data.js
```

### Clear and Reload Data

```bash
node scripts/bootstrap-demo-data.js --clear
```

The `--clear` flag will:
1. Delete all existing memories for both agents
2. Re-register the agents (if needed)
3. Load fresh demo data

### Custom Server URL

```bash
BASE_URL=http://localhost:3000 node scripts/bootstrap-demo-data.js
```

## Output

The script provides detailed progress information:

```
🏥 Checking server health...
✅ Server is healthy

📝 Registering agent: alice-dev
✅ Agent registered successfully
   Namespace: alice-dev-namespace
   API Key: opm_abc123...

💾 Adding memory 1/20: Production incident - database connection pool exhausted
✅ Memory added successfully
...

📊 Bootstrap Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Successfully created 2 agents
✅ Successfully created 40 memories
❌ Encountered 0 errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Testing Namespace Isolation

After loading the data, you can test that namespaces are properly isolated:

### Query alice-dev's memories
```bash
curl -X POST http://localhost:8080/api/memories/query \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "alice-dev",
    "api_key": "YOUR_ALICE_API_KEY",
    "query": "microservices architecture",
    "k": 5
  }'
```

### Query bob-research's memories
```bash
curl -X POST http://localhost:8080/api/memories/query \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "bob-research",
    "api_key": "YOUR_BOB_API_KEY",
    "query": "transformer models",
    "k": 5
  }'
```

Each agent should only see memories from their own namespace, demonstrating true namespace isolation.

## Script Structure

- **BootstrapClient**: HTTP client using Node.js native fetch API
- **Scenarios**: Predefined memory sequences with realistic content
- **Error Handling**: Graceful handling of conflicts and failures
- **Progress Tracking**: Real-time feedback during data loading
- **Statistics**: Summary of successful operations and errors

## Memory Structure

Each memory includes:
- `content`: Detailed description of the event/learning
- `tags`: Relevant keywords for categorization
- `metadata`: Additional context (priority, project, status, etc.)
- `sector`: Memory type (episodic, semantic, procedural, emotional, reflective)
- `salience`: Importance score (0.6-0.9)

## Use Cases

- **Testing**: Validate namespace isolation implementation
- **Demo**: Show realistic usage patterns to stakeholders
- **Development**: Quickly populate test data for UI/API development
- **Training**: Demonstrate memory organization and querying
- **Debugging**: Create reproducible scenarios for troubleshooting

## Notes

- The script is idempotent when using `--clear` flag
- Each memory addition has a small delay (100-500ms) to simulate realistic usage
- API keys are displayed during registration for testing purposes
- Both scenarios use realistic technical terminology and scenarios
