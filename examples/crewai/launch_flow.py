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
import click
import asyncio
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass

try:
    from flow_schema import FlowValidator, validate_flow_file
    SCHEMA_VALIDATION_AVAILABLE = True
except ImportError:
    SCHEMA_VALIDATION_AVAILABLE = False
    print("Warning: flow_schema module not found. Schema validation disabled.")

try:
    from crewai import Agent, Task, Crew, Process
    from crewai.tools import BaseTool
except ImportError:
    print("Error: crewai package not found. Please install it with: pip install crewai")
    sys.exit(1)

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    print("Warning: mcp package not found. MCP features will be disabled.")
    print("Install with: pip install mcp")

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    # Will warn when trying to use HTTP MCP servers


class MCPTool(BaseTool):
    """Wrapper to expose MCP tools as CrewAI tools."""
    
    name: str
    description: str
    mcp_tool_name: str
    session: Any
    input_schema: Dict[str, Any]
    
    def __init__(self, name: str, description: str, mcp_tool_name: str, 
                 session: Any, input_schema: Dict[str, Any]):
        """Initialize MCP tool wrapper."""
        super().__init__()
        self.name = name
        self.description = description
        self.mcp_tool_name = mcp_tool_name
        self.session = session
        self.input_schema = input_schema
    
    def _run(self, **kwargs) -> str:
        """Execute the MCP tool synchronously."""
        try:
            # Run async call in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._async_run(**kwargs))
            loop.close()
            return result
        except Exception as e:
            return f"Error executing MCP tool {self.mcp_tool_name}: {str(e)}"
    
    async def _async_run(self, **kwargs) -> str:
        """Execute the MCP tool asynchronously."""
        try:
            result = await self.session.call_tool(self.mcp_tool_name, arguments=kwargs)
            
            # Extract content from result
            if hasattr(result, 'content') and result.content:
                content_parts = []
                for item in result.content:
                    if hasattr(item, 'text'):
                        content_parts.append(item.text)
                    elif hasattr(item, 'data'):
                        content_parts.append(str(item.data))
                return '\n'.join(content_parts) if content_parts else str(result)
            return str(result)
        except Exception as e:
            return f"Error calling MCP tool: {str(e)}"


