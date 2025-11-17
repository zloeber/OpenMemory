# OpenMemory Use Case: Multi-Namespace Architecture

## Overview

This document demonstrates how OpenMemory's namespace-based architecture enables both **team collaboration** and **personal usage** scenarios without API keys or complex authentication. Each namespace operates independently, providing complete data isolation while allowing flexible access patterns.

---

## Use Case 1: Team Git Project Management

### Scenario
A development team uses multiple AI agents to manage a software project, tracking issues, code reviews, documentation, and architectural decisions.

### Namespace: `acme-backend-api`

#### Participating Agents

| Agent ID | Role | Purpose |
|----------|------|---------|
| `code-reviewer-bot` | Code Review Assistant | Analyzes PRs, suggests improvements, tracks review patterns |
| `issue-tracker-ai` | Issue Management | Categorizes bugs, tracks feature requests, links related issues |
| `docs-generator` | Documentation | Maintains technical docs, API references, changelogs |
| `architect-advisor` | Architecture Guidance | Tracks design decisions, architectural patterns, tech debt |

#### Memory Storage Examples

```python
from openmemory import store_memory, query_memory

# Code Reviewer Bot stores review feedback
store_memory(
    namespace="acme-backend-api",
    content="PR #234: Identified potential SQL injection in user authentication endpoint. "
           "Recommended using parameterized queries. Developer fixed in commit abc123.",
    metadata={
        "agent": "code-reviewer-bot",
        "pr_number": 234,
        "severity": "high",
        "status": "resolved"
    },
    sector="episodic"
)

# Issue Tracker AI stores bug pattern
store_memory(
    namespace="acme-backend-api",
    content="Recurring pattern: Database connection pool exhaustion occurs during "
           "peak traffic (>10k req/min). Root cause: Missing connection timeout config.",
    metadata={
        "agent": "issue-tracker-ai",
        "pattern_type": "infrastructure",
        "frequency": "weekly"
    },
    sector="semantic"
)

# Docs Generator stores API change
store_memory(
    namespace="acme-backend-api",
    content="API v2.1 breaking change: /users endpoint now requires pagination "
           "parameters. Default page size is 50. Updated migration guide.",
    metadata={
        "agent": "docs-generator",
        "version": "2.1.0",
        "breaking_change": True
    },
    sector="semantic"
)

# Architect Advisor stores design decision
store_memory(
    namespace="acme-backend-api",
    content="Architecture Decision Record (ADR-015): Adopted event-driven architecture "
           "for order processing to improve scalability. Using Kafka for event streaming.",
    metadata={
        "agent": "architect-advisor",
        "adr_number": 15,
        "decision_date": "2025-11-10"
    },
    sector="reflective"
)
```

#### Querying Shared Knowledge

Any agent can query the shared namespace to access collective team knowledge:

```python
# New agent joins the team and needs context
results = query_memory(
    namespace="acme-backend-api",
    query="What are the recent security vulnerabilities found in code reviews?",
    k=5
)

# Architect reviewing past decisions
results = query_memory(
    namespace="acme-backend-api", 
    query="event-driven architecture decisions",
    sector="reflective"
)

# Issue tracker looking for patterns
results = query_memory(
    namespace="acme-backend-api",
    query="database connection pool problems",
    sector="semantic"
)
```

### Benefits for Team Collaboration

✅ **Shared Context**: All agents access the same knowledge base
✅ **Persistent Memory**: Decisions and patterns survive across sessions
✅ **Cross-Agent Learning**: Code reviewer insights inform architecture decisions
✅ **No Access Control Overhead**: All team agents have equal access
✅ **Automatic Namespace Creation**: Just start using it

---

## Use Case 2: Personal Chat UI

### Scenario
An individual user has a personal AI assistant that remembers conversations, preferences, and context across chat sessions.

### Namespace: `user-alice-personal`

#### Single Agent

| Agent ID | Role | Purpose |
|----------|------|---------|
| `alice-assistant` | Personal AI Assistant | Conversational AI with memory of user preferences and history |

#### Memory Storage Examples

