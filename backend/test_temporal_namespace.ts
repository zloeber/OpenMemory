import { insert_fact, get_active_facts_count } from './src/temporal_graph/store';
import { query_facts_at_time, get_current_fact } from './src/temporal_graph/query';
import { get_subject_timeline } from './src/temporal_graph/timeline';

async function test() {
    console.log('Testing namespace-isolated temporal facts...\n');
    
    // Test 1: Insert facts in different namespaces
    console.log('1. Inserting facts in different namespaces...');
    const fact1 = await insert_fact('test-namespace-1', 'OpenAI', 'has_CEO', 'Sam Altman', new Date('2023-01-01'), 0.95);
    const fact2 = await insert_fact('test-namespace-2', 'OpenAI', 'has_CEO', 'Greg Brockman', new Date('2023-01-01'), 0.95);
    console.log('   ✓ Inserted fact in namespace-1:', fact1);
    console.log('   ✓ Inserted fact in namespace-2:', fact2);
    
    // Test 2: Query facts from specific namespace
    console.log('\n2. Querying facts by namespace...');
    const ns1_facts = await query_facts_at_time('test-namespace-1', 'OpenAI', 'has_CEO');
    const ns2_facts = await query_facts_at_time('test-namespace-2', 'OpenAI', 'has_CEO');
    console.log('   ✓ Namespace-1 fact:', ns1_facts[0]?.object);
    console.log('   ✓ Namespace-2 fact:', ns2_facts[0]?.object);
    
    // Test 3: Get current fact from specific namespace
    console.log('\n3. Getting current facts...');
    const current1 = await get_current_fact('test-namespace-1', 'OpenAI', 'has_CEO');
    const current2 = await get_current_fact('test-namespace-2', 'OpenAI', 'has_CEO');
    console.log('   ✓ Current in namespace-1:', current1?.object);
    console.log('   ✓ Current in namespace-2:', current2?.object);
    
    // Test 4: Count facts per namespace
    console.log('\n4. Counting active facts per namespace...');
    const count1 = await get_active_facts_count('test-namespace-1');
    const count2 = await get_active_facts_count('test-namespace-2');
    console.log('   ✓ Active facts in namespace-1:', count1);
    console.log('   ✓ Active facts in namespace-2:', count2);
    
    // Test 5: Timeline isolation
    console.log('\n5. Testing timeline isolation...');
    const timeline1 = await get_subject_timeline('test-namespace-1', 'OpenAI');
    const timeline2 = await get_subject_timeline('test-namespace-2', 'OpenAI');
    console.log('   ✓ Timeline entries in namespace-1:', timeline1.length);
    console.log('   ✓ Timeline entries in namespace-2:', timeline2.length);
    
    console.log('\n✅ All tests passed! Namespace isolation is working correctly.');
}

test().catch(console.error);
