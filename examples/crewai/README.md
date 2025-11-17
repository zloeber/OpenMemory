# CrewAI Flow Launcher

A Python script for loading and launching CrewAI flow definitions from YAML files.

## Overview

The `launch_flow.py` script provides a flexible way to define and execute CrewAI workflows using YAML configuration files. It parses flow definitions including agents, tasks, tools, and workflows, then orchestrates their execution.

## Features

- **YAML-based Flow Definition**: Define entire crew workflows in a readable YAML format
- **Agent Configuration**: Set up multiple agents with roles, goals, and instructions
- **Task Management**: Define tasks with inputs, outputs, and dependencies
- **Tool Integration**: Configure tools available to agents
- **Workflow Orchestration**: Define the execution sequence of tasks
- **Memory Namespace Support**: Configure memory namespaces for agent collaboration
- **LLM Configuration**: Support for multiple LLM providers (Ollama, OpenAI, etc.)

## Installation

1. Install dependencies:
```bash
# Using pip
pip install crewai pyyaml click mcp httpx

# Or using the project's pyproject.toml
pip install -e .

# For LLM support, install provider-specific packages:
pip install -e ".[ollama]"     # For Ollama support
pip install -e ".[openai]"     # For OpenAI support
pip install -e ".[anthropic]"  # For Anthropic support
pip install -e ".[all-llms]"   # For all LLM providers
```

## Usage

The Flow Launcher uses subcommands for different operations:

### Running Workflows

#### Basic Usage

```bash
python launch_flow.py run <flow_definition.yml>
```

#### Example

```bash
python launch_flow.py run improve-project-flow.yml
```

#### Whatif Mode

Preview configuration without executing:

```bash
python launch_flow.py run improve-project-flow.yml --whatif
```

#### Override Input Variables

```bash
python launch_flow.py run improve-project-flow.yml --project-path /path/to/project
```

#### Custom Input Variables

```bash
python launch_flow.py run improve-project-flow.yml -I custom_var=value -I another=123
```

#### Skip Validation

```bash
python launch_flow.py run improve-project-flow.yml --no-validate
```

#### Verbose Output

```bash
python launch_flow.py run improve-project-flow.yml -v
```

### Showing LLM Information

Display LLM connection details without running the workflow:

```bash
# Basic info
python launch_flow.py show improve-project-flow.yml

# Detailed info with connection testing
python launch_flow.py show improve-project-flow.yml -v
```

The `show` command displays:
- LLM provider and model information
- Base URLs with environment variable resolution
- Connection testing (in verbose mode)
- Required environment variables and their status
- Model availability (for Ollama)

### Backward Compatibility

For backward compatibility, the old format still works:

```bash
# Old format (still supported)
python launch_flow.py improve-project-flow.yml

# Equivalent to new format
python launch_flow.py run improve-project-flow.yml
```

## YAML Flow Definition Structure

### Complete Example

```yaml
version: "1.0"

description: >
  Description of what this crew does

# Optional: Model Context Protocol (MCP) server configurations
mcps:
  - name: "sequential-thinking"
    description: "Breaks down complex tasks into sequential steps"
    type: "stdio"
    args: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
  
  - name: "openmemory-mcp"
    description: "Access to OpenMemory's project memory"
    type: "http"
    url: "http://localhost:8080/mcp-proxy"
  
  - name: "searxng"
    type: "stdio"
    args: ["npx", "-y", "mcp-searxng"]
    env:
      SEARXNG_URL: "http://localhost:8081"

# Optional: Define input variables with defaults
inputs:
  - name: project_path
    description: "Path to the project"
    type: string
    default: "."
  - project_id:
      description: "Project identifier"
      type: string
      default: "my_project"

# Optional: Global memory namespace (supports variable interpolation)
memory_namespace: "{project_id}"

# Tools available to agents
tools:
  - name: tool_name
    description: "Tool description"

# Agent definitions
agents:
  agent_name:
    role: "Agent Role"
    memory_namespace: "{project_id}"  # Variable interpolation
    goal: >
      What the agent aims to achieve
    instructions: |
      Detailed instructions for the agent.
      You can reference variables like {project_path} and {project_id}.
    tasks:
      - name: task_name
        description: >
          Process files in {project_path}
        inputs:          # Optional
          - input1
        outputs:         # Optional
          - output1

# Crew configuration
crew:
  name: "Crew Name"
  description: >
    Crew description
  agents:
    - agent_name

# Workflow execution order
workflow:
  - agent: agent_name
    task: task_name

# Optional: LLM configuration
llms:
  - name: ollama
    provider: "ollama"
    base_url: "http://localhost:11434"  # Optional: Custom base URL
    model: "qwen3-coder:30b"
    temperature: 0.2
    max_tokens: 4000
```