```python
# Store user preferences
store_memory(
    namespace="user-alice-personal",
    content="Alice prefers Python over JavaScript for backend projects. "
           "She values code readability and maintainability over performance.",
    metadata={
        "agent": "alice-assistant",
        "category": "preferences",
        "topic": "programming"
    },
    sector="semantic"
)

# Store conversation context
store_memory(
    namespace="user-alice-personal",
    content="Alice is working on a machine learning project to predict customer churn. "
           "She's using scikit-learn and has a dataset of 50k customers. "
           "Main challenge is class imbalance.",
    metadata={
        "agent": "alice-assistant",
        "category": "current_project",
        "timestamp": "2025-11-16T10:30:00Z"
    },
    sector="episodic"
)

# Store learned patterns about user
store_memory(
    namespace="user-alice-personal",
    content="Alice typically works best in the mornings (8am-12pm). "
           "She prefers concise explanations with code examples. "
           "She asks follow-up questions when concepts are unclear.",
    metadata={
        "agent": "alice-assistant",
        "category": "interaction_patterns",
        "learned_from": "30_days_interaction"
    },
    sector="reflective"
)

# Store important personal context
store_memory(
    namespace="user-alice-personal",
    content="Alice's team uses Slack for communication, GitHub for code, "
           "and Notion for documentation. She prefers async communication.",
    metadata={
        "agent": "alice-assistant",
        "category": "work_environment"
    },
    sector="semantic"
)
```

#### Personalized Responses

```python
# Before responding to a question, query personal context
user_question = "Should I use a neural network for this?"

# Get relevant context about user preferences and current work
context = query_memory(
    namespace="user-alice-personal",
    query=f"{user_question} machine learning preferences current project",
    k=3
)

# Response can now be personalized:
# - Knows she's working on churn prediction
# - Knows she values simplicity
# - Can reference her tech stack
# - Understands her learning style
```

### Benefits for Personal Use

✅ **Persistent Conversations**: Context carries across sessions
✅ **Personalization**: AI learns user preferences over time
✅ **Privacy**: Personal namespace isolated from others
✅ **No Setup**: No registration, just use your namespace
✅ **Single User Control**: One person, one namespace, complete control

---

## Architecture Diagrams

### System Overview: Multi-Namespace Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OpenMemory Server                            │
│                      (Namespace-Based Access)                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │   Namespace Isolation     │   │   Namespace Isolation     │
    │                           │   │                           │
    │  acme-backend-api         │   │  user-alice-personal      │
    │                           │   │                           │
    │  ┌─────────────────────┐  │   │  ┌─────────────────────┐ │
    │  │  Vector Collections │  │   │  │  Vector Collections │ │
    │  │  • Episodic         │  │   │  │  • Episodic         │ │
    │  │  • Semantic         │  │   │  │  • Semantic         │ │
    │  │  • Procedural       │  │   │  │  • Procedural       │ │
    │  │  • Emotional        │  │   │  │  • Emotional        │ │
    │  │  • Reflective       │  │   │  │  • Reflective       │ │
    │  └─────────────────────┘  │   │  └─────────────────────┘ │
    │                           │   │                           │
    │  ┌─────────────────────┐  │   │  ┌─────────────────────┐ │
    │  │  SQLite Metadata    │  │   │  │  SQLite Metadata    │ │
    │  │  user_id=namespace  │  │   │  │  user_id=namespace  │ │
    │  └─────────────────────┘  │   │  └─────────────────────┘ │
    └───────────────────────────┘   └───────────────────────────┘
                    │                           │
    ┌───────────────┴────────────┐   ┌──────────┴─────────────┐
    │    Team Agents (4)         │   │   Personal Agent (1)   │
    └────────────────────────────┘   └────────────────────────┘
