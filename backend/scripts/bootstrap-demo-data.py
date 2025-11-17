#!/usr/bin/env python3
"""
Bootstrap Demo Data Script for OpenMemory

This script automatically loads realistic demo data for two separate agents:
1. alice-dev: Software Engineering Team Lead
2. bob-research: AI/NLP Research Scientist

Each agent gets 20 realistic memories demonstrating namespace isolation.
"""

import sys
import os
import time
import argparse
from typing import List, Dict, Any

# Add the SDK to the path
sdk_path = os.path.join(os.path.dirname(__file__), '..', '..', 'sdk-py')
sys.path.insert(0, sdk_path)

try:
    from openmemory import register_agent, OpenMemoryAgent
except ImportError:
    print("❌ Error: Could not import openmemory SDK")
    print(f"   Tried path: {sdk_path}")
    print("   Please ensure the Python SDK is installed or available")
    sys.exit(1)


class BootstrapStats:
    def __init__(self):
        self.agents_created = 0
        self.memories_created = 0
        self.errors = 0


def print_banner():
    """Print a nice banner for the bootstrap script"""
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║                 OpenMemory Bootstrap Script                        ║")
    print("║            Demo Data Generator with Namespace Isolation            ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print()


def create_alice_dev_scenario() -> List[Dict[str, Any]]:
    """Create memories for alice-dev: Software Engineering Team Lead"""
    return [
        {
            "content": "Production incident - database connection pool exhausted. Increased max_connections from 100 to 200, added connection timeout monitoring, implemented circuit breaker pattern. System recovered in 15 minutes. Need to review connection management practices across all services.",
            "tags": ["incident", "database", "production", "performance"],
            "metadata": {"severity": "high", "duration_minutes": 15, "impact": "service degradation"},
            "sector": "episodic",
            "salience": 0.9
        },
        {
            "content": "Architecture decision: Migrated user service from monolith to microservices. Implemented event-driven communication using Kafka. Benefits: independent scaling, better fault isolation, faster deployments. Challenges: distributed tracing complexity, eventual consistency.",
            "tags": ["architecture", "microservices", "kafka", "migration"],
            "metadata": {"decision_type": "strategic", "impact": "high", "rollout_phase": "completed"},
            "sector": "semantic",
            "salience": 0.85
        },
        {
            "content": "Code review feedback for junior dev: Excellent work on the API endpoint, but consider edge cases for null values. Added comprehensive test coverage suggestion. Discussed SOLID principles, particularly Single Responsibility. Mentoring session scheduled to discuss design patterns.",
            "tags": ["code_review", "mentoring", "api", "testing"],
            "metadata": {"developer": "junior", "review_status": "approved_with_changes"},
            "sector": "reflective",
            "salience": 0.7
        },
        {
            "content": "Sprint planning: Team velocity stabilized at 45 story points. Prioritized technical debt tickets - 20% of capacity allocated. Key focus: payment service refactoring, mobile app performance optimization, API documentation updates. All critical dependencies identified.",
            "tags": ["sprint_planning", "agile", "team_management"],
            "metadata": {"sprint": "2024-Q1-S3", "velocity": 45, "team_size": 6},
            "sector": "procedural",
            "salience": 0.75
        },
        {
            "content": "Performance optimization breakthrough: Reduced API response time from 450ms to 85ms by implementing Redis caching for frequently accessed user profiles. Cache hit rate: 87%. Estimated cost savings: $2400/month on database costs. Documentation updated with caching strategies.",
            "tags": ["performance", "caching", "redis", "optimization"],
            "metadata": {"improvement_percentage": 81, "cache_hit_rate": 0.87},
            "sector": "episodic",
            "salience": 0.88
        },
        {
            "content": "Security review findings: Implemented rate limiting on all public APIs, added JWT token expiration enforcement, upgraded to bcrypt for password hashing, enabled CORS with whitelist. Scheduled quarterly security audits. Team training on OWASP Top 10 completed.",
            "tags": ["security", "api", "authentication", "compliance"],
            "metadata": {"audit_date": "2024-01", "compliance": "SOC2"},
            "sector": "semantic",
            "salience": 0.82
        },
        {
            "content": "Team retrospective: Celebrated successful product launch. Identified process improvements: earlier QA involvement, better cross-team communication, automated deployment verification. Action items: implement pre-commit hooks, setup staging environment parity checks.",
            "tags": ["retrospective", "team", "process_improvement"],
            "metadata": {"sprint": "2024-Q1-S3", "mood": "positive"},
            "sector": "reflective",
            "salience": 0.73
        },
        {
            "content": "Learned new distributed tracing patterns using OpenTelemetry. Implemented span correlation across 8 microservices. Significantly improved debugging of cross-service issues. Average incident resolution time reduced from 2 hours to 30 minutes. Team adopted standardized logging format.",
            "tags": ["observability", "tracing", "microservices", "debugging"],
            "metadata": {"tool": "opentelemetry", "services_instrumented": 8},
            "sector": "semantic",
            "salience": 0.8
        },
        {
            "content": "1-on-1 with team member struggling with work-life balance. Discussed flexible hours, remote work options, workload distribution. Adjusted sprint commitments and paired them with senior developer. Follow-up scheduled in 2 weeks. Employee engagement improved.",
            "tags": ["management", "team_health", "work_life_balance"],
            "metadata": {"followup_needed": True, "priority": "high"},
            "sector": "emotional",
            "salience": 0.78
        },
        {
            "content": "Database migration strategy: Planned zero-downtime migration from PostgreSQL 12 to 15. Using logical replication, rolling upgrades, comprehensive testing in staging. Migration window: 4-hour maintenance slot. Rollback plan prepared. Stakeholder communication completed.",
            "tags": ["database", "migration", "postgresql", "planning"],
            "metadata": {"version_from": "12", "version_to": "15", "risk": "medium"},
            "sector": "procedural",
            "salience": 0.81
        },
        {
            "content": "API versioning strategy implemented: Adopted semantic versioning, deprecation policy (6-month notice), backward compatibility guidelines. Created API changelog, developer portal with interactive documentation. Breaking changes require architectural review.",
            "tags": ["api", "versioning", "architecture", "documentation"],
            "metadata": {"current_version": "v2.1", "deprecation_policy_months": 6},
            "sector": "semantic",
            "salience": 0.76
        },
        {
            "content": "CI/CD pipeline optimization: Reduced build time from 25 minutes to 8 minutes using parallel test execution, Docker layer caching, incremental builds. Deployment frequency increased from weekly to daily. Zero-downtime deployments achieved with blue-green strategy.",
            "tags": ["cicd", "devops", "automation", "performance"],
            "metadata": {"build_time_reduction_percent": 68, "deploy_frequency": "daily"},
            "sector": "procedural",
            "salience": 0.84
        },
        {
            "content": "Handled conflict between backend and frontend teams over API contract changes. Facilitated design session, agreed on versioned API endpoints, established RFC process for breaking changes. Teams aligned on communication protocols. Relationship restored.",
            "tags": ["conflict_resolution", "team_management", "api", "communication"],
            "metadata": {"resolution_status": "resolved", "teams_involved": 2},
            "sector": "emotional",
            "salience": 0.77
        },
        {
            "content": "Technology evaluation: Assessed GraphQL vs REST for new mobile API. Decision: REST for now due to team expertise, simpler caching, better tooling support. GraphQL considered for future when team gains experience. Documented decision rationale in ADR-015.",
            "tags": ["technology_evaluation", "api", "graphql", "rest"],
            "metadata": {"decision_record": "ADR-015", "status": "approved"},
            "sector": "semantic",
            "salience": 0.72
        },
        {
            "content": "Onboarding new senior engineer: Prepared comprehensive onboarding checklist, assigned mentor, scheduled knowledge transfer sessions. Set 30-60-90 day goals focused on codebase familiarity, first production contribution, and leading small feature. Initial feedback very positive.",
            "tags": ["onboarding", "hiring", "team_growth"],
            "metadata": {"seniority": "senior", "start_date": "2024-01-15"},
            "sector": "procedural",
            "salience": 0.69
        },
        {
            "content": "Implemented comprehensive monitoring dashboards using Grafana: service health metrics, business KPIs, infrastructure utilization, error rates, API latency percentiles. Setup PagerDuty integration for critical alerts. On-call rotation established with clear escalation procedures.",
            "tags": ["monitoring", "observability", "grafana", "alerting"],
            "metadata": {"dashboards_created": 12, "alert_rules": 35},
            "sector": "procedural",
            "salience": 0.79
        },
        {
            "content": "Quarterly architecture review: Identified service boundaries needing refinement, discussed data consistency strategies, evaluated message queue alternatives. Key decisions: adopt saga pattern for distributed transactions, implement API gateway for cross-cutting concerns.",
            "tags": ["architecture", "review", "distributed_systems"],
            "metadata": {"quarter": "2024-Q1", "participants": 8},
            "sector": "semantic",
            "salience": 0.83
        },
        {
            "content": "Successfully negotiated with product team on technical debt allocation: secured 25% of engineering capacity for infrastructure improvements, automated testing, and documentation. Created backlog of prioritized tech debt items. Executive sponsorship obtained.",
            "tags": ["technical_debt", "negotiation", "planning"],
            "metadata": {"capacity_allocated_percent": 25, "executive_approval": True},
            "sector": "episodic",
            "salience": 0.86
        },
        {
            "content": "Disaster recovery drill executed: Simulated complete database failure, tested backup restoration procedures, validated RPO/RTO targets. Identified gaps in runbook documentation. Updated incident response procedures. Team confidence in DR process significantly improved.",
            "tags": ["disaster_recovery", "testing", "database", "reliability"],
            "metadata": {"rpo_minutes": 15, "rto_minutes": 60, "test_date": "2024-01"},
            "sector": "episodic",
            "salience": 0.87
        },
        {
            "content": "Code quality initiative results: Implemented pre-commit hooks, added SonarQube analysis, established code coverage threshold (80%). Technical debt ratio decreased from 15% to 8%. Team velocity initially dipped but recovered with 15% improvement. Maintainability index up 40%.",
            "tags": ["code_quality", "testing", "technical_debt", "metrics"],
            "metadata": {"coverage_threshold": 0.8, "debt_ratio_improvement": 0.07},
            "sector": "semantic",
            "salience": 0.81
        },
    ]


def create_bob_research_scenario() -> List[Dict[str, Any]]:
    """Create memories for bob-research: AI/NLP Research Scientist"""
    return [
        {
            "content": "Read groundbreaking paper on attention mechanisms: 'Attention Is All You Need' (Vaswani et al., 2017). Transformer architecture eliminates recurrence, relies entirely on self-attention. Key insight: parallel processing of sequences dramatically improves training efficiency. Implications for future language models immense.",
            "tags": ["paper", "transformers", "attention", "architecture"],
            "metadata": {"paper_id": "arxiv:1706.03762", "authors": "Vaswani et al.", "year": 2017},
            "sector": "semantic",
            "salience": 0.95
        },
        {
            "content": "Experiment results: Fine-tuned BERT-base on domain-specific medical texts. Achieved 94.2% accuracy on clinical entity extraction, 3.5% improvement over baseline. Training time: 12 hours on 4x A100 GPUs. Dataset: 50K annotated clinical notes. Published results to internal wiki.",
            "tags": ["experiment", "bert", "medical_nlp", "fine_tuning"],
            "metadata": {"accuracy": 0.942, "dataset_size": 50000, "gpu_hours": 48},
            "sector": "episodic",
            "salience": 0.89
        },
        {
            "content": "Attended NeurIPS 2023 conference: Fascinating workshop on multimodal learning. Key trends: vision-language models, efficient training techniques, alignment methods. Networked with researchers from Stanford and DeepMind. Collected 15+ interesting paper references for follow-up reading.",
            "tags": ["conference", "neurips", "multimodal", "networking"],
            "metadata": {"conference": "NeurIPS 2023", "location": "New Orleans", "papers_collected": 15},
            "sector": "episodic",
            "salience": 0.83
        },
        {
            "content": "Developed novel data augmentation technique for low-resource languages: back-translation with controlled diversity using temperature sampling. Tested on 5 languages with <10K training examples. Average BLEU score improvement: 4.2 points. Submitted to ACL 2024.",
            "tags": ["research", "data_augmentation", "low_resource", "translation"],
            "metadata": {"languages": 5, "bleu_improvement": 4.2, "submission_status": "under_review"},
            "sector": "semantic",
            "salience": 0.88
        },
        {
            "content": "Troubleshooting training instability in large language model: gradient explosion at layer 28. Solution: adjusted learning rate schedule, implemented gradient clipping (max_norm=1.0), added layer normalization. Training stabilized, perplexity converged smoothly. Lesson: always monitor gradient norms.",
            "tags": ["debugging", "training", "llm", "optimization"],
            "metadata": {"issue": "gradient_explosion", "layer": 28, "solution": "gradient_clipping"},
            "sector": "procedural",
            "salience": 0.82
        },
        {
            "content": "Literature review on prompt engineering: Analyzed 40+ papers on in-context learning, chain-of-thought reasoning, few-shot prompting techniques. Key finding: prompt structure matters more than previously thought. Temperature and top-p sampling critically affect output quality. Documented best practices.",
            "tags": ["literature_review", "prompt_engineering", "in_context_learning"],
            "metadata": {"papers_reviewed": 42, "topics": ["prompting", "cot", "few_shot"]},
            "sector": "semantic",
            "salience": 0.79
        },
        {
            "content": "Collaboration with linguistics department: Joint project on syntactic parsing using neural networks. Combining traditional linguistic features with transformer representations. Initial results promising: 2.1% F1 improvement on Universal Dependencies treebanks. Paper co-authorship agreed.",
            "tags": ["collaboration", "syntax", "parsing", "interdisciplinary"],
            "metadata": {"department": "linguistics", "f1_improvement": 0.021},
            "sector": "episodic",
            "salience": 0.77
        },
        {
            "content": "Implemented efficient attention mechanism for long documents: Sparse attention pattern reduces complexity from O(n²) to O(n√n). Successfully processed 32K token documents on single GPU. Memory usage reduced by 60%. Code released on GitHub, received 200+ stars in first week.",
            "tags": ["implementation", "attention", "efficiency", "long_context"],
            "metadata": {"complexity_reduction": "O(n²) to O(n√n)", "max_tokens": 32768, "github_stars": 200},
            "sector": "episodic",
            "salience": 0.9
        },
        {
            "content": "Reviewed paper for EMNLP 2024: Novel approach to cross-lingual transfer using adapter layers. Strengths: elegant architecture, comprehensive evaluation. Concerns: limited analysis of failure cases, missing ablation studies. Recommendation: accept with minor revisions. Provided detailed constructive feedback.",
            "tags": ["peer_review", "emnlp", "cross_lingual", "adapters"],
            "metadata": {"conference": "EMNLP 2024", "decision": "accept_with_revisions"},
            "sector": "reflective",
            "salience": 0.74
        },
        {
            "content": "Dataset curation for question answering: Collected 10K high-quality Q&A pairs from technical documentation. Implemented quality filters, removed duplicates, manual verification of 1000 samples. Inter-annotator agreement: κ=0.82. Dataset ready for model training and evaluation.",
            "tags": ["dataset", "qa", "curation", "annotation"],
            "metadata": {"size": 10000, "kappa": 0.82, "domain": "technical"},
            "sector": "procedural",
            "salience": 0.76
        },
        {
            "content": "Breakthrough moment: Realized that pre-training objective significantly impacts downstream task performance. Masked language modeling great for understanding, causal language modeling better for generation. Designed hybrid objective combining both. Early experiments show 5-8% improvement across benchmarks.",
            "tags": ["insight", "pre_training", "objectives", "innovation"],
            "metadata": {"improvement_range": "5-8%", "hybrid_approach": True},
            "sector": "emotional",
            "salience": 0.93
        },
        {
            "content": "Guest lecture at MIT on transformer architectures: Covered attention mechanisms, positional encodings, layer normalization, feed-forward networks. Students highly engaged, excellent questions about scaling laws and emergent capabilities. Invited to give full course in fall semester.",
            "tags": ["teaching", "mit", "transformers", "education"],
            "metadata": {"institution": "MIT", "audience_size": 85, "invitation": "fall_course"},
            "sector": "episodic",
            "salience": 0.71
        },
        {
            "content": "Analyzed failure modes in production NLP system: Entity extraction errors concentrated in rare entity types, contextual ambiguity cases. Solution: augment training data with hard negatives, implement ensemble of specialized models. Precision improved from 87% to 93%. Error rate halved.",
            "tags": ["production", "error_analysis", "entity_extraction"],
            "metadata": {"precision_improvement": 0.06, "error_reduction": 0.5},
            "sector": "reflective",
            "salience": 0.84
        },
        {
            "content": "Grant proposal submitted to NSF: 'Efficient Training Methods for Large-Scale Language Models'. Requesting $750K over 3 years. Focus: gradient compression, mixed-precision training, distributed optimization. Collaboration with UC Berkeley and Google Research. Reviews expected in 3 months.",
            "tags": ["grant", "nsf", "funding", "research_proposal"],
            "metadata": {"amount": 750000, "duration_years": 3, "status": "submitted"},
            "sector": "episodic",
            "salience": 0.8
        },
        {
            "content": "Implemented reinforcement learning from human feedback (RLHF) pipeline: Reward model training, PPO optimization, KL divergence constraints. Successfully aligned language model outputs with human preferences. Helpfulness scores increased by 35%, harmful output rate decreased by 80%.",
            "tags": ["rlhf", "alignment", "reinforcement_learning", "safety"],
            "metadata": {"helpfulness_increase": 0.35, "harmful_reduction": 0.8},
            "sector": "semantic",
            "salience": 0.91
        },
        {
            "content": "Debugging numerical instability in mixed-precision training: FP16 underflow causing model divergence. Solution: loss scaling, gradient accumulation, FP32 master weights. Successfully trained 7B parameter model on 8x A100 cluster. Training throughput: 1.2M tokens/second.",
            "tags": ["debugging", "mixed_precision", "training", "large_scale"],
            "metadata": {"model_size": "7B", "precision": "FP16", "throughput": 1200000},
            "sector": "procedural",
            "salience": 0.86
        },
        {
            "content": "Organized workshop on interpretability in NLP: 8 speakers, 45 attendees, lively discussions on attention visualization, probing classifiers, causal intervention methods. Identified key research gaps: faithfulness of explanations, evaluation metrics for interpretability. Proceedings published.",
            "tags": ["workshop", "interpretability", "organization", "community"],
            "metadata": {"speakers": 8, "attendees": 45, "proceedings": True},
            "sector": "episodic",
            "salience": 0.73
        },
        {
            "content": "Experimented with retrieval-augmented generation: Indexed 10M documents, implemented dense retrieval with bi-encoder, integrated with GPT-based generation. Significant improvement in factual accuracy (78% → 91%). Reduced hallucination rate by 60%. Production deployment planned.",
            "tags": ["rag", "retrieval", "generation", "factuality"],
            "metadata": {"doc_count": 10000000, "accuracy_improvement": 0.13, "hallucination_reduction": 0.6},
            "sector": "episodic",
            "salience": 0.89
        },
        {
            "content": "Mentored PhD student on thesis project: Advised on research direction, experimental design, paper writing. Student's work on multilingual word embeddings accepted to top-tier conference. Proud of their growth from struggling with basics to producing publication-quality research.",
            "tags": ["mentoring", "phd", "multilingual", "success"],
            "metadata": {"student_level": "phd", "paper_accepted": True, "conference_tier": "top"},
            "sector": "emotional",
            "salience": 0.78
        },
        {
            "content": "Benchmarking study: Compared 15 pre-trained language models on 8 downstream tasks. GPT-4 leads on generation tasks, BERT variants strong on classification, T5 excellent on seq2seq. No single best model - task-dependent performance. Published comprehensive comparison on Papers with Code.",
            "tags": ["benchmarking", "comparison", "evaluation", "models"],
            "metadata": {"models_tested": 15, "tasks": 8, "publication": "papers_with_code"},
            "sector": "semantic",
            "salience": 0.85
        },
    ]


def load_scenario(base_url: str, scenario_data: Dict[str, Any], stats: BootstrapStats, clear_existing: bool = False):
    """Load a complete scenario (agent + memories) into OpenMemory"""
    
    print("\n" + "=" * 70)
    print(f"🎬 Loading Scenario: {scenario_data['name']}")
    print("=" * 70)
    print()
    
    agent_id = scenario_data['agent_id']
    namespace = scenario_data['namespace']
    memories = scenario_data['memories']
    
    # Register agent
    print(f"📝 Registering agent: {agent_id}")
    try:
        # Register the agent and get credentials
        registration = register_agent(
            agent_id=agent_id,
            namespace=namespace,
            description=scenario_data.get('description', ''),
            base_url=base_url
        )
        
        api_key = registration.api_key
        registered_namespace = registration.namespace
        stats.agents_created += 1
        
        print(f"✅ Agent registered successfully")
        print(f"   Namespace: {registered_namespace}")
        print(f"   API Key: {api_key[:20]}...")
        print()
        
        # Create an agent client for this agent
        agent_client = OpenMemoryAgent(
            agent_id=agent_id,
            api_key=api_key,
            base_url=base_url
        )
        
        # Add memories
        print(f"📚 Loading {len(memories)} memories...")
        print()
        
        for i, memory in enumerate(memories, 1):
            try:
                # Prepare metadata - combine tags into metadata if present
                memory_metadata = memory.get('metadata', {}).copy()
                if memory.get('tags'):
                    memory_metadata['tags'] = memory['tags']
                
                # Use the store_memory method from the agent client
                result = agent_client.store_memory(
                    content=memory['content'],
                    metadata=memory_metadata,
                    sector=memory.get('sector'),
                    salience=memory.get('salience', 0.7)
                )
                
                stats.memories_created += 1
                
                # Show brief preview of memory content
                content_preview = memory['content'][:80] + "..." if len(memory['content']) > 80 else memory['content']
                print(f"   [{i}/{len(memories)}] ✅ {content_preview}")
                
                # Small delay to avoid overwhelming the server
                time.sleep(0.2)
                
            except Exception as e:
                stats.errors += 1
                print(f"   [{i}/{len(memories)}] ❌ Error: {str(e)}")
        
        print()
        print(f"✅ Scenario loaded: {stats.memories_created} memories created")
        
    except Exception as e:
        stats.errors += 1
        print(f"❌ Failed to register agent: {str(e)}")


def print_summary(stats: BootstrapStats):
    """Print a summary of the bootstrap process"""
    print("\n" + "=" * 70)
    print("📊 Bootstrap Summary")
    print("=" * 70)
    print(f"   Agents Created: {stats.agents_created}")
    print(f"   Memories Created: {stats.memories_created}")
    print(f"   Errors: {stats.errors}")
    print("=" * 70)
    print()


def main():
    parser = argparse.ArgumentParser(description='Bootstrap OpenMemory with demo data')
    parser.add_argument('--base-url', default='http://localhost:8080',
                       help='Base URL for OpenMemory API (default: http://localhost:8080)')
    parser.add_argument('--clear', action='store_true',
                       help='Clear existing memories before loading new data')
    
    args = parser.parse_args()
    
    print_banner()
    print(f"Configuration:")
    print(f"   Base URL: {args.base_url}")
    print(f"   Clear Existing: {args.clear}")
    print(f"   Scenarios: 2 (Software Dev Lead + Research Scientist)")
    print()
    
    # Initialize with base URL - we'll create agent clients per scenario
    base_url = args.base_url
    
    try:
        print("🏥 Checking server health...")
        # Try to connect to the server using urllib
        import urllib.request
        import urllib.error
        try:
            with urllib.request.urlopen(f"{base_url}/api/agents", timeout=5) as response:
                if response.status == 200:
                    print("✅ Server is healthy")
                    print()
                else:
                    raise Exception(f"Server returned status {response.status}")
        except urllib.error.URLError as e:
            raise Exception(f"Connection failed: {str(e)}")
    except Exception as e:
        print(f"❌ Failed to connect to server: {str(e)}")
        print(f"   Make sure the server is running at {base_url}")
        sys.exit(1)
    
    stats = BootstrapStats()
    
    # Define scenarios
    scenarios = [
        {
            "name": "Software Development Team Lead",
            "agent_id": "alice-dev",
            "namespace": "alice-development",
            "description": "Engineering team lead managing microservices architecture, mentoring developers, and driving technical decisions",
            "memories": create_alice_dev_scenario()
        },
        {
            "name": "AI Research Scientist specializing in NLP",
            "agent_id": "bob-research",
            "namespace": "bob-research-lab",
            "description": "NLP researcher working on transformer models, language understanding, and efficient training methods",
            "memories": create_bob_research_scenario()
        }
    ]
    
    # Load each scenario
    for scenario in scenarios:
        try:
            load_scenario(base_url, scenario, stats, args.clear)
        except Exception as e:
            print(f"❌ Error loading scenario: {str(e)}")
            stats.errors += 1
    
    # Print summary
    print_summary(stats)
    
    print("✨ Bootstrap complete!")
    print()
    print("Next steps:")
    print(f"   1. Query alice-dev's namespace: Use the SDK or API to search 'database performance'")
    print(f"   2. Query bob-research's namespace: Search for 'transformer attention'")
    print(f"   3. Verify isolation: Queries to one namespace won't return data from the other")
    print()


if __name__ == "__main__":
    main()
