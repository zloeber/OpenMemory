#!/usr/bin/env node

/**
 * Bootstrap Script for OpenMemory
 * 
 * This script loads realistic memory sequences into two separate namespaces
 * demonstrating typical usage patterns for different scenarios:
 * - research-project: Academic research team collaboration
 * - product-development: Software product development team
 * 
 * Usage:
 *   node bootstrap-memories.js [--api-url http://localhost:8080] [--api-key your_key]
 */

const API_URL = process.env.OPENMEMORY_URL || process.argv.find(arg => arg.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:8080';
const API_KEY = process.env.OPENMEMORY_API_KEY || process.argv.find(arg => arg.startsWith('--api-key='))?.split('=')[1];

console.log('🚀 OpenMemory Bootstrap Script');
console.log('================================\n');
console.log(`📡 API URL: ${API_URL}`);
console.log(`🔑 API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'none'}\n`);

// Scenario 1: Research Project Namespace
const researchMemories = [
    {
        content: "Initial research proposal: Investigating the impact of large language models on code generation efficiency",
        metadata: { type: "proposal", date: "2024-01-15", priority: "high" }
    },
    {
        content: "Team meeting notes: Decided to focus on Python code generation benchmarks using HumanEval dataset",
        metadata: { type: "meeting", date: "2024-01-20", attendees: 5 }
    },
    {
        content: "Literature review finding: GPT-4 achieves 67% pass rate on HumanEval, Claude 3.5 reaches 73%",
        metadata: { type: "research", date: "2024-01-25", source: "arxiv" }
    },
    {
        content: "Experimental design: Will test 5 different models on 100 Python problems with varying complexity",
        metadata: { type: "methodology", date: "2024-02-01" }
    },
    {
        content: "Data collection complete: Gathered 500 test cases across beginner, intermediate, and advanced levels",
        metadata: { type: "data", date: "2024-02-10", sample_size: 500 }
    },
    {
        content: "Preliminary results: Our fine-tuned model shows 15% improvement over baseline on complex problems",
        metadata: { type: "results", date: "2024-02-20", improvement: 0.15 }
    },
    {
        content: "Peer review feedback: Reviewers suggest adding error analysis and failure case categorization",
        metadata: { type: "feedback", date: "2024-03-01", reviewers: 3 }
    },
    {
        content: "Enhanced analysis complete: Identified 4 main error categories - syntax, logic, API misuse, edge cases",
        metadata: { type: "analysis", date: "2024-03-10", categories: 4 }
    },
    {
        content: "Paper draft submitted to ICML 2024: 'Enhancing Code Generation through Hierarchical Reasoning'",
        metadata: { type: "submission", date: "2024-03-20", conference: "ICML" }
    },
    {
        content: "Conference acceptance: Paper accepted for oral presentation at ICML 2024!",
        metadata: { type: "milestone", date: "2024-04-15", presentation_type: "oral" }
    }
];

// Scenario 2: Product Development Namespace
const productMemories = [
    {
        content: "Product vision: Build a collaborative documentation platform with AI-powered content suggestions",
        metadata: { type: "vision", date: "2024-01-10", team: "product" }
    },
    {
        content: "User research insights: 85% of teams struggle with keeping documentation up-to-date and synchronized",
        metadata: { type: "research", date: "2024-01-18", survey_size: 200 }
    },
    {
        content: "Tech stack decision: Next.js frontend, Node.js backend, PostgreSQL database, vector search with OpenMemory",
        metadata: { type: "architecture", date: "2024-01-25", stack: ["nextjs", "nodejs", "postgresql"] }
    },
    {
        content: "Sprint 1 goal: Implement basic markdown editor with real-time collaboration features",
        metadata: { type: "sprint", date: "2024-02-01", sprint_number: 1 }
    },
    {
        content: "MVP feature list: Real-time editing, version control, AI suggestions, search, and team workspaces",
        metadata: { type: "features", date: "2024-02-05", mvp: true }
    },
    {
        content: "Security audit completed: Fixed 3 critical vulnerabilities, implemented OAuth 2.0 authentication",
        metadata: { type: "security", date: "2024-02-15", vulnerabilities_fixed: 3 }
    },
    {
        content: "Beta launch: 50 early access users onboarded, collecting feedback through in-app surveys",
        metadata: { type: "launch", date: "2024-03-01", beta_users: 50 }
    },
    {
        content: "Performance optimization: Reduced page load time by 40% through code splitting and lazy loading",
        metadata: { type: "optimization", date: "2024-03-10", improvement: 0.40 }
    },
    {
        content: "User feedback synthesis: Top requests are templates, mobile app, and integration with Slack/Teams",
        metadata: { type: "feedback", date: "2024-03-20", top_requests: 3 }
    },
    {
        content: "Public launch announcement: Version 1.0 released with 500+ signups in first week",
        metadata: { type: "milestone", date: "2024-04-01", signups: 500 }
    },
    {
        content: "Product roadmap Q2: Focus on mobile apps, API integrations, and enterprise features",
        metadata: { type: "roadmap", date: "2024-04-10", quarter: "Q2-2024" }
    }
];

async function makeRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (API_KEY) {
        headers['x-api-key'] = API_KEY;
        headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Request failed: ${error.message}`);
        throw error;
    }
}

async function checkHealth() {
    console.log('🔍 Checking API health...');
    try {
        const health = await makeRequest('/health');
        console.log(`✅ API is healthy: ${health.ok ? 'OK' : 'Not OK'}\n`);
        return health.ok;
    } catch (error) {
        console.error('❌ API health check failed\n');
        return false;
    }
}

async function createNamespace(namespace, description) {
    console.log(`📦 Creating namespace: ${namespace}...`);
    try {
        const result = await makeRequest('/api/namespaces', 'POST', {
            namespace,
            description
        });
        console.log(`✅ Namespace created: ${namespace}\n`);
        return result;
    } catch (error) {
        // Namespace might already exist, that's OK
        console.log(`ℹ️  Namespace ${namespace} may already exist, continuing...\n`);
        return null;
    }
}

async function storeMemory(namespace, memory) {
    try {
        const result = await makeRequest('/memory/add', 'POST', {
            content: memory.content,
            metadata: memory.metadata,
            user_id: namespace  // Using namespace as user_id
        });
        return result;
    } catch (error) {
        console.error(`  ❌ Failed to store memory: ${memory.content.substring(0, 50)}...`);
        throw error;
    }
}

async function loadMemories(namespace, memories, description) {
    console.log(`📝 Loading ${memories.length} memories into namespace: ${namespace}`);
    console.log(`   Description: ${description}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        try {
            await storeMemory(namespace, memory);
            successCount++;
            process.stdout.write(`  ✓ [${i + 1}/${memories.length}] ${memory.metadata.type}: ${memory.content.substring(0, 60)}...\n`);
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            failCount++;
            console.error(`  ✗ [${i + 1}/${memories.length}] Failed`);
        }
    }

    console.log(`\n  📊 Results: ${successCount} successful, ${failCount} failed\n`);
    return { successCount, failCount };
}

