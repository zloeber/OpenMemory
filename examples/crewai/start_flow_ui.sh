#!/bin/bash
# Quick Start Script for CrewAI Flow Launcher Web UI

set -e

echo "=========================================="
echo "  CrewAI Flow Launcher Web UI Setup"
echo "=========================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    echo "   Please install Python 3.8 or later"
    exit 1
fi

echo "✓ Python found: $(python3 --version)"
echo ""

# Check if pip is available
if ! command -v pip &> /dev/null && ! python3 -m pip --version &> /dev/null; then
    echo "❌ pip is required but not found"
    echo "   Please install pip"
    exit 1
fi

echo "✓ pip found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo ""

if [ -f "launch_flow_ui_requirements.txt" ]; then
    python3 -m pip install -r launch_flow_ui_requirements.txt
    echo ""
    echo "✓ Dependencies installed"
else
    echo "⚠️  Requirements file not found, installing core dependencies..."
    python3 -m pip install gradio crewai pyyaml click pydantic mcp httpx
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "🚀 Starting the web UI..."
echo ""

# Launch the UI
python3 run_flow_ui.py