### Key Components

#### 1. MCP Servers

Configure Model Context Protocol (MCP) servers that provide tools and capabilities:

```yaml
mcps:
  # STDIO-based MCP server
  - name: "sequential-thinking"
    description: "Breaks down complex tasks"
    type: "stdio"
    args: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
  
  # HTTP-based MCP server
  - name: "openmemory-mcp"
    description: "Project memory access"
    type: "http"
    url: "http://localhost:8080/mcp-proxy"
  
  # STDIO with environment variables
  - name: "searxng"
    type: "stdio"
    args: ["npx", "-y", "mcp-searxng"]
    env:
      SEARXNG_URL: "http://localhost:8081"
  
  # HTTP with options and env var interpolation
  - name: "context7"
    type: "http"
    url: "https://mcp.context7.com/mcp"
    options:
      url: "https://mcp.context7.com/mcp"
      version: "1.0.0"
      headers:
        CONTEXT7_API_KEY: "{$env:CONTEXT7_API_KEY}"
```

**MCP Server Types:**
- **stdio**: Launches a subprocess that communicates via stdin/stdout
  - `args`: Command and arguments to launch the server
  - `env`: Optional environment variables (key-value pairs)
- **http**: Connects to an HTTP endpoint
  - `url`: HTTP(S) URL of the MCP server
  - `options`: Optional configuration object (can include headers, auth, etc.)

**Environment Variable Interpolation:**

Use `{$env:VAR_NAME}` syntax to interpolate environment variables in any MCP configuration field:

```yaml
mcps:
  - name: "my-service"
    type: "http"
    url: "https://api.example.com/mcp"
    options:
      headers:
        API_KEY: "{$env:MY_API_KEY}"
        AUTH_TOKEN: "{$env:AUTH_TOKEN}"
  
  - name: "custom-tool"
    type: "stdio"
    args: ["python", "tool.py"]
    env:
      DATABASE_URL: "{$env:DATABASE_URL}"
      LOG_LEVEL: "info"
```

Environment variables are resolved at runtime. If a variable is not set, the original placeholder text is preserved. Sensitive values (keys, tokens, passwords) are automatically masked in log output.

**Common MCP Servers:**
- `@modelcontextprotocol/server-sequential-thinking`: Step-by-step reasoning
- `@modelcontextprotocol/server-filesystem`: File system operations
- `mcp-searxng`: Web search capabilities
- `mcp-feedback-enhanced`: Interactive user feedback
- `context7`: Up-to-date library and framework documentation
- Custom MCP servers for domain-specific functionality

**Note:** MCP server configurations are currently parsed and logged. Full integration requires implementing MCP client connections and exposing MCP tools to CrewAI agents.

#### 2. Inputs

Define reusable variables with default values:
```yaml
inputs:
  # Format 1: Explicit structure
  - name: project_path
    description: "Path to the project"
    type: string
    default: "."
  
  # Format 2: Compact structure
  - project_id:
      description: "Project identifier"
      type: string
      default: "my_project"
```

Variables can be interpolated anywhere in the flow using `{variable_name}` syntax:
- Agent instructions: `"Process {project_path}"`
- Memory namespaces: `"{project_id}_memory"`
- Task descriptions: `"Analyze {project_path}"`
- Goals and any other text fields

#### 3. Agents

Define agents with:
- `role`: The agent's role in the crew
- `goal`: What the agent aims to accomplish
- `instructions`: Detailed guidance for the agent's behavior
- `memory_namespace`: Optional namespace for shared memory
- `tasks`: List of tasks this agent can perform

#### 4. Tasks

Each task includes:
- `name`: Unique identifier for the task
- `description`: What the task accomplishes
- `inputs`: Optional list of required inputs
- `outputs`: Optional list of expected outputs

#### 5. Workflow

Defines the execution order:
```yaml
workflow:
  - agent: lead_agent
    task: evaluate_project
  - agent: developer_agent
    task: implement_change
```

#### 6. Tools

List of tools agents can use:
```yaml
tools:
  - name: read_file
    description: "Reads the contents of a file"
  - name: write_file
    description: "Writes content to a file"
```

## Flow Launcher API

### FlowLauncher Class

