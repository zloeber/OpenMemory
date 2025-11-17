#!/usr/bin/env python3
"""
Schema validation for CrewAI flow definition YAML files.

This module provides JSON Schema-based validation for flow definitions
to ensure they conform to the expected structure before execution.
"""

from typing import Dict, Any, List, Optional, Tuple
import json


# JSON Schema for CrewAI Flow Definition
FLOW_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CrewAI Flow Definition",
    "description": "Schema for validating CrewAI flow definition YAML files",
    "type": "object",
    "required": ["version", "description", "agents", "crew", "workflow"],
    "properties": {
        "version": {
            "type": "string",
            "description": "Flow definition version",
            "pattern": "^[0-9]+\\.[0-9]+$"
        },
        "description": {
            "type": "string",
            "description": "Human-readable description of the flow"
        },
        "mcps": {
            "type": "array",
            "description": "Model Context Protocol server configurations",
            "items": {
                "type": "object",
                "required": ["name", "type"],
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Unique name for the MCP server"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the MCP server"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["stdio", "http"],
                        "description": "Type of MCP server connection"
                    },
                    "args": {
                        "type": "array",
                        "description": "Command and arguments for stdio servers",
                        "items": {"type": "string"}
                    },
                    "url": {
                        "type": "string",
                        "description": "URL for HTTP-based MCP servers",
                        "format": "uri"
                    },
                    "env": {
                        "type": "object",
                        "description": "Environment variables for stdio servers",
                        "additionalProperties": {"type": "string"}
                    },
                    "options": {
                        "type": "object",
                        "description": "Additional options for HTTP servers",
                        "properties": {
                            "headers": {
                                "type": "object",
                                "additionalProperties": {"type": "string"}
                            }
                        }
                    }
                },
                "allOf": [
                    {
                        "if": {
                            "properties": {"type": {"const": "stdio"}}
                        },
                        "then": {
                            "required": ["args"]
                        }
                    },
                    {
                        "if": {
                            "properties": {"type": {"const": "http"}}
                        },
                        "then": {
                            "required": ["url"]
                        }
                    }
                ]
            }
        },
        "inputs": {
            "type": "array",
            "description": "Input variable definitions with defaults",
            "items": {
                "oneOf": [
                    {
                        "type": "object",
                        "required": ["name", "type"],
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": ["string", "number", "boolean", "array", "object"]
                            },
                            "default": {}
                        }
                    },
                    {
                        "type": "object",
                        "description": "Compact format: {var_name: {properties}}",
                        "minProperties": 1,
                        "maxProperties": 1,
                        "additionalProperties": {
                            "type": "object",
                            "properties": {
                                "description": {"type": "string"},
                                "type": {
                                    "type": "string",
                                    "enum": ["string", "number", "boolean", "array", "object"]
                                },
                                "default": {}
                            }
                        }
                    }
                ]
            }
        },
        "tools": {
            "type": "array",
            "description": "Tool definitions (documentation purposes)",
            "items": {
                "type": "object",
                "required": ["name"],
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"}
                }
            }
        },
        "memory_namespace": {
            "type": "string",
            "description": "Global memory namespace (supports variable interpolation)"
        },
        "agents": {
            "type": "object",
            "description": "Agent definitions",
            "minProperties": 1,
            "additionalProperties": {
                "type": "object",
                "required": ["role", "goal", "tasks"],
                "properties": {
                    "role": {
                        "type": "string",
                        "description": "Agent's role in the crew"
                    },
                    "goal": {
                        "type": "string",
                        "description": "Agent's primary goal"
                    },
                    "instructions": {
                        "type": "string",
                        "description": "Detailed instructions for the agent"
                    },
                    "memory_namespace": {
                        "type": "string",
                        "description": "Memory namespace for this agent"
                    },
                    "allow_delegation": {
                        "type": "boolean",
                        "description": "Whether the agent can delegate tasks to other agents",
                        "default": False
                    },
                    "tasks": {
                        "type": "array",
                        "description": "Tasks this agent can perform",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "required": ["name", "description"],
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "inputs": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                },
                                "outputs": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            }
                        }
                    }
                }
            }
        },
        "crew": {
            "type": "object",
            "description": "Crew configuration",
            "required": ["name", "agents"],
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "agents": {
                    "type": "array",
                    "description": "List of agent names in the crew",
                    "minItems": 1,
                    "items": {"type": "string"}
                }
            }
        },
        "workflow": {
            "type": "array",
            "description": "Workflow execution order",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["agent", "task"],
                "properties": {
                    "agent": {
                        "type": "string",
                        "description": "Agent name from agents section"
                    },
                    "task": {
                        "type": "string",
                        "description": "Task name from agent's tasks"
                    }
                }
            }
        },
        "llms": {
            "type": "array",
            "description": "LLM provider configurations",
            "items": {
                "type": "object",
                "required": ["name", "provider", "model"],
                "properties": {
                    "name": {"type": "string"},
                    "provider": {
                        "type": "string",
                        "enum": ["ollama", "openai", "anthropic", "google", "azure"]
                    },
                    "model": {"type": "string"},
                    "base_url": {"type": "string", "format": "uri"},
                    "temperature": {"type": "number", "minimum": 0, "maximum": 2},
                    "max_tokens": {"type": "integer", "minimum": 1},
                    "top_p": {"type": "number", "minimum": 0, "maximum": 1},
                    "frequency_penalty": {"type": "number", "minimum": -2, "maximum": 2},
                    "presence_penalty": {"type": "number", "minimum": -2, "maximum": 2}
                }
            }
        }
    }
}


