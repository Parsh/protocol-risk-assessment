/**
 * Unit Tests for Repository Layer
 * Tests file-based repository operations, locking, and error handling
 */

import * as fs from 'fs';
import * as path from 'path';
import { JsonFileRepository } from '../../src/repositories/json-file-repository';
import { ProtocolRepository, AssessmentRepository } from '../../src/repositories/index';
import { Protocol, RiskAssessment } from '../../src/models/index';
import { MockDataFactory } from '../mock-data.factory';

// Test-specific repository classes that accept custom base paths
class TestProtocolRepository extends JsonFileRepository<Protocol> {
  constructor(basePath: string) {
    super('protocols', {
      basePath,
      indexing: true,
      backup: true,
      lockTimeout: 10000,
      retryAttempts: 3,
    });
  }

  async findByBlockchain(blockchain: string): Promise<Protocol[]> {
    return this.findWhere(protocol => protocol.blockchain.toLowerCase() === blockchain.toLowerCase());
  }

  async findByContractAddress(address: string): Promise<Protocol[]> {
    return this.findWhere(protocol => 
      protocol.contractAddresses.some(addr => 
        addr.toLowerCase() === address.toLowerCase()
      )
    );
  }

  async searchByName(nameQuery: string): Promise<Protocol[]> {
    const query = nameQuery.toLowerCase();
    return this.findWhere(protocol => 
      protocol.name.toLowerCase().includes(query)
    );
  }
}

class TestAssessmentRepository extends JsonFileRepository<RiskAssessment> {
  constructor(basePath: string) {
    super('assessments', {
      basePath,
      indexing: true,
      backup: true,
      lockTimeout: 10000,
      retryAttempts: 3,
    });
  }

  async findByProtocolId(protocolId: string): Promise<RiskAssessment[]> {
    return this.findWhere(assessment => assessment.protocolId === protocolId);
  }

  async findByStatus(status: string): Promise<RiskAssessment[]> {
    return this.findWhere(assessment => assessment.status === status);
  }

