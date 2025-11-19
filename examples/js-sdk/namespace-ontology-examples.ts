/**
 * Namespace with Ontology Profile Examples
 * 
 * Demonstrates how to:
 * 1. Create namespaces with ontology profiles
 * 2. Auto-create namespaces on first use
 * 3. Update namespace configurations
 * 4. Use metadata for custom namespace settings
 */

const API_URL = process.env.OPENMEMORY_API_URL || 'http://localhost:8080';
const API_KEY = process.env.OPENMEMORY_API_KEY || 'test-key';

const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
};

// Example 1: Create a namespace with an ontology profile
async function createNamespaceWithOntology() {
    console.log('\n📝 Example 1: Create namespace with ontology profile\n');
    
    const response = await fetch(`${API_URL}/api/namespaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            namespace: 'dungeon-master-01',
            description: 'Fantasy RPG dungeon master AI memory space',
            ontology_profile: 'fantasy_dungeon_master_ontology',
            metadata: {
                game_system: 'D&D 5e',
                campaign: 'Lost Mines of Phandelver',
                max_players: 6,
                theme: 'high-fantasy'
            }
        })
    });

    const data = await response.json();
    console.log('✅ Namespace created:', data);
    return data;
}

// Example 2: Create a therapy agent namespace
async function createTherapyNamespace() {
    console.log('\n🧠 Example 2: Create therapy namespace\n');
    
    const response = await fetch(`${API_URL}/api/namespaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            namespace: 'therapy-agent-01',
            description: 'AI therapy assistant memory space',
            ontology_profile: 'therapy_psychology_ontology',
            metadata: {
                specialization: 'cognitive-behavioral-therapy',
                patient_demographics: 'adults',
                session_length: 50,
                privacy_level: 'maximum'
            }
        })
    });

    const data = await response.json();
    console.log('✅ Therapy namespace created:', data);
    return data;
}

// Example 3: Create a default agentic namespace
async function createAgenticNamespace() {
    console.log('\n🤖 Example 3: Create agentic namespace\n');
    
    const response = await fetch(`${API_URL}/api/namespaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            namespace: 'task-agent-01',
            description: 'General purpose task automation agent',
            ontology_profile: 'default_agentic_memory_ontology',
            metadata: {
                agent_type: 'task-automation',
                capabilities: ['web-search', 'file-operations', 'api-calls'],
                priority: 'normal',
                owner: 'team-engineering'
            }
        })
    });

    const data = await response.json();
    console.log('✅ Agentic namespace created:', data);
    return data;
}

// Example 4: Create namespace without ontology (will auto-create structure)
async function createSimpleNamespace() {
    console.log('\n📦 Example 4: Create simple namespace (no ontology)\n');
    
    const response = await fetch(`${API_URL}/api/namespaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            namespace: 'project-alpha',
            description: 'Project Alpha team collaboration space'
        })
    });

    const data = await response.json();
    console.log('✅ Simple namespace created:', data);
    return data;
}

// Example 5: Update namespace configuration
async function updateNamespaceConfig() {
    console.log('\n🔄 Example 5: Update namespace configuration\n');
    
    const response = await fetch(`${API_URL}/api/namespaces/task-agent-01`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            description: 'Enhanced task automation agent with ML capabilities',
            metadata: {
                agent_type: 'task-automation',
                capabilities: ['web-search', 'file-operations', 'api-calls', 'ml-inference'],
                priority: 'high',
                owner: 'team-engineering',
                ml_model: 'gpt-4'
            }
        })
    });

    const data = await response.json();
    console.log('✅ Namespace updated:', data);
    return data;
}

// Example 6: Store memory with auto-created namespace
async function storeMemoryWithAutoNamespace() {
    console.log('\n💾 Example 6: Store memory (namespace auto-created if needed)\n');
    
    // This namespace doesn't exist yet - it will be auto-created
    const response = await fetch(`${API_URL}/memory/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            content: 'User prefers dark mode UI and keyboard shortcuts',
            namespaces: ['user-preferences-auto'],
            tags: ['ui', 'preferences'],
            meta: {
                source: 'user-settings',
                priority: 'high'
            }
        })
    });

    const data = await response.json();
    console.log('✅ Memory stored (namespace auto-created):', data);
    return data;
}

// Example 7: List all namespaces with their configurations
async function listAllNamespaces() {
    console.log('\n📋 Example 7: List all namespaces\n');
    
    const response = await fetch(`${API_URL}/api/namespaces`, {
        method: 'GET',
        headers
    });

    const data = await response.json();
    console.log(`✅ Found ${data.total} namespaces:\n`);
    
    data.namespaces.forEach((ns: any) => {
        console.log(`  📁 ${ns.namespace}`);
        console.log(`     Description: ${ns.description}`);
        if (ns.ontology_profile) {
            console.log(`     Ontology: ${ns.ontology_profile}`);
        }
        if (ns.metadata) {
            console.log(`     Metadata: ${JSON.stringify(ns.metadata, null, 2).split('\n').join('\n     ')}`);
        }
        console.log('');
    });
    
    return data;
}

// Example 8: Get specific namespace details
async function getNamespaceDetails(namespace: string) {
    console.log(`\n🔍 Example 8: Get details for namespace: ${namespace}\n`);
    
    const response = await fetch(`${API_URL}/api/namespaces/${namespace}`, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        console.log(`❌ Namespace not found: ${namespace}`);
        return null;
    }

    const data = await response.json();
    console.log('✅ Namespace details:', JSON.stringify(data, null, 2));
    return data;
}

// Run all examples
async function main() {
    console.log('🚀 Namespace with Ontology Profile Examples\n');
    console.log('='.repeat(60));

    try {
        // Create namespaces with different ontology profiles
        await createNamespaceWithOntology();
        await createTherapyNamespace();
        await createAgenticNamespace();
        await createSimpleNamespace();
        
        // Update a namespace
        await updateNamespaceConfig();
        
        // Auto-create namespace on first use
        await storeMemoryWithAutoNamespace();
        
        // List all namespaces
        await listAllNamespaces();
        
        // Get specific namespace
        await getNamespaceDetails('dungeon-master-01');
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ All examples completed successfully!\n');
        
    } catch (error) {
        console.error('\n❌ Error running examples:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { 
    createNamespaceWithOntology,
    createTherapyNamespace,
    createAgenticNamespace,
    createSimpleNamespace,
    updateNamespaceConfig,
    storeMemoryWithAutoNamespace,
    listAllNamespaces,
    getNamespaceDetails
};