```python
from launch_flow import FlowLauncher

# Initialize launcher
launcher = FlowLauncher("flow_definition.yml")

# Load the flow definition
flow_def = launcher.load_flow()

# Set up the crew with custom input values (overrides defaults)
input_values = {
    'project_path': '/path/to/my/project',
    'project_id': 'custom_project_id'
}
crew = launcher.setup_crew(input_values=input_values)

# Launch with optional crew inputs
crew_inputs = {}  # Separate from input_values
result = launcher.launch(inputs=input_values, crew_inputs=crew_inputs)
```

### Methods

- `load_flow()`: Parse the YAML flow definition
- `setup_crew(input_values)`: Initialize agents and tasks with variable interpolation
  - `input_values`: Dict of variable values to override defaults
- `launch(inputs, crew_inputs)`: Execute the crew workflow
  - `inputs`: Variable values for interpolation (e.g., `project_path`)
  - `crew_inputs`: Parameters passed to `crew.kickoff()`

## Usage Example

With your flow definition:
```yaml
mcps:
  # stdio-based MCP server
  - name: "sequential-thinking"
    args: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
    type: "stdio"
  
  # HTTP-based MCP server with authentication
  - name: "openmemory-mcp"
    type: "http"
    url: "http://localhost:8080/mcp-proxy"
  
  # HTTP-based MCP server with API key
  - name: "context7"
    type: "http"
    url: "https://mcp.context7.com/mcp"
    options:
      headers:
        CONTEXT7_API_KEY: "{$env:CONTEXT7_API_KEY}"
```

When you run:
```bash
python launch_flow.py improve-project-flow.yml
```

The launcher will:
1. Connect to all configured MCP servers (stdio and HTTP)
2. Discover tools from each server:
   - sequential-thinking: `sequentialthinking`
   - openmemory-mcp: `store_memory`, `query_memory`, etc.
   - context7: `get-library-docs`, `resolve-library-id`
3. Wrap them as CrewAI tools:
   - `mcp_sequential-thinking_sequentialthinking`
   - `mcp_openmemory-mcp_store_memory`
   - `mcp_context7_get-library-docs`
4. Make them available to all agents
5. Agents can use: "Use the context7 docs tool to find React documentation"

## Example Flow: Project Improvement

The included `improve-project-flow.yml` demonstrates a complete workflow for project improvements:

1. **Lead Agent**: Evaluates project and identifies improvements
2. **Developer Agent**: Implements selected improvements
3. **QA Agent**: Tests and validates changes

Each agent has:
- Specific memory usage guidelines (semantic, episodic, procedural, etc.)
- AGENTS.md integration for path-specific instructions
- Task inputs and outputs for data flow

## Advanced Features

### MCP Server Integration

The flow supports Model Context Protocol (MCP) servers, which provide standardized interfaces for tools and capabilities:

**Benefits:**
- **Standardized Tool Interface**: Consistent API across different tool providers
- **Composability**: Mix and match MCP servers for different capabilities
- **Reusability**: Share MCP server configurations across projects
- **Isolation**: Each MCP server runs independently

**MCP Server Examples:**
```yaml
mcps:
  # Sequential thinking for complex reasoning
  - name: "sequential-thinking"
    type: "stdio"
    args: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
  
  # File system operations
  - name: "server-filesystem"
    type: "stdio"
    args: ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."]
  
  # Project memory via HTTP
  - name: "openmemory-mcp"
    type: "http"
    url: "http://localhost:8080/mcp-proxy"
  
  # Web search with custom config
  - name: "searxng"
    type: "stdio"
    args: ["npx", "-y", "mcp-searxng"]
    env:
      SEARXNG_URL: "http://localhost:8081"
  
  # HTTP server with API key from environment
  - name: "context7"
    type: "http"
    url: "https://mcp.context7.com/mcp"
    options:
      headers:
        CONTEXT7_API_KEY: "{$env:CONTEXT7_API_KEY}"
```

**Current Status:** The launcher now fully supports both stdio and HTTP-based MCP servers:

**Implemented:**
- ✅ Automatic MCP client initialization for stdio-based servers
- ✅ Automatic MCP client initialization for HTTP-based servers (JSON-RPC over HTTP)
- ✅ Tool discovery from connected MCP servers (both types)
- ✅ Dynamic tool exposure to CrewAI agents
- ✅ Automatic tool wrapping with MCPTool and HTTPMCPTool bridge classes
- ✅ Session lifecycle management and cleanup
- ✅ Error handling and graceful degradation
- ✅ Custom headers and authentication support for HTTP servers
- ✅ Environment variable interpolation for API keys

**How It Works:**

