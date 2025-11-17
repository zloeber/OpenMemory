#!/usr/bin/env python3
"""
CrewAI Flow Launcher

This script loads and launches CrewAI flow definitions from YAML files.
It parses the flow structure including agents, tasks, tools, and workflow,
then executes the crew according to the defined configuration.

Usage:
    python launch_flow.py [path_to_flow_definition.yml]
    
Example:
    python launch_flow.py improve-project-flow.yml
"""

import sys
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

try:
    from crewai import Agent, Task, Crew, Process
    from crewai.tools import BaseTool
except ImportError:
    print("Error: crewai package not found. Please install it with: pip install crewai")
    sys.exit(1)


@dataclass
class FlowDefinition:
    """Represents a parsed flow definition."""
    version: str
    description: str
    tools: List[Dict[str, Any]]
    agents: Dict[str, Dict[str, Any]]
    crew: Dict[str, Any]
    workflow: List[Dict[str, Any]]
    llms: Optional[List[Dict[str, Any]]] = None
    memory_namespace: Optional[str] = None
    inputs: Optional[List[Dict[str, Any]]] = None
    mcps: Optional[List[Dict[str, Any]]] = None


class FlowLauncher:
    """Handles loading and launching CrewAI flows from YAML definitions."""
    
    def __init__(self, flow_file: str):
        """
        Initialize the flow launcher.
        
        Args:
            flow_file: Path to the YAML flow definition file
        """
        self.flow_file = Path(flow_file)
        self.flow_def: Optional[FlowDefinition] = None
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.tools: List[Any] = []
        
    def load_flow(self) -> FlowDefinition:
        """
        Load and parse the flow definition from YAML.
        
        Returns:
            Parsed FlowDefinition object
            
        Raises:
            FileNotFoundError: If the flow file doesn't exist
            yaml.YAMLError: If the YAML is invalid
        """
        if not self.flow_file.exists():
            raise FileNotFoundError(f"Flow definition file not found: {self.flow_file}")
            
        with open(self.flow_file, 'r') as f:
            data = yaml.safe_load(f)
            
        self.flow_def = FlowDefinition(
            version=data.get('version', '1.0'),
            description=data.get('description', ''),
            tools=data.get('tools', []),
            agents=data.get('agents', {}),
            crew=data.get('crew', {}),
            workflow=data.get('workflow', []),
            llms=data.get('llms'),
            memory_namespace=data.get('memory_namespace'),
            inputs=data.get('inputs', []),
            mcps=data.get('mcps', [])
        )
        
        return self.flow_def
    
    def _parse_input_definitions(self) -> Dict[str, Any]:
        """
        Parse input definitions and extract default values.
        
        Returns:
            Dictionary mapping input names to their default values
        """
        defaults = {}
        
        if not self.flow_def or not self.flow_def.inputs:
            return defaults
        
        print("\n=== Input Definitions ===")
        for input_def in self.flow_def.inputs:
            # Handle both dict and simplified formats
            if isinstance(input_def, dict):
                # Two formats:
                # 1. {'name': 'var', 'description': '...', 'type': '...', 'default': '...'}
                # 2. {'var': {'description': '...', 'type': '...', 'default': '...'}}
                if 'name' in input_def:
                    name = input_def['name']
                    description = input_def.get('description', '')
                    default = input_def.get('default')
                    input_type = input_def.get('type', 'string')
                else:
                    # Format 2: key is the variable name
                    for name, details in input_def.items():
                        if isinstance(details, dict):
                            description = details.get('description', '')
                            default = details.get('default')
                            input_type = details.get('type', 'string')
                        else:
                            description = ''
                            default = details
                            input_type = 'string'
                        
                        defaults[name] = default
                        print(f"  - {name}: {description}")
                        print(f"    Type: {input_type}, Default: {default}")
                    continue
                
                defaults[name] = default
                print(f"  - {name}: {description}")
                print(f"    Type: {input_type}, Default: {default}")
        
        return defaults
    
    def _load_mcp_servers(self) -> List[Dict[str, Any]]:
        """
        Parse and display MCP (Model Context Protocol) server configurations.
        
        Returns:
            List of MCP server configurations with environment variables resolved
            
        Note:
            This currently logs the MCP configurations. Full integration with
            CrewAI tools would require implementing MCP client connections and
            exposing MCP tools to agents.
            
            Supports environment variable interpolation using {$env:VAR_NAME} syntax.
        """
        import os
        import re
        
        mcp_configs = []
        
        if not self.flow_def or not self.flow_def.mcps:
            return mcp_configs
        
        print("\n=== MCP Server Configurations ===")
        for mcp_def in self.flow_def.mcps:
            name = mcp_def.get('name', 'unnamed')
            description = mcp_def.get('description', '')
            mcp_type = mcp_def.get('type', 'stdio')
            args = mcp_def.get('args', [])
            url = mcp_def.get('url')
            env = mcp_def.get('env', {})
            options = mcp_def.get('options', {})
            
            # Deep copy to avoid modifying original
            resolved_env = dict(env)
            resolved_options = self._resolve_env_vars(options)
            
            print(f"\n  [{name}]")
            if description:
                print(f"    Description: {description}")
            print(f"    Type: {mcp_type}")
            
            if mcp_type == 'stdio':
                if args:
                    print(f"    Command: {' '.join(args)}")
                if resolved_env:
                    print(f"    Environment Variables:")
                    for key, value in resolved_env.items():
                        print(f"      {key}: {value}")
            elif mcp_type == 'http':
                if url:
                    print(f"    URL: {url}")
                if resolved_options:
                    print(f"    Options:")
                    self._print_nested_dict(resolved_options, indent=6)
            
            mcp_configs.append({
                'name': name,
                'description': description,
                'type': mcp_type,
                'args': args,
                'url': url,
                'env': resolved_env,
                'options': resolved_options
            })
        
        print("\n  Note: MCP servers configured but not yet connected.")
        print("  TODO: Implement MCP client connections and tool exposure.")
        
        return mcp_configs
    
    def _resolve_env_vars(self, data: Any) -> Any:
        """
        Recursively resolve environment variables in data structures.
        Supports {$env:VAR_NAME} syntax.
        
        Args:
            data: Data structure (dict, list, str, or other) that may contain env var references
            
        Returns:
            Data with environment variables resolved
        """
        import os
        import re
        
        if isinstance(data, str):
            # Pattern to match {$env:VAR_NAME}
            pattern = r'\{\$env:([A-Za-z_][A-Za-z0-9_]*)\}'
            
            def replace_env(match):
                var_name = match.group(1)
                return os.environ.get(var_name, match.group(0))  # Keep original if not found
            
            return re.sub(pattern, replace_env, data)
        elif isinstance(data, dict):
            return {k: self._resolve_env_vars(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._resolve_env_vars(item) for item in data]
        else:
            return data
    
    def _print_nested_dict(self, data: Any, indent: int = 0) -> None:
        """
        Pretty print nested dictionary structures.
        
        Args:
            data: Data to print
            indent: Current indentation level (spaces)
        """
        prefix = ' ' * indent
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    print(f"{prefix}{key}:")
                    self._print_nested_dict(value, indent + 2)
                else:
                    # Mask sensitive values (API keys, tokens, etc.)
                    if any(sensitive in str(key).lower() for sensitive in ['key', 'token', 'secret', 'password']):
                        masked_value = self._mask_sensitive_value(str(value))
                        print(f"{prefix}{key}: {masked_value}")
                    else:
                        print(f"{prefix}{key}: {value}")
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (dict, list)):
                    self._print_nested_dict(item, indent)
                else:
                    print(f"{prefix}- {item}")
        else:
            print(f"{prefix}{data}")
    
    def _mask_sensitive_value(self, value: str) -> str:
        """
        Mask sensitive values for logging.
        
        Args:
            value: Value to mask
            
        Returns:
            Masked value showing only first/last few characters
        """
        if not value or len(value) <= 8:
            return "***"
        return f"{value[:4]}...{value[-4:]}"
    
    def _interpolate_variables(self, text: str, variables: Dict[str, Any]) -> str:
        """
        Interpolate variables in text using {variable_name} syntax.
        
        Args:
            text: Text containing {variable} placeholders
            variables: Dictionary of variable name -> value mappings
            
        Returns:
            Text with variables interpolated
        """
        if not text or not variables:
            return text
        
        result = text
        for var_name, var_value in variables.items():
            placeholder = "{" + var_name + "}"
            if placeholder in result:
                result = result.replace(placeholder, str(var_value))
        
        return result
    
    def _interpolate_dict(self, data: Any, variables: Dict[str, Any]) -> Any:
        """
        Recursively interpolate variables in a dictionary or list structure.
        
        Args:
            data: Data structure to interpolate (dict, list, str, or other)
            variables: Dictionary of variable name -> value mappings
            
        Returns:
            Data structure with variables interpolated
        """
        if isinstance(data, str):
            return self._interpolate_variables(data, variables)
        elif isinstance(data, dict):
            return {k: self._interpolate_dict(v, variables) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._interpolate_dict(item, variables) for item in data]
        else:
            return data
    
    def _load_tools(self) -> List[Any]:
        """
        Load and initialize tools from the flow definition.
        
        Returns:
            List of initialized tool objects
            
        Note:
            This is a placeholder that logs tool definitions.
            In a real implementation, you would initialize actual tool objects
            based on the tool definitions (e.g., MCP tools, custom tools, etc.)
        """
        tools = []
        print("\n=== Tools Defined ===")
        for tool_def in self.flow_def.tools:
            tool_name = tool_def.get('name', 'unknown')
            tool_desc = tool_def.get('description', '')
            print(f"  - {tool_name}: {tool_desc}")
            # TODO: Initialize actual tool objects here
            # tools.append(initialize_tool(tool_def))
        
        return tools
    
    def _configure_llm(self, agent_config: Dict[str, Any]) -> Optional[Any]:
        """
        Configure LLM for an agent based on flow definition.
        
        Args:
            agent_config: Agent configuration dictionary
            
        Returns:
            Configured LLM object or None
            
        Note:
            Configures LLM with provider-specific settings including base_url.
            Supports providers: ollama, openai, anthropic, etc.
        """
        if not self.flow_def.llms:
            return None
            
        # Use the first LLM config by default
        # TODO: Support per-agent LLM selection
        llm_config = self.flow_def.llms[0]
        
        provider = llm_config.get('provider', '').lower()
        model = llm_config.get('model')
        base_url = llm_config.get('base_url')
        temperature = llm_config.get('temperature', 0.7)
        max_tokens = llm_config.get('max_tokens', 2000)
        
        print(f"\nConfiguring LLM:")
        print(f"  Provider: {provider}")
        print(f"  Model: {model}")
        if base_url:
            print(f"  Base URL: {base_url}")
        print(f"  Temperature: {temperature}")
        print(f"  Max Tokens: {max_tokens}")
        
        try:
            if provider == 'ollama':
                from langchain_community.llms import Ollama
                llm_params = {
                    'model': model,
                    'temperature': temperature,
                }
                if base_url:
                    llm_params['base_url'] = base_url
                return Ollama(**llm_params)
            
            elif provider == 'openai':
                from langchain_openai import ChatOpenAI
                llm_params = {
                    'model': model,
                    'temperature': temperature,
                    'max_tokens': max_tokens,
                }
                if base_url:
                    llm_params['base_url'] = base_url
                return ChatOpenAI(**llm_params)
            
            elif provider == 'anthropic':
                from langchain_anthropic import ChatAnthropic
                llm_params = {
                    'model': model,
                    'temperature': temperature,
                    'max_tokens': max_tokens,
                }
                if base_url:
                    llm_params['base_url'] = base_url
                return ChatAnthropic(**llm_params)
            
            else:
                print(f"  Warning: Unsupported provider '{provider}', using default LLM")
                return None
                
        except ImportError as e:
            print(f"  Warning: Could not import LLM provider '{provider}': {e}")
            print(f"  Install with: pip install langchain-{provider}")
            return None
        except Exception as e:
            print(f"  Warning: Error configuring LLM: {e}")
            return None
    
    def _create_agent(self, agent_name: str, agent_config: Dict[str, Any]) -> Agent:
        """
        Create a CrewAI Agent from the configuration.
        
        Args:
            agent_name: Name/identifier for the agent
            agent_config: Agent configuration dictionary
            
        Returns:
            Initialized Agent object
        """
        role = agent_config.get('role', agent_name)
        goal = agent_config.get('goal', '')
        instructions = agent_config.get('instructions', '')
        memory_namespace = agent_config.get('memory_namespace')
        
        # Create backstory from instructions
        backstory = instructions if instructions else f"Agent responsible for {role}"
        
        # Configure LLM if available
        llm = self._configure_llm(agent_config)
        
        agent_params = {
            'role': role,
            'goal': goal,
            'backstory': backstory,
            'verbose': True,
            'allow_delegation': False,
            'tools': self.tools,
        }
        
        if llm:
            agent_params['llm'] = llm
        
        agent = Agent(**agent_params)
        
        print(f"\n=== Created Agent: {agent_name} ===")
        print(f"  Role: {role}")
        print(f"  Goal: {goal[:100]}..." if len(goal) > 100 else f"  Goal: {goal}")
        if memory_namespace:
            print(f"  Memory Namespace: {memory_namespace}")
        
        return agent
    
    def _create_task(self, agent_name: str, task_config: Dict[str, Any]) -> Task:
        """
        Create a CrewAI Task from the configuration.
        
        Args:
            agent_name: Name of the agent responsible for this task
            task_config: Task configuration dictionary
            
        Returns:
            Initialized Task object
        """
        task_name = task_config.get('name', 'unnamed_task')
        description = task_config.get('description', '')
        inputs = task_config.get('inputs', [])
        outputs = task_config.get('outputs', [])
        
        # Get the agent for this task
        agent = self.agents.get(agent_name)
        if not agent:
            raise ValueError(f"Agent '{agent_name}' not found for task '{task_name}'")
        
        # Build expected output description from outputs
        expected_output = f"Task should produce: {', '.join(outputs)}" if outputs else "Task completion"
        
        task = Task(
            description=description,
            expected_output=expected_output,
            agent=agent
        )
        
        print(f"\n=== Created Task: {task_name} ===")
        print(f"  Agent: {agent_name}")
        print(f"  Description: {description[:100]}..." if len(description) > 100 else f"  Description: {description}")
        if inputs:
            print(f"  Inputs: {', '.join(inputs)}")
        if outputs:
            print(f"  Outputs: {', '.join(outputs)}")
        
        return task
    
    def setup_crew(self, input_values: Optional[Dict[str, Any]] = None) -> Crew:
        """
        Set up the crew with agents and tasks based on the flow definition.
        
        Args:
            input_values: Optional dictionary of input values to override defaults
        
        Returns:
            Initialized Crew object
            
        Raises:
            ValueError: If the flow definition is not loaded
        """
        if not self.flow_def:
            raise ValueError("Flow definition not loaded. Call load_flow() first.")
        
        print("\n" + "="*60)
        print("SETTING UP CREW")
        print("="*60)
        
        # Parse input definitions and merge with provided values
        default_inputs = self._parse_input_definitions()
        variables = {**default_inputs, **(input_values or {})}
        
        if variables:
            print("\n=== Variable Values ===")
            for var_name, var_value in variables.items():
                print(f"  {var_name}: {var_value}")
        
        # Interpolate variables in the flow definition
        self.flow_def.agents = self._interpolate_dict(self.flow_def.agents, variables)
        self.flow_def.crew = self._interpolate_dict(self.flow_def.crew, variables)
        self.flow_def.workflow = self._interpolate_dict(self.flow_def.workflow, variables)
        if self.flow_def.memory_namespace:
            self.flow_def.memory_namespace = self._interpolate_variables(
                self.flow_def.memory_namespace, variables
            )
        
        # Load MCP server configurations
        mcp_configs = self._load_mcp_servers()
        
        # Load tools
        self.tools = self._load_tools()
        
        # Create all agents first
        print("\n" + "-"*60)
        print("CREATING AGENTS")
        print("-"*60)
        for agent_name, agent_config in self.flow_def.agents.items():
            self.agents[agent_name] = self._create_agent(agent_name, agent_config)
        
        # Create tasks based on workflow
        print("\n" + "-"*60)
        print("CREATING TASKS")
        print("-"*60)
        task_list = []
        for workflow_step in self.flow_def.workflow:
            agent_name = workflow_step.get('agent')
            task_name = workflow_step.get('task')
            
            # Find task config in agent's tasks
            agent_config = self.flow_def.agents.get(agent_name, {})
            agent_tasks = agent_config.get('tasks', [])
            
            task_config = None
            for t in agent_tasks:
                if t.get('name') == task_name:
                    task_config = t
                    break
            
            if not task_config:
                print(f"Warning: Task '{task_name}' not found in agent '{agent_name}' configuration")
                continue
            
            task = self._create_task(agent_name, task_config)
            task_list.append(task)
            self.tasks[f"{agent_name}.{task_name}"] = task
        
        # Create crew
        crew_name = self.flow_def.crew.get('name', 'Unnamed Crew')
        crew_description = self.flow_def.crew.get('description', '')
        
        print("\n" + "-"*60)
        print("CREATING CREW")
        print("-"*60)
        print(f"Name: {crew_name}")
        print(f"Description: {crew_description}")
        
        crew = Crew(
            agents=list(self.agents.values()),
            tasks=task_list,
            verbose=True,
            process=Process.sequential  # Default to sequential based on workflow
        )
        
        return crew
    
    def launch(self, inputs: Optional[Dict[str, Any]] = None, crew_inputs: Optional[Dict[str, Any]] = None) -> Any:
        """
        Launch the crew and execute the workflow.
        
        Args:
            inputs: Optional input values for variable interpolation (e.g., project_path, project_id)
            crew_inputs: Optional input parameters passed to crew.kickoff()
            
        Returns:
            Result from crew execution
        """
        if not self.flow_def:
            self.load_flow()
        
        crew = self.setup_crew(input_values=inputs)
        
        print("\n" + "="*60)
        print("LAUNCHING CREW")
        print("="*60)
        print(f"\nFlow: {self.flow_def.description}\n")
        
        # Execute the crew
        result = crew.kickoff(inputs=crew_inputs or {})
        
        print("\n" + "="*60)
        print("EXECUTION COMPLETE")
        print("="*60)
        
        return result


def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        print("Usage: python launch_flow.py <flow_definition.yml>")
        print("\nExample:")
        print("  python launch_flow.py improve-project-flow.yml")
        sys.exit(1)
    
    flow_file = sys.argv[1]
    
    try:
        launcher = FlowLauncher(flow_file)
        
        print("="*60)
        print("CREWAI FLOW LAUNCHER")
        print("="*60)
        print(f"Loading flow from: {flow_file}\n")
        
        launcher.load_flow()
        
        # You can pass custom input values for variable interpolation
        # These will override defaults from the flow definition's inputs block
        input_values = {
            # 'project_path': '/path/to/project',
            # 'project_id': 'my_custom_project',
        }
        
        # Crew inputs are separate - they're passed to the crew.kickoff() method
        crew_inputs = {}
        
        result = launcher.launch(inputs=input_values, crew_inputs=crew_inputs)
        
        print("\n" + "="*60)
        print("FINAL RESULT")
        print("="*60)
        print(result)
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
