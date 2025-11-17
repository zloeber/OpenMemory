#!/usr/bin/env node

/**
 * OpenMemory Bootstrap Script - Demo Data Generator
 * 
 * Creates two agents with realistic memory sequences demonstrating
 * namespace isolation and different use cases.
 * 
 * Scenario 1: Software Development Team Lead (alice-dev)
 * Scenario 2: Research Scientist (bob-research)
 * 
 * Usage:
 *   node bootstrap-demo-data.js [--base-url=http://localhost:8080] [--clear]
 */

interface AgentConfig {
    agent_id: string;
    namespace: string;
    description: string;
    permissions: string[];
}

interface MemoryEntry {
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
    salience?: number;
    delay?: number; // ms to wait before next memory
}

interface AgentScenario {
    agent: AgentConfig;
    memories: MemoryEntry[];
}

const BASE_URL = process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:8080';
const CLEAR_EXISTING = process.argv.includes('--clear');

class BootstrapClient {
    private baseUrl: string;
    private stats = {
        agents_created: 0,
        memories_created: 0,
        errors: 0,
    };

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request(method: string, path: string, body?: any): Promise<any> {
        const url = `${this.baseUrl}${path}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            try {
                error.data = await response.json();
            } catch {
                // Ignore JSON parse errors
            }
            throw error;
        }

        return response.json();
    }

    async checkHealth(): Promise<void> {
        // Try to list agents as a health check since /health endpoint doesn't exist
        await this.request('GET', '/api/agents');
    }

    async registerAgent(config: AgentConfig): Promise<{ api_key: string; namespace: string }> {
        try {
            console.log(`\n📝 Registering agent: ${config.agent_id}`);
            const response = await this.request('POST', '/api/agents', config);
            this.stats.agents_created++;
            console.log(`✅ Agent registered successfully`);
            console.log(`   Namespace: ${response.namespace}`);
            console.log(`   API Key: ${response.api_key.substring(0, 20)}...`);
            return response;
        } catch (error: any) {
            if (error.status === 409) {
                console.log(`ℹ️  Agent already exists, fetching info...`);
                const info = await this.request('GET', `/api/agents/${config.agent_id}`);
                return { api_key: '***existing***', namespace: info.namespace };
            }
            throw error;
        }
    }

    async addMemory(
        namespace: string,
        memory: MemoryEntry,
        apiKey?: string
    ): Promise<{ id: string; primary_sector: string }> {
        try {
            const payload = {
                content: memory.content,
                tags: memory.tags || [],
                metadata: memory.metadata || {},
                salience: memory.salience || 0.5,
                user_id: namespace,
            };

            const response = await this.request('POST', '/memory/add', payload);
            this.stats.memories_created++;
            return response;
        } catch (error: any) {
            this.stats.errors++;
            console.error(`   ❌ Failed to add memory: ${error.message}`);
            throw error;
        }
    }

    async clearAgentMemories(namespace: string): Promise<void> {
        try {
            console.log(`🗑️  Clearing existing memories for namespace: ${namespace}`);
            await this.request('DELETE', `/users/${namespace}/memories`);
            console.log(`✅ Memories cleared`);
        } catch (error: any) {
            console.log(`ℹ️  No existing memories to clear`);
        }
    }

    async loadScenario(scenario: AgentScenario): Promise<void> {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🎬 Loading Scenario: ${scenario.agent.description}`);
        console.log(`${'='.repeat(70)}`);

        // Register agent
        const registration = await this.registerAgent(scenario.agent);

        // Clear existing memories if requested
        if (CLEAR_EXISTING) {
            await this.clearAgentMemories(registration.namespace);
        }

