#!/usr/bin/env python3
"""
Example script to demonstrate launching the Flow UI

This script shows how to programmatically launch the web UI
and can be used as a starting point for custom implementations.
"""

import sys
import os
from pathlib import Path

# Ensure the current directory is in the path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    """Launch the Flow UI with custom configuration."""
    
    # Import after path is set
    from launch_flow_ui import demo
    
    print("=" * 60)
    print("  CrewAI Flow Launcher Web UI")
    print("=" * 60)
    print()
    print("📋 Available Flow Files:")
    
    # List available flows
    from launch_flow_ui import find_flow_files
    flow_files = find_flow_files()
    
    if flow_files:
        for i, flow_file in enumerate(flow_files, 1):
            print(f"  {i}. {flow_file}")
    else:
        print("  ⚠️  No flow files found in current directory")
        print("     Create a YAML flow definition file to get started")
    
    print()
    print("=" * 60)
    print()
    print("🌐 Starting web interface...")
    print("   Navigate to the URL below to access the UI")
    print()
    
    # Launch with custom settings
    demo.launch(
        server_name="0.0.0.0",  # Accessible from network
        server_port=7860,        # Default port
        share=False,             # Set to True to create a public link
        show_error=True,         # Show errors in browser
        quiet=False              # Show server logs
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down gracefully...")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
