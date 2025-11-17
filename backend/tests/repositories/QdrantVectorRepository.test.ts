import { QdrantVectorRepository } from '../../src/repositories/QdrantVectorRepository';
import { VectorInsertOptions } from '../../src/repositories/IVectorRepository';

/**
 * Unit tests for QdrantVectorRepository
 * 
 * Prerequisites:
 * - Qdrant server running on http://localhost:6333
 * - Or use Qdrant in-memory mode for testing
 * 
 * Run with: npm test
 */

describe('QdrantVectorRepository', () => {
  let repo: QdrantVectorRepository;
  const testCollection = 'test_openmemory_vectors';
  const testUrl = process.env.QDRANT_TEST_URL || 'http://localhost:6333';

  beforeAll(async () => {
    repo = new QdrantVectorRepository(testUrl, undefined, testCollection, 256);
    await repo.initialize();
  });

  afterAll(async () => {
    // Cleanup: delete test collection
    try {
      await repo.close();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clear collection data before each test
    try {
      await repo.close();
      repo = new QdrantVectorRepository(testUrl, undefined, testCollection, 256);
      await repo.initialize();
    } catch (e) {
      console.warn('Could not reset collection:', e);
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const result = await repo.healthCheck();
      expect(result).toBe(true);
    });

    it('should create collection with correct configuration', async () => {
      // Collection should exist after initialization
      const stats = await repo.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalVectors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('upsert operations', () => {
    it('should insert a single vector', async () => {
      const vector = new Float32Array(256).map(() => Math.random());
      const options: VectorInsertOptions = {
        id: 'test-memory-1',
        sector: 'semantic',
        userId: 'test-user',
        vector,
        payload: { test: 'data' },
      };

      await repo.upsert(options);

      // Verify insertion
      const retrieved = await repo.getVector('test-memory-1', 'semantic');
      expect(retrieved).toBeDefined();
      expect(retrieved?.length).toBe(256);
    });

    it('should update existing vector', async () => {
      const vector1 = new Float32Array(256).fill(0.5);
      const vector2 = new Float32Array(256).fill(0.8);

      const options1: VectorInsertOptions = {
        id: 'test-memory-2',
        sector: 'semantic',
        userId: 'test-user',
        vector: vector1,
      };

      const options2: VectorInsertOptions = {
        id: 'test-memory-2',
        sector: 'semantic',
        userId: 'test-user',
        vector: vector2,
      };

      await repo.upsert(options1);
      await repo.upsert(options2);

      const retrieved = await repo.getVector('test-memory-2', 'semantic');
      expect(retrieved).toBeDefined();
      // Vector should be updated to vector2 values
      expect(retrieved![0]).toBeCloseTo(0.8, 5);
    });

    it('should handle batch upsert', async () => {
      const vectors: VectorInsertOptions[] = [];
      for (let i = 0; i < 10; i++) {
        vectors.push({
          id: `batch-test-${i}`,
          sector: 'semantic',
          userId: 'test-user',
          vector: new Float32Array(256).map(() => Math.random()),
        });
      }

      const count = await repo.batchUpsert(vectors);
      expect(count).toBe(10);

      const stats = await repo.getStats();
      expect(stats.totalVectors).toBeGreaterThanOrEqual(10);
    });
  });

  describe('search operations', () => {
    beforeEach(async () => {
      // Insert test vectors
      const testVectors: VectorInsertOptions[] = [
        {
          id: 'search-test-1',
          sector: 'semantic',
          userId: 'user1',
          vector: new Float32Array(256).fill(0.5),
        },
        {
          id: 'search-test-2',
          sector: 'semantic',
          userId: 'user1',
          vector: new Float32Array(256).fill(0.6),
        },
        {
          id: 'search-test-3',
          sector: 'episodic',
          userId: 'user2',
          vector: new Float32Array(256).fill(0.7),
        },
      ];

      await repo.batchUpsert(testVectors);
      // Small delay to ensure indexing
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should perform similarity search', async () => {
      const queryVector = new Float32Array(256).fill(0.55);
      const results = await repo.search({
        vector: queryVector,
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBeDefined();
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should filter by sector', async () => {
      const queryVector = new Float32Array(256).fill(0.5);
      const results = await repo.search({
        vector: queryVector,
        sector: 'semantic',
        limit: 10,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(r => {
        expect(r.payload?.sector).toBe('semantic');
      });
    });

    it('should filter by userId', async () => {
      const queryVector = new Float32Array(256).fill(0.5);
      const results = await repo.search({
        vector: queryVector,
        userId: 'user1',
        limit: 10,
      });

      expect(results.length).toBe(2);
      results.forEach(r => {
        expect(r.payload?.user_id).toBe('user1');
      });
    });

    it('should respect limit parameter', async () => {
      const queryVector = new Float32Array(256).fill(0.5);
      const results = await repo.search({
        vector: queryVector,
        limit: 1,
      });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return vectors when requested', async () => {
      const queryVector = new Float32Array(256).fill(0.5);
      const results = await repo.search({
        vector: queryVector,
        limit: 1,
        withVectors: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].vector).toBeDefined();
      expect(results[0].vector?.length).toBe(256);
    });
  });

  describe('retrieval operations', () => {
    beforeEach(async () => {
      const testVector: VectorInsertOptions = {
        id: 'retrieve-test',
        sector: 'semantic',
        userId: 'test-user',
        vector: new Float32Array(256).map((_, i) => i / 256),
      };
      await repo.upsert(testVector);
    });

    it('should retrieve vector by id and sector', async () => {
      const vector = await repo.getVector('retrieve-test', 'semantic');
      expect(vector).toBeDefined();
      expect(vector?.length).toBe(256);
      expect(vector![0]).toBeCloseTo(0, 5);
      expect(vector![255]).toBeCloseTo(255 / 256, 5);
    });

    it('should return null for non-existent vector', async () => {
      const vector = await repo.getVector('non-existent', 'semantic');
      expect(vector).toBeNull();
    });

    it('should get vectors by sector', async () => {
      // Insert multiple sectors for same memory
      await repo.upsert({
        id: 'multi-sector',
        sector: 'semantic',
        userId: 'test-user',
        vector: new Float32Array(256).fill(0.5),
      });
      await repo.upsert({
        id: 'multi-sector',
        sector: 'episodic',
        userId: 'test-user',
        vector: new Float32Array(256).fill(0.6),
      });

      const vectors = await repo.getVectorsBySector('multi-sector');
      expect(vectors.size).toBe(2);
      expect(vectors.has('semantic')).toBe(true);
      expect(vectors.has('episodic')).toBe(true);
    });
  });

  describe('delete operations', () => {
    beforeEach(async () => {
      await repo.upsert({
        id: 'delete-test',
        sector: 'semantic',
        userId: 'test-user',
        vector: new Float32Array(256).fill(0.5),
      });
    });

    it('should delete single sector vector', async () => {
      await repo.delete('delete-test', 'semantic');
      const vector = await repo.getVector('delete-test', 'semantic');
      expect(vector).toBeNull();
    });

    it('should delete all sector vectors', async () => {
      await repo.upsert({
        id: 'delete-all-test',
        sector: 'semantic',
        userId: 'test-user',
        vector: new Float32Array(256).fill(0.5),
      });
      await repo.upsert({
        id: 'delete-all-test',
        sector: 'episodic',
        userId: 'test-user',
        vector: new Float32Array(256).fill(0.6),
      });

      await repo.delete('delete-all-test');

      const semantic = await repo.getVector('delete-all-test', 'semantic');
      const episodic = await repo.getVector('delete-all-test', 'episodic');
      expect(semantic).toBeNull();
      expect(episodic).toBeNull();
    });

    it('should handle batch delete', async () => {
      // Insert multiple vectors
      await repo.batchUpsert([
        {
          id: 'batch-delete-1',
          sector: 'semantic',
          userId: 'test-user',
          vector: new Float32Array(256).fill(0.5),
        },
        {
          id: 'batch-delete-2',
          sector: 'semantic',
          userId: 'test-user',
          vector: new Float32Array(256).fill(0.6),
        },
      ]);

      const count = await repo.batchDelete(['batch-delete-1', 'batch-delete-2'], 'semantic');
      expect(count).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should return repository stats', async () => {
      // Insert some test data
      await repo.batchUpsert([
        {
          id: 'stats-test-1',
          sector: 'semantic',
          userId: 'test-user',
          vector: new Float32Array(256).fill(0.5),
        },
        {
          id: 'stats-test-2',
          sector: 'episodic',
          userId: 'test-user',
          vector: new Float32Array(256).fill(0.6),
        },
      ]);

      const stats = await repo.getStats();
      expect(stats.totalVectors).toBeGreaterThanOrEqual(2);
      expect(stats.vectorsBySector).toBeDefined();
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const healthy = await repo.healthCheck();
      expect(healthy).toBe(true);
    });
  });
});
