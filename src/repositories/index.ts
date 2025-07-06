import { JsonFileRepository } from './json-file-repository';
import { Protocol, RiskAssessment } from '../models';
import { config } from '../config/environment';
import { logger } from '../middleware/logging';

/**
 * Repository factory for creating typed repositories
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private repositories: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  /**
   * Get or create a repository for a specific entity type
   */
  getRepository<T>(entityName: string, entityType: new() => T): JsonFileRepository<T & { id: string; createdAt: Date; updatedAt: Date }> {
    if (!this.repositories.has(entityName)) {
      const repository = new JsonFileRepository<T & { id: string; createdAt: Date; updatedAt: Date }>(
        entityName,
        {
          basePath: config.dataDir,
          indexing: true,
          backup: true,
          lockTimeout: 10000,
          retryAttempts: 3,
        }
      );
      
      this.repositories.set(entityName, repository);
      logger.info(`Created repository for entity: ${entityName}`);
    }
    
    return this.repositories.get(entityName);
  }
}

/**
 * Typed repository for Protocol entities
 */
export class ProtocolRepository extends JsonFileRepository<Protocol> {
  constructor() {
    super('protocols', {
      basePath: config.dataDir,
      indexing: true,
      backup: true,
      lockTimeout: 10000,
      retryAttempts: 3,
    });
  }

  /**
   * Find protocols by blockchain
   */
  async findByBlockchain(blockchain: string): Promise<Protocol[]> {
    return this.findWhere(protocol => protocol.blockchain.toLowerCase() === blockchain.toLowerCase());
  }

  /**
   * Find protocols by contract address
   */
  async findByContractAddress(address: string): Promise<Protocol[]> {
    return this.findWhere(protocol => 
      protocol.contractAddresses.some(addr => 
        addr.toLowerCase() === address.toLowerCase()
      )
    );
  }

  /**
   * Search protocols by name (case-insensitive)
   */
  async searchByName(nameQuery: string): Promise<Protocol[]> {
    const query = nameQuery.toLowerCase();
    return this.findWhere(protocol => 
      protocol.name.toLowerCase().includes(query)
    );
  }
}

/**
 * Typed repository for RiskAssessment entities
 */
export class AssessmentRepository extends JsonFileRepository<RiskAssessment> {
  constructor() {
    super('assessments', {
      basePath: config.dataDir,
      indexing: true,
      backup: true,
      lockTimeout: 10000,
      retryAttempts: 3,
    });
  }

  /**
   * Find assessments by protocol ID
   */
  async findByProtocolId(protocolId: string): Promise<RiskAssessment[]> {
    return this.findWhere(assessment => assessment.protocolId === protocolId);
  }

  /**
   * Find assessments by status
   */
  async findByStatus(status: string): Promise<RiskAssessment[]> {
    return this.findWhere(assessment => assessment.status === status);
  }

  /**
   * Find assessments by risk level
   */
  async findByRiskLevel(riskLevel: string): Promise<RiskAssessment[]> {
    return this.findWhere(assessment => assessment.riskLevel === riskLevel);
  }

  /**
   * Get latest assessment for a protocol
   */
  async getLatestForProtocol(protocolId: string): Promise<RiskAssessment | null> {
    const assessments = await this.findByProtocolId(protocolId);
    
    if (assessments.length === 0) {
      return null;
    }
    
    // Sort by creation date (newest first) and return the first one
    const sorted = assessments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return sorted[0] || null;
  }

  /**
   * Get assessment statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byRiskLevel: Record<string, number>;
    averageScore: number;
  }> {
    const assessments = await this.findAll();
    
    const stats = {
      total: assessments.length,
      byStatus: {} as Record<string, number>,
      byRiskLevel: {} as Record<string, number>,
      averageScore: 0,
    };

    if (assessments.length === 0) {
      return stats;
    }

    let totalScore = 0;
    
    for (const assessment of assessments) {
      // Count by status
      stats.byStatus[assessment.status] = (stats.byStatus[assessment.status] || 0) + 1;
      
      // Count by risk level
      stats.byRiskLevel[assessment.riskLevel] = (stats.byRiskLevel[assessment.riskLevel] || 0) + 1;
      
      // Sum scores for average
      totalScore += assessment.overallScore;
    }
    
    stats.averageScore = Math.round((totalScore / assessments.length) * 100) / 100;
    
    return stats;
  }
}

// Repository instances
export const protocolRepository = new ProtocolRepository();
export const assessmentRepository = new AssessmentRepository();