```

### Use Case 1: Team Git Project Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Team Collaboration Workflow                       │
└─────────────────────────────────────────────────────────────────────┘

    Developer commits code
            │
            ▼
    ┌───────────────────┐
    │ code-reviewer-bot │──────┐
    │                   │      │ store_memory()
    │ Analyzes PR       │      │ namespace: acme-backend-api
    │ Finds issues      │      │ content: "Security issue in PR #234..."
    └───────────────────┘      │
                               ▼
                    ┌─────────────────────┐
                    │   OpenMemory        │
                    │   acme-backend-api  │
                    │                     │
                    │   [Shared Storage]  │
                    └─────────────────────┘
                               ▲
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    ┌───────┴──────────┐  ┌───┴────────────┐  ┌─┴─────────────────┐
    │ issue-tracker-ai │  │ docs-generator │  │ architect-advisor │
    │                  │  │                │  │                   │
    │ query_memory()   │  │ query_memory() │  │ query_memory()    │
    │ "security issues"│  │ "API changes"  │  │ "architecture"    │
    └──────────────────┘  └────────────────┘  └───────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
    Creates related    Updates API docs    Reviews tech debt
    tracking ticket    with security notes  based on patterns


┌─────────────────────────────────────────────────────────────────────┐
│                    Memory Categories in Team Namespace               │
└─────────────────────────────────────────────────────────────────────┘

Episodic Memories:
  • "PR #234 review: found SQL injection"
  • "Bug #891 fixed: connection pool timeout"
  • "Code merge conflict resolved in auth module"

Semantic Memories:
  • "Database connection patterns and best practices"
  • "API versioning strategy: semantic versioning"
  • "Security checklist for authentication endpoints"

Reflective Memories:
  • "ADR-015: Event-driven architecture decision"
  • "Team learned: Always test with production-like data"
  • "Pattern: Peak traffic causes connection exhaustion"
```

### Use Case 2: Personal Chat UI Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Personal Assistant Workflow                       │
└─────────────────────────────────────────────────────────────────────┘

    Alice starts new chat session
            │
            ▼
    ┌───────────────────┐
    │ alice-assistant   │
    │                   │
    │ query_memory()    │──────────┐
    │ "Alice preferences"           │
    │ "current projects"            │
    └───────────────────┘           │
            │                       │
            │                       ▼
            │            ┌─────────────────────┐
            │            │   OpenMemory        │
            │            │ user-alice-personal │
            │            │                     │
            │            │  [Personal Storage] │
            │            └─────────────────────┘
            │                       │
            │      Returns:         │
            │      • Prefers Python │
            │      • Working on ML  │
            │      • Likes examples │
            │                       │
            ▼                       │
    Personalized response           │
    tailored to Alice               │
            │                       │
            ▼                       │
    Alice continues conversation    │
            │                       │
            ▼                       │
    ┌───────────────────┐           │
    │ alice-assistant   │           │
    │                   │           │
    │ store_memory()    │───────────┘
    │ "Alice asked about neural networks"
    │ "Context: churn prediction project"
    └───────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│              Memory Categories in Personal Namespace                 │
└─────────────────────────────────────────────────────────────────────┘

Episodic Memories:
  • "Discussed ML model selection for churn project"
  • "Alice struggled with class imbalance problem"
  • "Recommended SMOTE technique, Alice implemented it"

Semantic Memories:
  • "Alice prefers Python, values code readability"
  • "Alice's tech stack: scikit-learn, pandas, Jupyter"
  • "Alice's team uses Slack, GitHub, Notion"

Reflective Memories:
  • "Alice learns best with concrete examples"
  • "Alice asks clarifying questions when uncertain"
  • "Alice works best in morning hours (8am-12pm)"
```

### Namespace Isolation and Auto-Creation

```
┌─────────────────────────────────────────────────────────────────────┐
│              OpenMemory Namespace Auto-Creation Flow                 │
└─────────────────────────────────────────────────────────────────────┘

1. Agent makes first request:
   ───────────────────────────────────────────────────────────────────

   store_memory(
       namespace="new-project-alpha",  ← Namespace doesn't exist yet
       content="Initial project setup..."
   )

2. OpenMemory checks if namespace exists:
   ───────────────────────────────────────────────────────────────────

   ┌──────────────────┐
   │ Namespace Check  │
   │                  │
   │ Exists?          │
   └────────┬─────────┘
            │
      ┌─────┴─────┐
      │           │
      NO         YES
      │           │
      ▼           ▼
   Create    Use existing
   namespace  namespace
      │           │
      └─────┬─────┘
            │
            ▼
   ┌──────────────────┐
   │ Store Memory     │
   │ in namespace     │
   └──────────────────┘

3. Namespace created automatically:
   ───────────────────────────────────────────────────────────────────

   • Creates namespace_groups entry
   • Creates vector collections for all sectors
   • No configuration needed
   • Immediate availability

