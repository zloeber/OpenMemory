#!/usr/bin/env python3
"""
Demo script showing how the OpenMemory integration works

This demonstrates:
1. How agents are configured for OpenMemory
2. What tools they receive
3. The agent registration process (mock)
"""

import sys
import os

# Add SDK and src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'sdk-py'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from crewai_memory_middleware.tools.openmemory_tool import create_openmemory_tools


def demonstrate_configuration():
    """Show how the integration is configured."""
    print("🚀 OpenMemory Integration Demo")
    print("=" * 70)
    print()
    
    print("📋 CREW CONFIGURATION")
    print("-" * 70)
    print("When the CrewAI crew starts, the @before_kickoff decorator:")
    print("1. Registers each agent with OpenMemory")
    print("2. Creates unique namespaces for each agent")
    print("3. Generates API keys for authentication")
    print("4. Provides OpenMemory tools to each agent")
    print()
    
    print("👥 AGENT REGISTRATIONS")
    print("-" * 70)
    
    agents = [
        {
            'name': 'Researcher',
            'agent_id': 'crewai-researcher',
            'namespace': 'research-workspace',
            'shared_namespaces': ['team-research', 'public-knowledge'],
            'description': 'AI researcher for data analysis and research tasks',
            'permissions': ['read', 'write']
        },
        {
            'name': 'Reporting Analyst',
            'agent_id': 'crewai-reporting-analyst',
            'namespace': 'reporting-workspace',
            'shared_namespaces': ['team-research', 'reports-archive'],
            'description': 'AI analyst for creating detailed reports',
            'permissions': ['read', 'write']
        }
    ]
    
    for i, agent in enumerate(agents, 1):
        print(f"\nAgent {i}: {agent['name']}")
        print(f"  Agent ID: {agent['agent_id']}")
        print(f"  Primary Namespace: {agent['namespace']}")
        print(f"  Shared Namespaces: {', '.join(agent['shared_namespaces'])}")
        print(f"  Permissions: {', '.join(agent['permissions'])}")
        print(f"  Description: {agent['description']}")
    
    print()
    print("🔧 OPENMEMORY TOOLS")
    print("-" * 70)
    
    # Create example tools (with mock credentials)
    mock_tools = create_openmemory_tools(
        agent_id="demo-agent",
        api_key="demo-key-12345",
        base_url="http://localhost:8080"
    )
    
    print(f"Each agent receives {len(mock_tools)} OpenMemory tools:\n")
    
    for tool in mock_tools:
        print(f"Tool: {tool.name}")
        print(f"  Description: {tool.description[:100]}...")
        
        # Show input schema
        if hasattr(tool, 'args_schema'):
            schema = tool.args_schema
            if hasattr(schema, 'model_fields'):
                fields = schema.model_fields
                print("  Input Parameters:")
                for field_name, field_info in fields.items():
                    field_type = field_info.annotation
                    field_desc = field_info.description if hasattr(field_info, 'description') else 'N/A'
                    print(f"    - {field_name} ({field_type}): {field_desc}")
        print()
    
    print("💡 USAGE DURING EXECUTION")
    print("-" * 70)
    print("During crew execution, agents can:")
    print()
    print("1. Query past memories:")
    print("   query_openmemory(")
    print("     query='AI research breakthroughs',")
    print("     k=5")
    print("   )")
    print()
    print("2. Store new findings:")
    print("   store_in_openmemory(")
    print("     content='GPT-4 achieves 87% on coding benchmarks',")
    print("     sector='semantic',")
    print("     salience=0.9")
    print("   )")
    print()
    
    print("🏗️ MEMORY ARCHITECTURE")
    print("-" * 70)
    print("┌────────────────────────────────────────────────┐")
    print("│         CrewAI Crew (Research Team)           │")
    print("│  ┌──────────────┐    ┌──────────────┐         │")
    print("│  │  Researcher  │───▶│   Analyst    │         │")
    print("│  └──────┬───────┘    └──────┬───────┘         │")
    print("└─────────┼────────────────────┼─────────────────┘")
    print("          │                    │")
    print("          └─────────┬──────────┘")
    print("                    │ MCP Proxy")
    print("          ┌─────────▼──────────────────┐")
    print("          │   OpenMemory Backend       │")
    print("          │                            │")
    print("          │  Namespaces:               │")
    print("          │  • research-workspace      │")
    print("          │  • reporting-workspace     │")
    print("          │  • team-research (shared)  │")
    print("          │                            │")
    print("          │  Memory Sectors:           │")
    print("          │  • Episodic (events)       │")
    print("          │  • Semantic (facts)        │")
    print("          │  • Procedural (how-to)     │")
    print("          │  • Emotional (sentiment)   │")
    print("          │  • Reflective (meta)       │")
    print("          └────────────────────────────┘")
    print()
    
    print("✅ BENEFITS")
    print("-" * 70)
    print("• Persistent Memory: Agents remember across runs")
    print("• Namespace Isolation: Each agent has private memory space")
    print("• Collaboration: Shared namespaces enable team work")
    print("• Multi-Sector Storage: Organize memories by type")
    print("• Semantic Search: Find relevant memories efficiently")
    print("• Automatic Registration: No manual setup required")
    print()
    
    print("🎯 NEXT STEPS")
    print("-" * 70)
    print("1. Start OpenMemory: docker compose -f ../../../docker-compose.yml up -d")
    print("2. Run the crew: crewai run")
    print("3. Watch agents use memory tools during execution")
    print("4. Query memories after completion to see what was stored")
    print()
    print("=" * 70)


if __name__ == "__main__":
    demonstrate_configuration()