  async getRecentAssessments(limit: number = 10): Promise<RiskAssessment[]> {
    const all = await this.findAll();
    return all
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getAssessmentStats(): Promise<{
    total: number;
    averageScore: number;
    byRiskLevel: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const assessments = await this.findAll();
    
    const stats = {
      total: assessments.length,
      averageScore: assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length
        : 0,
      byRiskLevel: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    for (const assessment of assessments) {
      stats.byRiskLevel[assessment.riskLevel] = (stats.byRiskLevel[assessment.riskLevel] || 0) + 1;
      stats.byStatus[assessment.status] = (stats.byStatus[assessment.status] || 0) + 1;
    }

    return stats;
  }

  async getAssessmentCountByProtocol(): Promise<Record<string, number>> {
    const assessments = await this.findAll();
    const counts: Record<string, number> = {};
    
    for (const assessment of assessments) {
      counts[assessment.protocolId] = (counts[assessment.protocolId] || 0) + 1;
    }
    
    return counts;
  }
}

describe('Repository Layer - Unit Tests', () => {
  const testDataDir = global.testUtils.testDataDir;
  let protocolRepo: TestProtocolRepository;
  let assessmentRepo: TestAssessmentRepository;

  beforeAll(async () => {
    // Ensure test data directory structure
    await global.testUtils.createTestDataStructure();
  });

  beforeEach(async () => {
    // Clean test data directory completely
    await global.testUtils.cleanTestData();
    await global.testUtils.createTestDataStructure();

    // Create fresh repository instances with test data path
    protocolRepo = new TestProtocolRepository(testDataDir);
    assessmentRepo = new TestAssessmentRepository(testDataDir);

    MockDataFactory.reset();
  });

  afterAll(async () => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Protocol Repository', () => {
    describe('Basic CRUD Operations', () => {
      it('should save and retrieve a protocol', async () => {
        const protocol = MockDataFactory.createProtocol();
        
        await protocolRepo.save(protocol.id, protocol);
        const retrieved = await protocolRepo.findById(protocol.id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(protocol.id);
        expect(retrieved!.name).toBe(protocol.name);
        expect(retrieved!.contractAddresses).toEqual(protocol.contractAddresses);
      });

      it('should return null for non-existent protocol', async () => {
        const result = await protocolRepo.findById('non-existent-id');
        expect(result).toBeNull();
      });

      it('should update existing protocol', async () => {
        const protocol = MockDataFactory.createProtocol();
        await protocolRepo.save(protocol.id, protocol);
        
        const updatedProtocol = { ...protocol, name: 'Updated Name' };
        await protocolRepo.save(protocol.id, updatedProtocol);
        
        const retrieved = await protocolRepo.findById(protocol.id);
        expect(retrieved!.name).toBe('Updated Name');
      });

      it('should delete protocol', async () => {
        const protocol = MockDataFactory.createProtocol();
        await protocolRepo.save(protocol.id, protocol);
        
        expect(await protocolRepo.exists(protocol.id)).toBe(true);
        
        await protocolRepo.delete(protocol.id);
        
        expect(await protocolRepo.exists(protocol.id)).toBe(false);
        expect(await protocolRepo.findById(protocol.id)).toBeNull();
      });

      it('should check if protocol exists', async () => {
        const protocol = MockDataFactory.createProtocol();
        
        expect(await protocolRepo.exists(protocol.id)).toBe(false);
        
        await protocolRepo.save(protocol.id, protocol);
        
        expect(await protocolRepo.exists(protocol.id)).toBe(true);
      });
    });

    describe('Protocol-specific queries', () => {
      let testProtocols: Protocol[];

      beforeEach(async () => {
        testProtocols = [
          MockDataFactory.createProtocol({ blockchain: 'ethereum', name: 'Ethereum Protocol' }),
          MockDataFactory.createProtocol({ blockchain: 'ethereum', name: 'Another Ethereum Protocol' }),
          MockDataFactory.createProtocol({ blockchain: 'bsc', name: 'BSC Protocol' }),
        ];

        for (const protocol of testProtocols) {
          await protocolRepo.save(protocol.id, protocol);
        }
      });

      it('should find protocols by blockchain', async () => {
        const ethereumProtocols = await protocolRepo.findByBlockchain('ethereum');
        expect(ethereumProtocols).toHaveLength(2);
        expect(ethereumProtocols.every(p => p.blockchain === 'ethereum')).toBe(true);

        const bscProtocols = await protocolRepo.findByBlockchain('bsc');
        expect(bscProtocols).toHaveLength(1);
        expect(bscProtocols[0]!.blockchain).toBe('bsc');
      });

      it('should find protocols by contract address', async () => {
        const targetAddress = testProtocols[0]!.contractAddresses[0]!;
        const results = await protocolRepo.findByContractAddress(targetAddress);
        
        expect(results).toHaveLength(1);
        expect(results[0]!.id).toBe(testProtocols[0]!.id);
      });

      it('should search protocols by name', async () => {
        const results = await protocolRepo.searchByName('ethereum');
        expect(results).toHaveLength(2);
        expect(results.every(p => p.name.toLowerCase().includes('ethereum'))).toBe(true);
      });

      it('should handle case-insensitive searches', async () => {
        const results = await protocolRepo.searchByName('ETHEREUM');
        expect(results).toHaveLength(2);
      });

      it('should return empty array for non-matching searches', async () => {
        const results = await protocolRepo.searchByName('nonexistent');
        expect(results).toHaveLength(0);

        const blockchainResults = await protocolRepo.findByBlockchain('unknown');
        expect(blockchainResults).toHaveLength(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid IDs gracefully', async () => {
        await expect(protocolRepo.findById('')).resolves.toBeNull();
        await expect(protocolRepo.exists('')).resolves.toBe(false);
      });
    });
  });

  describe('Assessment Repository', () => {
    describe('Basic CRUD Operations', () => {
      it('should save and retrieve an assessment', async () => {
        const assessment = MockDataFactory.createRiskAssessment();
        
        await assessmentRepo.save(assessment.id, assessment);
        const retrieved = await assessmentRepo.findById(assessment.id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(assessment.id);
        expect(retrieved!.protocolId).toBe(assessment.protocolId);
        expect(retrieved!.overallScore).toBe(assessment.overallScore);
      });

      it('should find assessments by protocol ID', async () => {
        const protocolId = 'test-protocol-id';
        const assessments = [
          MockDataFactory.createRiskAssessment(protocolId, { id: 'assessment-1' }),
          MockDataFactory.createRiskAssessment(protocolId, { id: 'assessment-2' }),
          MockDataFactory.createRiskAssessment('other-protocol-id', { id: 'assessment-3' })
        ];

        for (const assessment of assessments) {
          await assessmentRepo.save(assessment.id, assessment);
        }

        const protocolAssessments = await assessmentRepo.findByProtocolId(protocolId);
        expect(protocolAssessments).toHaveLength(2);
        expect(protocolAssessments.every(a => a.protocolId === protocolId)).toBe(true);
      });

      it('should find assessments by status', async () => {
        const assessments = [
          MockDataFactory.createRiskAssessment(undefined, { status: 'COMPLETED' as any }),
          MockDataFactory.createRiskAssessment(undefined, { status: 'COMPLETED' as any }),
          MockDataFactory.createRiskAssessment(undefined, { status: 'PENDING' as any })
        ];

        for (const assessment of assessments) {
          await assessmentRepo.save(assessment.id, assessment);
        }

        const completedAssessments = await assessmentRepo.findByStatus('COMPLETED' as any);
        expect(completedAssessments).toHaveLength(2);
        expect(completedAssessments.every(a => a.status === 'COMPLETED')).toBe(true);
      });

      it('should get recent assessments', async () => {
        const now = new Date();
        const assessments = [
          MockDataFactory.createRiskAssessment(undefined, { 
            createdAt: new Date(now.getTime() - 86400000) // 1 day ago
          }),
          MockDataFactory.createRiskAssessment(undefined, { 
            createdAt: new Date(now.getTime() - 3600000) // 1 hour ago
          }),
          MockDataFactory.createRiskAssessment(undefined, { 
            createdAt: now
          })
        ];

        for (const assessment of assessments) {
          await assessmentRepo.save(assessment.id, assessment);
        }

        const recentAssessments = await assessmentRepo.getRecentAssessments(2);
        expect(recentAssessments).toHaveLength(2);
        
        // Should be sorted by creation date, newest first
        expect(recentAssessments[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
          recentAssessments[1]!.createdAt.getTime()
        );
      });
    });

    describe('Statistics and Aggregation', () => {
      beforeEach(async () => {
        const assessments = [
          MockDataFactory.createRiskAssessment('protocol-1', { overallScore: 80, id: 'stats-assessment-1' }),
          MockDataFactory.createRiskAssessment('protocol-1', { overallScore: 90, id: 'stats-assessment-2' }),
          MockDataFactory.createRiskAssessment('protocol-2', { overallScore: 60, id: 'stats-assessment-3' }),
          MockDataFactory.createRiskAssessment('protocol-2', { overallScore: 70, id: 'stats-assessment-4' })
        ];

        for (const assessment of assessments) {
          await assessmentRepo.save(assessment.id, assessment);
        }
      });

      it('should get assessment statistics', async () => {
        const stats = await assessmentRepo.getAssessmentStats();
        
        expect(stats.total).toBe(4);
        expect(stats.averageScore).toBe(75); // (80+90+60+70)/4
        expect(stats.byRiskLevel).toBeDefined();
      });

      it('should get assessment count by protocol', async () => {
        const counts = await assessmentRepo.getAssessmentCountByProtocol();
        
        expect(counts['protocol-1']).toBe(2);
        expect(counts['protocol-2']).toBe(2);
      });
    });
  });

  describe('Generic File Repository', () => {
    interface TestEntity {
      id: string;
      name: string;
      value: number;
      createdAt: Date;
      updatedAt: Date;
    }

    let genericRepo: JsonFileRepository<TestEntity>;

    beforeEach(() => {
      genericRepo = new JsonFileRepository<TestEntity>('test-entities', {
        basePath: testDataDir,
        indexing: true,
        backup: false, // Disable backup for faster tests
        lockTimeout: 5000,
        retryAttempts: 2
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle concurrent saves without corruption', async () => {
        const entities: TestEntity[] = Array.from({ length: 10 }, (_, i) => ({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          value: i,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        // Save all entities concurrently
        const savePromises = entities.map(entity => 
          genericRepo.save(entity.id, entity)
        );

        await Promise.all(savePromises);

        // Verify all entities were saved correctly
        const allEntities = await genericRepo.findAll();
        expect(allEntities).toHaveLength(10);
        
        for (const entity of entities) {
          const retrieved = await genericRepo.findById(entity.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.name).toBe(entity.name);
          expect(retrieved!.value).toBe(entity.value);
        }
      });

      it('should handle concurrent reads correctly', async () => {
        const entity: TestEntity = {
          id: 'test-entity',
          name: 'Test Entity',
          value: 42,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await genericRepo.save(entity.id, entity);

        // Perform multiple concurrent reads
        const readPromises = Array.from({ length: 20 }, () => 
          genericRepo.findById(entity.id)
        );

        const results = await Promise.all(readPromises);

        // All reads should return the same entity
        expect(results.every(result => result !== null)).toBe(true);
        expect(results.every(result => result!.id === entity.id)).toBe(true);
        expect(results.every(result => result!.value === entity.value)).toBe(true);
      });

      it('should handle mixed concurrent operations', async () => {
        const initialEntity: TestEntity = {
          id: 'mixed-test',
          name: 'Initial',
          value: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await genericRepo.save(initialEntity.id, initialEntity);

        // Mix of reads, updates, and existence checks
        const operations = [
          ...Array.from({ length: 5 }, () => genericRepo.findById(initialEntity.id)),
          ...Array.from({ length: 3 }, (_, i) => 
            genericRepo.save(initialEntity.id, { ...initialEntity, value: i + 1 })
          ),
          ...Array.from({ length: 5 }, () => genericRepo.exists(initialEntity.id))
        ];

        const results = await Promise.all(operations);
        
        // Should complete without errors
        expect(results).toHaveLength(13);
        
        // Final entity should exist
        const finalEntity = await genericRepo.findById(initialEntity.id);
        expect(finalEntity).not.toBeNull();
        expect(finalEntity!.value).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Performance', () => {
      // TODO: Re-enable this test with proper performance tuning
      // it('should handle bulk operations efficiently', async () => {
      //   const entityCount = 100;
      //   const entities: TestEntity[] = Array.from({ length: entityCount }, (_, i) => ({
      //     id: `bulk-entity-${i}`,
      //     name: `Bulk Entity ${i}`,
      //     value: i,
      //     createdAt: new Date(),
      //     updatedAt: new Date()
      //   }));

      //   const startTime = Date.now();

      //   // Save all entities
      //   for (const entity of entities) {
      //     await genericRepo.save(entity.id, entity);
      //     // Small delay to prevent concurrent issues during bulk operations
      //     await new Promise(resolve => setTimeout(resolve, 1));
      //   }

      //   const saveTime = Date.now() - startTime;

      //   // Read all entities
      //   const readStartTime = Date.now();
      //   const allEntities = await genericRepo.findAll();
      //   const readTime = Date.now() - readStartTime;

      //   expect(allEntities).toHaveLength(entityCount);
      //   expect(saveTime).toBeLessThan(10000); // Should complete within 10 seconds
      //   expect(readTime).toBeLessThan(5000); // Should read within 5 seconds
      // });
    });

    describe('Data Persistence', () => {
      it('should persist data between repository instances', async () => {
        const entity: TestEntity = {
          id: 'persistent-entity',
          name: 'Persistent Entity',
          value: 123,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await genericRepo.save(entity.id, entity);

        // Create new repository instance
        const newRepo = new JsonFileRepository<TestEntity>('test-entities', {
          basePath: testDataDir,
          indexing: true,
          backup: false
        });

        const retrieved = await newRepo.findById(entity.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.name).toBe(entity.name);
        expect(retrieved!.value).toBe(entity.value);
      });

      it('should handle repository restarts gracefully', async () => {
        const entities: TestEntity[] = Array.from({ length: 5 }, (_, i) => ({
          id: `restart-entity-${i}`,
          name: `Restart Entity ${i}`,
          value: i * 10,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        // Save entities
        for (const entity of entities) {
          await genericRepo.save(entity.id, entity);
        }

        // Simulate restart by creating new repository instance
        const restartedRepo = new JsonFileRepository<TestEntity>('test-entities', {
          basePath: testDataDir,
          indexing: true,
          backup: false
        });

        // All entities should still be accessible
        const allEntities = await restartedRepo.findAll();
        expect(allEntities).toHaveLength(5);

        for (const originalEntity of entities) {
          const retrieved = await restartedRepo.findById(originalEntity.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.value).toBe(originalEntity.value);
        }
      });
    });
  });
});