class FlowValidationError(Exception):
    """Raised when flow definition validation fails."""
    pass


class FlowValidator:
    """Validator for CrewAI flow definitions."""
    
    def __init__(self, schema: Optional[Dict[str, Any]] = None):
        """
        Initialize the validator.
        
        Args:
            schema: Custom JSON schema (uses default if not provided)
        """
        self.schema = schema or FLOW_SCHEMA
        
        # Try to use jsonschema if available
        try:
            import jsonschema
            self.jsonschema = jsonschema
            self.has_jsonschema = True
        except ImportError:
            self.jsonschema = None
            self.has_jsonschema = False
    
    def validate(self, flow_data: Dict[str, Any], strict: bool = True) -> Tuple[bool, List[str]]:
        """
        Validate flow definition against schema.
        
        Args:
            flow_data: Parsed flow definition data
            strict: If True, use full JSON schema validation (requires jsonschema)
                   If False, use basic validation
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        if strict and self.has_jsonschema:
            # Use full JSON schema validation
            try:
                self.jsonschema.validate(instance=flow_data, schema=self.schema)
                return True, []
            except self.jsonschema.ValidationError as e:
                errors.append(f"Schema validation error: {e.message}")
                errors.append(f"  Path: {' -> '.join(str(p) for p in e.path)}")
                return False, errors
            except self.jsonschema.SchemaError as e:
                errors.append(f"Invalid schema: {e.message}")
                return False, errors
        else:
            # Use basic validation
            if not strict and not self.has_jsonschema:
                print("Note: jsonschema not installed, using basic validation")
                print("Install with: pip install jsonschema")
            
            return self._basic_validate(flow_data)
    
    def _basic_validate(self, flow_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Perform basic validation without jsonschema library.
        
        Args:
            flow_data: Parsed flow definition data
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check required top-level fields
        required_fields = ["version", "description", "agents", "crew", "workflow"]
        for field in required_fields:
            if field not in flow_data:
                errors.append(f"Missing required field: {field}")
        
        # Validate version format
        if "version" in flow_data:
            version = flow_data["version"]
            if not isinstance(version, str) or not version.replace('.', '').isdigit():
                errors.append(f"Invalid version format: {version} (expected X.Y)")
        
        # Validate agents
        if "agents" in flow_data:
            agents = flow_data["agents"]
            if not isinstance(agents, dict) or len(agents) == 0:
                errors.append("agents must be a non-empty dictionary")
            else:
                for agent_name, agent_config in agents.items():
                    agent_errors = self._validate_agent(agent_name, agent_config)
                    errors.extend(agent_errors)
        
        # Validate crew
        if "crew" in flow_data:
            crew = flow_data["crew"]
            if not isinstance(crew, dict):
                errors.append("crew must be a dictionary")
            else:
                if "name" not in crew:
                    errors.append("crew.name is required")
                if "agents" not in crew:
                    errors.append("crew.agents is required")
                elif not isinstance(crew["agents"], list) or len(crew["agents"]) == 0:
                    errors.append("crew.agents must be a non-empty list")
                else:
                    # Check that crew agents exist in agents section
                    if "agents" in flow_data:
                        defined_agents = set(flow_data["agents"].keys())
                        for agent_name in crew["agents"]:
                            if agent_name not in defined_agents:
                                errors.append(f"crew references undefined agent: {agent_name}")
        
        # Validate workflow
        if "workflow" in flow_data:
            workflow = flow_data["workflow"]
            if not isinstance(workflow, list) or len(workflow) == 0:
                errors.append("workflow must be a non-empty list")
            else:
                workflow_errors = self._validate_workflow(workflow, flow_data.get("agents", {}))
                errors.extend(workflow_errors)
        
        # Validate MCPs if present
        if "mcps" in flow_data:
            mcps = flow_data["mcps"]
            if isinstance(mcps, list):
                for idx, mcp in enumerate(mcps):
                    mcp_errors = self._validate_mcp(mcp, idx)
                    errors.extend(mcp_errors)
        
        # Validate LLMs if present
        if "llms" in flow_data:
            llms = flow_data["llms"]
            if isinstance(llms, list):
                for idx, llm in enumerate(llms):
                    llm_errors = self._validate_llm(llm, idx)
                    errors.extend(llm_errors)
        
        return len(errors) == 0, errors
    
    def _validate_agent(self, agent_name: str, agent_config: Dict[str, Any]) -> List[str]:
        """Validate agent configuration."""
        errors = []
        
        if not isinstance(agent_config, dict):
            errors.append(f"Agent {agent_name}: configuration must be a dictionary")
            return errors
        
        # Check required fields
        required = ["role", "goal", "tasks"]
        for field in required:
            if field not in agent_config:
                errors.append(f"Agent {agent_name}: missing required field '{field}'")
        
        # Validate tasks
        if "tasks" in agent_config:
            tasks = agent_config["tasks"]
            if not isinstance(tasks, list) or len(tasks) == 0:
                errors.append(f"Agent {agent_name}: tasks must be a non-empty list")
            else:
                for idx, task in enumerate(tasks):
                    if not isinstance(task, dict):
                        errors.append(f"Agent {agent_name}, task {idx}: must be a dictionary")
                    else:
                        if "name" not in task:
                            errors.append(f"Agent {agent_name}, task {idx}: missing 'name'")
                        if "description" not in task:
                            errors.append(f"Agent {agent_name}, task {idx}: missing 'description'")
        
        return errors
    
    def _validate_workflow(self, workflow: List[Dict[str, Any]], agents: Dict[str, Any]) -> List[str]:
        """Validate workflow configuration."""
        errors = []
        
        for idx, step in enumerate(workflow):
            if not isinstance(step, dict):
                errors.append(f"Workflow step {idx}: must be a dictionary")
                continue
            
            if "agent" not in step:
                errors.append(f"Workflow step {idx}: missing 'agent'")
            elif step["agent"] not in agents:
                errors.append(f"Workflow step {idx}: references undefined agent '{step['agent']}'")
            else:
                # Check if task exists in agent
                if "task" not in step:
                    errors.append(f"Workflow step {idx}: missing 'task'")
                else:
                    agent_name = step["agent"]
                    task_name = step["task"]
                    agent_config = agents[agent_name]
                    
                    if "tasks" in agent_config:
                        task_names = [t.get("name") for t in agent_config["tasks"] if isinstance(t, dict)]
                        if task_name not in task_names:
                            errors.append(
                                f"Workflow step {idx}: agent '{agent_name}' "
                                f"does not have task '{task_name}'"
                            )
        
        return errors
    
    def _validate_mcp(self, mcp: Dict[str, Any], idx: int) -> List[str]:
        """Validate MCP server configuration."""
        errors = []
        
        if not isinstance(mcp, dict):
            errors.append(f"MCP {idx}: must be a dictionary")
            return errors
        
        if "name" not in mcp:
            errors.append(f"MCP {idx}: missing 'name'")
        
        if "type" not in mcp:
            errors.append(f"MCP {idx}: missing 'type'")
        elif mcp["type"] not in ["stdio", "http"]:
            errors.append(f"MCP {idx}: type must be 'stdio' or 'http'")
        
        # Type-specific validation
        if mcp.get("type") == "stdio" and "args" not in mcp:
            errors.append(f"MCP {idx} (stdio): missing 'args'")
        
        if mcp.get("type") == "http" and "url" not in mcp:
            errors.append(f"MCP {idx} (http): missing 'url'")
        
        return errors
    
    def _validate_llm(self, llm: Dict[str, Any], idx: int) -> List[str]:
        """Validate LLM configuration."""
        errors = []
        
        if not isinstance(llm, dict):
            errors.append(f"LLM {idx}: must be a dictionary")
            return errors
        
        required = ["name", "provider", "model"]
        for field in required:
            if field not in llm:
                errors.append(f"LLM {idx}: missing '{field}'")
        
        if "provider" in llm:
            valid_providers = ["ollama", "openai", "anthropic", "google", "azure"]
            if llm["provider"] not in valid_providers:
                errors.append(
                    f"LLM {idx}: invalid provider '{llm['provider']}' "
                    f"(valid: {', '.join(valid_providers)})"
                )
        
        # Validate numeric ranges
        if "temperature" in llm:
            temp = llm["temperature"]
            if not isinstance(temp, (int, float)) or temp < 0 or temp > 2:
                errors.append(f"LLM {idx}: temperature must be between 0 and 2")
        
        if "top_p" in llm:
            top_p = llm["top_p"]
            if not isinstance(top_p, (int, float)) or top_p < 0 or top_p > 1:
                errors.append(f"LLM {idx}: top_p must be between 0 and 1")
        
        return errors


def validate_flow_file(file_path: str, strict: bool = True) -> Tuple[bool, List[str]]:
    """
    Validate a flow definition YAML file.
    
    Args:
        file_path: Path to the YAML file
        strict: Use full JSON schema validation if available
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    import yaml
    from pathlib import Path
    
    flow_file = Path(file_path)
    
    if not flow_file.exists():
        return False, [f"File not found: {file_path}"]
    
    try:
        with open(flow_file, 'r') as f:
            flow_data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        return False, [f"YAML parsing error: {str(e)}"]
    except Exception as e:
        return False, [f"Error reading file: {str(e)}"]
    
    validator = FlowValidator()
    return validator.validate(flow_data, strict=strict)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python flow_schema.py <flow_file.yml>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    is_valid, errors = validate_flow_file(file_path)
    
    if is_valid:
        print(f"✅ Flow definition is valid: {file_path}")
        sys.exit(0)
    else:
        print(f"❌ Flow definition is invalid: {file_path}")
        print("\nValidation errors:")
        for error in errors:
            print(f"  • {error}")
        sys.exit(1)