async function displayMetrics(namespace) {
    console.log(`📈 Fetching metrics for namespace: ${namespace}...`);
    try {
        const metrics = await makeRequest(`/api/metrics/namespaces/${namespace}`);
        
        console.log(`\n  Namespace: ${metrics.namespace}`);
        console.log(`  Total memories: ${metrics.memories.total}`);
        console.log(`  Memories by sector:`);
        
        Object.entries(metrics.memories.by_sector || {}).forEach(([sector, stats]) => {
            console.log(`    - ${sector}: ${stats.count} (avg salience: ${stats.avg_salience})`);
        });
        
        console.log(`  Graph waypoints: ${metrics.graph.waypoints}`);
        console.log(`  Recent activity: ${metrics.recent_activity.length} items\n`);
    } catch (error) {
        console.error(`  ❌ Failed to fetch metrics\n`);
    }
}

async function displaySummary() {
    console.log(`📊 System-wide Summary`);
    console.log(`=====================\n`);
    try {
        const summary = await makeRequest('/api/metrics/summary');
        
        console.log(`  Total namespaces: ${summary.namespaces}`);
        console.log(`  Total memories: ${summary.total_memories}`);
        console.log(`  Total embeddings: ${summary.total_embeddings}`);
        
        if (summary.sector_distribution) {
            console.log(`\n  Sector distribution:`);
            Object.entries(summary.sector_distribution).forEach(([sector, count]) => {
                console.log(`    - ${sector}: ${count}`);
            });
        }
        
        if (summary.top_namespaces && summary.top_namespaces.length > 0) {
            console.log(`\n  Most active namespaces:`);
            summary.top_namespaces.slice(0, 5).forEach((ns, i) => {
                console.log(`    ${i + 1}. ${ns.namespace}: ${ns.memory_count} memories`);
            });
        }
        
        console.log('');
    } catch (error) {
        console.error(`  ❌ Failed to fetch summary\n`);
    }
}

async function main() {
    try {
        // Check if API is accessible
        const isHealthy = await checkHealth();
        if (!isHealthy) {
            console.error('❌ API is not accessible. Please ensure OpenMemory is running.');
            process.exit(1);
        }

        // Create namespaces
        await createNamespace('research-project', 'Academic research team collaboration on LLM code generation');
        await createNamespace('product-development', 'Software product development team building documentation platform');

        // Load memories into both namespaces
        const results1 = await loadMemories(
            'research-project',
            researchMemories,
            'Academic research timeline'
        );

        const results2 = await loadMemories(
            'product-development',
            productMemories,
            'Product development journey'
        );

        // Display metrics for each namespace
        await displayMetrics('research-project');
        await displayMetrics('product-development');

        // Display system-wide summary
        await displaySummary();

        console.log('✅ Bootstrap complete!');
        console.log('\n🎯 Next steps:');
        console.log('   - Query memories: curl -X POST http://localhost:8080/memory/query \\');
        console.log('       -H "Content-Type: application/json" \\');
        console.log('       -d \'{"query": "research findings", "filters": {"user_id": "research-project"}}\'');
        console.log('\n   - View metrics: curl http://localhost:8080/api/metrics');
        console.log('\n   - List namespaces: curl http://localhost:8080/api/namespaces\n');

    } catch (error) {
        console.error('\n❌ Bootstrap failed:', error.message);
        process.exit(1);
    }
}

// Run the bootstrap script
main();
