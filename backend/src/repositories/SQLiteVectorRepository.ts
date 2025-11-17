import { IVectorRepository, VectorInsertOptions, VectorSearchOptions, VectorSearchResult, VectorStats } from './IVectorRepository';
import { q } from '../core/db';
import { cos_sim, buf_to_vec, vec_to_buf } from '../utils';

export class SQLiteVectorRepository implements IVectorRepository {
  private initialized: boolean = false;
  
  async initialize(): Promise<void> {
    // SQLite tables already created by existing schema
    this.initialized = true;
  }
  
  async upsert(options: VectorInsertOptions): Promise<void> {
    const buf = vec_to_buf(Array.from(options.vector));
    await q.ins_vec.run(
      options.id,
      options.sector,
      options.userId,
      buf,
      options.vector.length
    );
  }
  
  async batchUpsert(vectors: VectorInsertOptions[]): Promise<number> {
    let count = 0;
    for (const v of vectors) {
      await this.upsert(v);
      count++;
    }
    return count;
  }
  
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const sector = options.sector || 'semantic';
    const vectors = await q.get_vecs_by_sector.all(sector);
    
    const results: VectorSearchResult[] = [];
    const threshold = options.scoreThreshold || 0.3;
    
    for (const v of vectors) {
      if (options.userId && v.user_id !== options.userId) continue;
      
      const vec = buf_to_vec(v.v);
      const score = cos_sim(options.vector, vec);
      
      if (score >= threshold) {
        results.push({
          id: v.id,
          score,
          vector: options.withVectors ? vec : undefined,
        });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }
  
  async getVector(id: string, sector: string, userId?: string): Promise<Float32Array | null> {
    const result = await q.get_vec.get(id, sector);
    if (!result) return null;
    // Verify userId matches if provided (namespace isolation)
    if (userId && result.user_id !== userId) return null;
    return buf_to_vec(result.v);
  }
  
  async getVectorsBySector(id: string, userId?: string): Promise<Map<string, Float32Array>> {
    const results = await q.get_vecs_by_id.all(id);
    const vectors = new Map<string, Float32Array>();
    
    for (const r of results) {
      // Enforce namespace isolation if userId provided
      if (userId && r.user_id !== userId) continue;
      vectors.set(r.sector, buf_to_vec(r.v));
    }
    
    return vectors;
  }
  
  async delete(id: string, sector?: string, userId?: string): Promise<void> {
    if (sector) {
      // For SQLite, we need to verify ownership before deleting
      if (userId) {
        const result = await q.get_vec.get(id, sector);
        if (result && result.user_id !== userId) return; // Namespace isolation
      }
      await q.del_vec_sector.run(id, sector);
    } else {
      // Delete all sectors for this ID
      if (userId) {
        // Verify ownership of all sectors before deleting
        const results = await q.get_vecs_by_id.all(id);
        const allMatch = results.every(r => r.user_id === userId);
        if (!allMatch && results.length > 0) return; // Namespace isolation
      }
      await q.del_vec.run(id);
    }
  }
  
  async batchDelete(ids: string[], sector?: string, userId?: string): Promise<number> {
    let count = 0;
    for (const id of ids) {
      await this.delete(id, sector, userId);
      count++;
    }
    return count;
  }
  
  async getStats(): Promise<VectorStats> {
    const sectors = ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'];
    const sectorCounts: Record<string, number> = {};
    let total = 0;
    
    for (const sector of sectors) {
      const vectors = await q.get_vecs_by_sector.all(sector);
      sectorCounts[sector] = vectors.length;
      total += vectors.length;
    }
    
    return {
      totalVectors: total,
      vectorsBySector: sectorCounts,
      lastUpdated: Date.now(),
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await q.get_vecs_by_sector.all('semantic');
      return true;
    } catch (e) {
      return false;
    }
  }
  
  async close(): Promise<void> {
    // SQLite connection managed by db.ts
    this.initialized = false;
  }
}
