#!/usr/bin/env python3
"""
Test CrewAI with tools to identify the issue.
"""

import os
from crewai import Agent, Task, Crew, LLM, Process
from crewai.tools import BaseTool

# Configure Ollama
os.environ['OLLAMA_API_BASE'] = 'http://linbox5:11434'

# Create a simple test tool
class SimpleTool(BaseTool):
    name: str = "simple_calculator"
    description: str = "Adds two numbers together"
    
    def _run(self, a: int, b: int) -> str:
        """Add two numbers."""
        return str(a + b)

# Create LLM
llm = LLM(
    model='ollama/gpt-oss:latest',
    base_url='http://linbox5:11434',
    temperature=0.7,
    max_tokens=500,
    timeout=120,
)

print("="*60)
print("CREWAI TEST WITH TOOLS")
print("="*60)
print(f"LLM Model: {llm.model}")
print()

# Create agent WITH a tool
print("Creating agent with tools...")
simple_tool = SimpleTool()

agent = Agent(
    role='Calculator',
    goal='Use the calculator tool when asked',
    backstory='You are a helpful assistant that uses tools to solve problems.',
    verbose=True,
    llm=llm,
    tools=[simple_tool],
    allow_delegation=False,
)

# Create task that requires tool use
print("Creating task...")
task = Task(
    description='Use the simple_calculator tool to add 5 and 7. Report just the result.',
    expected_output='The sum of 5 and 7',
    agent=agent
)

# Create and run crew
print("Creating crew...")
crew = Crew(
    agents=[agent],
    tasks=[task],
    verbose=True,
    process=Process.sequential
)

print("\n" + "="*60)
print("EXECUTING CREW WITH TOOL")
print("="*60 + "\n")

try:
    result = crew.kickoff()
    print("\n" + "="*60)
    print("SUCCESS!")
    print("="*60)
    print(f"Result: {result}")
except Exception as e:
    print("\n" + "="*60)
    print("ERROR!")
    print("="*60)
    print(f"Error: {e}")
    print(f"Type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
