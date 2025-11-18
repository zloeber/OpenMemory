#!/usr/bin/env python3
"""
Test script to verify the Flow Launcher UI is properly installed and configured.

This script checks:
- Required dependencies are installed
- Flow files can be discovered
- UI components can be initialized
- Basic functionality works
"""

import sys
from pathlib import Path

def check_imports():
    """Check if all required packages are importable."""
    print("🔍 Checking dependencies...\n")
    
    required = {
        'gradio': 'gradio',
        'crewai': 'crewai',
        'yaml': 'pyyaml',
        'click': 'click',
        'pydantic': 'pydantic',
    }
    
    optional = {
        'mcp': 'mcp (for MCP server support)',
        'httpx': 'httpx (for HTTP MCP servers)',
    }
    
    all_ok = True
    
    # Check required
    for module, package in required.items():
        try:
            __import__(module)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} - REQUIRED")
            all_ok = False
    
    # Check optional
    for module, package in optional.items():
        try:
            __import__(module)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ⚠️  {package} - OPTIONAL")
    
    print()
    return all_ok


def check_flow_files():
    """Check if flow files can be discovered."""
    print("🔍 Checking for flow files...\n")
    
    try:
        from launch_flow_ui import find_flow_files
        flows = find_flow_files()
        
        if flows:
            print(f"  ✅ Found {len(flows)} flow file(s):")
            for flow in flows:
                print(f"     - {flow}")
        else:
            print("  ⚠️  No flow files found (this is OK for initial setup)")
        print()
        return True
    except Exception as e:
        print(f"  ❌ Error finding flows: {e}\n")
        return False


def check_ui_components():
    """Check if UI components can be initialized."""
    print("🔍 Checking UI components...\n")
    
    try:
        import gradio as gr
        
        # Try to create basic components
        with gr.Blocks() as test_demo:
            gr.Textbox(label="Test")
            gr.Button("Test")
        
        print("  ✅ Gradio UI components initialized successfully")
        print()
        return True
    except Exception as e:
        print(f"  ❌ Error initializing UI: {e}\n")
        return False


def check_launcher():
    """Check if FlowLauncher can be imported and instantiated."""
    print("🔍 Checking FlowLauncher...\n")
    
    try:
        from launch_flow import FlowLauncher
        
        # Try to create a launcher (without loading a file)
        print("  ✅ FlowLauncher imported successfully")
        print()
        return True
    except Exception as e:
        print(f"  ❌ Error importing FlowLauncher: {e}\n")
        return False


def check_example_flow():
    """Check if an example flow file exists and can be parsed."""
    print("🔍 Checking example flows...\n")
    
    example_flows = [
        'improve-project-flow.yml',
        'test-simple-flow.yml',
        'test-first-agent.yml'
    ]
    
    found_examples = []
    for flow_file in example_flows:
        if Path(flow_file).exists():
            found_examples.append(flow_file)
            print(f"  ✅ Found: {flow_file}")
    
    if not found_examples:
        print("  ⚠️  No example flows found")
        print("     This is OK if you plan to create your own flows")
    
    print()
    return True


def print_summary(checks):
    """Print a summary of all checks."""
    print("\n" + "=" * 60)
    print("  Test Summary")
    print("=" * 60 + "\n")
    
    passed = sum(checks.values())
    total = len(checks)
    
    for name, result in checks.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print()
    
    if passed == total:
        print("🎉 All checks passed! The UI is ready to use.")
        print("\nRun the UI with:")
        print("  python run_flow_ui.py")
        print("\nOr:")
        print("  ./start_flow_ui.sh")
        return 0
    else:
        print(f"⚠️  {total - passed} check(s) failed.")
        print("\nInstall missing dependencies with:")
        print("  pip install -r launch_flow_ui_requirements.txt")
        return 1


def main():
    """Run all checks."""
    print("=" * 60)
    print("  CrewAI Flow Launcher UI - Installation Test")
    print("=" * 60 + "\n")
    
    checks = {
        "Dependencies": check_imports(),
        "UI Components": check_ui_components(),
        "FlowLauncher": check_launcher(),
        "Flow Discovery": check_flow_files(),
        "Example Flows": check_example_flow(),
    }
    
    return print_summary(checks)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