class HTTPMCPTool(BaseTool):
    """Wrapper to expose HTTP-based MCP tools as CrewAI tools."""
    
    name: str
    description: str
    mcp_tool_name: str
    base_url: str
    headers: Dict[str, str]
    input_schema: Dict[str, Any]
    
    def __init__(self, name: str, description: str, mcp_tool_name: str,
                 base_url: str, headers: Dict[str, str], input_schema: Dict[str, Any]):
        """Initialize HTTP MCP tool wrapper."""
        super().__init__()
        self.name = name
        self.description = description
        self.mcp_tool_name = mcp_tool_name
        self.base_url = base_url
        self.headers = headers
        self.input_schema = input_schema
    
    def _run(self, **kwargs) -> str:
        """Execute the HTTP MCP tool synchronously."""
        try:
            # Run async call in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._async_run(**kwargs))
            loop.close()
            return result
        except Exception as e:
            return f"Error executing HTTP MCP tool {self.mcp_tool_name}: {str(e)}"
    
    async def _async_run(self, **kwargs) -> str:
        """Execute the HTTP MCP tool asynchronously."""
        try:
            import httpx
            
            async with httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=60.0) as client:
                # Call tool via JSON-RPC over HTTP
                response = await client.post(
                    '/mcp/v1/tools/call',
                    json={
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {
                            "name": self.mcp_tool_name,
                            "arguments": kwargs
                        },
                        "id": 1
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                # Extract content from JSON-RPC result
                if 'result' in result:
                    tool_result = result['result']
                    
                    # Handle different response formats
                    if isinstance(tool_result, dict):
                        if 'content' in tool_result:
                            content = tool_result['content']
                            if isinstance(content, list):
                                parts = []
                                for item in content:
                                    if isinstance(item, dict):
                                        parts.append(item.get('text', str(item)))
                                    else:
                                        parts.append(str(item))
                                return '\n'.join(parts) if parts else str(tool_result)
                            else:
                                return str(content)
                        else:
                            return json.dumps(tool_result, indent=2)
                    else:
                        return str(tool_result)
                elif 'error' in result:
                    error = result['error']
                    return f"MCP Error: {error.get('message', str(error))}"
                else:
                    return str(result)
                    
        except httpx.HTTPStatusError as e:
            return f"HTTP Error {e.response.status_code}: {e.response.text}"
        except Exception as e:
            return f"Error calling HTTP MCP tool: {str(e)}"


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
    
    def __init__(self, flow_file: str, whatif: bool = False):
        """
        Initialize the flow launcher.
        
        Args:
            flow_file: Path to the YAML flow definition file
            whatif: If True, only show configuration without executing
        """
        self.flow_file = Path(flow_file)
        self.flow_def: Optional[FlowDefinition] = None
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.tools: List[Any] = []
        self.whatif = whatif
        self.mcp_sessions: List[Any] = []
        self.mcp_contexts: List[Any] = []
        
    def load_flow(self, validate: bool = True) -> FlowDefinition:
        """
        Load and parse the flow definition from YAML.
        
        Args:
            validate: Whether to validate the flow against the schema
        
        Returns:
            Parsed FlowDefinition object
            
        Raises:
            FileNotFoundError: If the flow file doesn't exist
            yaml.YAMLError: If the YAML is invalid
            ValueError: If validation fails
        """
        if not self.flow_file.exists():
            raise FileNotFoundError(f"Flow definition file not found: {self.flow_file}")
        
        with open(self.flow_file, 'r') as f:
            data = yaml.safe_load(f)
        
        # Validate schema if enabled
        if validate and SCHEMA_VALIDATION_AVAILABLE:
            validator = FlowValidator()
            is_valid, errors = validator.validate(data, strict=False)
            
            if not is_valid:
                error_msg = "Flow definition validation failed:\n"
                error_msg += "\n".join(f"  • {err}" for err in errors)
                raise ValueError(error_msg)
            
            print("✅ Flow definition validated successfully\n")
            
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
        
        if not MCP_AVAILABLE:
            print("\n  Note: MCP package not installed. Servers configured but not connected.")
            print("  Install with: pip install mcp")
            return mcp_configs
        
        if self.whatif:
            print("\n  Note: WHATIF mode - MCP servers would be connected in normal execution.")
            return mcp_configs
        
        # Connect to MCP servers
        print("\n  Connecting to MCP servers...")
        for mcp_config in mcp_configs:
            try:
                if mcp_config['type'] == 'stdio':
                    self._connect_stdio_mcp(mcp_config)
                elif mcp_config['type'] == 'http':
                    self._connect_http_mcp(mcp_config)
            except Exception as e:
                print(f"    Error connecting to {mcp_config['name']}: {str(e)}")
                if '--verbose' in sys.argv or '-v' in sys.argv:
                    import traceback
                    traceback.print_exc()
        
        return mcp_configs
    
    def _connect_stdio_mcp(self, mcp_config: Dict[str, Any]) -> None:
        """Connect to a stdio-based MCP server and expose its tools."""
        import os
        import subprocess
        
        name = mcp_config['name']
        args = mcp_config['args']
        env = mcp_config.get('env', {})
        
        if not args:
            print(f"    [{name}] No command specified, skipping")
            return
        
        print(f"    [{name}] Connecting via stdio...")
        
        # Prepare environment
        server_env = os.environ.copy()
        server_env.update(env)
        
        try:
            # This is a synchronous wrapper - in production you'd use async context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            async def connect_and_list_tools():
                server_params = StdioServerParameters(
                    command=args[0],
                    args=args[1:],
                    env=server_env
                )
                
                async with stdio_client(server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        
                        # List available tools
                        tools_result = await session.list_tools()
                        
                        print(f"    [{name}] Connected successfully")
                        print(f"    [{name}] Available tools: {len(tools_result.tools)}")
                        
                        # Create CrewAI tool wrappers for each MCP tool
                        for tool in tools_result.tools:
                            tool_name = f"mcp_{name}_{tool.name}"
                            tool_desc = tool.description or f"MCP tool: {tool.name}"
                            
                            # Create wrapper
                            mcp_tool = MCPTool(
                                name=tool_name,
                                description=tool_desc,
                                mcp_tool_name=tool.name,
                                session=session,
                                input_schema=tool.inputSchema if hasattr(tool, 'inputSchema') else {}
                            )
                            
                            self.tools.append(mcp_tool)
                            print(f"      - {tool.name}: {tool_desc[:80]}")
                        
                        # Store session for cleanup
                        self.mcp_sessions.append(session)
                        return session
            
            session = loop.run_until_complete(connect_and_list_tools())
            
        except Exception as e:
            print(f"    [{name}] Failed to connect: {str(e)}")
            if '--verbose' in sys.argv or '-v' in sys.argv:
                import traceback
                traceback.print_exc()
    
    def _connect_http_mcp(self, mcp_config: Dict[str, Any]) -> None:
        """Connect to an HTTP-based MCP server and expose its tools."""
        name = mcp_config['name']
        url = mcp_config.get('url')
        options = mcp_config.get('options', {})
        
        if not url:
            print(f"    [{name}] No URL specified, skipping")
            return
        
        if not HTTPX_AVAILABLE:
            print(f"    [{name}] httpx not installed, skipping HTTP connection")
            print(f"    Install with: pip install httpx")
            return
        
        print(f"    [{name}] Connecting to {url}...")
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            async def connect_and_list_tools():
                # Prepare headers from options
                headers = options.get('headers', {})
                
                # Create HTTP transport
                transport = httpx.AsyncClient(
                    base_url=url,
                    headers=headers,
                    timeout=30.0
                )
                
                # Create MCP session over HTTP
                # Note: HTTP MCP uses SSE (Server-Sent Events) for streaming
                async with transport:
                    # Initialize connection by calling the tools endpoint
                    try:
                        response = await transport.post(
                            '/mcp/v1/tools/list',
                            json={"jsonrpc": "2.0", "method": "tools/list", "id": 1}
                        )
                        response.raise_for_status()
                        result = response.json()
                        
                        print(f"    [{name}] Connected successfully")
                        
                        if 'result' in result and 'tools' in result['result']:
                            tools = result['result']['tools']
                            print(f"    [{name}] Available tools: {len(tools)}")
                            
                            # Create CrewAI tool wrappers for each MCP tool
                            for tool in tools:
                                tool_name = f"mcp_{name}_{tool['name']}"
                                tool_desc = tool.get('description', f"MCP tool: {tool['name']}")
                                
                                # Create HTTP MCP tool wrapper
                                mcp_tool = HTTPMCPTool(
                                    name=tool_name,
                                    description=tool_desc,
                                    mcp_tool_name=tool['name'],
                                    base_url=url,
                                    headers=headers,
                                    input_schema=tool.get('inputSchema', {})
                                )
                                
                                self.tools.append(mcp_tool)
                                print(f"      - {tool['name']}: {tool_desc[:80]}")
                        else:
                            print(f"    [{name}] No tools found in response")
                            
                    except httpx.HTTPStatusError as e:
                        print(f"    [{name}] HTTP error: {e.response.status_code}")
                        if '--verbose' in sys.argv or '-v' in sys.argv:
                            print(f"    Response: {e.response.text}")
                    except Exception as e:
                        print(f"    [{name}] Error listing tools: {str(e)}")
                        if '--verbose' in sys.argv or '-v' in sys.argv:
                            import traceback
                            traceback.print_exc()
            
            loop.run_until_complete(connect_and_list_tools())
            
        except Exception as e:
            print(f"    [{name}] Failed to connect: {str(e)}")
            if '--verbose' in sys.argv or '-v' in sys.argv:
                import traceback
                traceback.print_exc()
    
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
            Tools defined in the flow YAML are for documentation.
            Actual tools are loaded from MCP servers via _load_mcp_servers().
        """
        print("\n=== Tools Defined in Flow ===")
        for tool_def in self.flow_def.tools:
            tool_name = tool_def.get('name', 'unknown')
            tool_desc = tool_def.get('description', '')
            print(f"  - {tool_name}: {tool_desc}")
        
        print(f"\n  Note: {len(self.tools)} MCP tools loaded from servers")
        
        return self.tools
    
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
                # CrewAI uses LiteLLM internally, so we just need to format the model correctly
                # and set the environment variable for the Ollama base URL
                import os
                
                # Set Ollama base URL if provided
                if base_url:
                    os.environ['OLLAMA_API_BASE'] = base_url
                    print(f"  Setting OLLAMA_API_BASE={base_url}")
                
                # Test if LiteLLM is available and can connect
                try:
                    from litellm import completion
                    
                    # Use ollama_chat/ prefix for chat models
                    litellm_model = f"ollama_chat/{model}"
                    
                    # Test the connection
                    try:
                        test_response = completion(
                            model=litellm_model,
                            messages=[{"role": "user", "content": "test"}],
                            temperature=temperature,
                            max_tokens=10
                        )
                        print(f"  ✅ LiteLLM connection test successful")
                        print(f"  ✅ Using model: {litellm_model}")
                        
                        # Return the LiteLLM model string - CrewAI will use it with LiteLLM
                        # We return it as a string, and CrewAI's LLM layer will handle it
                        return litellm_model
                    
                    except Exception as test_error:
                        print(f"  ❌ Connection test failed: {test_error}")
                        print(f"  Make sure Ollama is running at {base_url or 'http://localhost:11434'}")
                        print(f"  And model '{model}' is available")
                        print(f"\n  ⚠️  Without a configured LLM, CrewAI will default to OpenAI!")
                        return None
                
                except ImportError:
                    print(f"  ❌ ERROR: LiteLLM not found")
                    print(f"  CrewAI requires LiteLLM for Ollama support")
                    print(f"  Install with: pip install litellm")
                    print(f"\n  ⚠️  Without a configured LLM, CrewAI will default to OpenAI!")
                    return None
            
            elif provider == 'openai':
                from langchain_openai import ChatOpenAI
                llm_params = {
                    'model': model,
                    'temperature': temperature,
                    'max_tokens': max_tokens,
                }
                if base_url:
                    llm_params['base_url'] = base_url
                print(f"  ✅ Using langchain-openai (ChatOpenAI)")
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
                print(f"  ✅ Using langchain-anthropic (ChatAnthropic)")
                return ChatAnthropic(**llm_params)
            
            else:
                print(f"  ❌ ERROR: Unsupported provider '{provider}'")
                print(f"  ⚠️  Without a configured LLM, CrewAI will default to OpenAI!")
                return None
                
        except ImportError as e:
            print(f"  ❌ ERROR: Could not import LLM provider '{provider}': {e}")
            print(f"  Install with: pip install langchain-{provider}")
            print(f"  ⚠️  Without a configured LLM, CrewAI will default to OpenAI!")
            return None
        except Exception as e:
            print(f"  ❌ ERROR: Error configuring LLM: {e}")
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
        allow_delegation = agent_config.get('allow_delegation', False)
        
        # Create backstory from instructions
        backstory = instructions if instructions else f"Agent responsible for {role}"
        
        # Configure LLM if available
        llm = self._configure_llm(agent_config)
        
        agent_params = {
            'role': role,
            'goal': goal,
            'backstory': backstory,
            'verbose': True,
            'allow_delegation': allow_delegation,
            'tools': self.tools,
        }
        
        if llm:
            agent_params['llm'] = llm
        
        agent = Agent(**agent_params)
        
        print(f"\n=== Created Agent: {agent_name} ===")
        print(f"  Role: {role}")
        print(f"  Goal: {goal[:100]}..." if len(goal) > 100 else f"  Goal: {goal}")
        print(f"  Allow Delegation: {allow_delegation}")
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
        
        # Create all agents first (even in whatif mode to show configuration)
        print("\n" + "-"*60)
        print("CREATING AGENTS")
        print("-"*60)
        for agent_name, agent_config in self.flow_def.agents.items():
            self.agents[agent_name] = self._create_agent(agent_name, agent_config)
        
        if self.whatif:
            print("\n" + "="*60)
            print("WHATIF MODE: Showing configuration only (no execution)")
            print("="*60)
            return None
        
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
            Result from crew execution (None if in whatif mode)
        """
        if not self.flow_def:
            self.load_flow()
        
        crew = self.setup_crew(input_values=inputs)
        
        if self.whatif:
            print("\n" + "="*60)
            print("WHATIF: Would launch crew with the above configuration")
            print("="*60)
            print(f"\nFlow: {self.flow_def.description}")
            print(f"\nCrew inputs that would be passed: {crew_inputs or {}}")
            print("\nNo execution performed in whatif mode.")
            return None
        
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
    
    def cleanup(self):
        """Clean up MCP connections."""
        if self.mcp_sessions:
            print("\nCleaning up MCP connections...")
            for session in self.mcp_sessions:
                try:
                    # Close sessions if they have cleanup methods
                    if hasattr(session, 'close'):
                        session.close()
                except Exception as e:
                    print(f"Warning: Error closing MCP session: {e}")
            self.mcp_sessions.clear()


@click.group()
def cli():
    """CrewAI Flow Launcher - Load and execute CrewAI flow definitions from YAML files."""
    pass


@cli.command(name='run')
@click.argument('flow_file', type=click.Path(exists=True))
@click.option('--whatif', '--dry-run', is_flag=True, 
              help='Show configuration without executing the crew')
@click.option('--no-validate', is_flag=True,
              help='Skip schema validation of the flow definition')
@click.option('--project-path', '-p', 
              help='Override project_path input variable')
@click.option('--project-id', '-i', 
              help='Override project_id input variable')
@click.option('--input', '-I', 'custom_inputs', multiple=True, 
              help='Custom input variables in KEY=VALUE format (can be used multiple times)')
@click.option('--verbose', '-v', is_flag=True, 
              help='Enable verbose output')
def run_command(flow_file, whatif, no_validate, project_path, project_id, custom_inputs, verbose):
    """
    Run a CrewAI flow from a YAML definition file.
    
    FLOW_FILE: Path to the YAML flow definition file
    
    Examples:
    
      # Basic usage
      python launch_flow.py run improve-project-flow.yml
      
      # Show configuration without executing (whatif mode)
      python launch_flow.py run improve-project-flow.yml --whatif
      
      # Override input variables
      python launch_flow.py run improve-project-flow.yml --project-path /path/to/project
      
      # Custom input variables
      python launch_flow.py run improve-project-flow.yml -I custom_var=value -I another=123
    """
    try:
        launcher = FlowLauncher(flow_file, whatif=whatif)
        
        mode_str = "WHATIF MODE" if whatif else "EXECUTION MODE"
        print("="*60)
        print(f"CREWAI FLOW LAUNCHER - {mode_str}")
        print("="*60)
        print(f"Loading flow from: {flow_file}\n")
        
        launcher.load_flow(validate=not no_validate)
        
        # Build input values from CLI options
        input_values = {}
        
        # Add project-specific overrides
        if project_path:
            input_values['project_path'] = project_path
            if verbose:
                click.echo(f"Overriding project_path: {project_path}")
        
        if project_id:
            input_values['project_id'] = project_id
            if verbose:
                click.echo(f"Overriding project_id: {project_id}")
        
        # Parse custom inputs (KEY=VALUE format)
        for custom_input in custom_inputs:
            if '=' not in custom_input:
                click.echo(f"Warning: Invalid input format '{custom_input}', expected KEY=VALUE", err=True)
                continue
            key, value = custom_input.split('=', 1)
            input_values[key.strip()] = value.strip()
            if verbose:
                click.echo(f"Custom input: {key.strip()} = {value.strip()}")
        
        # Crew inputs are separate - they're passed to the crew.kickoff() method
        crew_inputs = {}
        
        result = launcher.launch(inputs=input_values, crew_inputs=crew_inputs)
        
        if not whatif and result:
            print("\n" + "="*60)
            print("FINAL RESULT")
            print("="*60)
            print(result)
        
        # Cleanup MCP connections
        launcher.cleanup()
        
    except FileNotFoundError as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)
    except yaml.YAMLError as e:
        click.echo(f"Error parsing YAML: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@cli.command(name='show')
@click.argument('flow_file', type=click.Path(exists=True))
@click.option('--no-validate', is_flag=True,
              help='Skip schema validation of the flow definition')
@click.option('--verbose', '-v', is_flag=True,
              help='Show detailed information')
def show_command(flow_file, no_validate, verbose):
    """
    Show LLM connection information from a flow definition.
    
    FLOW_FILE: Path to the YAML flow definition file
    
    Examples:
    
      # Show LLM info
      python launch_flow.py show improve-project-flow.yml
      
      # Show with details
      python launch_flow.py show improve-project-flow.yml -v
    """
    try:
        import os
        
        click.echo("="*60)
        click.echo("LLM CONNECTION INFORMATION")
        click.echo("="*60)
        click.echo(f"Flow file: {flow_file}\n")
        
        # Load flow definition
        flow_path = Path(flow_file)
        if not flow_path.exists():
            click.echo(f"Error: File not found: {flow_file}", err=True)
            sys.exit(1)
        
        with open(flow_path, 'r') as f:
            flow_data = yaml.safe_load(f)
        
        # Validate if requested
        if not no_validate and SCHEMA_VALIDATION_AVAILABLE:
            validator = FlowValidator()
            is_valid, errors = validator.validate(flow_data, strict=False)
            if not is_valid:
                click.echo("⚠️  Warning: Flow validation failed", err=True)
                if verbose:
                    for error in errors:
                        click.echo(f"  • {error}", err=True)
                click.echo()
        
        # Extract LLM configurations
        llms = flow_data.get('llms', [])
        
        if not llms:
            click.echo("No LLM configurations found in flow definition.")
            click.echo("\nNote: Agents will use default LLM settings.")
            sys.exit(0)
        
        click.echo(f"Found {len(llms)} LLM configuration(s):\n")
        
        for idx, llm in enumerate(llms, 1):
            name = llm.get('name', f'llm_{idx}')
            provider = llm.get('provider', 'unknown')
            model = llm.get('model', 'unknown')
            base_url = llm.get('base_url')
            
            click.echo(f"[{idx}] {name}")
            click.echo(f"    Provider: {provider}")
            click.echo(f"    Model: {model}")
            
            if base_url:
                # Resolve environment variables in base_url
                resolved_url = base_url
                if '{$env:' in base_url:
                    import re
                    pattern = r'\{\$env:([A-Za-z_][A-Za-z0-9_]*)\}'
                    
                    def replace_env(match):
                        var_name = match.group(1)
                        return os.environ.get(var_name, match.group(0))
                    
                    resolved_url = re.sub(pattern, replace_env, base_url)
                
                click.echo(f"    Base URL: {resolved_url}")
                if resolved_url != base_url:
                    click.echo(f"    (Original: {base_url})")
            
            # Test connection if verbose
            if verbose:
                click.echo(f"    Testing connection...")
                
                try:
                    if provider.lower() == 'ollama':
                        url_to_test = base_url or 'http://localhost:11434'
                        if '{$env:' in url_to_test:
                            import re
                            pattern = r'\{\$env:([A-Za-z_][A-Za-z0-9_]*)\}'
                            url_to_test = re.sub(pattern, lambda m: os.environ.get(m.group(1), m.group(0)), url_to_test)
                        
                        try:
                            import httpx
                            response = httpx.get(f"{url_to_test}/api/tags", timeout=5.0)
                            if response.status_code == 200:
                                click.echo(f"    ✅ Connection successful")
                                models_data = response.json()
                                if 'models' in models_data:
                                    available_models = [m.get('name', '') for m in models_data['models']]
                                    if model in available_models:
                                        click.echo(f"    ✅ Model '{model}' is available")
                                    else:
                                        click.echo(f"    ⚠️  Model '{model}' not found. Available: {', '.join(available_models[:5])}")
                            else:
                                click.echo(f"    ❌ Connection failed (HTTP {response.status_code})")
                        except httpx.ConnectError:
                            click.echo(f"    ❌ Cannot connect to {url_to_test}")
                        except Exception as e:
                            click.echo(f"    ❌ Error: {str(e)}")
                    else:
                        click.echo(f"    (Connection test not implemented for {provider})")
                except ImportError:
                    click.echo(f"    (Install httpx for connection testing: pip install httpx)")
            
            # Show additional parameters
            if verbose:
                params = []
                if 'temperature' in llm:
                    params.append(f"temperature={llm['temperature']}")
                if 'max_tokens' in llm:
                    params.append(f"max_tokens={llm['max_tokens']}")
                if 'top_p' in llm:
                    params.append(f"top_p={llm['top_p']}")
                if 'frequency_penalty' in llm:
                    params.append(f"frequency_penalty={llm['frequency_penalty']}")
                if 'presence_penalty' in llm:
                    params.append(f"presence_penalty={llm['presence_penalty']}")
                
                if params:
                    click.echo(f"    Parameters: {', '.join(params)}")
            
            click.echo()
        
        # Show environment variables that might be needed
        click.echo("Environment Variables:")
        env_vars_needed = set()
        
        for llm in llms:
            base_url = llm.get('base_url', '')
            if '{$env:' in str(base_url):
                import re
                matches = re.findall(r'\{\$env:([A-Za-z_][A-Za-z0-9_]*)\}', base_url)
                env_vars_needed.update(matches)
        
        if env_vars_needed:
            for var in sorted(env_vars_needed):
                value = os.environ.get(var)
                if value:
                    click.echo(f"  ✅ {var}={value}")
                else:
                    click.echo(f"  ❌ {var}=<not set>")
        else:
            click.echo("  (No environment variables required)")
        
    except yaml.YAMLError as e:
        click.echo(f"Error parsing YAML: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    # Support both old and new CLI formats
    if len(sys.argv) > 1 and sys.argv[1] not in ['run', 'show', '--help', '--version']:
        # Old format: python launch_flow.py flow.yml
        # Convert to new format: python launch_flow.py run flow.yml
        sys.argv.insert(1, 'run')
    
    cli()
