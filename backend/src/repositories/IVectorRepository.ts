/**
 * Universal interface for vector storage operations
 * All vector database backends must implement this interface
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  vector?: Float32Array;  // Optional: only if with_vectors=true
  payload?: Record<string, any>;
}

export interface VectorInsertOptions {
  id: string;
  sector: string;
  userId: string;
  vector: Float32Array;
  payload?: Record<string, any>;
}

export interface VectorSearchOptions {
  vector: Float32Array;
  sector?: string;
  userId?: string;
  limit?: number;
  scoreThreshold?: number;
  filters?: Record<string, any>;
  withVectors?: boolean;
}

export interface VectorBatchOperation {
  operation: 'insert' | 'update' | 'delete';
  data: VectorInsertOptions | string;
}

export interface VectorStats {
  totalVectors: number;
  vectorsBySector: Record<string, number>;
  storageSize?: number;
  lastUpdated: number;
}

/**
 * IVectorRepository - Core abstraction for all vector operations
 */
export interface IVectorRepository {
  /**
   * Initialize the repository (create collections, indices, etc.)
   */
  initialize(): Promise<void>;
  
  /**
   * Insert or update a single vector
   */
  upsert(options: VectorInsertOptions): Promise<void>;
  
  /**
   * Insert or update multiple vectors in a batch
   * @returns Number of vectors successfully upserted
   */
  batchUpsert(vectors: VectorInsertOptions[]): Promise<number>;
  
  /**
   * Search for similar vectors
   */
  search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * Get a specific vector by ID and sector
   * @param userId - Namespace identifier for data isolation
   */
  getVector(id: string, sector: string, userId?: string): Promise<Float32Array | null>;
  
  /**
   * Get all vectors for a memory ID across all sectors
   * @param userId - Namespace identifier for data isolation
   */
  getVectorsBySector(id: string, userId?: string): Promise<Map<string, Float32Array>>;
  
  /**
   * Delete vector(s)
   * If sector is provided, delete only that sector's vector
   * Otherwise, delete all vectors for the ID
   * @param userId - Namespace identifier for data isolation
   */
  delete(id: string, sector?: string, userId?: string): Promise<void>;
  
  /**
   * Batch delete operations
   * @param userId - Namespace identifier for data isolation
   */
  batchDelete(ids: string[], sector?: string, userId?: string): Promise<number>;
  
  /**
   * Get repository statistics
   */
  getStats(): Promise<VectorStats>;
  
  /**
   * Check if repository is healthy and accessible
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Close connections and cleanup resources
   */
  close(): Promise<void>;
}
