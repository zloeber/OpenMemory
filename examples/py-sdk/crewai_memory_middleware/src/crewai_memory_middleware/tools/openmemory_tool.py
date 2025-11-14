"""
OpenMemory MCP Proxy Tool for CrewAI

This tool enables CrewAI agents to interact with OpenMemory via the MCP proxy,
allowing them to store and query memories with automatic namespace isolation.
"""

from crewai.tools import BaseTool
from typing import Type, Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json
import urllib.request


class OpenMemoryQueryInput(BaseModel):
    """Input schema for querying OpenMemory."""
    query: str = Field(..., description="The search query to find relevant memories")
    k: int = Field(default=5, description="Number of results to return (default: 5)")
    namespace: Optional[str] = Field(default=None, description="Optional namespace to query from")


class OpenMemoryStorageInput(BaseModel):
    """Input schema for storing memories in OpenMemory."""
    content: str = Field(..., description="The content/memory to store")
    sector: Optional[str] = Field(default=None, description="Memory sector: episodic, semantic, procedural, emotional, or reflective")
    salience: Optional[float] = Field(default=0.7, description="Importance of the memory (0.0-1.0)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the memory")


class OpenMemoryQueryTool(BaseTool):
    """
    Tool for querying memories from OpenMemory via MCP proxy.
    
    This tool allows agents to search through their memory space and retrieve
    relevant information based on semantic similarity.
    """
    name: str = "query_openmemory"
    description: str = (
        "Query and retrieve relevant memories from OpenMemory. "
        "Use this when you need to recall past information, research findings, "
        "user preferences, or any previously stored knowledge. "
        "Returns a list of relevant memories with their content and metadata."
    )
    args_schema: Type[BaseModel] = OpenMemoryQueryInput
    
    # Configuration
    agent_id: str = ""
    api_key: str = ""
    base_url: str = "http://localhost:8080"
    
    def __init__(self, agent_id: str, api_key: str, base_url: str = "http://localhost:8080", **kwargs):
        super().__init__(**kwargs)
        self.agent_id = agent_id
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
    
    def _request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make request to MCP proxy."""
        headers = {
            'content-type': 'application/json',
            'authorization': f'Bearer {self.api_key}'
        }
        
        data = json.dumps(payload).encode()
        url = f"{self.base_url}/mcp-proxy"
        req = urllib.request.Request(url, method='POST', headers=headers, data=data)
        
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            try:
                error_data = json.loads(error_body) if error_body else {}
                error_msg = error_data.get('message', f'HTTP {e.code}: {e.reason}')
            except json.JSONDecodeError:
                error_msg = f'HTTP {e.code}: {e.reason}'
            raise Exception(f"MCP proxy request failed: {error_msg}")
    
    def _run(self, query: str, k: int = 5, namespace: Optional[str] = None) -> str:
        """Execute the query memory operation."""
        payload = {
            'method': 'tools/call',
            'params': {
                'name': 'query_memory',
                'arguments': {
                    'agent_id': self.agent_id,
                    'query': query,
                    'k': k,
                    'api_key': self.api_key
                }
            }
        }
        
        if namespace:
            payload['params']['arguments']['namespace'] = namespace
        
        try:
            result = self._request(payload)
            
            # Extract results from MCP response
            if 'result' in result and 'meta' in result['result']:
                meta = result['result']['meta']
                results = meta.get('results', [])
                total = meta.get('total_results', 0)
                
                if not results:
                    return f"No relevant memories found for query: '{query}'"
                
                # Format results for the agent
                formatted_results = [
                    f"Memory {i+1}:\n"
                    f"  Content: {mem.get('content', 'N/A')}\n"
                    f"  Sector: {mem.get('sector', 'unknown')}\n"
                    f"  Salience: {mem.get('salience', 0):.2f}\n"
                    f"  Created: {mem.get('created_at', 'N/A')}"
                    for i, mem in enumerate(results)
                ]
                
                return (
                    f"Found {total} relevant memories:\n\n" +
                    "\n\n".join(formatted_results)
                )
            else:
                return f"Unexpected response format from OpenMemory"
                
        except Exception as e:
            return f"Failed to query memories: {str(e)}"


class OpenMemoryStorageTool(BaseTool):
    """
    Tool for storing memories in OpenMemory via MCP proxy.
    
    This tool allows agents to persist important information, learnings,
    and insights for future recall.
    """
    name: str = "store_in_openmemory"
    description: str = (
        "Store important information in OpenMemory for future recall. "
        "Use this to save research findings, user preferences, insights, "
        "decisions, or any information that should be remembered. "
        "Choose appropriate sector: 'episodic' for events, 'semantic' for facts, "
        "'procedural' for how-to knowledge, 'emotional' for sentiment, "
        "'reflective' for meta-information."
    )
    args_schema: Type[BaseModel] = OpenMemoryStorageInput
    
    # Configuration
    agent_id: str = ""
    api_key: str = ""
    base_url: str = "http://localhost:8080"
    
    def __init__(self, agent_id: str, api_key: str, base_url: str = "http://localhost:8080", **kwargs):
        super().__init__(**kwargs)
        self.agent_id = agent_id
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
    
    def _request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make request to MCP proxy."""
        headers = {
            'content-type': 'application/json',
            'authorization': f'Bearer {self.api_key}'
        }
        
        data = json.dumps(payload).encode()
        url = f"{self.base_url}/mcp-proxy"
        req = urllib.request.Request(url, method='POST', headers=headers, data=data)
        
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            try:
                error_data = json.loads(error_body) if error_body else {}
                error_msg = error_data.get('message', f'HTTP {e.code}: {e.reason}')
            except json.JSONDecodeError:
                error_msg = f'HTTP {e.code}: {e.reason}'
            raise Exception(f"MCP proxy request failed: {error_msg}")
    
    def _run(self, content: str, sector: Optional[str] = None, 
             salience: Optional[float] = 0.7, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Execute the store memory operation."""
        payload = {
            'method': 'tools/call',
            'params': {
                'name': 'store_memory',
                'arguments': {
                    'agent_id': self.agent_id,
                    'content': content,
                    'api_key': self.api_key
                }
            }
        }
        
        args = payload['params']['arguments']
        if sector:
            args['sector'] = sector
        if salience is not None:
            args['salience'] = salience
        if metadata:
            args['metadata'] = metadata
        
        try:
            result = self._request(payload)
            
            # Extract result from MCP response
            if 'result' in result and 'content' in result['result']:
                content_item = result['result']['content'][0]
                memory_id = result['result'].get('meta', {}).get('memory_id')
                used_namespace = result['result'].get('meta', {}).get('namespace')
                
                return (
                    f"Successfully stored memory:\n"
                    f"  Memory ID: {memory_id}\n"
                    f"  Namespace: {used_namespace}\n"
                    f"  Message: {content_item.get('text', 'Memory stored successfully')}"
                )
            else:
                return "Memory stored but response format unexpected"
                
        except Exception as e:
            return f"Failed to store memory: {str(e)}"


def create_openmemory_tools(agent_id: str, api_key: str, base_url: str = "http://localhost:8080") -> List[BaseTool]:
    """
    Create OpenMemory tools for a CrewAI agent.
    
    Args:
        agent_id: The unique identifier for the agent
        api_key: The API key for authenticating with OpenMemory
        base_url: The base URL of the OpenMemory service (default: http://localhost:8080)
        
    Returns:
        List of OpenMemory tools (query and storage)
    """
    return [
        OpenMemoryQueryTool(agent_id=agent_id, api_key=api_key, base_url=base_url),
        OpenMemoryStorageTool(agent_id=agent_id, api_key=api_key, base_url=base_url)
    ]
