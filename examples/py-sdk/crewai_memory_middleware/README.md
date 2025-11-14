# CrewAI Memory Middleware with OpenMemory

Welcome to the CrewAI Memory Middleware example, demonstrating deep integration between [crewAI](https://crewai.com) and [OpenMemory](https://github.com/zloeber/OpenMemory). This example shows how to:

- **Automatically register CrewAI agents** with OpenMemory via the SDK
- **Use the MCP proxy** as a tool within CrewAI agents for memory operations
- **Store and query memories** using OpenMemory's multi-sector architecture
- **Enable agents to have persistent memory** across runs

Our goal is to enable your agents to collaborate effectively on complex tasks while maintaining persistent, searchable memory of all their interactions and findings.

## Installation

Ensure you have Python >=3.10 <3.14 installed on your system. This project uses [UV](https://docs.astral.sh/uv/) for dependency management and package handling, offering a seamless setup and execution experience.

First, if you haven't already, install uv:

```bash
pip install uv
```

Next, navigate to your project directory and install the dependencies:

(Optional) Lock the dependencies and install them by using the CLI command:
```bash
crewai install
```
### Configuration

Configure your `.env` file:

```bash
cp ./.env.example ./.env
```

## OpenMemory Integration

This example demonstrates the following OpenMemory features:

1. **Automatic Agent Registration**: Each CrewAI agent is automatically registered with OpenMemory, getting its own namespace and API key
2. **MCP Proxy Tools**: Agents can query and store memories using the MCP proxy endpoint
3. **Namespace Isolation**: Each agent has its own memory workspace, with optional shared namespaces for collaboration
4. **Multi-Sector Memory**: Memories are classified into sectors (episodic, semantic, procedural, emotional, reflective)

### How It Works

1. **Before Kickoff**: The `@before_kickoff` decorator in `crew.py` automatically registers all agents with OpenMemory
2. **Tool Integration**: Each agent receives `query_openmemory` and `store_in_openmemory` tools
3. **Memory Operations**: Agents can store findings and query past memories during task execution
4. **Persistent Knowledge**: All agent interactions are stored and can be retrieved in future runs

## Services

Start backend services if not started already

```bash
# Start OpenMemory services (required)
cd ../../../
docker compose up --build -d openmemory
cd examples/py-sdk/crewai_memory_middleware

# Local web search (optional, for research tasks)
docker compose up -d searxng
```

## Running the Project

To kickstart your crew of AI agents and begin task execution, run this from the root folder of your project:

```bash
$ crewai run
```

This command initializes the crewai-memory-middleware Crew, assembling the agents and assigning them tasks as defined in your configuration.

### What Happens During Execution

1. **Agent Registration**: The crew automatically registers two agents with OpenMemory:
   - `crewai-researcher` with namespace `research-workspace`
   - `crewai-reporting-analyst` with namespace `reporting-workspace`

2. **Memory Tools**: Each agent receives OpenMemory tools that allow them to:
   - Query past memories with `query_openmemory`
   - Store new findings with `store_in_openmemory`

3. **Research & Reporting**: The researcher investigates the topic and can store findings in OpenMemory. The analyst can query these findings to create comprehensive reports.

4. **Output**: Creates a `report.md` file with detailed research on the specified topic (default: AI LLMs)

### Example Memory Operations

During execution, agents can use their OpenMemory tools:

```python
# Store a finding (agent does this automatically)
"store_in_openmemory": {
    "content": "GPT-4 achieves 87% accuracy on coding benchmarks",
    "sector": "semantic",
    "salience": 0.9
}

# Query past research (agent does this automatically)
"query_openmemory": {
    "query": "recent AI breakthroughs",
    "k": 5
}
```

## Understanding Your Crew

The crewai-memory-middleware Crew is composed of multiple AI agents, each with unique roles, goals, and tools. These agents collaborate on a series of tasks, defined in `config/tasks.yaml`, leveraging their collective skills to achieve complex objectives. The `config/agents.yaml` file outlines the capabilities and configurations of each agent in your crew.

### Agent Architecture with OpenMemory

```
┌─────────────────────────────────────────────────────────────┐
│                    CrewAI Crew                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Researcher     │         │  Reporting       │         │
│  │   Agent          │────────▶│  Analyst         │         │
│  │                  │         │                  │         │
│  │ Tools:           │         │ Tools:           │         │
│  │ - query_memory   │         │ - query_memory   │         │
│  │ - store_memory   │         │ - store_memory   │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────────┼─────────────────┘
            │                              │
            │         MCP Proxy            │
            └──────────────┬───────────────┘
                           │
            ┌──────────────▼───────────────┐
            │   OpenMemory Backend         │
            │                              │
            │  Namespaces:                 │
            │  - research-workspace        │
            │  - reporting-workspace       │
            │  - team-research (shared)    │
            │                              │
            │  Memory Sectors:             │
            │  - Episodic, Semantic        │
            │  - Procedural, Emotional     │
            │  - Reflective                │
            └──────────────────────────────┘
```

### Key Components

1. **crew.py**: Defines the crew and implements the `@before_kickoff` decorator that:
   - Registers agents with OpenMemory
   - Creates OpenMemory tools for each agent
   - Configures namespaces and permissions

2. **tools/openmemory_tool.py**: Implements two CrewAI tools:
   - `OpenMemoryQueryTool`: Searches memories via MCP proxy
   - `OpenMemoryStorageTool`: Stores new memories via MCP proxy

3. **OpenMemory SDK Integration**: Uses the Python SDK to:
   - Register agents automatically
   - Manage API keys and namespaces
   - Provide authenticated access to MCP proxy

## Support

For support, questions, or feedback regarding the CrewaiMemoryMiddleware Crew or crewAI.
- Visit our [documentation](https://docs.crewai.com)
- Reach out to us through our [GitHub repository](https://github.com/joaomdmoura/crewai)
- [Join our Discord](https://discord.com/invite/X4JWnZnxPb)
- [Chat with our docs](https://chatg.pt/DWjSBZn)

Let's create wonders together with the power and simplicity of crewAI.
