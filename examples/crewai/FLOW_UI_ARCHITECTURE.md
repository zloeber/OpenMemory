# CrewAI Flow Launcher Web UI - File Structure

## 📁 Created Files

```
examples/crewai/
├── launch_flow_ui.py              # Main web UI application
├── run_flow_ui.py                 # Simple launcher script
├── test_flow_ui.py                # Installation test script
├── start_flow_ui.sh               # Automated setup & launch script
├── launch_flow_ui_requirements.txt # Python dependencies
├── LAUNCH_FLOW_UI_README.md       # Comprehensive documentation
└── QUICKSTART.md                  # Quick start guide
```

## 🔄 Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
│                  (http://localhost:7860)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Gradio Web Interface                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Flow Selector│  │ Input Fields │  │ Launch Button│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Real-time Output Display                   │    │
│  │  (Streaming chat interface with progress updates)   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Backend (Main Thread)                    │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Shared Queue (Thread-Safe)               │       │
│  │  • Receives TaskInfo objects from worker         │       │
│  │  • Streams to Gradio UI                          │       │
│  └──────────────┬───────────────────────────────────┘       │
│                 │                                             │
│                 ▼                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Worker Thread (Flow Execution)           │       │
│  │                                                   │       │
│  │  1. Load Flow Definition (YAML)                  │       │
│  │  2. Connect to MCP Servers                       │       │
│  │  3. Initialize LLMs                              │       │
│  │  4. Create Agents                                │       │
│  │  5. Create Tasks                                 │       │
│  │  6. Launch Crew                                  │       │
│  │  7. Stream Results                               │       │
│  │                                                   │       │
│  │  (Pushes status updates to Shared Queue)         │       │
│  └──────────────┬───────────────────────────────────┘       │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   FlowLauncher                               │
│         (from launch_flow.py)                                │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Flow Parser │  │  MCP Manager │  │  LLM Manager │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Agent Creator │  │ Task Creator │  │ Crew Builder │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    CrewAI Framework                          │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │   ...    │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
│        │             │              │             │         │
│        └─────────────┴──────────────┴─────────────┘         │
│                      │                                       │
│              ┌───────▼────────┐                             │
│              │  Task Queue    │                             │
│              └───────┬────────┘                             │
│                      │                                       │
│              ┌───────▼────────┐                             │
│              │  Workflow Exec │                             │
│              └───────┬────────┘                             │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 External Services                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  LLM APIs    │  │ MCP Servers  │  │  Tools/APIs  │      │
│  │ (Ollama, etc)│  │ (stdio/http) │  │ (filesystem) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Components

### 1. **launch_flow_ui.py**
Main application file containing:
- Gradio interface definition
- Flow discovery and input parsing
- Streaming execution handler
- Queue management for real-time updates

### 2. **run_flow_ui.py**
Simple launcher that:
- Lists available flow files
- Provides configuration options
- Starts the web server

### 3. **test_flow_ui.py**
Verification script that checks:
- Required dependencies
- UI component initialization
- FlowLauncher availability
- Example flow files

### 4. **start_flow_ui.sh**
Automated setup script that:
- Checks system requirements
- Installs dependencies
- Launches the UI

## 🔄 Data Flow

1. **User Action**: User selects flow and enters inputs in browser
2. **UI Processing**: Gradio captures form data
3. **Thread Spawn**: Background worker thread starts
4. **Flow Execution**: FlowLauncher processes the YAML flow
5. **Status Updates**: TaskInfo objects pushed to shared queue
6. **Streaming**: Main thread reads queue and updates UI
7. **Display**: Browser shows real-time progress updates
8. **Completion**: Final results displayed when crew finishes

## 📊 Message Types

The UI uses a `TaskInfo` model with different types:

| Type | Purpose | Visual |
|------|---------|--------|
| `info` | Progress updates | 📋 Standard text |
| `markdown` | Formatted content | 📝 Rich formatting |
| `code` | Code snippets | 💻 Syntax highlight |
| `error` | Error messages | ❌ Red alert |

## 🎯 Usage Patterns

### Basic Flow
```python
User → Select Flow → Enter Inputs → Click Launch → Watch Progress → Review Results
```

### With MCP Tools
```python
User → Select Flow with MCPs → UI connects to MCPs → Tools available to agents → Execute
```

### Multi-Agent Collaboration
```python
Agent 1 (Lead) → Agent 2 (Developer) → Agent 3 (QA) → All updates stream to UI
```

## 🔧 Customization Points

1. **Themes**: Change Gradio theme in `launch_flow_ui.py`
2. **Port**: Modify server port in launch configuration
3. **Auth**: Add authentication to `demo.launch()`
4. **Styling**: Customize CSS for chat display
5. **Inputs**: Extend input field generation logic

## 📦 Dependencies

### Required
- **gradio**: Web UI framework
- **crewai**: Multi-agent orchestration
- **pyyaml**: YAML parsing
- **pydantic**: Data validation
- **click**: CLI utilities

### Optional
- **mcp**: Model Context Protocol support
- **httpx**: HTTP MCP server connections
- **jsonschema**: Flow validation

## 🚀 Quick Commands

```bash
# Install
pip install -r launch_flow_ui_requirements.txt

# Test
python test_flow_ui.py

# Launch
python run_flow_ui.py

# Auto setup + launch
./start_flow_ui.sh
```

## 📚 Documentation Files

- **LAUNCH_FLOW_UI_README.md**: Comprehensive guide
- **QUICKSTART.md**: 5-minute getting started
- **This file**: Architecture and structure overview