4. Subsequent requests use existing namespace:
   ───────────────────────────────────────────────────────────────────

   query_memory(namespace="new-project-alpha", ...)  ← Works immediately!


┌─────────────────────────────────────────────────────────────────────┐
│                    Complete Namespace Isolation                      │
└─────────────────────────────────────────────────────────────────────┘

   Namespace A              Namespace B              Namespace C
   (acme-backend-api)      (user-alice-personal)    (project-gamma)
   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
   │              │        │              │        │              │
   │  Memories    │        │  Memories    │        │  Memories    │
   │  • Issue #1  │        │  • Chat 1    │        │  • Task A    │
   │  • PR #234   │        │  • Pref 1    │        │  • Note B    │
   │  • ADR-015   │        │  • Project X │        │  • Goal C    │
   │              │        │              │        │              │
   └──────────────┘        └──────────────┘        └──────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                     NO CROSS-NAMESPACE ACCESS
                     Complete data isolation
                     Each namespace is independent
```

---

## Implementation Examples

### Team Collaboration: Complete Workflow

```python
"""
Team Git Project Management - Complete Implementation
Namespace: acme-backend-api
"""

from openmemory import store_memory, query_memory, reinforce_memory

class CodeReviewerBot:
    """Automated code review assistant"""
    
    NAMESPACE = "acme-backend-api"
    
    def review_pull_request(self, pr_number: int, code_diff: str):
        """Analyze PR and store findings"""
        # Analyze code (simplified)
        issues = self.analyze_code(code_diff)
        
        # Check for similar past issues
        past_issues = query_memory(
            namespace=self.NAMESPACE,
            query=f"code review issues similar to {issues[0]['type']}",
            sector="episodic",
            k=3
        )
        
        # Store new review
        store_memory(
            namespace=self.NAMESPACE,
            content=f"PR #{pr_number} review completed. "
                   f"Found {len(issues)} issues: {', '.join(i['type'] for i in issues)}. "
                   f"Similar to past PR #{past_issues[0]['pr_number'] if past_issues else 'none'}.",
            metadata={
                "agent": "code-reviewer-bot",
                "pr_number": pr_number,
                "issue_count": len(issues),
                "severity": max(i['severity'] for i in issues)
            },
            sector="episodic"
        )
        
        # If critical issue, reinforce related security memories
        if any(i['severity'] == 'critical' for i in issues):
            security_memories = query_memory(
                namespace=self.NAMESPACE,
                query="security best practices",
                k=1
            )
            if security_memories:
                reinforce_memory(
                    namespace=self.NAMESPACE,
                    memory_id=security_memories[0]['id']
                )

class IssueTrackerAI:
    """Intelligent issue categorization and tracking"""
    
    NAMESPACE = "acme-backend-api"
    
    def process_new_issue(self, issue_data: dict):
        """Categorize and track new issue"""
        # Query for similar past issues
        similar = query_memory(
            namespace=self.NAMESPACE,
            query=issue_data['description'],
            sector="episodic",
            k=5
        )
        
        # Identify patterns
        if len(similar) >= 3:
            pattern_content = (
                f"Recurring issue pattern detected: {issue_data['category']}. "
                f"This is the {len(similar) + 1}th occurrence. "
                f"Common root cause: {self.identify_root_cause(similar)}"
            )
            
            # Store pattern as semantic memory
            store_memory(
                namespace=self.NAMESPACE,
                content=pattern_content,
                metadata={
                    "agent": "issue-tracker-ai",
                    "pattern_type": "recurring_bug",
                    "occurrences": len(similar) + 1
                },
                sector="semantic"
            )
        
        # Store the new issue
        store_memory(
            namespace=self.NAMESPACE,
            content=f"Issue #{issue_data['id']}: {issue_data['description']}",
            metadata={
                "agent": "issue-tracker-ai",
                "issue_id": issue_data['id'],
                "category": issue_data['category'],
                "linked_issues": [s['issue_id'] for s in similar if 'issue_id' in s]
            },
            sector="episodic"
        )

