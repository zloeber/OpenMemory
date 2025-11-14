# Quick Start Guide - CrewAI with OpenMemory

Get started with the OpenMemory-integrated CrewAI example in 5 minutes.

## Prerequisites

- Python 3.10-3.13
- Docker (for OpenMemory service)
- crewai CLI

## Installation

### 1. Start OpenMemory Service

```bash
cd ../../../  # Go to repo root
docker compose up -d openmemory
```

Verify it's running:
```bash
curl http://localhost:8080/health
```

### 2. Install Dependencies

```bash
cd examples/py-sdk/crewai_memory_middleware
pip install crewai[tools]==1.4.1
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your LLM configuration:
```bash
MODEL=ollama/qwen3:30b
API_BASE=http://localhost:11434
OPENMEMORY_BASE_URL=http://localhost:8080
```

## Running the Example

### Basic Run

```bash
crewai run
```

This will:
1. ✅ Automatically register two agents with OpenMemory
2. 🔧 Provide each agent with memory tools
3. 🔍 Execute research task with memory capabilities
4. 📝 Generate a report in `report.md`

### Watch What Happens

When you run the crew, you'll see:

```
🧠 Setting up OpenMemory integration...
✅ Registered researcher agent: crewai-researcher
   Namespace: research-workspace
   API Key: omp_abc...
✅ Registered analyst agent: crewai-reporting-analyst
   Namespace: reporting-workspace
   API Key: omp_def...
🎉 OpenMemory setup complete!
```

Then agents can:
- 📥 Store findings: `store_in_openmemory(...)`
- 🔎 Query memories: `query_openmemory(...)`

## Verify Integration

### Run Tests

```bash
python test_integration.py
```

Expected output:
```
✅ PASS - Tool Instantiation
✅ PASS - Crew Configuration
✅ PASS - Agent Registration Logic
✅ PASS - Tool Schemas
Total: 4 tests, 4 passed, 0 failed
```

### Run Demo

```bash
python demo_setup.py
```

Shows complete configuration and architecture.

## Example Memory Operations

### Store a Memory

During execution, agents automatically use:
```python
store_in_openmemory(
    content="GPT-4 achieves 87% accuracy on coding tasks",
    sector="semantic",  # or episodic, procedural, emotional, reflective
    salience=0.9
)
```

### Query Memories

```python
query_openmemory(
    query="recent AI breakthroughs",
    k=5  # number of results
)
```

## Query Stored Memories

After running, check what was stored:

```bash
# Using curl
curl http://localhost:8080/memory/all?l=10

# Or using Python SDK
python << EOF
import sys
sys.path.insert(0, '../../../sdk-py')
from openmemory import OpenMemoryAgent

agent = OpenMemoryAgent(
    agent_id="query-agent",
    auto_register=False
)

# This will fail without API key, but shows the pattern
# In real use, you'd have an API key from registration
EOF
```

## Troubleshooting

### OpenMemory Not Running

```bash
# Check service status
docker ps | grep openmemory

# View logs
docker logs openmemory

# Restart if needed
docker compose restart openmemory
```

### Import Errors

Make sure you're running from the correct directory:
```bash
cd examples/py-sdk/crewai_memory_middleware
```

### Agent Registration Fails

1. Check OpenMemory is accessible:
   ```bash
   curl http://localhost:8080/health
   ```

2. Verify environment variables:
   ```bash
   echo $OPENMEMORY_BASE_URL
   ```

3. Check logs in crew output

## Next Steps

### Customize Agents

Edit `src/crewai_memory_middleware/config/agents.yaml` to modify agent behavior.

### Add More Namespaces

In `crew.py`, add shared namespaces:
```python
shared_namespaces=["team-research", "your-custom-namespace"]
```

### Adjust Memory Sectors

Choose appropriate sectors for your use case:
- **episodic**: Events, temporal data
- **semantic**: Facts, preferences
- **procedural**: How-to, processes
- **emotional**: Sentiment, tone
- **reflective**: Meta-information, logs

### Query Past Runs

Use the SDK to query memories from previous runs:
```python
from openmemory import OpenMemoryAgent

agent = OpenMemoryAgent(
    agent_id="crewai-researcher",
    api_key="<your-api-key>",
    auto_register=False
)

results = agent.query_memory("AI research findings", k=10)
print(results)
```

## Resources

- **Full Documentation**: See `INTEGRATION_SUMMARY.md`
- **Architecture Details**: See `README.md`
- **OpenMemory Docs**: https://github.com/zloeber/OpenMemory
- **CrewAI Docs**: https://docs.crewai.com

## Support

Issues? Questions?
1. Check test output: `python test_integration.py`
2. Run demo: `python demo_setup.py`
3. Review logs: `docker logs openmemory`
4. Check main repo: https://github.com/zloeber/OpenMemory/issues

---

**Happy Memory-Enhanced Agent Building! 🧠✨**
