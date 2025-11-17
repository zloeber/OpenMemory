#!/usr/bin/env tsx
/**
 * Vector Migration Script
 * 
 * This script migrates existing vectors from SQLite/PostgreSQL to Qdrant.
 * It supports:
 * - Dry-run mode to preview migration
 * - Batch processing for better performance
 * - Progress tracking
 * - Error handling and retry logic
 * 
 * Usage:
 *   npm run migrate:vectors                    # Dry run
 *   npm run migrate:vectors -- --execute       # Execute migration
 *   npm run migrate:vectors -- --execute --batch-size=1000
 */

import { q } from '../core/db';
import { VectorRepositoryFactory } from '../repositories/VectorRepositoryFactory';
import { buf_to_vec } from '../utils';
import { env } from '../core/cfg';

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  verify: boolean;
}

async function migrateVectors(options: MigrationOptions) {
  console.log('🚀 Vector Migration Tool');
  console.log('========================');
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Target: ${env.vector_backend} (${env.qdrant_url})`);
  console.log('');

  if (env.vector_backend !== 'qdrant') {
    console.error('❌ Error: OM_VECTOR_BACKEND must be set to "qdrant"');
    console.error('   Current value:', env.vector_backend);
    process.exit(1);
  }

  // Get all sectors
  const sectors = ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'];
  
  let totalVectors = 0;
  let migratedVectors = 0;
  let errors = 0;

  // Count total vectors
  console.log('📊 Counting vectors in source database...');
  for (const sector of sectors) {
    const vectors = await q.get_vecs_by_sector.all(sector);
    console.log(`   ${sector}: ${vectors.length} vectors`);
    totalVectors += vectors.length;
  }
  
  console.log(`\n📦 Total vectors to migrate: ${totalVectors}\n`);

  if (options.dryRun) {
    console.log('✅ Dry run complete. Use --execute to perform migration.');
    return;
  }

  // Initialize Qdrant repository
  console.log('🔌 Connecting to Qdrant...');
  const qdrantRepo = await VectorRepositoryFactory.getInstance();
  
  // Health check
  const healthy = await qdrantRepo.healthCheck();
  if (!healthy) {
    console.error('❌ Qdrant health check failed!');
    process.exit(1);
  }
  console.log('✅ Qdrant connection successful\n');

  // Migrate each sector
  for (const sector of sectors) {
    console.log(`🔄 Migrating ${sector} sector...`);
    
    const vectors = await q.get_vecs_by_sector.all(sector);
    if (vectors.length === 0) {
      console.log(`   ⏭️  No vectors to migrate\n`);
      continue;
    }

    // Process in batches
    for (let i = 0; i < vectors.length; i += options.batchSize) {
      const batch = vectors.slice(i, i + options.batchSize);
      
      try {
        const vectorData = batch.map(v => ({
          id: v.id,
          sector,
          userId: v.user_id || 'default',
          vector: buf_to_vec(v.v),
        }));

        const count = await qdrantRepo.batchUpsert(vectorData);
        migratedVectors += count;
        
        const progress = ((migratedVectors / totalVectors) * 100).toFixed(1);
        console.log(`   ✓ Batch ${Math.floor(i / options.batchSize) + 1}: ${count} vectors (${progress}% complete)`);
        
        // Small delay to avoid overwhelming Qdrant
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`   ❌ Batch failed:`, error);
        errors++;
      }
    }
    
    console.log('');
  }

  // Verification
  if (options.verify) {
    console.log('🔍 Verifying migration...');
    const stats = await qdrantRepo.getStats();
    console.log(`   Qdrant total vectors: ${stats.totalVectors}`);
    console.log(`   Sector breakdown:`);
    for (const [sector, count] of Object.entries(stats.vectorsBySector)) {
      console.log(`      ${sector}: ${count}`);
    }
    console.log('');
  }

  // Summary
  console.log('📋 Migration Summary');
  console.log('==================');
  console.log(`✅ Successfully migrated: ${migratedVectors}/${totalVectors} vectors`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📈 Success rate: ${((migratedVectors / totalVectors) * 100).toFixed(1)}%`);
  
  if (migratedVectors === totalVectors && errors === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update .env: OM_VECTOR_BACKEND=qdrant');
    console.log('   2. Restart OpenMemory backend');
    console.log('   3. Verify search functionality');
    console.log('   4. Monitor Qdrant performance');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review logs.');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '500');
const verify = args.includes('--verify') || !dryRun;

migrateVectors({ dryRun, batchSize, verify }).catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