class ArchitectAdvisor:
    """Architecture and design decision tracking"""
    
    NAMESPACE = "acme-backend-api"
    
    def record_architecture_decision(self, adr: dict):
        """Record an Architecture Decision Record"""
        # Check for related past decisions
        related = query_memory(
            namespace=self.NAMESPACE,
            query=f"{adr['topic']} architecture decisions",
            sector="reflective",
            k=3
        )
        
        # Store ADR
        store_memory(
            namespace=self.NAMESPACE,
            content=(
                f"ADR-{adr['number']:03d}: {adr['title']}. "
                f"Decision: {adr['decision']}. "
                f"Rationale: {adr['rationale']}. "
                f"Consequences: {', '.join(adr['consequences'])}"
            ),
            metadata={
                "agent": "architect-advisor",
                "adr_number": adr['number'],
                "topic": adr['topic'],
                "decision_date": adr['date'],
                "related_adrs": [r['adr_number'] for r in related if 'adr_number' in r]
            },
            sector="reflective"
        )
    
    def get_architecture_context(self, topic: str) -> str:
        """Get all relevant architecture decisions for a topic"""
        decisions = query_memory(
            namespace=self.NAMESPACE,
            query=f"architecture decisions about {topic}",
            sector="reflective",
            k=10
        )
        
        return "\n\n".join([
            f"ADR-{d['adr_number']}: {d['content'][:200]}..."
            for d in decisions
        ])

# Example usage - Team collaboration
if __name__ == "__main__":
    # Code reviewer finds issues
    reviewer = CodeReviewerBot()
    reviewer.review_pull_request(235, "... code diff ...")
    
    # Issue tracker processes bug report
    tracker = IssueTrackerAI()
    tracker.process_new_issue({
        'id': 892,
        'description': 'Database timeout during peak traffic',
        'category': 'performance'
    })
    
    # Architect records decision
    advisor = ArchitectAdvisor()
    advisor.record_architecture_decision({
        'number': 16,
        'title': 'Adopt Redis for session storage',
        'topic': 'caching',
        'decision': 'Use Redis instead of in-memory sessions',
        'rationale': 'Enables horizontal scaling',
        'consequences': ['Requires Redis cluster', 'Lower latency'],
        'date': '2025-11-16'
    })
```

### Personal Chat UI: Complete Workflow

```python
"""
Personal Chat Assistant - Complete Implementation
Namespace: user-alice-personal
"""

from openmemory import store_memory, query_memory
from datetime import datetime

class PersonalAssistant:
    """AI assistant with persistent memory"""
    
    def __init__(self, user_namespace: str):
        self.namespace = user_namespace
        self.conversation_buffer = []
    
    def process_user_message(self, message: str) -> str:
        """Process user input with memory context"""
        # Get relevant context from memory
        context = self.get_relevant_context(message)
        
        # Generate response (simplified - would use LLM here)
        response = self.generate_response(message, context)
        
        # Store conversation turn
        self.store_conversation_turn(message, response)
        
        return response
    
    def get_relevant_context(self, query: str) -> list:
        """Retrieve relevant memories for current query"""
        # Get different types of context
        recent_context = query_memory(
            namespace=self.namespace,
            query="recent conversations",
            sector="episodic",
            k=3
        )
        
        preferences = query_memory(
            namespace=self.namespace,
            query="user preferences and style",
            sector="semantic",
            k=2
        )
        
        patterns = query_memory(
            namespace=self.namespace,
            query="interaction patterns and learning",
            sector="reflective",
            k=2
        )
        
        # Specific to current query
        specific = query_memory(
            namespace=self.namespace,
            query=query,
            k=5
        )
        
        return {
            'recent': recent_context,
            'preferences': preferences,
            'patterns': patterns,
            'specific': specific
        }
    
    def store_conversation_turn(self, user_msg: str, assistant_msg: str):
        """Store conversation in episodic memory"""
        store_memory(
            namespace=self.namespace,
            content=(
                f"User: {user_msg}\n"
                f"Assistant: {assistant_msg}"
            ),
            metadata={
                "agent": "alice-assistant",
                "timestamp": datetime.now().isoformat(),
                "message_type": "conversation_turn"
            },
            sector="episodic"
        )
    
    def learn_user_preference(self, preference: str, category: str):
        """Store learned user preference"""
        store_memory(
            namespace=self.namespace,
            content=preference,
            metadata={
                "agent": "alice-assistant",
                "category": category,
                "learned_date": datetime.now().isoformat()
            },
            sector="semantic"
        )
    
    def reflect_on_interactions(self, timeframe: str = "week"):
        """Analyze interaction patterns and store insights"""
        # Get recent interactions
        interactions = query_memory(
            namespace=self.namespace,
            query=f"conversations from past {timeframe}",
            sector="episodic",
            k=50
        )
        
        # Analyze patterns (simplified)
        insights = self.analyze_patterns(interactions)
        
        # Store reflection
        store_memory(
            namespace=self.namespace,
            content=(
                f"Weekly reflection on interactions: "
                f"User asked {insights['question_count']} questions. "
                f"Main topics: {', '.join(insights['top_topics'])}. "
                f"Observed patterns: {insights['patterns']}"
            ),
            metadata={
                "agent": "alice-assistant",
                "reflection_period": timeframe,
                "reflection_date": datetime.now().isoformat()
            },
            sector="reflective"
        )
    
    def generate_response(self, message: str, context: dict) -> str:
        """Generate contextual response (placeholder)"""
        # In real implementation, would use LLM with context
        return f"Response based on your preferences and our conversation history..."

