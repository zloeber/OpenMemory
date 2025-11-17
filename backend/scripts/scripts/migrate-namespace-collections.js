#!/usr/bin/env node
"use strict";
/**
 * Migration script to convert single Qdrant collection to namespace-isolated collections
 *
 * This script migrates data from the old single `openmemory_vectors` collection
 * to namespace-specific collections for proper data isolation.
 *
 * Usage:
 *   node migrate-namespace-collections.js [--dry-run] [--batch-size=500]
 *
 * Options:
 *   --dry-run      : Show what would be migrated without making changes
 *   --batch-size   : Number of vectors to process per batch (default: 500)
 *   --source       : Source collection name (default: openmemory_vectors)
 *   --delete-source: Delete source collection after successful migration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_client_rest_1 = require("@qdrant/js-client-rest");
const cfg_js_1 = require("../src/core/cfg.js");
const SOURCE_COLLECTION = 'openmemory_vectors';
const TARGET_PREFIX = 'openmemory_vectors';
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: false,
        batchSize: 500,
        sourceCollection: SOURCE_COLLECTION,
        deleteSource: false,
    };
    for (const arg of args) {
        if (arg === '--dry-run') {
            options.dryRun = true;
        }
        else if (arg.startsWith('--batch-size=')) {
            options.batchSize = parseInt(arg.split('=')[1], 10);
        }
        else if (arg.startsWith('--source=')) {
            options.sourceCollection = arg.split('=')[1];
        }
        else if (arg === '--delete-source') {
            options.deleteSource = true;
        }
        else if (arg === '--help' || arg === '-h') {
            console.log(`
OpenMemory Namespace Collection Migration

Usage:
  node migrate-namespace-collections.js [options]

Options:
  --dry-run           Show what would be migrated without making changes
  --batch-size=N      Number of vectors to process per batch (default: 500)
  --source=NAME       Source collection name (default: openmemory_vectors)
  --delete-source     Delete source collection after successful migration
  -h, --help          Show this help message

Examples:
  # Preview migration
  node migrate-namespace-collections.js --dry-run

  # Migrate with larger batch size
  node migrate-namespace-collections.js --batch-size=1000

  # Migrate and delete old collection
  node migrate-namespace-collections.js --delete-source
`);
            process.exit(0);
        }
    }
    return options;
}
function sanitizeNamespace(namespace) {
    return namespace.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function getCollectionName(userId) {
    const sanitized = sanitizeNamespace(userId);
    return `${TARGET_PREFIX}_${sanitized}`;
}
async function analyzeCollection(client, sourceCollection) {
    console.log(`\n📊 Analyzing collection: ${sourceCollection}`);
    const stats = {
        totalVectors: 0,
        namespaces: new Map(),
        migratedVectors: 0,
        errors: [],
    };
    let offset = undefined;
    let hasMore = true;
    while (hasMore) {
        const result = await client.scroll(sourceCollection, {
            limit: 100,
            offset,
            with_payload: true,
            with_vector: false,
        });
        if (result.points.length === 0) {
            hasMore = false;
            break;
        }
        for (const point of result.points) {
            stats.totalVectors++;
            const userId = point.payload?.user_id || 'default';
            stats.namespaces.set(userId, (stats.namespaces.get(userId) || 0) + 1);
        }
        offset = result.next_page_offset;
        hasMore = offset !== null && offset !== undefined;
    }
    return stats;
}
async function createNamespaceCollection(client, collectionName, vectorSize) {
    try {
        await client.getCollection(collectionName);
        console.log(`  ✓ Collection ${collectionName} already exists`);
    }
    catch {
        console.log(`  ⚙️  Creating collection: ${collectionName}`);
        await client.createCollection(collectionName, {
            vectors: {
                size: vectorSize,
                distance: 'Cosine',
            },
            optimizers_config: {
                default_segment_number: 2,
            },
            replication_factor: 1,
            hnsw_config: {
                m: 16,
                ef_construct: 100,
                full_scan_threshold: 10000,
            },
        });
        // Create payload indices
        await client.createPayloadIndex(collectionName, {
            field_name: 'sector',
            field_schema: 'keyword',
        });
        await client.createPayloadIndex(collectionName, {
            field_name: 'memory_id',
            field_schema: 'keyword',
        });
        console.log(`  ✓ Collection ${collectionName} created with indices`);
    }
}
async function migrateNamespace(client, sourceCollection, userId, batchSize, dryRun) {
    const targetCollection = getCollectionName(userId);
    let migrated = 0;
    console.log(`\n🔄 Migrating namespace: ${userId} → ${targetCollection}`);
    if (dryRun) {
        console.log(`  [DRY RUN] Would migrate to: ${targetCollection}`);
        return 0;
    }
    // Fetch all vectors for this namespace
    let offset = undefined;
    let hasMore = true;
    let vectorSize = 0;
    const batches = [];
    let currentBatch = [];
    while (hasMore) {
        const result = await client.scroll(sourceCollection, {
            filter: {
                must: [
                    {
                        key: 'user_id',
                        match: { value: userId },
                    },
                ],
            },
            limit: 100,
            offset,
            with_payload: true,
            with_vector: true,
        });
        if (result.points.length === 0) {
            hasMore = false;
            break;
        }
        for (const point of result.points) {
            if (!vectorSize && Array.isArray(point.vector)) {
                vectorSize = point.vector.length;
            }
            currentBatch.push(point);
            if (currentBatch.length >= batchSize) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        }
        offset = result.next_page_offset;
        hasMore = offset !== null && offset !== undefined;
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    if (batches.length === 0) {
        console.log(`  ⚠️  No vectors found for namespace: ${userId}`);
        return 0;
    }
    // Create target collection
    await createNamespaceCollection(client, targetCollection, vectorSize);
    // Migrate batches
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`  📦 Batch ${i + 1}/${batches.length}: ${batch.length} vectors`);
        const points = batch.map(p => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload,
        }));
        await client.upsert(targetCollection, {
            wait: true,
            points,
        });
        migrated += batch.length;
    }
    console.log(`  ✅ Migrated ${migrated} vectors to ${targetCollection}`);
    return migrated;
}
async function verifyMigration(client, sourceCollection, stats) {
    console.log(`\n🔍 Verifying migration...`);
    let allValid = true;
    for (const [userId, expectedCount] of stats.namespaces) {
        const targetCollection = getCollectionName(userId);
        try {
            const collInfo = await client.getCollection(targetCollection);
            const actualCount = collInfo.points_count || 0;
            if (actualCount === expectedCount) {
                console.log(`  ✅ ${targetCollection}: ${actualCount}/${expectedCount} vectors`);
            }
            else {
                console.log(`  ❌ ${targetCollection}: ${actualCount}/${expectedCount} vectors (MISMATCH)`);
                allValid = false;
            }
        }
        catch (error) {
            console.log(`  ❌ ${targetCollection}: Collection not found`);
            allValid = false;
        }
    }
    return allValid;
}
async function main() {
    const options = parseArgs();
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║     OpenMemory Namespace Collection Migration                 ║
╚════════════════════════════════════════════════════════════════╝
`);
    if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    console.log(`Source Collection: ${options.sourceCollection}`);
    console.log(`Target Prefix: ${TARGET_PREFIX}`);
    console.log(`Batch Size: ${options.batchSize}`);
    console.log(`Qdrant URL: ${cfg_js_1.env.qdrant_url}\n`);
    const client = new js_client_rest_1.QdrantClient({
        url: cfg_js_1.env.qdrant_url,
        apiKey: cfg_js_1.env.qdrant_api_key,
    });
    try {
        // Verify source collection exists
        await client.getCollection(options.sourceCollection);
        console.log(`✅ Source collection found: ${options.sourceCollection}`);
    }
    catch {
        console.error(`❌ Source collection not found: ${options.sourceCollection}`);
        console.error('   Make sure the collection exists before running migration.');
        process.exit(1);
    }
    // Analyze source collection
    const stats = await analyzeCollection(client, options.sourceCollection);
    console.log(`\n📈 Analysis Complete:`);
    console.log(`   Total Vectors: ${stats.totalVectors}`);
    console.log(`   Namespaces: ${stats.namespaces.size}`);
    console.log(`\n📋 Namespace Breakdown:`);
    for (const [userId, count] of stats.namespaces) {
        const targetName = getCollectionName(userId);
        console.log(`   ${userId.padEnd(30)} → ${targetName.padEnd(40)} (${count} vectors)`);
    }
    if (options.dryRun) {
        console.log(`\n✅ Dry run complete. No changes made.`);
        console.log(`   Run without --dry-run to perform actual migration.`);
        process.exit(0);
    }
    // Confirm migration
    console.log(`\n⚠️  This will create ${stats.namespaces.size} new collections and copy ${stats.totalVectors} vectors.`);
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`\n🚀 Starting migration...`);
    // Migrate each namespace
    for (const [userId] of stats.namespaces) {
        try {
            const migrated = await migrateNamespace(client, options.sourceCollection, userId, options.batchSize, false);
            stats.migratedVectors += migrated;
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            stats.errors.push({ namespace: userId, error: errMsg });
            console.error(`  ❌ Error migrating ${userId}: ${errMsg}`);
        }
    }
    // Verify migration
    const verified = await verifyMigration(client, options.sourceCollection, stats);
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                  Migration Summary                             ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);
    console.log(`   Total Vectors: ${stats.totalVectors}`);
    console.log(`   Migrated: ${stats.migratedVectors}`);
    console.log(`   Errors: ${stats.errors.length}`);
    console.log(`   Verification: ${verified ? '✅ PASSED' : '❌ FAILED'}`);
    if (stats.errors.length > 0) {
        console.log(`\n⚠️  Errors occurred during migration:`);
        for (const err of stats.errors) {
            console.log(`   ${err.namespace}: ${err.error}`);
        }
    }
    if (verified && options.deleteSource) {
        console.log(`\n🗑️  Deleting source collection: ${options.sourceCollection}`);
        await client.deleteCollection(options.sourceCollection);
        console.log(`   ✅ Source collection deleted`);
    }
    else if (verified) {
        console.log(`\n💡 Migration successful! Source collection preserved.`);
        console.log(`   To delete it, run: curl -X DELETE ${cfg_js_1.env.qdrant_url}/collections/${options.sourceCollection}`);
    }
    console.log(`\n✅ Migration complete!\n`);
    process.exit(stats.errors.length > 0 ? 1 : 0);
}
main().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
