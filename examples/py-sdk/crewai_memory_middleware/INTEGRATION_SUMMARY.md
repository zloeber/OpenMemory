# OpenMemory Integration Summary

This document summarizes the OpenMemory integration added to the CrewAI memory middleware example.

## Overview

The integration demonstrates how to use the OpenMemory SDK with CrewAI agents through the MCP proxy, providing persistent memory across agent runs with namespace isolation and multi-sector memory organization.

## Implementation Details

### 1. Agent Registration (`crew.py`)

The `@before_kickoff` decorator automatically registers CrewAI agents with OpenMemory:

```python
@before_kickoff
def setup_openmemory(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
    # Registers researcher agent
    researcher_agent = OpenMemoryAgent(
        agent_id="crewai-researcher",
        namespace="research-workspace",
        description="AI researcher for data analysis",
        permissions=["read", "write"],
        shared_namespaces=["team-research", "public-knowledge"],
        base_url=self.openmemory_base_url,
        auto_register=True
    )
```

**Benefits:**
- Automatic registration on crew startup
- Unique namespaces for each agent
- API key generation and management
- Shared namespace support for collaboration

### 2. MCP Proxy Tools (`tools/openmemory_tool.py`)

Two tools enable memory operations via the MCP proxy:

#### Query Tool
```python
OpenMemoryQueryTool(agent_id, api_key, base_url)
```
- Searches memories using semantic similarity
- Supports namespace filtering
- Returns formatted results with sector and salience info

#### Storage Tool
```python
OpenMemoryStorageTool(agent_id, api_key, base_url)
```
- Stores memories in appropriate sectors
- Supports custom salience and metadata
- Provides feedback on successful storage

**Key Features:**
- Built-in error handling
- Proper authentication via API keys
- MCP protocol compliance
- Pydantic input validation

### 3. Tool Integration

Each agent receives OpenMemory tools during initialization:

```python
@agent
def researcher(self) -> Agent:
    om_agent = self.openmemory_agents.get('researcher')
    om_tools = create_openmemory_tools(
        agent_id=om_agent.agent_id,
        api_key=om_agent.api_key,
        base_url=self.openmemory_base_url
    )
    return Agent(
        config=self.agents_config['researcher'],
        verbose=True,
        tools=om_tools
    )
```

## Configuration

### Environment Variables

Add to `.env`:
```bash
OPENMEMORY_BASE_URL=http://localhost:8080
```

### Agent Configuration

| Agent | Namespace | Shared Namespaces | Permissions |
|-------|-----------|-------------------|-------------|
| Researcher | research-workspace | team-research, public-knowledge | read, write |
| Reporting Analyst | reporting-workspace | team-research, reports-archive | read, write |

## Usage Examples

### During Crew Execution

Agents can automatically use memory tools:

**Query memories:**
```python
query_openmemory(
    query="recent AI breakthroughs",
    k=5
)
```

**Store findings:**
```python
store_in_openmemory(
    content="GPT-4 achieves 87% on coding benchmarks",
    sector="semantic",
    salience=0.9
)
```

## Testing

The implementation includes comprehensive tests:

### Test Suite (`test_integration.py`)
```bash
python test_integration.py
```

Tests verify:
- ✅ Tool instantiation
- ✅ Crew configuration
- ✅ Agent registration logic
- ✅ Tool schemas

### Demo Script (`demo_setup.py`)
```bash
python demo_setup.py
```

Shows:
- Agent configuration
- Tool capabilities
- Memory architecture
- Usage examples

## Architecture

```
┌────────────────────────────────────────────────┐
│         CrewAI Crew (Research Team)           │
│  ┌──────────────┐    ┌──────────────┐         │
│  │  Researcher  │───▶│   Analyst    │         │
│  └──────┬───────┘    └──────┬───────┘         │
└─────────┼────────────────────┼─────────────────┘
          │                    │
          └─────────┬──────────┘
                    │ MCP Proxy
          ┌─────────▼──────────────────┐
          │   OpenMemory Backend       │
          │                            │
          │  Namespaces:               │
          │  • research-workspace      │
          │  • reporting-workspace     │
          │  • team-research (shared)  │
          │                            │
          │  Memory Sectors:           │
          │  • Episodic (events)       │
          │  • Semantic (facts)        │
          │  • Procedural (how-to)     │
          │  • Emotional (sentiment)   │
          │  • Reflective (meta)       │
          └────────────────────────────┘
```

## Benefits

1. **Persistent Memory**: Agents remember information across runs
2. **Namespace Isolation**: Each agent has a private memory workspace
3. **Collaboration**: Shared namespaces enable team work
4. **Multi-Sector Storage**: Organize memories by type (episodic, semantic, etc.)
5. **Semantic Search**: Find relevant memories efficiently
6. **Automatic Registration**: No manual agent setup required
7. **MCP Compliance**: Uses standard MCP proxy protocol

## Files Created/Modified

### New Files
- `tools/openmemory_tool.py` - MCP proxy tools (243 lines)
- `test_integration.py` - Test suite (233 lines)
- `demo_setup.py` - Demo script (162 lines)
- `INTEGRATION_SUMMARY.md` - This document

### Modified Files
- `crew.py` - Added agent registration and tool integration
- `tools/__init__.py` - Added new tool exports
- `README.md` - Updated with integration documentation
- `.env.example` - Added OpenMemory configuration
- `pyproject.toml` - Documented SDK dependency

## Running the Example

### 1. Start Services
```bash
# Start OpenMemory
cd ../../../
docker compose up -d openmemory

# Optional: Start search service
cd examples/py-sdk/crewai_memory_middleware
docker compose up -d searxng
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your LLM configuration
```

### 3. Run the Crew
```bash
crewai run
```

### 4. Observe Memory Operations

During execution, you'll see:
- Agent registration messages
- Memory storage operations
- Query operations retrieving past memories
- Final report generation

## Next Steps

- Experiment with different memory sectors
- Add custom namespaces for specific workflows
- Query stored memories after runs
- Use shared namespaces for multi-agent collaboration
- Adjust salience values to prioritize important memories

## Support

For issues or questions:
- Check the main OpenMemory documentation
- Review the SDK examples in `examples/py-sdk/`
- See agent registration examples in `examples/py-sdk/agent_registration.py`
