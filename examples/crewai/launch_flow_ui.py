#!/usr/bin/env python3
"""
Web UI for CrewAI Flow Launcher

This provides a Gradio-based web interface for launching CrewAI flows
defined in YAML files. It allows users to select a flow, configure inputs,
and monitor execution in real-time.

Usage:
    python launch_flow_ui.py
"""

import sys
import os
import time
import gradio as gr
from pathlib import Path
from queue import Queue
from threading import Thread
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Import the flow launcher
from launch_flow import FlowLauncher

# Shared queue for streaming output
class TaskInfo(BaseModel):
    name: str
    type: str  # "markdown", "code", "error", "info"
    output: str

shared_task_output_queue: Queue[TaskInfo] = Queue()

def add_to_queue(task_info: TaskInfo):
    """Add a task output to the shared queue."""
    shared_task_output_queue.put(task_info)


def find_flow_files() -> List[str]:
    """Find all YAML flow definition files in the current directory."""
    flow_files = []
    current_dir = Path(".")
    
    for pattern in ["*.yml", "*.yaml"]:
        for file in current_dir.glob(pattern):
            # Skip non-flow YAML files
            if file.name not in ["docker-compose.yml", "Taskfile.yml"]:
                flow_files.append(str(file))
    
    return sorted(flow_files)


def parse_flow_inputs(flow_file: str) -> Dict[str, Any]:
    """
    Parse the flow file and extract input definitions with defaults.
    
    Returns:
        Dictionary with input names as keys and their properties as values
    """
    if not flow_file or not Path(flow_file).exists():
        return {}
    
    try:
        launcher = FlowLauncher(flow_file, whatif=True)
        flow_def = launcher.load_flow(validate=False)
        
        inputs = {}
        if flow_def.inputs:
            for input_def in flow_def.inputs:
                if isinstance(input_def, dict):
                    if 'name' in input_def:
                        name = input_def['name']
                        inputs[name] = {
                            'description': input_def.get('description', ''),
                            'type': input_def.get('type', 'string'),
                            'default': input_def.get('default', '')
                        }
                    else:
                        # Format: {var: {description: ..., default: ...}}
                        for name, details in input_def.items():
                            if isinstance(details, dict):
                                inputs[name] = {
                                    'description': details.get('description', ''),
                                    'type': details.get('type', 'string'),
                                    'default': details.get('default', '')
                                }
        
        return inputs
    except Exception as e:
        add_to_queue(TaskInfo(
            name="Error",
            type="error",
            output=f"Failed to parse flow file: {str(e)}"
        ))
        return {}


