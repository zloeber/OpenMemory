#!/usr/bin/env python3
"""
Simple script to test LLM connectivity and response quality.
Use this to diagnose LLM issues before running complex flows.
"""

import sys
import yaml
from pathlib import Path

try:
    from crewai import LLM
except ImportError:
    print("Error: crewai package not found. Please install it with: pip install crewai")
    sys.exit(1)


def test_llm(flow_file: str):
    """Test LLM configuration from a flow file."""
    
    flow_path = Path(flow_file)
    if not flow_path.exists():
        print(f"Error: File not found: {flow_file}")
        sys.exit(1)
    
    with open(flow_path, 'r') as f:
        flow_data = yaml.safe_load(f)
    
    llms = flow_data.get('llms', [])
    
    if not llms:
        print("No LLM configurations found in flow definition.")
        sys.exit(1)
    
    llm_config = llms[0]  # Test first LLM
    
    provider = llm_config.get('provider', '').lower()
    model = llm_config.get('model')
    base_url = llm_config.get('base_url')
    temperature = llm_config.get('temperature', 0.7)
    max_tokens = llm_config.get('max_tokens', 2000)
    
    print("="*60)
    print("LLM CONNECTIVITY TEST")
    print("="*60)
    print(f"Provider: {provider}")
    print(f"Model: {model}")
    print(f"Base URL: {base_url}")
    print(f"Temperature: {temperature}")
    print(f"Max Tokens: {max_tokens}")
    print()
    
    if provider != 'ollama':
        print(f"This test script currently only supports Ollama.")
        print(f"Provider '{provider}' is not supported yet.")
        sys.exit(1)
    
    # Set up Ollama environment
    import os
    if base_url:
        os.environ['OLLAMA_API_BASE'] = base_url
    
    llm_model = f"ollama/{model}"
    
    print("Creating LLM instance...")
    try:
        llm = LLM(
            model=llm_model,
            base_url=base_url,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=60,
        )
        print("✅ LLM instance created successfully\n")
    except Exception as e:
        print(f"❌ Failed to create LLM instance: {e}")
        sys.exit(1)
    
    # Test 1: Simple arithmetic
    print("-"*60)
    print("Test 1: Simple Arithmetic")
    print("-"*60)
    test_prompt_1 = "What is 7 + 5? Respond with just the number."
    print(f"Prompt: {test_prompt_1}")
    print()
    
    try:
        # Direct call to the LLM
        from litellm import completion
        
        response = completion(
            model=llm_model,
            messages=[{"role": "user", "content": test_prompt_1}],
            api_base=base_url,
            temperature=temperature,
            max_tokens=50,
        )
        
        answer = response.choices[0].message.content.strip()
        print(f"Response: {answer}")
        
        if answer:
            print("✅ Test 1 passed - LLM responded")
        else:
            print("❌ Test 1 failed - Empty response")
            
    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # Test 2: Longer response
    print("-"*60)
    print("Test 2: Longer Response")
    print("-"*60)
    test_prompt_2 = "Explain what a file system is in 2-3 sentences."
    print(f"Prompt: {test_prompt_2}")
    print()
    
    try:
        from litellm import completion
        
        response = completion(
            model=llm_model,
            messages=[{"role": "user", "content": test_prompt_2}],
            api_base=base_url,
            temperature=temperature,
            max_tokens=200,
        )
        
        answer = response.choices[0].message.content.strip()
        print(f"Response: {answer}")
        print()
        
        if answer and len(answer) > 20:
            print(f"✅ Test 2 passed - LLM responded with {len(answer)} characters")
        else:
            print(f"❌ Test 2 failed - Response too short or empty")
            
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("="*60)
    print("TESTING COMPLETE")
    print("="*60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test-llm.py <flow_file.yml>")
        print("Example: python test-llm.py improve-project-flow.yml")
        sys.exit(1)
    
    test_llm(sys.argv[1])