**For stdio-based MCP servers:**
1. Subprocess launched with configured command and environment
2. Client connects via stdin/stdout using MCP SDK
3. Tools discovered using `list_tools()` MCP protocol method
4. Each tool wrapped in `MCPTool` class (extends CrewAI's `BaseTool`)
5. Tools added to all agents automatically

**For HTTP-based MCP servers:**
1. HTTP client created with base URL and headers (including auth)
2. Connection established via JSON-RPC over HTTP
3. Tools discovered by calling `/mcp/v1/tools/list` endpoint
4. Each tool wrapped in `HTTPMCPTool` class
5. Tool calls made via `/mcp/v1/tools/call` endpoint using JSON-RPC protocol
6. Supports custom headers for API keys and authentication

**Security Notes:**
- Sensitive values (API keys, tokens, passwords) are automatically masked in console output
- Use environment variables for secrets rather than hardcoding them in YAML
- Environment variable interpolation happens at runtime using `{$env:VAR_NAME}` syntax

**MCPTool Bridge:**

Two bridge classes connect MCP tools to CrewAI:

**MCPTool (for stdio-based servers):**
```python
class MCPTool(BaseTool):
    """Wrapper to expose MCP tools as CrewAI tools."""
    
    def _run(self, **kwargs) -> str:
        # Executes MCP tool via session.call_tool()
        # Handles async/sync conversion
        # Returns formatted results
```

**HTTPMCPTool (for HTTP-based servers):**
```python
class HTTPMCPTool(BaseTool):
    """Wrapper to expose HTTP-based MCP tools as CrewAI tools."""
    
    def _run(self, **kwargs) -> str:
        # Makes JSON-RPC call to /mcp/v1/tools/call
        # Includes authentication headers
        # Handles async/sync conversion
        # Parses JSON-RPC response
        # Returns formatted results
```

Features:
- Automatic async/sync bridging
- Tool result extraction and formatting
- Error handling with informative messages
- Schema validation from MCP tool definitions
- HTTP authentication support (API keys, tokens)
- JSON-RPC protocol handling

### Memory Types

The flow supports different memory types:
- **Semantic Memory**: Facts, knowledge, conventions
- **Episodic Memory**: Events, failures, unique occurrences
- **Procedural Memory**: Workflows, processes, steps
- **Reflective Memory**: Reasoning, lessons learned
- **Emotional Memory**: User feedback, sentiment
- **Temporal Memory**: Time-based context and changes

### LLM Configuration

Configure different LLM providers:
```yaml
llms:
  - name: ollama
    provider: "ollama"              # ollama, openai, anthropic
    base_url: "http://localhost:11434"  # Optional: Custom endpoint
    model: "qwen3-coder:30b"
    temperature: 0.2
    max_tokens: 4000
    top_p: 0.9                      # Optional
    frequency_penalty: 0            # Optional
    presence_penalty: 0             # Optional
```

Supported providers:
- **ollama**: Local Ollama instances (requires `langchain-community`)
- **openai**: OpenAI and OpenAI-compatible APIs (requires `langchain-openai`)
- **anthropic**: Anthropic Claude models (requires `langchain-anthropic`)

The `base_url` parameter allows you to:
- Point to custom Ollama instances on different hosts/ports
- Use OpenAI-compatible APIs (LM Studio, vLLM, etc.)
- Configure enterprise API endpoints

## Development Notes

### TODOs

The current implementation includes placeholders for:
- Tool initialization (currently logs tool definitions)
- LLM configuration (needs provider-specific setup)
- Advanced workflow patterns (parallel execution, conditional flows)

### Extending the Launcher

To add custom tool support:

```python
def _load_tools(self) -> List[Any]:
    tools = []
    for tool_def in self.flow_def.tools:
        # Initialize your custom tool
        tool = YourCustomTool(tool_def)
        tools.append(tool)
    return tools
```

## Troubleshooting

### Import Errors

Ensure all dependencies are installed:
```bash
pip install crewai pyyaml
```

### YAML Parsing Errors

Validate your YAML syntax:
```bash
python -c "import yaml; yaml.safe_load(open('your_flow.yml'))"
```

### Agent Configuration Issues

Check that:
- All agents referenced in workflow exist in agents section
- All tasks referenced in workflow exist in agent's tasks list
- Required fields (role, goal) are provided for each agent

## Contributing

When creating new flow definitions:
1. Follow the YAML structure outlined above
2. Provide clear descriptions for agents and tasks
3. Document any custom tools or requirements
4. Include memory usage guidelines for agents

## License

See the main project LICENSE file.