def run_flow_with_streaming(
    flow_file: str,
    input_values: Dict[str, str],
    verbose: bool = False
):
    """
    Run the flow and stream output to the queue.
    
    Args:
        flow_file: Path to the flow YAML file
        input_values: Dictionary of input parameter values
        verbose: Enable verbose output
    """
    try:
        add_to_queue(TaskInfo(
            name="Initializing",
            type="info",
            output=f"🚀 Loading flow from: {flow_file}"
        ))
        
        # Create launcher
        launcher = FlowLauncher(flow_file, whatif=False, verbose=verbose)
        
        # Load and setup the flow
        add_to_queue(TaskInfo(
            name="Loading",
            type="info",
            output="📋 Loading flow definition..."
        ))
        
        # Load the flow definition first
        flow_def = launcher.load_flow(validate=True)
        
        # Setup the entire crew (this loads MCPs, LLMs, agents, tasks)
        crew = launcher.setup_crew(input_values=input_values)
        
        add_to_queue(TaskInfo(
            name="Flow Info",
            type="markdown",
            output=f"### {flow_def.crew.get('name', 'Unnamed Crew')}\n\n{flow_def.description}"
        ))
        
        # Display MCP tools if any were loaded
        if launcher.tools:
            mcp_tools = [t for t in launcher.tools if hasattr(t, 'mcp_tool_name')]
            if mcp_tools:
                mcp_report = "**MCP Tools Loaded:**\n\n"
                mcp_report += f"Found {len(mcp_tools)} MCP tool(s) from configured servers:\n\n"
                
                for tool in mcp_tools:
                    tool_name = getattr(tool, 'name', 'Unknown')
                    tool_desc = getattr(tool, 'description', 'No description')
                    mcp_name = getattr(tool, 'mcp_tool_name', tool_name)
                    
                    # Determine if it's HTTP or Stdio based MCP tool
                    tool_type = "HTTP" if hasattr(tool, 'base_url') else "Stdio"
                    
                    mcp_report += f"- **`{tool_name}`** ({tool_type})\n"
                    mcp_report += f"  - MCP Name: `{mcp_name}`\n"
                    mcp_report += f"  - Description: {tool_desc}\n"
                    
                    # Show input schema if available
                    if hasattr(tool, 'input_schema') and tool.input_schema:
                        schema = tool.input_schema
                        if isinstance(schema, dict) and 'properties' in schema:
                            params = list(schema['properties'].keys())
                            if params:
                                mcp_report += f"  - Parameters: {', '.join(params)}\n"
                    
                    mcp_report += "\n"
                
                add_to_queue(TaskInfo(
                    name="MCP Tools",
                    type="markdown",
                    output=mcp_report
                ))
        
        # Display agents
        agent_list = "\n".join([f"- **{name}**: {agent.role}" for name, agent in launcher.agents.items()])
        add_to_queue(TaskInfo(
            name="Agent List",
            type="markdown",
            output=f"**Agents Created:**\n\n{agent_list}"
        ))
        
        # Display inputs if provided
        if input_values:
            input_display = "**Input Parameters:**\n\n"
            for key, value in input_values.items():
                input_display += f"- **{key}**: {value}\n"
            add_to_queue(TaskInfo(
                name="Parameters",
                type="markdown",
                output=input_display
            ))
        
        # Launch crew
        add_to_queue(TaskInfo(
            name="Execution",
            type="info",
            output="🎯 Launching crew execution..."
        ))
        
        add_to_queue(TaskInfo(
            name="Running",
            type="markdown",
            output="### 🏃 Crew is now running...\n\nThis may take a while. Please be patient."
        ))
        
        # Execute the crew
        result = crew.kickoff(inputs=input_values)
        
        # Display results
        add_to_queue(TaskInfo(
            name="Results",
            type="markdown",
            output=f"### ✅ Execution Complete!\n\n{result}"
        ))
        
        add_to_queue(TaskInfo(
            name="Complete",
            type="info",
            output="🎉 Flow execution finished successfully!"
        ))
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        add_to_queue(TaskInfo(
            name="Error",
            type="error",
            output=f"❌ **Error during execution:**\n\n```\n{error_details}\n```"
        ))


def launch_flow_ui(
    flow_file: str,
    verbose: bool,
    *input_values
):
    """
    Launch the flow with streaming output.
    
    Args:
        flow_file: Selected flow file path
        verbose: Verbose mode checkbox
        *input_values: Variable number of input field values
    """
    if not flow_file:
        yield [{"role": "assistant", "content": "⚠️ Please select a flow file first."}]
        return
    
    # Clear the queue
    while not shared_task_output_queue.empty():
        shared_task_output_queue.get()
    
    # Parse inputs for the selected flow
    flow_inputs = parse_flow_inputs(flow_file)
    input_dict = {}
    
    # Map input values to input names
    input_names = list(flow_inputs.keys())
    for i, value in enumerate(input_values):
        if i < len(input_names):
            input_dict[input_names[i]] = value
    
    # Start the flow in a background thread
    thread = Thread(
        target=run_flow_with_streaming,
        args=(flow_file, input_dict, verbose)
    )
    thread.start()
    
    # Stream output
    messages = []
    curr_role = "user"
    
    while thread.is_alive() or not shared_task_output_queue.empty():
        if not shared_task_output_queue.empty():
            task = shared_task_output_queue.get()
            
            # Alternate roles for visual distinction
            curr_role = "assistant" if curr_role == "user" else "user"
            messages.append({
                "role": curr_role,
                "content": "",
            })
            
            # Animate the output character by character
            for char in task.output:
                time.sleep(0.002)
                messages[-1]["content"] += char
                yield messages
        else:
            time.sleep(0.2)
    
    # Final message
    curr_role = "assistant" if curr_role == "user" else "user"
    messages.append({
        "role": curr_role,
        "content": "# 🎯 All Done!"
    })
    yield messages


