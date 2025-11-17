#!/usr/bin/env python3
"""
Simple Bootstrap Script for OpenMemory using direct REST API

This script loads demo data directly through the REST API endpoints,
bypassing the MCP proxy layer.
"""

import sys
import os
import time
import json
import argparse
from typing import List, Dict, Any
import urllib.request
import urllib.error

# Add the SDK to the path for agent registration
sdk_path = os.path.join(os.path.dirname(__file__), '..', '..', 'sdk-py')
sys.path.insert(0, sdk_path)

try:
    from openmemory import register_agent
except ImportError:
    print("❌ Error: Could not import openmemory SDK")
    print(f"   Tried path: {sdk_path}")
    print("   Please ensure the Python SDK is installed or available")
    sys.exit(1)


class BootstrapStats:
    def __init__(self):
        self.agents_created = 0
        self.memories_created = 0
        self.errors = 0


def make_request(url: str, method: str = 'GET', data: Dict = None) -> Dict[str, Any]:
    """Make an HTTP request using urllib"""
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    req_data = json.dumps(data).encode('utf-8') if data else None
    request = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else 'No error details'
        raise Exception(f"HTTP {e.code}: {e.reason} - {error_body}")
    except urllib.error.URLError as e:
        raise Exception(f"Connection error: {str(e.reason)}")


def print_banner():
    """Print a nice banner for the bootstrap script"""
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║          OpenMemory Simple Bootstrap Script (REST API)            ║")
    print("║            Demo Data Generator with Namespace Isolation            ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print()


def create_alice_scenario():
    """Simplified alice-dev memories"""
    return [
        {
            "content": "Production incident resolved: Database connection pool exhausted. Increased max_connections from 100 to 200, implemented connection monitoring.",
            "user_id": "alice-development",
            "tags": "incident,database,production",
            "metadata": {"severity": "high", "resolved": True}
        },
        {
            "content": "Architecture decision: Migrated user service to microservices using Kafka for event-driven communication.",
            "user_id": "alice-development",
            "tags": "architecture,microservices,kafka",
            "metadata": {"impact": "high"}
        },
        {
            "content": "Code review completed for API endpoint. Suggested comprehensive test coverage and discussed SOLID principles.",
            "user_id": "alice-development",
            "tags": "code_review,mentoring,api",
            "metadata": {"developer": "junior"}
        },
    ]


def create_bob_scenario():
    """Simplified bob-research memories"""
    return [
        {
            "content": "Read groundbreaking paper 'Attention Is All You Need' by Vaswani et al. Transformer architecture eliminates recurrence.",
            "user_id": "bob-research-lab",
            "tags": "paper,transformers,attention",
            "metadata": {"paper_id": "arxiv:1706.03762", "year": 2017}
        },
        {
            "content": "Fine-tuned BERT-base on medical texts. Achieved 94.2% accuracy on clinical entity extraction.",
            "user_id": "bob-research-lab",
            "tags": "experiment,bert,medical_nlp",
            "metadata": {"accuracy": 0.942}
        },
        {
            "content": "Attended NeurIPS 2023: Fascinating workshop on multimodal learning with vision-language models.",
            "user_id": "bob-research-lab",
            "tags": "conference,neurips,multimodal",
            "metadata": {"conference": "NeurIPS 2023"}
        },
    ]


def load_scenario(base_url: str, scenario_data: Dict[str, Any], stats: BootstrapStats):
    """Load a scenario using direct REST API"""
    
    print("\n" + "=" * 70)
    print(f"🎬 Loading Scenario: {scenario_data['name']}")
    print("=" * 70)
    print()
    
    agent_id = scenario_data['agent_id']
    namespace = scenario_data['namespace']
    memories = scenario_data['memories']
    
    # Register agent using SDK
    print(f"📝 Registering agent: {agent_id}")
    try:
        result = register_agent(
            agent_id=agent_id,
            namespace=namespace,
            description=scenario_data.get('description', ''),
            base_url=base_url
        )
        
        api_key = result.api_key
        registered_namespace = result.namespace
        stats.agents_created += 1
        
        print(f"✅ Agent registered successfully")
        print(f"   Namespace: {registered_namespace}")
        print(f"   API Key: {api_key[:20]}...")
        print()
        
    except Exception as e:
        print(f"⚠️  Agent registration skipped (may already exist): {str(e)}")
        print()
    
    # Add memories using direct REST API
    print(f"📚 Loading {len(memories)} memories using REST API...")
    print()
    
    for i, memory in enumerate(memories, 1):
        try:
            # Use the /memory/add endpoint directly
            result = make_request(
                f"{base_url}/memory/add",
                method='POST',
                data=memory
            )
            
            stats.memories_created += 1
            
            content_preview = memory['content'][:70] + "..." if len(memory['content']) > 70 else memory['content']
            print(f"   [{i}/{len(memories)}] ✅ {content_preview}")
            
            time.sleep(0.3)
            
        except Exception as e:
            stats.errors += 1
            print(f"   [{i}/{len(memories)}] ❌ Error: {str(e)}")
    
    print()


def print_summary(stats: BootstrapStats):
    """Print a summary"""
    print("\n" + "=" * 70)
    print("📊 Bootstrap Summary")
    print("=" * 70)
    print(f"   Agents Created: {stats.agents_created}")
    print(f"   Memories Created: {stats.memories_created}")
    print(f"   Errors: {stats.errors}")
    print("=" * 70)
    print()


def main():
    parser = argparse.ArgumentParser(description='Simple Bootstrap for OpenMemory')
    parser.add_argument('--base-url', default='http://localhost:8080',
                       help='Base URL for OpenMemory API')
    
    args = parser.parse_args()
    
    print_banner()
    print(f"Configuration:")
    print(f"   Base URL: {args.base_url}")
    print(f"   Using: Direct REST API (/memory/add)")
    print()
    
    # Health check
    try:
        print("🏥 Checking server health...")
        with urllib.request.urlopen(f"{args.base_url}/api/agents", timeout=5) as response:
            if response.status == 200:
                print("✅ Server is healthy")
            else:
                raise Exception(f"Server returned status {response.status}")
    except Exception as e:
        print(f"❌ Failed to connect: {str(e)}")
        sys.exit(1)
    
    stats = BootstrapStats()
    
    # Define simplified scenarios
    scenarios = [
        {
            "name": "Software Development Team Lead",
            "agent_id": "alice-dev",
            "namespace": "alice-development",
            "description": "Engineering team lead",
            "memories": create_alice_scenario()
        },
        {
            "name": "AI Research Scientist",
            "agent_id": "bob-research",
            "namespace": "bob-research-lab",
            "description": "NLP researcher",
            "memories": create_bob_scenario()
        }
    ]
    
    # Load scenarios
    for scenario in scenarios:
        try:
            load_scenario(args.base_url, scenario, stats)
        except Exception as e:
            print(f"❌ Error loading scenario: {str(e)}")
            stats.errors += 1
    
    print_summary(stats)
    
    print("✨ Bootstrap complete!")
    print()
    print("To query memories:")
    print(f"  curl -X POST {args.base_url}/memory/query \\")
    print(f"    -H 'Content-Type: application/json' \\")
    print(f"    -d '{{\"query\":\"database\",\"filters\":{{\"user_id\":\"alice-development\"}}}}'")
    print()


if __name__ == "__main__":
    main()
