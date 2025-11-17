/**
 * HSG Integration Example
 * 
 * This file shows how to update hsg.ts to use the new VectorRepository pattern.
 * Replace the direct q.* vector operations with repository calls.
 */

import { VectorRepositoryFactory } from '../repositories/VectorRepositoryFactory';
import { IVectorRepository } from '../repositories/IVectorRepository';

// Initialize repository (singleton pattern - only happens once)
let vectorRepo: IVectorRepository;

async function initVectorRepo() {
  if (!vectorRepo) {
    vectorRepo = await VectorRepositoryFactory.getInstance();
    console.log('[HSG] Vector repository initialized');
  }
  return vectorRepo;
}

/**
 * Example: Storing a vector
 * 
 * OLD CODE:
 * await q.ins_vec.run(id, sector, userId, vec_to_buf(vector), dim);
 * 
 * NEW CODE:
 */
export async function storeVector(id: string, sector: string, userId: string, vector: Float32Array) {
  const repo = await initVectorRepo();
  await repo.upsert({
    id,
    sector,
    userId,
    vector,
  });
}

/**
 * Example: Searching vectors
 * 
 * OLD CODE:
 * const vectors = await q.get_vecs_by_sector.all(sector);
 * for (const v of vectors) {
 *   const vec = buf_to_vec(v.v);
 *   const sim = cos_sim(queryVec, vec);
 *   if (sim >= threshold) {
 *     results.push({ id: v.id, score: sim });
 *   }
 * }
 * 
 * NEW CODE:
 */
export async function searchVectors(
  queryVec: Float32Array,
  sector: string,
  userId?: string,
  limit: number = 10,
  threshold: number = 0.3
) {
  const repo = await initVectorRepo();
  const results = await repo.search({
    vector: queryVec,
    sector,
    userId,
    limit,
    scoreThreshold: threshold,
  });
  
  return results; // Returns VectorSearchResult[]
}

/**
 * Example: Getting a specific vector
 * 
 * OLD CODE:
 * const result = await q.get_vec.get(id, sector);
 * if (!result) return null;
 * return buf_to_vec(result.v);
 * 
 * NEW CODE:
 */
export async function getVector(id: string, sector: string): Promise<Float32Array | null> {
  const repo = await initVectorRepo();
  return await repo.getVector(id, sector);
}

/**
 * Example: Getting all vectors for a memory across sectors
 * 
 * OLD CODE:
 * const results = await q.get_vecs_by_id.all(id);
 * const vectors = new Map<string, Float32Array>();
 * for (const r of results) {
 *   vectors.set(r.sector, buf_to_vec(r.v));
 * }
 * 
 * NEW CODE:
 */
export async function getAllVectorsForMemory(id: string): Promise<Map<string, Float32Array>> {
  const repo = await initVectorRepo();
  return await repo.getVectorsBySector(id);
}

/**
 * Example: Deleting vectors
 * 
 * OLD CODE:
 * await q.del_vec.run(id);
 * // or for specific sector:
 * await q.del_vec_sector.run(id, sector);
 * 
 * NEW CODE:
 */
export async function deleteVector(id: string, sector?: string): Promise<void> {
  const repo = await initVectorRepo();
  await repo.delete(id, sector);
}

/**
 * Example: Batch operations
 * 
 * NEW FEATURE - Not available in old code!
 */
export async function batchStoreVectors(vectors: Array<{
  id: string;
  sector: string;
  userId: string;
  vector: Float32Array;
}>) {
  const repo = await initVectorRepo();
  const count = await repo.batchUpsert(vectors);
  console.log(`[HSG] Batch stored ${count} vectors`);
  return count;
}

/**
 * Migration Notes:
 * 
 * 1. In hsg.ts, replace all q.ins_vec.run() calls with repo.upsert()
 * 2. Replace all q.get_vecs_by_sector.all() + cos_sim loops with repo.search()
 * 3. Replace q.get_vec.get() with repo.getVector()
 * 4. Replace q.get_vecs_by_id.all() with repo.getVectorsBySector()
 * 5. Replace q.del_vec.run() with repo.delete()
 * 
 * Benefits:
 * - Automatically uses Qdrant when OM_VECTOR_BACKEND=qdrant
 * - Falls back to SQLite when OM_VECTOR_BACKEND=sqlite
 * - Much faster vector search with Qdrant (HNSW index)
 * - Supports batch operations for better performance
 * - Clean abstraction makes testing easier
 */
