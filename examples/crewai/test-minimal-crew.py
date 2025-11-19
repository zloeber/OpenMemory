#!/usr/bin/env python3
"""
Minimal test to isolate the LLM response issue with CrewAI.
"""

import os
from crewai import Agent, Task, Crew, LLM, Process

# Configure Ollama
os.environ['OLLAMA_API_BASE'] = 'http://linbox5:11434'

# Create LLM
llm = LLM(
    model='ollama/gpt-oss:latest',
    base_url='http://linbox5:11434',
    temperature=0.7,
    max_tokens=500,
    timeout=120,
)

print("="*60)
print("MINIMAL CREWAI TEST")
print("="*60)
print(f"LLM Model: {llm.model}")
print(f"LLM Base URL: {llm.base_url}")
print()

# Create a simple agent WITHOUT tools
print("Creating agent without tools...")
agent = Agent(
    role='Simple Responder',
    goal='Respond to simple questions',
    backstory='You are a helpful assistant that provides clear, concise answers.',
    verbose=True,
    llm=llm,
    allow_delegation=False,
)

# Create a simple task
print("Creating task...")
task = Task(
    description='What is 2 + 2? Respond with just the number and nothing else.',
    expected_output='A single number',
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
print("EXECUTING CREW")
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