# Example usage - Personal chat
if __name__ == "__main__":
    assistant = PersonalAssistant("user-alice-personal")
    
    # First interaction - learn preferences
    assistant.learn_user_preference(
        "Prefers Python for backend development, values readability",
        "programming_preferences"
    )
    
    # User asks question
    response = assistant.process_user_message(
        "Should I use a neural network for my churn prediction project?"
    )
    
    # Assistant remembers:
    # - Alice's preference for Python
    # - Previous discussion about churn project
    # - Her learning style (examples preferred)
    
    # Weekly reflection
    assistant.reflect_on_interactions("week")
```

---

## Comparison: Team vs Personal Use

| Aspect | Team Namespace | Personal Namespace |
|--------|----------------|-------------------|
| **Agents** | Multiple (4+) | Single (1) |
| **Collaboration** | High - shared knowledge | N/A - individual use |
| **Memory Types** | Mix of all sectors | Emphasis on episodic/semantic |
| **Access Pattern** | Concurrent writes/reads | Sequential interaction |
| **Use Case** | Project management, code review | Chat assistant, personal AI |
| **Data Volume** | High (many agents contributing) | Moderate (one user) |
| **Isolation Needs** | From other teams | From other users |
| **Auto-Creation** | Yes | Yes |
| **Setup Required** | None | None |

---

## Key Takeaways

### 🎯 Namespace Flexibility
- **One namespace per team project** enables collaboration
- **One namespace per user** enables personalization
- Both patterns work seamlessly with the same API

### 🔓 No Authentication Barriers
- No API keys to manage
- No permission configurations
- Just provide a namespace name

### 🚀 Auto-Provisioning
- Namespaces created on first use
- No pre-setup required
- Immediate productivity

### 🔒 Complete Isolation
- Team memories stay in team namespace
- Personal memories stay private
- Zero cross-namespace leakage

### 📈 Scalability
- Add agents without reconfiguration
- Create namespaces dynamically
- Horizontal scaling by namespace

---

## Getting Started

### Team Setup (Git Project)

```python
# No setup needed! Just start using it:

from openmemory import store_memory

# First agent stores memory - namespace auto-created
store_memory(
    namespace="your-team-project",
    content="Initial project setup complete"
)

# Other agents can immediately access
results = query_memory(
    namespace="your-team-project",
    query="project setup"
)
```

### Personal Setup (Chat UI)

```python
# No setup needed! Just start using it:

from openmemory import store_memory

# Store your first memory - namespace auto-created
store_memory(
    namespace="user-yourname-personal",
    content="I prefer detailed explanations with examples"
)

# Future interactions remember this
results = query_memory(
    namespace="user-yourname-personal",
    query="my preferences"
)
```

---

## Conclusion

OpenMemory's namespace-based architecture provides a flexible foundation for both **team collaboration** and **personal AI applications** without the complexity of traditional authentication systems. Whether you're building multi-agent systems for software development or creating personalized AI assistants, namespaces provide the perfect balance of simplicity and isolation.

**Start using OpenMemory today - no setup required, just pick a namespace and go! 🚀**
