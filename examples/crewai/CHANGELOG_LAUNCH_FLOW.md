# Launch Flow Script Updates

## Changes Made

### 1. Fixed Ollama LLM Integration with CrewAI

**Issue**: CrewAI was trying to call Ollama through OpenAI-compatible API, resulting in "404 page not found" errors even though the Ollama server was running and the model existed.

**Root Cause**:
- CrewAI uses LiteLLM internally for LLM providers
- When passing LangChain LLM objects, CrewAI wraps them in OpenAI-compatible clients
- The OpenAI API format doesn't match Ollama's native API exactly
- Need to use LiteLLM's model string format instead of LangChain objects

**Solution**:
- Changed Ollama integration to use LiteLLM's native model string format
- Model format: `ollama_chat/model_name` (e.g., `ollama_chat/gpt-oss:latest`)
- Set `OLLAMA_API_BASE` environment variable for custom Ollama URLs
- Added connection test during configuration to verify Ollama is accessible
- Return model string instead of LangChain object for CrewAI to handle via LiteLLM

**Before**:
```python
from langchain_ollama import ChatOllama
llm = ChatOllama(model='gpt-oss:latest', base_url='http://linbox5:11434')
# CrewAI wraps this and fails with OpenAI API errors
```

**After**:
```python
import os
os.environ['OLLAMA_API_BASE'] = 'http://linbox5:11434'
llm = 'ollama_chat/gpt-oss:latest'  # LiteLLM format
# CrewAI uses this directly with LiteLLM - works perfectly!
```

**Output**:
```
Configuring LLM:
  Provider: ollama
  Model: gpt-oss:latest
  Base URL: http://linbox5:11434
  Setting OLLAMA_API_BASE=http://linbox5:11434
  ✅ LiteLLM connection test successful
  ✅ Using model: ollama_chat/gpt-oss:latest
```

### 2. Added `allow_delegation` Support

**Issue**: The `allow_delegation` agent attribute was hardcoded to `False` in the script, even though it could be specified in the YAML flow definition.

**Solution**:
- Modified `_create_agent()` method to read `allow_delegation` from agent configuration
- Defaults to `False` if not specified in YAML
- Added to agent creation output to show delegation status
- Updated `flow_schema.py` to include `allow_delegation` in the schema validation

**Example YAML**:
```yaml
agents:
  lead_agent:
    role: "Lead Project Strategist"
    allow_delegation: true  # Now supported!
    goal: "Coordinate and delegate tasks"
    ...
  
  developer_agent:
    role: "Implementation Engineer"
    allow_delegation: false  # or omit for default
    goal: "Execute implementation tasks"
    ...
```

**Output**:
```
=== Created Agent: lead_agent ===
  Role: Lead Project Strategist
  Goal: Maintain the global project model...
  Allow Delegation: True  # ← Now visible

=== Created Agent: developer_agent ===
  Role: Implementation Engineer
  Goal: Implement according to instructions...
  Allow Delegation: False
```

### 2. Fixed OpenAI Connection Issue

**Issue**: When Ollama LLM provider was configured but the required package wasn't installed, CrewAI would silently fall back to OpenAI, causing authentication errors.

**Root Cause**:
- `langchain-community` package was missing
- Import errors were only warnings
- CrewAI defaults to OpenAI when no LLM is explicitly configured

**Solution**:
- Enhanced LLM configuration with multiple import attempts:
  1. Try `langchain-ollama` (newer, recommended package)
  2. Fall back to `langchain-community` (legacy package)
  3. Show clear error messages if both fail
- Added explicit warnings that missing packages will cause OpenAI fallback
- Updated `pyproject.toml` to include both `langchain-ollama` and `langchain-community`
- Changed warnings to errors (❌) to make issues more visible

**Before**:
```
Configuring LLM:
  Provider: ollama
  Model: gpt-oss:latest
  Warning: Could not import LLM provider 'ollama'
  Install with: pip install langchain-ollama

[Later...]
ERROR:root:OpenAI API call failed: Error code: 401
```

**After**:
```
Configuring LLM:
  Provider: ollama
  Model: gpt-oss:latest
  Base URL: http://linbox5:11434
  ✅ Using langchain-ollama (ChatOllama)

=== Created Agent: lead_agent ===
  Role: Lead Project Strategist
  Allow Delegation: True
```

Or if packages are missing:
```
Configuring LLM:
  Provider: ollama
  Model: gpt-oss:latest
  ❌ ERROR: Could not import Ollama provider: No module named 'langchain_ollama'
  Install with: pip install langchain-ollama
  Or: pip install langchain-community

  ⚠️  Without a configured LLM, CrewAI will default to OpenAI!
  Please install the required package and try again.
```

### 3. Improved Whatif Mode

**Enhancement**: Whatif mode now creates agents to show their configuration, including LLM setup and delegation settings.

**Before**: Whatif mode would skip agent creation entirely
**After**: Agents are created (but tasks are not executed) to display full configuration

This helps verify:
- LLM provider is correctly configured
- Allow delegation settings are as expected
- Agent roles and goals are interpolated correctly
- No OpenAI fallback is occurring

## Installation

To use Ollama with the launch script:

```bash
# Install recommended package
pip install langchain-ollama

# Or install legacy package
pip install langchain-community

# Or install both (safest option)
pip install langchain-ollama langchain-community

# Or use the project extras
cd examples/crewai
pip install -e ".[ollama]"
```

## Testing

Test your configuration without execution:

```bash
python launch_flow.py run improve-project-flow.yml --whatif
```

This will show:
- ✅ Successfully configured LLM providers
- ❌ Missing packages or configuration errors
- Agent delegation settings
- All interpolated values

## Updated Files

1. **launch_flow.py**:
   - `_create_agent()`: Added `allow_delegation` support
   - `_configure_llm()`: Enhanced with multiple import attempts and better error messages
   - `setup_crew()`: Moved agent creation before whatif check

2. **flow_schema.py**:
   - Added `allow_delegation` boolean field to agent schema
   - Defaults to `false`

3. **pyproject.toml**:
   - Added `langchain-ollama>=0.1.0` to ollama extras
   - Added to all-llms extras

4. **FLOW_LAUNCHER_README.md**:
   - Updated with subcommand documentation
   - Added `show` command examples

## Migration Notes

If you have existing flow YAML files:

1. **No breaking changes**: Existing files will work without modification
2. **Optional enhancement**: Add `allow_delegation: true` to agents that should coordinate work
3. **Recommended**: Test with `--whatif` to verify LLM configuration

## Example Flow Configuration

```yaml
llms:
  - name: ollama
    provider: ollama
    model: qwen3-coder:30b
    base_url: http://linbox5:11434
    temperature: 0.2
    max_tokens: 4000

agents:
  lead_agent:
    role: "Lead Project Strategist"
    allow_delegation: true  # Can delegate to other agents
    goal: "Coordinate project improvements"
    instructions: |
      Analyze the project and delegate tasks...
    tasks: [...]

  developer_agent:
    role: "Implementation Engineer"
    allow_delegation: false  # Focused executor
    goal: "Implement changes"
    instructions: |
      Execute implementation tasks...
    tasks: [...]
```