def get_mcp_report(flow_file: str) -> str:
    """
    Generate an MCP tools report for the selected flow file.
    
    Args:
        flow_file: Path to the flow YAML file
        
    Returns:
        Markdown formatted MCP report
    """
    if not flow_file or not Path(flow_file).exists():
        return "**No flow selected**"
    
    try:
        # Create a temporary launcher to inspect MCP configuration
        launcher = FlowLauncher(flow_file, whatif=True, verbose=False)
        flow_def = launcher.load_flow(validate=False)
        
        # Check if flow has MCP servers configured
        if not hasattr(flow_def, 'mcp_servers') or not flow_def.mcp_servers:
            return "**No MCP servers configured in this flow**"
        
        report = "# MCP Configuration Report\n\n"
        report += f"**Flow:** {flow_file}\n\n"
        report += "---\n\n"
        
        # List configured MCP servers
        report += "## Configured MCP Servers\n\n"
        for idx, server_config in enumerate(flow_def.mcp_servers, 1):
            server_name = server_config.get('name', f'Server {idx}')
            server_type = server_config.get('type', 'unknown')
            
            report += f"### {idx}. {server_name}\n\n"
            report += f"- **Type:** {server_type}\n"
            
            if server_type == 'http':
                url = server_config.get('url', 'N/A')
                report += f"- **URL:** `{url}`\n"
            elif server_type == 'stdio':
                command = server_config.get('command', 'N/A')
                report += f"- **Command:** `{command}`\n"
                if server_config.get('args'):
                    args = ' '.join(server_config['args'])
                    report += f"- **Args:** `{args}`\n"
            
            # Note about tools being loaded at runtime
            report += f"- **Tools:** *Loaded at runtime*\n\n"
        
        report += "---\n\n"
        report += "*Note: Actual tool details will be available after launching the flow.*"
        
        return report
        
    except Exception as e:
        return f"**Error generating MCP report:**\n\n```\n{str(e)}\n```"


def update_input_fields(flow_file: str):
    """
    Update the input fields based on the selected flow file.
    
    Returns:
        List of Gradio component updates and MCP report
    """
    if not flow_file:
        return [gr.update(visible=False, value="") for _ in range(5)] + [get_mcp_report(None)]
    
    flow_inputs = parse_flow_inputs(flow_file)
    
    updates = []
    for i in range(5):
        if i < len(flow_inputs):
            input_name = list(flow_inputs.keys())[i]
            input_info = flow_inputs[input_name]
            updates.append(gr.update(
                visible=True,
                label=input_name,
                placeholder=input_info['description'],
                value=str(input_info['default'])
            ))
        else:
            updates.append(gr.update(visible=False, value=""))
    
    # Add MCP report
    updates.append(get_mcp_report(flow_file))
    
    return updates


# Build the Gradio UI
with gr.Blocks(theme=gr.themes.Soft(), title="CrewAI Flow Launcher") as demo:
    gr.Markdown("""
    # 🚀 CrewAI Flow Launcher
    
    Load and execute CrewAI flows defined in YAML files with real-time monitoring.
    """)
    
    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### Configuration")
            
            flow_file_dropdown = gr.Dropdown(
                label="Select Flow File",
                choices=find_flow_files(),
                value=None,
                interactive=True
            )
            
            verbose_checkbox = gr.Checkbox(
                label="Verbose Mode",
                value=False,
                info="Enable detailed logging"
            )
            
            # Dynamic input fields (max 5)
            input_fields = []
            for i in range(5):
                field = gr.Textbox(
                    label=f"Input {i+1}",
                    visible=False,
                    interactive=True
                )
                input_fields.append(field)
            
            run_button = gr.Button("▶️ Launch Flow", variant="primary", size="lg")
            
            gr.Markdown("### 🔌 MCP Configuration")
            
            mcp_report = gr.Markdown(
                value="**No flow selected**",
                label="MCP Tools Report"
            )
            
            gr.Markdown("""
            ---
            ### 📖 Instructions
            
            1. **Select a flow file** from the dropdown
            2. **Review MCP configuration** if applicable
            3. **Configure inputs** that appear based on the flow
            4. **Click Launch Flow** to execute
            5. **Monitor progress** in the output panel
            
            The flow will execute according to its workflow definition, 
            with agents collaborating to complete their tasks.
            """)
        
        with gr.Column(scale=2):
            gr.Markdown("### Execution Output")
            chat = gr.Chatbot(
                type="messages",
                label="Flow Progress",
                height=700,
                show_copy_button=True
            )
    
    # Update input fields and MCP report when flow file changes
    flow_file_dropdown.change(
        fn=update_input_fields,
        inputs=[flow_file_dropdown],
        outputs=input_fields + [mcp_report]
    )
    
    # Launch flow on button click
    run_button.click(
        fn=launch_flow_ui,
        inputs=[flow_file_dropdown, verbose_checkbox] + input_fields,
        outputs=chat
    )


if __name__ == "__main__":
    print("🌐 Starting CrewAI Flow Launcher Web UI...")
    print("📍 Navigate to the URL below to access the interface\n")
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False
    )
