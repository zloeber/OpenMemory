import { IVectorRepository } from './IVectorRepository';
import { QdrantVectorRepository } from './QdrantVectorRepository';
import { SQLiteVectorRepository } from './SQLiteVectorRepository';
import { env } from '../core/cfg';

export class VectorRepositoryFactory {
  private static instance: IVectorRepository | null = null;
  
  /**
   * Get singleton instance of configured vector repository
   */
  static async getInstance(): Promise<IVectorRepository> {
    if (this.instance) return this.instance;
    
    const backend = env.vector_backend.toLowerCase();
    
    switch (backend) {
      case 'qdrant':
        console.log('[VectorRepo] Initializing Qdrant repository');
        this.instance = new QdrantVectorRepository(
          env.qdrant_url,
          env.qdrant_api_key,
          env.qdrant_collection,
          env.vec_dim
        );
        break;
        
      case 'sqlite':
      default:
        console.log('[VectorRepo] Initializing SQLite repository');
        this.instance = new SQLiteVectorRepository();
        break;
    }
    
    await this.instance.initialize();
    return this.instance;
  }
  
  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
  
  /**
   * Create a new instance (bypass singleton)
   */
  static async create(backend: string): Promise<IVectorRepository> {
    let repo: IVectorRepository;
    
    switch (backend.toLowerCase()) {
      case 'qdrant':
        repo = new QdrantVectorRepository(
          env.qdrant_url,
          env.qdrant_api_key,
          env.qdrant_collection,
          env.vec_dim
        );
        break;
      case 'sqlite':
        repo = new SQLiteVectorRepository();
        break;
      default:
        throw new Error(`Unknown vector backend: ${backend}`);
    }
    
    await repo.initialize();
    return repo;
  }
}
