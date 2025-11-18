# Quick Start Guide: CrewAI Flow Launcher Web UI

Get started with the Flow Launcher Web UI in under 5 minutes!

## 🎯 What is This?

A web-based interface for running CrewAI flows defined in YAML files. Perfect for:
- Testing and debugging flows
- Running multi-agent workflows
- Monitoring agent collaboration in real-time
- Sharing flows with non-technical users

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
pip install -r launch_flow_ui_requirements.txt
```

Or use the automated script:
```bash
./start_flow_ui.sh
```

### Step 2: Launch the UI

```bash
python run_flow_ui.py
```

Or directly:
```bash
python launch_flow_ui.py
```

### Step 3: Open in Browser

Navigate to: **http://localhost:7860**

## 📋 First Flow Example

Create a simple test flow `hello-world-flow.yml`:

```yaml
version: "1.0"
description: "Hello World Flow"

inputs:
  - name: user_name
    description: "Your name"
    type: string
    default: "World"

agents:
  greeter:
    role: "Friendly Greeter"
    goal: "Greet the user warmly"
    backstory: "You are a cheerful assistant who loves saying hello."
    
    tasks:
      - name: say_hello
        description: "Say hello to {user_name}"
        expected_output: "A warm greeting message"

crew:
  name: "Hello World Crew"
  agents:
    - greeter

workflow:
  - agent: greeter
    task: say_hello

llms:
  - name: default
    provider: "ollama"
    base_url: "http://localhost:11434"
    model: "mistral:latest"
```

## 🎮 Using the Interface

1. **Select Flow**: Choose `hello-world-flow.yml` from the dropdown
2. **Enter Name**: Type your name in the `user_name` field
3. **Launch**: Click "▶️ Launch Flow"
4. **Watch**: Monitor the execution in real-time

## 🔥 Advanced Example

Try the included `improve-project-flow.yml` for a complete multi-agent example:

```bash
# In the UI:
1. Select: improve-project-flow.yml
2. Set project_path: ../../../
3. Set project_id: my_project
4. Click Launch
```

This flow demonstrates:
- Multiple agents (Lead, Developer, QA)
- Agent delegation
- Memory integration
- MCP tool usage
- Complex workflow orchestration

## 🛠️ Configuration Tips

### Using Local LLMs (Ollama)

```yaml
llms:
  - name: local
    provider: "ollama"
    base_url: "http://localhost:11434"
    model: "mistral:latest"
```

Make sure Ollama is running:
```bash
ollama serve
```

### Using OpenAI

```yaml
llms:
  - name: openai
    provider: "openai"
    model: "gpt-4"
    api_key: "{$env:OPENAI_API_KEY}"
```

Set environment variable:
```bash
export OPENAI_API_KEY="your-key-here"
```

### Adding MCP Tools

```yaml
mcps:
  - name: "filesystem"
    description: "File operations"
    type: "stdio"
    args: ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."]
```

## 📊 Understanding Output

The UI shows different message types:

| Icon | Type | Description |
|------|------|-------------|
| 📋 | Info | Progress updates |
| 📝 | Markdown | Formatted results |
| 💻 | Code | Code snippets |
| ❌ | Error | Error messages |

## 🐛 Troubleshooting

### Port Already in Use

Change the port:
```python
# In launch_flow_ui.py, line 387:
demo.launch(server_port=8080)  # Use different port
```

### Gradio Not Installed

```bash
pip install gradio>=4.0.0
```

### LLM Connection Failed

1. Check LLM server is running
2. Verify URL in flow YAML
3. Enable verbose mode in UI
4. Check API keys if using cloud providers

### No Flow Files Found

1. Ensure you're in the correct directory
2. Flow files must have `.yml` or `.yaml` extension
3. At least one valid flow file must exist

## 🎨 Customization

### Change Theme

Edit `launch_flow_ui.py`:
```python
with gr.Blocks(theme=gr.themes.Ocean()) as demo:  # Try: Soft, Glass, Monochrome
```

### Add Authentication

```python
demo.launch(auth=("admin", "password"))
```

### Enable Public Sharing

```python
demo.launch(share=True)  # Creates a public URL
```

## 📚 Next Steps

1. **Read the Documentation**: Check [LAUNCH_FLOW_UI_README.md](./LAUNCH_FLOW_UI_README.md)
2. **Explore Examples**: Try different flow files
3. **Create Your Own**: Write custom flows for your use cases
4. **Integrate MCPs**: Add tool capabilities with MCP servers
5. **Join Community**: Share your flows and learn from others

## 🤝 Getting Help

- Check the [full README](./LAUNCH_FLOW_UI_README.md)
- Review example flows in this directory
- Enable verbose mode for detailed logs
- Check the [launch_flow.py CLI](./launch_flow.py) documentation

## 🌟 Example Use Cases

### Code Review Workflow
```yaml
# Multi-agent code review with specialized reviewers
agents: [security_reviewer, performance_reviewer, code_style_reviewer]
```

### Content Generation
```yaml
# Research → Write → Edit → Publish pipeline
agents: [researcher, writer, editor, publisher]
```

### Data Analysis
```yaml
# Load → Clean → Analyze → Visualize → Report
agents: [data_engineer, analyst, visualizer, reporter]
```

### Testing Pipeline
```yaml
# Unit Tests → Integration Tests → QA → Deploy
agents: [unit_tester, integration_tester, qa_engineer, deployer]
```

## 🎁 Bonus: One-Liner Launch

```bash
python3 -c "from launch_flow_ui import demo; demo.launch()"
```

---

**Ready to build amazing multi-agent workflows! 🚀**
