# Flow Schema Validation

Schema validation for CrewAI flow definition YAML files using JSON Schema.

## Overview

The `flow_schema.py` module provides comprehensive validation for CrewAI flow definitions to ensure they conform to the expected structure before execution. This helps catch configuration errors early and provides clear error messages.

## Features

- **JSON Schema-based validation** for complete structure verification
- **Basic validation fallback** when jsonschema library is not available
- **Detailed error messages** with specific path information
- **Command-line tool** for standalone validation
- **Integrated validation** in the launch script

## Validated Elements

### Required Fields
- `version`: Flow definition version (format: X.Y)
- `description`: Human-readable description
- `agents`: At least one agent definition
- `crew`: Crew configuration with name and agent list
- `workflow`: Execution order with at least one step

### Optional Fields
- `mcps`: MCP server configurations
- `inputs`: Input variable definitions with defaults
- `tools`: Tool definitions (documentation)
- `memory_namespace`: Global memory namespace
- `llms`: LLM provider configurations

### Agent Validation
Each agent must have:
- `role`: Agent's role
- `goal`: Primary goal
- `tasks`: At least one task with name and description
- Optional: `instructions`, `memory_namespace`

### MCP Server Validation
- `name`: Unique identifier
- `type`: Must be "stdio" or "http"
- For stdio: `args` required (command array)
- For http: `url` required (valid URI)
- Optional: `env`, `options`, `description`

### Workflow Validation
- Each step must reference an existing agent
- Each step must reference an existing task from that agent
- Validates cross-references between workflow, agents, and tasks

### LLM Validation
- `name`, `provider`, `model` required
- Provider must be: ollama, openai, anthropic, google, or azure
- Temperature: 0-2
- Top_p: 0-1
- Numeric parameter ranges validated

## Usage

### Command Line

Validate a flow definition file:

```bash
# Basic validation
python flow_schema.py improve-project-flow.yml

# Using the launch script with validation
python launch_flow.py improve-project-flow.yml

# Skip validation
python launch_flow.py improve-project-flow.yml --no-validate
```

### Programmatic Usage

```python
from flow_schema import FlowValidator, validate_flow_file

# Validate a file
is_valid, errors = validate_flow_file("flow.yml", strict=True)

if not is_valid:
    for error in errors:
        print(f"Error: {error}")

# Or use the validator directly
import yaml

with open("flow.yml") as f:
    flow_data = yaml.safe_load(f)

validator = FlowValidator()
is_valid, errors = validator.validate(flow_data, strict=True)
```

### Integration with Launch Script

The validation is automatically integrated into `launch_flow.py`:

```bash
# Validation runs by default
python launch_flow.py improve-project-flow.yml

# Skip validation if needed
python launch_flow.py improve-project-flow.yml --no-validate

# Whatif mode includes validation
python launch_flow.py improve-project-flow.yml --whatif
```

## Validation Modes

### Strict Mode (requires jsonschema)

Uses full JSON Schema validation with jsonschema library:
- Complete structural validation
- Type checking
- Format validation (URIs, enums, etc.)
- Advanced constraint checking

```python
validator.validate(flow_data, strict=True)
```

### Basic Mode (no dependencies)

Fallback validation without jsonschema:
- Required field checking
- Type validation
- Cross-reference validation
- Range checking for numeric values

```python
validator.validate(flow_data, strict=False)
```

## Error Messages

Validation errors are specific and actionable:

```
❌ Flow definition is invalid: improve-project-flow.yml

Validation errors:
  • Missing required field: agents
  • Agent lead_agent: missing required field 'tasks'
  • Workflow step 0: references undefined agent 'nonexistent_agent'
  • MCP 2 (http): missing 'url'
  • LLM 0: temperature must be between 0 and 2
```

## Schema Reference

The complete JSON schema is defined in `flow_schema.py` as `FLOW_SCHEMA`. Key constraints:

- **Version**: String matching pattern `^[0-9]+\.[0-9]+$`
- **MCP Types**: Enum ["stdio", "http"]
- **LLM Providers**: Enum ["ollama", "openai", "anthropic", "google", "azure"]
- **Input Types**: Enum ["string", "number", "boolean", "array", "object"]
- **Conditional Requirements**: stdio MCPs require args, http MCPs require url

## Common Validation Errors

### Missing Required Fields
```
Missing required field: agents
Agent my_agent: missing required field 'role'
```

**Fix**: Add the required field to your configuration.

### Invalid References
```
Workflow step 0: references undefined agent 'typo_agent'
Workflow step 1: agent 'qa_agent' does not have task 'missing_task'
```

**Fix**: Ensure agent names and task names match between sections.

### Type Mismatches
```
MCP 0: type must be 'stdio' or 'http'
LLM 0: invalid provider 'invalid_provider'
```

**Fix**: Use only allowed values from enums.

### Missing Type-Specific Fields
```
MCP 0 (stdio): missing 'args'
MCP 1 (http): missing 'url'
```

**Fix**: Add required fields based on the type.

### Invalid Ranges
```
LLM 0: temperature must be between 0 and 2
LLM 0: top_p must be between 0 and 1
```

**Fix**: Adjust numeric values to be within valid ranges.

## Installation

The jsonschema library is optional but recommended:

```bash
# Install all dependencies including jsonschema
pip install -e .

# Or install separately
pip install jsonschema
```

Without jsonschema, basic validation still works but with fewer checks.

## Extending the Schema

To add custom validation rules, modify `FLOW_SCHEMA` in `flow_schema.py`:

```python
FLOW_SCHEMA["properties"]["my_field"] = {
    "type": "string",
    "description": "My custom field",
    "pattern": "^custom_.*"
}
```

Or extend the `FlowValidator` class:

```python
class CustomFlowValidator(FlowValidator):
    def _basic_validate(self, flow_data):
        is_valid, errors = super()._basic_validate(flow_data)
        
        # Add custom validation
        if "my_field" in flow_data:
            if not flow_data["my_field"].startswith("custom_"):
                errors.append("my_field must start with 'custom_'")
        
        return len(errors) == 0, errors
```

## Testing

Test the validator with your flow files:

```bash
# Test validation
python flow_schema.py improve-project-flow.yml

# Test with whatif mode
python launch_flow.py improve-project-flow.yml --whatif

# Test with verbose output
python launch_flow.py improve-project-flow.yml --whatif -v
```

## Performance

Validation adds minimal overhead:
- Strict mode (jsonschema): ~10-50ms for typical flows
- Basic mode: <5ms for typical flows

Validation runs once during flow loading, not during execution.

## Benefits

1. **Early Error Detection**: Catch configuration errors before execution
2. **Clear Error Messages**: Know exactly what's wrong and where
3. **Documentation**: Schema serves as documentation for flow structure
4. **IDE Support**: JSON schema can be used for autocompletion in IDEs
5. **Version Control**: Ensure flow definitions remain valid across changes
6. **CI/CD Integration**: Validate flows in automated pipelines

## Contributing

To improve validation:
1. Update `FLOW_SCHEMA` for new requirements
2. Add validation methods to `FlowValidator`
3. Add test cases for new validation rules
4. Update documentation with examples
