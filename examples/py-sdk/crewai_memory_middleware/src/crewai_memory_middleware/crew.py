from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task, before_kickoff
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List, Dict, Any
import os
import sys

# Add parent directory to path for SDK import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', 'sdk-py'))
from openmemory import OpenMemoryAgent

from crewai_memory_middleware.tools.openmemory_tool import create_openmemory_tools

# If you want to run a snippet of code before or after the crew starts,
# you can use the @before_kickoff and @after_kickoff decorators
# https://docs.crewai.com/concepts/crews#example-crew-class-with-decorators

@CrewBase
class CrewaiMemoryMiddleware():
    """CrewaiMemoryMiddleware crew with OpenMemory integration"""

    agents: List[BaseAgent]
    tasks: List[Task]
    
    # OpenMemory configuration
    openmemory_base_url: str = os.getenv('OPENMEMORY_BASE_URL', 'http://localhost:8080')
    openmemory_agents: Dict[str, OpenMemoryAgent] = {}

    # Learn more about YAML configuration files here:
    # Agents: https://docs.crewai.com/concepts/agents#yaml-configuration-recommended
    # Tasks: https://docs.crewai.com/concepts/tasks#yaml-configuration-recommended
    
    @before_kickoff
    def setup_openmemory(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initialize OpenMemory agents before crew execution.
        This automatically registers each CrewAI agent with OpenMemory.
        """
        print("🧠 Setting up OpenMemory integration...")
        
        # Register researcher agent
        researcher_agent = OpenMemoryAgent(
            agent_id="crewai-researcher",
            namespace="research-workspace",
            description="AI researcher for data analysis and research tasks",
            permissions=["read", "write"],
            shared_namespaces=["team-research", "public-knowledge"],
            base_url=self.openmemory_base_url,
            auto_register=True
        )
        self.openmemory_agents['researcher'] = researcher_agent
        print(f"✅ Registered researcher agent: {researcher_agent.agent_id}")
        print(f"   Namespace: {researcher_agent.namespace}")
        print(f"   API Key: {researcher_agent.api_key[:20]}...")
        
        # Register reporting analyst agent
        analyst_agent = OpenMemoryAgent(
            agent_id="crewai-reporting-analyst",
            namespace="reporting-workspace",
            description="AI analyst for creating detailed reports and documentation",
            permissions=["read", "write"],
            shared_namespaces=["team-research", "reports-archive"],
            base_url=self.openmemory_base_url,
            auto_register=True
        )
        self.openmemory_agents['reporting_analyst'] = analyst_agent
        print(f"✅ Registered analyst agent: {analyst_agent.agent_id}")
        print(f"   Namespace: {analyst_agent.namespace}")
        print(f"   API Key: {analyst_agent.api_key[:20]}...")
        
        print("🎉 OpenMemory setup complete!\n")
        return inputs
    
    # If you would like to add tools to your agents, you can learn more about it here:
    # https://docs.crewai.com/concepts/agents#agent-tools
    @agent
    def researcher(self) -> Agent:
        """Research agent with OpenMemory integration"""
        # Get OpenMemory agent for this CrewAI agent
        om_agent = self.openmemory_agents.get('researcher')
        
        # Create OpenMemory tools for this agent
        om_tools = []
        if om_agent:
            om_tools = create_openmemory_tools(
                agent_id=om_agent.agent_id,
                api_key=om_agent.api_key,
                base_url=self.openmemory_base_url
            )
        
        return Agent(
            config=self.agents_config['researcher'], # type: ignore[index]
            verbose=True,
            tools=om_tools  # Add OpenMemory tools
        )

    @agent
    def reporting_analyst(self) -> Agent:
        """Reporting analyst agent with OpenMemory integration"""
        # Get OpenMemory agent for this CrewAI agent
        om_agent = self.openmemory_agents.get('reporting_analyst')
        
        # Create OpenMemory tools for this agent
        om_tools = []
        if om_agent:
            om_tools = create_openmemory_tools(
                agent_id=om_agent.agent_id,
                api_key=om_agent.api_key,
                base_url=self.openmemory_base_url
            )
        
        return Agent(
            config=self.agents_config['reporting_analyst'], # type: ignore[index]
            verbose=True,
            tools=om_tools  # Add OpenMemory tools
        )

    # To learn more about structured task outputs,
    # task dependencies, and task callbacks, check out the documentation:
    # https://docs.crewai.com/concepts/tasks#overview-of-a-task
    @task
    def research_task(self) -> Task:
        return Task(
            config=self.tasks_config['research_task'], # type: ignore[index]
        )

    @task
    def reporting_task(self) -> Task:
        return Task(
            config=self.tasks_config['reporting_task'], # type: ignore[index]
            output_file='report.md'
        )

    @crew
    def crew(self) -> Crew:
        """Creates the CrewaiMemoryMiddleware crew"""
        # To learn how to add knowledge sources to your crew, check out the documentation:
        # https://docs.crewai.com/concepts/knowledge#what-is-knowledge

        return Crew(
            agents=self.agents, # Automatically created by the @agent decorator
            tasks=self.tasks, # Automatically created by the @task decorator
            process=Process.sequential,
            verbose=True,
            # process=Process.hierarchical, # In case you wanna use that instead https://docs.crewai.com/how-to/Hierarchical/
        )