        // Load memories with realistic timing
        console.log(`\n📚 Loading ${scenario.memories.length} memories...`);
        for (let i = 0; i < scenario.memories.length; i++) {
            const memory = scenario.memories[i];
            try {
                const result = await this.addMemory(registration.namespace, memory);
                console.log(`   [${i + 1}/${scenario.memories.length}] ✅ ${result.primary_sector} | ${memory.content.substring(0, 60)}...`);

                // Simulate realistic time gaps between memories
                if (memory.delay && i < scenario.memories.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, memory.delay));
                }
            } catch (error: any) {
                console.error(`   [${i + 1}/${scenario.memories.length}] ❌ Error: ${error.message}`);
            }
        }
    }

    printStats(): void {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 Bootstrap Summary`);
        console.log(`${'='.repeat(70)}`);
        console.log(`   Agents Created: ${this.stats.agents_created}`);
        console.log(`   Memories Created: ${this.stats.memories_created}`);
        console.log(`   Errors: ${this.stats.errors}`);
        console.log(`${'='.repeat(70)}\n`);
    }
}

// Scenario 1: Software Development Team Lead
const aliceDevScenario: AgentScenario = {
    agent: {
        agent_id: 'alice-dev',
        namespace: 'alice-development',
        description: 'Software Development Team Lead',
        permissions: ['read', 'write'],
    },
    memories: [
        {
            content: 'Started new position as Engineering Team Lead at TechCorp. Team of 8 developers working on cloud infrastructure.',
            tags: ['career', 'onboarding', 'team'],
            metadata: { type: 'milestone', date: '2024-01-15' },
            salience: 0.9,
            delay: 100,
        },
        {
            content: 'Met with product team to discuss Q1 roadmap. Priority features: API rate limiting, database optimization, and microservices migration.',
            tags: ['planning', 'roadmap', 'meetings'],
            metadata: { quarter: 'Q1', attendees: 5 },
            salience: 0.8,
            delay: 100,
        },
        {
            content: 'Code review best practice: Always check for SQL injection vulnerabilities in user input handling. Use parameterized queries.',
            tags: ['best-practices', 'security', 'sql'],
            metadata: { category: 'security', importance: 'critical' },
            salience: 0.85,
            delay: 100,
        },
        {
            content: 'Sprint planning meeting notes: Story points estimation disagreement. Team velocity averaging 45 points per sprint. Need to improve estimation accuracy.',
            tags: ['agile', 'sprint-planning', 'velocity'],
            metadata: { sprint: 'Sprint-23', velocity: 45 },
            salience: 0.6,
            delay: 100,
        },
        {
            content: 'Investigated production incident: Database connection pool exhaustion caused 503 errors. Increased max connections from 100 to 200. Root cause: N+1 query problem in user dashboard.',
            tags: ['incident', 'database', 'performance'],
            metadata: { severity: 'high', resolved: true, duration_minutes: 45 },
            salience: 0.95,
            delay: 100,
        },
        {
            content: 'Team retrospective insights: Developers feeling overwhelmed by context switching. Too many meetings interrupting flow state. Action: Implement "focus time" blocks from 9-12am daily.',
            tags: ['retrospective', 'team-health', 'productivity'],
            metadata: { action_items: 3, sentiment: 'constructive' },
            salience: 0.75,
            delay: 100,
        },
        {
            content: 'Technical debt discussion: Legacy authentication system needs modernization. Current system uses MD5 hashing (security risk). Proposal: Migrate to bcrypt with Argon2 fallback.',
            tags: ['tech-debt', 'security', 'authentication'],
            metadata: { priority: 'high', estimated_effort: '3 sprints' },
            salience: 0.88,
            delay: 100,
        },
        {
            content: 'Mentoring session with junior developer Sarah. Explained async/await patterns and Promise error handling. She struggled with error propagation in nested promises.',
            tags: ['mentoring', 'javascript', 'async'],
            metadata: { mentee: 'Sarah', topics: ['promises', 'async-await'] },
            salience: 0.7,
            delay: 100,
        },
        {
            content: 'Architecture decision: Moving from monolith to microservices. Start with user service and auth service. Use gRPC for inter-service communication. Event bus for async operations.',
            tags: ['architecture', 'microservices', 'design'],
            metadata: { decision_id: 'ADR-042', status: 'approved' },
            salience: 0.92,
            delay: 100,
        },
        {
            content: 'Performance optimization success: Implemented Redis caching for frequently accessed user profiles. Reduced database load by 60%. API response time improved from 450ms to 120ms.',
            tags: ['performance', 'caching', 'redis'],
            metadata: { improvement_percent: 60, response_time_before: 450, response_time_after: 120 },
            salience: 0.87,
            delay: 100,
        },
        {
            content: 'Security audit findings: Need to implement rate limiting on API endpoints. Recommendation: 100 requests per minute per user. Use Redis for distributed rate limit tracking.',
            tags: ['security', 'rate-limiting', 'api'],
            metadata: { audit_date: '2024-02-10', recommendations: 5 },
            salience: 0.83,
            delay: 100,
        },
        {
            content: 'Deployment pipeline improvements: Added automated smoke tests after production deploy. Integration with Slack for deployment notifications. Rollback time reduced from 15min to 3min.',
            tags: ['devops', 'ci-cd', 'automation'],
            metadata: { tools: ['Jenkins', 'Kubernetes', 'Slack'], rollback_improvement: '80%' },
            salience: 0.78,
            delay: 100,
        },
        {
            content: 'Team bonding event: Virtual escape room. Great for remote team collaboration. Everyone enjoyed it. Planning monthly team building activities.',
            tags: ['team-culture', 'remote-work', 'bonding'],
            metadata: { attendance: 7, format: 'virtual', feedback: 'positive' },
            salience: 0.55,
            delay: 100,
        },
        {
            content: 'Interview candidate evaluation: Strong algorithms knowledge, good system design thinking. Concerned about communication skills in team setting. Second round recommended.',
            tags: ['hiring', 'interviews', 'evaluation'],
            metadata: { candidate_id: 'C-1234', round: 1, recommendation: 'proceed' },
            salience: 0.68,
            delay: 100,
        },
        {
            content: 'Learned about new monitoring tool: OpenTelemetry for distributed tracing. Evaluated vs Datadog APM. OpenTelemetry wins for vendor neutrality and flexibility.',
            tags: ['monitoring', 'observability', 'tools'],
            metadata: { tool: 'OpenTelemetry', comparison: ['Datadog', 'New Relic'] },
            salience: 0.72,
            delay: 100,
        },
        {
            content: 'Bug triage session: Prioritized 23 bugs from backlog. 5 critical (P0), 10 high (P1), 8 medium (P2). Assigned P0 bugs to sprint. Created detailed reproduction steps.',
            tags: ['bug-triage', 'prioritization', 'backlog'],
            metadata: { total_bugs: 23, critical: 5, high: 10, medium: 8 },
            salience: 0.65,
            delay: 100,
        },
        {
            content: 'Database migration strategy discussion: Zero-downtime migration for user_profiles table (12M rows). Plan: Shadow writes, data validation, gradual traffic shift.',
            tags: ['database', 'migration', 'strategy'],
            metadata: { table: 'user_profiles', rows: 12000000, downtime_target: 0 },
            salience: 0.89,
            delay: 100,
        },
        {
            content: 'Code quality metrics review: Test coverage at 78% (target 85%). Cyclomatic complexity spike in payment processing module. Refactoring needed.',
            tags: ['code-quality', 'testing', 'metrics'],
            metadata: { coverage: 78, target: 85, issues: ['complexity'] },
            salience: 0.74,
            delay: 100,
        },
        {
            content: 'Stakeholder presentation: Demonstrated new dashboard features to executive team. Positive feedback on performance improvements. Request for additional analytics features.',
            tags: ['presentation', 'stakeholders', 'demo'],
            metadata: { audience: 'executives', feedback: 'positive', new_requests: 3 },
            salience: 0.76,
            delay: 100,
        },
        {
            content: 'Personal reflection: Balancing technical leadership with hands-on coding is challenging. Need to delegate more code reviews. Focus on architecture and team enablement.',
            tags: ['leadership', 'reflection', 'growth'],
            metadata: { type: 'personal', insights: ['delegation', 'focus'] },
            salience: 0.71,
        },
    ],
};

// Scenario 2: Research Scientist
const bobResearchScenario: AgentScenario = {
    agent: {
        agent_id: 'bob-research',
        namespace: 'bob-research-lab',
        description: 'AI Research Scientist specializing in NLP',
        permissions: ['read', 'write', 'admin'],
    },
    memories: [
        {
            content: 'Paper reading: "Attention Is All You Need" - Transformer architecture revolutionized NLP. Self-attention mechanism allows parallel processing. Key innovation over RNNs.',
            tags: ['papers', 'transformers', 'attention'],
            metadata: { paper: 'Vaswani et al. 2017', citations: 50000, importance: 'foundational' },
            salience: 0.95,
            delay: 100,
        },
        {
            content: 'Experiment results: Fine-tuning BERT on domain-specific medical texts. Achieved 92.3% F1 score on entity recognition task. Baseline was 87.1%. Significant improvement.',
            tags: ['experiments', 'bert', 'medical-nlp'],
            metadata: { model: 'BioBERT', f1_score: 0.923, baseline: 0.871, dataset: 'PubMed-NER' },
            salience: 0.91,
            delay: 100,
        },
        {
            content: 'Research group meeting: Discussed challenges in multilingual models. Low-resource languages need better representation. Proposed using cross-lingual transfer learning.',
            tags: ['meetings', 'multilingual', 'low-resource'],
            metadata: { attendees: 12, languages: ['Swahili', 'Bengali', 'Yoruba'] },
            salience: 0.78,
            delay: 100,
        },
        {
            content: 'Hyperparameter tuning insights: Learning rate 2e-5 works best for BERT fine-tuning. Batch size 16 with gradient accumulation. Warmup steps = 10% of training.',
            tags: ['hyperparameters', 'optimization', 'best-practices'],
            metadata: { lr: 0.00002, batch_size: 16, warmup: 0.1 },
            salience: 0.82,
            delay: 100,
        },
        {
            content: 'Conference accepted: NeurIPS 2024 - Paper on efficient attention mechanisms accepted! Proposed sparse attention reduces computation by 40% with minimal accuracy loss.',
            tags: ['conferences', 'publications', 'achievements'],
            metadata: { conference: 'NeurIPS', year: 2024, acceptance_rate: 0.21, innovation: 'sparse-attention' },
            salience: 0.98,
            delay: 100,
        },
        {
            content: 'Dataset creation workflow: Annotated 10k samples for sentiment analysis. Inter-annotator agreement (Cohen\'s kappa) = 0.87. Need to resolve 234 disagreements.',
            tags: ['datasets', 'annotation', 'sentiment'],
            metadata: { samples: 10000, kappa: 0.87, disagreements: 234 },
            salience: 0.75,
            delay: 100,
        },
        {
            content: 'Collaboration discussion with Stanford NLP group: Interested in our work on few-shot learning. Proposing joint research on prompt engineering techniques.',
            tags: ['collaboration', 'few-shot', 'prompts'],
            metadata: { institution: 'Stanford', topic: 'few-shot-learning', status: 'proposed' },
            salience: 0.88,
            delay: 100,
        },
        {
            content: 'Literature review finding: GPT-3 shows emergent abilities at scale. Tasks like arithmetic and translation improve non-linearly with model size. Scaling laws are fascinating.',
            tags: ['literature', 'gpt-3', 'scaling'],
            metadata: { paper: 'Brown et al. 2020', concept: 'emergent-abilities' },
            salience: 0.86,
            delay: 100,
        },
        {
            content: 'Model compression experiment: Knowledge distillation from BERT-large to BERT-tiny. Achieved 95% of original performance with 10x speedup. Great for production deployment.',
            tags: ['compression', 'distillation', 'efficiency'],
            metadata: { teacher: 'BERT-large', student: 'BERT-tiny', performance_ratio: 0.95, speedup: 10 },
            salience: 0.84,
            delay: 100,
        },
        {
            content: 'Grant proposal submitted to NSF: $500k over 3 years for interpretable AI research. Focus on attention visualization and model explanation techniques.',
            tags: ['grants', 'funding', 'interpretability'],
            metadata: { agency: 'NSF', amount: 500000, duration_years: 3, topic: 'interpretable-ai' },
            salience: 0.92,
            delay: 100,
        },
        {
            content: 'Code review note: Always freeze pretrained layers initially when fine-tuning. Gradual unfreezing prevents catastrophic forgetting. Unfreeze top layers after 2 epochs.',
            tags: ['best-practices', 'fine-tuning', 'transfer-learning'],
            metadata: { technique: 'gradual-unfreezing', timing: '2-epochs' },
            salience: 0.79,
            delay: 100,
        },
        {
            content: 'Seminar attendance: Yoshua Bengio on consciousness and AI. Discussed integration of System 1 (intuitive) and System 2 (deliberate) thinking in neural architectures.',
            tags: ['seminars', 'cognitive-ai', 'bengio'],
            metadata: { speaker: 'Yoshua Bengio', topic: 'consciousness', concepts: ['system-1', 'system-2'] },
            salience: 0.81,
            delay: 100,
        },
        {
            content: 'Debugging session: Training instability in custom attention layer. Issue: Gradient explosion due to softmax temperature. Solution: Add temperature scaling and gradient clipping.',
            tags: ['debugging', 'training', 'attention'],
            metadata: { issue: 'gradient-explosion', solution: 'temperature-scaling' },
            salience: 0.77,
            delay: 100,
        },
        {
            content: 'Ethics discussion: Bias in language models perpetuates societal stereotypes. Need systematic bias auditing. Implementing fairness constraints in training objective.',
            tags: ['ethics', 'bias', 'fairness'],
            metadata: { concerns: ['gender-bias', 'racial-bias'], mitigation: 'fairness-constraints' },
            salience: 0.89,
            delay: 100,
        },
        {
            content: 'Benchmark evaluation: Our model ranks 3rd on GLUE leaderboard. Strong performance on QQP and MNLI tasks. Weakness in CoLA (grammatical acceptability).',
            tags: ['benchmarks', 'evaluation', 'glue'],
            metadata: { benchmark: 'GLUE', rank: 3, strengths: ['QQP', 'MNLI'], weaknesses: ['CoLA'] },
            salience: 0.85,
            delay: 100,
        },
        {
            content: 'PhD student mentoring: Guiding Maria on her thesis about multilingual embeddings. Suggested exploring adapter modules for efficient cross-lingual transfer.',
            tags: ['mentoring', 'phd', 'multilingual'],
            metadata: { student: 'Maria', thesis_topic: 'multilingual-embeddings', suggestion: 'adapter-modules' },
            salience: 0.73,
            delay: 100,
        },
        {
            content: 'Infrastructure upgrade: New GPU cluster with 8x A100 GPUs arrived. Can now train larger models. Estimated 5x speedup for distributed training experiments.',
            tags: ['infrastructure', 'gpu', 'compute'],
            metadata: { hardware: 'A100', count: 8, speedup: 5 },
            salience: 0.76,
            delay: 100,
        },
        {
            content: 'Paper rejected from ACL. Reviewers criticized limited ablation studies and unclear motivation. Need to strengthen experimental section and add more baseline comparisons.',
            tags: ['publications', 'rejection', 'feedback'],
            metadata: { conference: 'ACL', year: 2024, feedback: ['ablations', 'motivation', 'baselines'] },
            salience: 0.68,
            delay: 100,
        },
        {
            content: 'Breakthrough insight: Combining contrastive learning with masked language modeling improves representation quality. SimCLR-style augmentation for text surprisingly effective.',
            tags: ['insights', 'contrastive-learning', 'mlm'],
            metadata: { technique: 'contrastive-mlm', inspiration: 'SimCLR', result: 'improved-representations' },
            salience: 0.94,
            delay: 100,
        },
        {
            content: 'Research priorities review: Q2 focus on efficient architectures and prompt engineering. Need to balance theoretical innovation with practical applications.',
            tags: ['planning', 'priorities', 'strategy'],
            metadata: { quarter: 'Q2', focus: ['efficiency', 'prompts'], balance: 'theory-practice' },
            salience: 0.80,
        },
    ],
};

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                 OpenMemory Bootstrap Script                        ║
║            Demo Data Generator with Namespace Isolation            ║
╚════════════════════════════════════════════════════════════════════╝
    `);

    console.log(`Configuration:`);
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Clear Existing: ${CLEAR_EXISTING}`);
    console.log(`   Scenarios: 2 (Software Dev Lead + Research Scientist)`);

    const client = new BootstrapClient(BASE_URL);

    try {
        // Check server health
        console.log(`\n🏥 Checking server health...`);
        await client.checkHealth();
        console.log(`✅ Server is healthy\n`);

        // Load scenarios
        await client.loadScenario(aliceDevScenario);
        await client.loadScenario(bobResearchScenario);

        // Print summary
        client.printStats();

        console.log(`✨ Bootstrap complete!`);
        console.log(`\nNext steps:`);
        console.log(`   1. Query alice-dev's namespace: curl "${BASE_URL}/memory/query" -d '{"query":"database performance","filters":{"user_id":"alice-development"}}'`);
        console.log(`   2. Query bob-research's namespace: curl "${BASE_URL}/memory/query" -d '{"query":"transformer attention","filters":{"user_id":"bob-research-lab"}}'`);
        console.log(`   3. Verify isolation: Queries to one namespace won't return data from the other\n`);

    } catch (error: any) {
        console.error(`\n❌ Bootstrap failed: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        }
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { BootstrapClient, aliceDevScenario, bobResearchScenario };
