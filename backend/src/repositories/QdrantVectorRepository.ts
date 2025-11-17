import { QdrantClient } from '@qdrant/js-client-rest';
import { 
  IVectorRepository, 
  VectorInsertOptions, 
  VectorSearchOptions,
  VectorSearchResult,
  VectorStats
} from './IVectorRepository';

export class QdrantVectorRepository implements IVectorRepository {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize: number;
  private initialized: boolean = false;
  private initializedCollections: Set<string> = new Set();
  
  constructor(
    url: string,
    apiKey?: string,
    collectionName: string = 'openmemory_vectors',
    vectorSize: number = 256
  ) {
    this.client = new QdrantClient({
      url,
      apiKey,
    });
    this.collectionName = collectionName;
    this.vectorSize = vectorSize;
  }
  
  /**
   * Get collection name for a specific namespace (user_id)
   * Creates namespace-isolated collections for complete data separation
   */
  private getCollectionName(userId?: string): string {
    if (!userId) {
      // No user_id means system-level or default collection
      return this.collectionName;
    }
    // Sanitize user_id for collection name (remove special chars)
    const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.collectionName}_${sanitized}`;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }
  
  /**
   * Ensure a collection exists for the given namespace
   * Each namespace gets its own isolated collection for complete data separation
   */
  private async ensureCollection(userId?: string): Promise<string> {
    const collectionName = this.getCollectionName(userId);
    
    // Check if we've already initialized this collection
    if (this.initializedCollections.has(collectionName)) {
      return collectionName;
    }
    
    try {
      // Check if collection exists
      await this.client.getCollection(collectionName);
      console.log(`[Qdrant] Collection '${collectionName}' already exists`);
    } catch (e) {
      // Create collection with optimized settings
      console.log(`[Qdrant] Creating collection '${collectionName}' for namespace isolation`);
      await this.client.createCollection(collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
          on_disk: false,  // Keep in memory for speed
        },
        optimizers_config: {
          default_segment_number: 2,
          indexing_threshold: 20000,
        },
        hnsw_config: {
          m: 16,  // Number of edges per node
          ef_construct: 100,  // Quality of index construction
        },
      });
      
      // Create payload indices for fast filtering
      await Promise.all([
        this.client.createPayloadIndex(this.collectionName, {
          field_name: 'sector',
          field_schema: 'keyword',
        }),
        this.client.createPayloadIndex(this.collectionName, {
          field_name: 'user_id',
          field_schema: 'keyword',
        }),
        this.client.createPayloadIndex(this.collectionName, {
          field_name: 'memory_id',
          field_schema: 'keyword',
        }),
      ]);
      
      console.log(`[Qdrant] Collection '${collectionName}' created successfully with namespace isolation`);
    }
    
    this.initializedCollections.add(collectionName);
    return collectionName;
  }
  
  async upsert(options: VectorInsertOptions): Promise<void> {
    await this.initialize();
    const collectionName = await this.ensureCollection(options.userId);
    
    const pointId = `${options.id}-${options.sector}`;
    
    await this.client.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: Array.from(options.vector),
          payload: {
            memory_id: options.id,
            sector: options.sector,
            user_id: options.userId,
            dimension: options.vector.length,
            created_at: Date.now(),
            ...options.payload,
          },
        },
      ],
    });
  }
  
  async batchUpsert(vectors: VectorInsertOptions[]): Promise<number> {
    await this.initialize();
    
    if (vectors.length === 0) return 0;
    
    // Group vectors by userId to ensure they go to correct collections
    const vectorsByNamespace = new Map<string, VectorInsertOptions[]>();
    for (const v of vectors) {
      const key = v.userId || '';
      if (!vectorsByNamespace.has(key)) {
        vectorsByNamespace.set(key, []);
      }
      vectorsByNamespace.get(key)!.push(v);
    }
    
    let totalInserted = 0;
    
    // Process each namespace separately
    for (const [userId, namespaceVectors] of vectorsByNamespace.entries()) {
      const collectionName = await this.ensureCollection(userId || undefined);
      
      // Qdrant supports batches of 100-1000 points efficiently
      const batchSize = 500;
      
      for (let i = 0; i < namespaceVectors.length; i += batchSize) {
        const batch = namespaceVectors.slice(i, i + batchSize);
      
        const points = batch.map(v => ({
          id: `${v.id}-${v.sector}`,
          vector: Array.from(v.vector),
          payload: {
            memory_id: v.id,
            sector: v.sector,
            user_id: v.userId,
            dimension: v.vector.length,
            created_at: Date.now(),
            ...v.payload,
          },
        }));
        
        await this.client.upsert(collectionName, {
          wait: true,
          points,
        });
        
        totalInserted += batch.length;
      }
      
      console.log(`[Qdrant] Batch upserted ${namespaceVectors.length} vectors to collection '${collectionName}'`);
    }
    
    console.log(`[Qdrant] Total upserted ${totalInserted}/${vectors.length} vectors across ${vectorsByNamespace.size} namespace(s)`);
    
    return totalInserted;
  }
  
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    await this.initialize();
    const collectionName = await this.ensureCollection(options.userId);
    
    const filter: any = { must: [] };
    
    if (options.sector) {
      filter.must.push({
        key: 'sector',
        match: { value: options.sector },
      });
    }
    
    // No need to filter by user_id since we're already in a namespace-specific collection
    // This provides true isolation - queries can't accidentally access other namespaces
    
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        filter.must.push({
          key,
          match: { value },
        });
      }
    }
    
    try {
      const results = await this.client.search(collectionName, {
        vector: Array.from(options.vector),
        limit: options.limit || 10,
        score_threshold: options.scoreThreshold || 0.3,
        filter: filter.must.length > 0 ? filter : undefined,
        with_payload: true,
        with_vector: options.withVectors || false,
      });
    
      return results.map((r: any) => ({
        id: (r.payload?.memory_id as string) || '',
        score: r.score,
        vector: r.vector 
          ? new Float32Array(r.vector as number[]) 
          : undefined,
        payload: r.payload as Record<string, any>,
      }));
    } catch (e) {
      // Collection doesn't exist yet for this namespace - return empty results
      console.log(`[Qdrant] Collection '${collectionName}' not found, returning empty results`);
      return [];
    }
  }
  
  async getVector(id: string, sector: string, userId?: string): Promise<Float32Array | null> {
    await this.initialize();
    const collectionName = await this.ensureCollection(userId);
    
    const pointId = `${id}-${sector}`;
    
    try {
      const result = await this.client.retrieve(collectionName, {
      ids: [pointId],
      with_vector: true,
    });
    
      if (result.length === 0) return null;
      
      const vector = result[0].vector as number[];
      return new Float32Array(vector);
    } catch (e) {
      return null;
    }
  }
  
  async getVectorsBySector(id: string, userId?: string): Promise<Map<string, Float32Array>> {
    await this.initialize();
    const collectionName = await this.ensureCollection(userId);
    
    try {
      const results = await this.client.scroll(collectionName, {
      filter: {
        must: [
          {
            key: 'memory_id',
            match: { value: id },
          },
        ],
      },
      with_vector: true,
      limit: 10,  // Max 5 sectors
    });
    
      const vectors = new Map<string, Float32Array>();
      
      for (const point of results.points) {
        const sector = point.payload?.sector as string;
        const vector = point.vector as number[];
        if (sector && vector) {
          vectors.set(sector, new Float32Array(vector));
        }
      }
      
      return vectors;
    } catch (e) {
      return new Map();
    }
  }
  
  async delete(id: string, sector?: string, userId?: string): Promise<void> {
    await this.initialize();
    const collectionName = await this.ensureCollection(userId);
    
    try {
      if (sector) {
        // Delete specific sector vector
        const pointId = `${id}-${sector}`;
        await this.client.delete(collectionName, {
        wait: true,
        points: [pointId],
        });
      } else {
        // Delete all vectors for this memory
        await this.client.delete(collectionName, {
          wait: true,
          filter: {
            must: [
              {
                key: 'memory_id',
                match: { value: id },
              },
            ],
          },
        });
      }
    } catch (e) {
      console.log(`[Qdrant] Delete failed for collection '${collectionName}':`, e);
    }
  }
  
  async batchDelete(ids: string[], sector?: string, userId?: string): Promise<number> {
    await this.initialize();
    
    if (ids.length === 0) return 0;
    
    const collectionName = await this.ensureCollection(userId);
    
    try {
      if (sector) {
        const pointIds = ids.map(id => `${id}-${sector}`);
        await this.client.delete(collectionName, {
          wait: true,
          points: pointIds,
        });
        return ids.length;
      } else {
        // Delete all sectors for each ID
        for (const id of ids) {
          await this.delete(id, undefined, userId);
        }
        return ids.length * 5;  // Estimate 5 sectors per memory
      }
    } catch (e) {
      console.log(`[Qdrant] Batch delete failed for collection '${collectionName}':`, e);
      return 0;
    }
  }
  
  async getStats(): Promise<VectorStats> {
    await this.initialize();
    
    try {
      // Get all collections to aggregate stats across all namespaces
      const collections = await this.client.getCollections();
      const relevantCollections = collections.collections.filter(
        (c: any) => c.name.startsWith(this.collectionName)
      );
      
      let totalVectors = 0;
      const sectorCounts: Record<string, number> = {
        episodic: 0,
        semantic: 0,
        procedural: 0,
        emotional: 0,
        reflective: 0
      };
      let totalStorage = 0;
      
      // Aggregate stats from all namespace collections
      for (const coll of relevantCollections) {
        try {
          const info = await this.client.getCollection(coll.name);
          totalVectors += info.points_count || 0;
          totalStorage += info.segments_count || 0;
          
          // Get sector counts for this collection
          const sectors = ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'];
          for (const sector of sectors) {
            const result = await this.client.count(coll.name, {
              filter: {
                must: [
                  {
                    key: 'sector',
                    match: { value: sector },
                  },
                ],
              },
            });
            sectorCounts[sector] += result.count;
          }
        } catch (e) {
          console.log(`[Qdrant] Failed to get stats for collection '${coll.name}':`, e);
        }
      }
      
      return {
        totalVectors,
        vectorsBySector: sectorCounts,
        storageSize: totalStorage * 1024 * 1024,
        lastUpdated: Date.now(),
      };
    } catch (e) {
      console.error('[Qdrant] Failed to get stats:', e);
      return {
        totalVectors: 0,
        vectorsBySector: {},
        lastUpdated: Date.now(),
      };
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (e) {
      console.error('[Qdrant] Health check failed:', e);
      return false;
    }
  }
  
  async close(): Promise<void> {
    // Qdrant client doesn't need explicit cleanup
    this.initialized = false;
    this.initializedCollections.clear();
  }
}
