/**
 * Assessment Orchestrator Service
 * Manages the complete workflow of risk assessments
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  RiskAssessment, 
  Protocol, 
  AssessmentStatus, 
  RiskLevel, 
  CategoryScores,
  ProtocolCategory,
  AnalysisDepth,
  AssessmentPriority,
  Finding,
  FindingCategory,
  FindingSeverity,
  AssessmentMetadata
} from '../models/index';
import { AssessmentRepository, ProtocolRepository } from '../repositories/index';
import { logger } from '../config/logger';
import { RiskScoringEngine, ScoringInput } from './risk-scoring-engine';
import { UnifiedBlockchainClient, createUnifiedBlockchainClient } from './unified-blockchain-client';

export interface AssessmentRequest {
  protocolId?: string;
  protocol?: {
    name: string;
    contractAddresses: string[];
    blockchain: string;
    tokenSymbol?: string;
    website?: string;
    documentation?: string;
    category?: ProtocolCategory;
    tags?: string[];
  };
  priority?: AssessmentPriority;
  analysisDepth?: AnalysisDepth;
}

export interface AssessmentResponse {
  assessmentId: string;
  status: AssessmentStatus;
  estimatedCompletionTime: number; // seconds
  message: string;
  protocolId?: string;
}

export interface AssessmentProgress {
  assessmentId: string;
  status: AssessmentStatus;
  progress: number; // 0-100
  currentStage?: string;
  startedAt: Date;
  estimatedCompletionAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Assessment Orchestrator - Coordinates the entire risk assessment process
 */
export class AssessmentOrchestrator {
  private protocolRepo: ProtocolRepository;
  private assessmentRepo: AssessmentRepository;
  private riskScoringEngine: RiskScoringEngine;
  private blockchainClient: UnifiedBlockchainClient;
  private activeAssessments: Map<string, AssessmentProgress> = new Map();

  constructor() {
    this.protocolRepo = new ProtocolRepository();
    this.assessmentRepo = new AssessmentRepository();
    this.riskScoringEngine = new RiskScoringEngine();
    
    // Initialize blockchain client with default configuration
    // In production, this would be configured with proper API keys
    this.blockchainClient = createUnifiedBlockchainClient({
      ethereum: { network: 'mainnet' },
      bsc: { network: 'mainnet' },
      polygon: { network: 'mainnet' },
      rateLimit: {
        requestsPerSecond: 3, // Conservative rate limiting
        burstSize: 5
      }
    });
  }

  /**
   * Initiate a new risk assessment
   */
  async initiateAssessment(request: AssessmentRequest): Promise<AssessmentResponse> {
    const assessmentId = this.generateAssessmentId();
    const startTime = new Date();

    try {
      logger.info('Initiating new assessment', { assessmentId, request });

      // Step 1: Validate and get/create protocol
      const protocol = await this.getOrCreateProtocol(request);
      
      // Step 2: Check for recent assessments to avoid duplicates
      await this.checkForRecentAssessments(protocol.id);

      // Step 3: Create initial assessment record
      const assessment = await this.createInitialAssessment(assessmentId, protocol.id, request);

      // Step 4: Initialize progress tracking
      const progress: AssessmentProgress = {
        assessmentId,
        status: AssessmentStatus.PENDING,
        progress: 0,
        currentStage: 'Initialization',
        startedAt: startTime,
        estimatedCompletionAt: new Date(startTime.getTime() + this.getEstimatedDuration(request.analysisDepth))
      };

      this.activeAssessments.set(assessmentId, progress);

      // Step 5: Start assessment process asynchronously
      this.processAssessment(assessmentId, protocol, request).catch(error => {
        logger.error('Assessment processing failed', { assessmentId, error });
        this.handleAssessmentError(assessmentId, error);
      });

      const response: AssessmentResponse = {
        assessmentId,
        status: AssessmentStatus.PENDING,
        estimatedCompletionTime: this.getEstimatedDuration(request.analysisDepth),
        message: 'Assessment initiated successfully',
        protocolId: protocol.id
      };

      logger.info('Assessment initiated successfully', { assessmentId, protocolId: protocol.id });
      return response;

    } catch (error) {
      logger.error('Failed to initiate assessment', { assessmentId, error });
      throw error;
    }
  }

  /**
   * Get current status of an assessment
   */
  async getAssessmentStatus(assessmentId: string): Promise<AssessmentProgress> {
    // Check if assessment is currently active
    const activeProgress = this.activeAssessments.get(assessmentId);
    if (activeProgress) {
      return activeProgress;
    }

    // Check if assessment is completed (in database)
    const assessment = await this.assessmentRepo.findById(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    // Return status from completed assessment
    const result: AssessmentProgress = {
      assessmentId,
      status: assessment.status,
      progress: assessment.status === AssessmentStatus.COMPLETED ? 100 : 0,
      currentStage: assessment.status === AssessmentStatus.COMPLETED ? 'Completed' : 'Unknown',
      startedAt: assessment.createdAt
    };

    if (assessment.completedAt) {
      result.completedAt = assessment.completedAt;
    }

    if (assessment.status === AssessmentStatus.FAILED) {
      result.error = 'Assessment failed';
    }

    return result;
  }

  /**
   * Get completed assessment result
   */
  async getAssessmentResult(assessmentId: string): Promise<RiskAssessment> {
    const assessment = await this.assessmentRepo.findById(assessmentId);
    
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.status !== AssessmentStatus.COMPLETED) {
      throw new Error(`Assessment not completed. Current status: ${assessment.status}`);
    }

    return assessment;
  }

  /**
   * Get all assessments with optional filtering
   */
  async getAssessments(options?: {
    status?: AssessmentStatus;
    protocolId?: string;
    limit?: number;
    offset?: number;
  }): Promise<RiskAssessment[]> {
    let assessments = await this.assessmentRepo.findAll();

    // Apply filters
    if (options?.status) {
      assessments = assessments.filter(a => a.status === options.status);
    }

    if (options?.protocolId) {
      assessments = assessments.filter(a => a.protocolId === options.protocolId);
    }

    // Sort by creation date (newest first)
    assessments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    
    return assessments.slice(offset, offset + limit);
  }

  /**
   * Cancel an active assessment
   */
  async cancelAssessment(assessmentId: string): Promise<void> {
    const progress = this.activeAssessments.get(assessmentId);
    
    if (!progress) {
      throw new Error(`Assessment not found or not active: ${assessmentId}`);
    }

    if (progress.status === AssessmentStatus.COMPLETED) {
      throw new Error(`Cannot cancel completed assessment: ${assessmentId}`);
    }

    // Update progress to cancelled
    progress.status = AssessmentStatus.FAILED;
    progress.progress = 0;
    progress.currentStage = 'Cancelled';
    progress.error = 'Assessment cancelled by user';
    progress.completedAt = new Date();

    // Update database record
    const assessment = await this.assessmentRepo.findById(assessmentId);
    if (assessment) {
      assessment.status = AssessmentStatus.FAILED;
      assessment.completedAt = new Date();
      await this.assessmentRepo.save(assessmentId, assessment);
    }

    // Remove from active assessments
    this.activeAssessments.delete(assessmentId);

    logger.info('Assessment cancelled', { assessmentId });
  }

  /**
   * Generate unique assessment ID
   */
  private generateAssessmentId(): string {
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0]; // First part of UUID
    return `assessment-${timestamp}-${uuid}`;
  }

  /**
   * Get or create protocol from request
   */
  private async getOrCreateProtocol(request: AssessmentRequest): Promise<Protocol> {
    if (request.protocolId) {
      // Use existing protocol
      const protocol = await this.protocolRepo.findById(request.protocolId);
      if (!protocol) {
        throw new Error(`Protocol not found: ${request.protocolId}`);
      }
      return protocol;
    }

    if (!request.protocol) {
      throw new Error('Either protocolId or protocol data must be provided');
    }

    // Create new protocol
    const protocolData = request.protocol;
    
    // Validate required fields
    if (!protocolData.contractAddresses || protocolData.contractAddresses.length === 0) {
      throw new Error('At least one contract address is required');
    }
    
    const primaryAddress = protocolData.contractAddresses[0];
    if (!primaryAddress) {
      throw new Error('Primary contract address cannot be empty');
    }
    
    const protocolId = this.generateProtocolId(protocolData.name, primaryAddress);
    
    const protocol: Protocol = {
      id: protocolId,
      name: protocolData.name,
      contractAddresses: protocolData.contractAddresses,
      blockchain: protocolData.blockchain,
      ...(protocolData.tokenSymbol && { tokenSymbol: protocolData.tokenSymbol }),
      ...(protocolData.website && { website: protocolData.website }),
      ...(protocolData.documentation && { documentation: protocolData.documentation }),
      category: protocolData.category || ProtocolCategory.OTHER,
      tags: protocolData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.protocolRepo.save(protocolId, protocol);
    logger.info('Created new protocol', { protocolId, name: protocol.name });

    return protocol;
  }

  /**
   * Generate protocol ID from name and contract address
   */
  private generateProtocolId(name: string, contractAddress: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const addressSuffix = contractAddress.slice(-8); // Last 8 chars of address
    const timestamp = Date.now().toString(36); // Base36 timestamp
    return `${cleanName}-${addressSuffix}-${timestamp}`;
  }

  /**
   * Check for recent assessments to avoid duplicates
   */
  private async checkForRecentAssessments(protocolId: string): Promise<void> {
    const recentAssessments = await this.assessmentRepo.findByProtocolId(protocolId);
    
    // Check for assessments in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCompleted = recentAssessments.filter(a => 
      a.status === AssessmentStatus.COMPLETED && 
      a.createdAt > oneDayAgo
    );

    if (recentCompleted.length > 0) {
      logger.warn('Recent assessment found for protocol', { protocolId, recentAssessments: recentCompleted.length });
      // Note: Not throwing error, just logging warning. Duplicate assessments allowed for now.
    }
  }

  /**
   * Create initial assessment record
   */
  private async createInitialAssessment(
    assessmentId: string, 
    protocolId: string, 
    request: AssessmentRequest
  ): Promise<RiskAssessment> {
    const now = new Date();
    
    const metadata: AssessmentMetadata = {
      analysisVersion: '1.0.0',
      analysisDepth: request.analysisDepth || AnalysisDepth.STANDARD,
      executionTime: 0,
      dataSourcesUsed: [],
      warnings: []
    };
    
    const assessment: RiskAssessment = {
      id: assessmentId,
      protocolId,
      status: AssessmentStatus.PENDING,
      overallScore: 0,
      riskLevel: RiskLevel.MEDIUM, // Default until calculation
      categoryScores: {
        technical: 0,
        governance: 0,
        liquidity: 0,
        reputation: 0
      },
      recommendations: [],
      metadata: metadata,
      findings: [],
      createdAt: now,
      updatedAt: now
    };

    await this.assessmentRepo.save(assessmentId, assessment);
    return assessment;
  }

  /**
   * Get estimated duration based on analysis depth
   */
  private getEstimatedDuration(depth?: string): number {
    switch (depth) {
      case 'BASIC':
        return 30; // 30 seconds
      case 'COMPREHENSIVE':
        return 180; // 3 minutes
      case 'STANDARD':
      default:
        return 90; // 1.5 minutes
    }
  }

  /**
   * Process the assessment asynchronously
   */
  private async processAssessment(
    assessmentId: string, 
    protocol: Protocol, 
    request: AssessmentRequest
  ): Promise<void> {
    const progress = this.activeAssessments.get(assessmentId);
    if (!progress) return;

    try {
      // Update status to in progress
      progress.status = AssessmentStatus.IN_PROGRESS;
      progress.progress = 10;
      progress.currentStage = 'Data Collection';

      logger.info('Starting assessment processing', { assessmentId, protocolId: protocol.id });

      // Simulate assessment stages for now
      // TODO: Replace with actual analyzer implementations

      // Stage 1: Technical Analysis (placeholder)
      await this.simulateAnalysisStage(progress, 'Technical Analysis', 25, 2000);

      // Stage 2: Governance Analysis (placeholder)
      await this.simulateAnalysisStage(progress, 'Governance Analysis', 50, 1500);

      // Stage 3: Liquidity Analysis (placeholder)
      await this.simulateAnalysisStage(progress, 'Liquidity Analysis', 75, 1000);

      // Stage 4: Risk Calculation (placeholder)
      await this.simulateAnalysisStage(progress, 'Risk Calculation', 90, 500);

      // Complete the assessment
      await this.completeAssessment(assessmentId, protocol, request);

    } catch (error) {
      await this.handleAssessmentError(assessmentId, error);
    }
  }

  /**
   * Simulate analysis stage (temporary implementation)
   */
  private async simulateAnalysisStage(
    progress: AssessmentProgress, 
    stageName: string, 
    targetProgress: number, 
    duration: number
  ): Promise<void> {
    progress.currentStage = stageName;
    progress.progress = targetProgress;
    
    logger.info('Assessment stage progress', { 
      assessmentId: progress.assessmentId, 
      stage: stageName, 
      progress: targetProgress 
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Complete the assessment with final results
   */
  private async completeAssessment(
    assessmentId: string, 
    protocol: Protocol, 
    request: AssessmentRequest
  ): Promise<void> {
    const progress = this.activeAssessments.get(assessmentId);
    const assessment = await this.assessmentRepo.findById(assessmentId);
    
    if (!progress || !assessment) return;

    try {
      // Generate mock findings (TODO: Replace with actual analyzer results)
      const mockCategoryScores: CategoryScores = {
        technical: Math.floor(Math.random() * 40) + 60,
        governance: Math.floor(Math.random() * 40) + 50,
        liquidity: Math.floor(Math.random() * 30) + 40,
        reputation: Math.floor(Math.random() * 35) + 45
      };
      const mockFindings = this.generateMockFindings(protocol, mockCategoryScores);
      
      // Prepare scoring input with protocol metadata
      const scoringInput: ScoringInput = {
        findings: mockFindings,
        protocolMetadata: {
          ageInDays: this.calculateProtocolAge(protocol),
          tvlUsd: this.estimateTvl(protocol),
          auditCount: this.estimateAuditCount(protocol)
        }
      };

      // Use RiskScoringEngine for comprehensive scoring
      const scoringResult = await this.riskScoringEngine.calculateRiskScore(scoringInput);

      // Update assessment with scoring results
      assessment.status = AssessmentStatus.COMPLETED;
      assessment.overallScore = scoringResult.overallScore;
      assessment.riskLevel = scoringResult.riskLevel;
      assessment.categoryScores = scoringResult.categoryScores;
      assessment.findings = scoringResult.criticalFindings.concat(mockFindings);
      assessment.recommendations = scoringResult.recommendations;
      assessment.completedAt = new Date();
      assessment.updatedAt = new Date();

      // Add scoring confidence to metadata
      assessment.metadata.warnings = assessment.metadata.warnings || [];
      assessment.metadata.warnings.push(
        `Scoring confidence: ${scoringResult.scoringBreakdown.confidence}%`
      );

      await this.assessmentRepo.save(assessmentId, assessment);

      // Update progress
      progress.status = AssessmentStatus.COMPLETED;
      progress.progress = 100;
      progress.currentStage = 'Completed';
      progress.completedAt = new Date();

      // Remove from active assessments
      this.activeAssessments.delete(assessmentId);

      logger.info('Assessment completed successfully', { 
        assessmentId, 
        protocolId: protocol.id, 
        overallScore: scoringResult.overallScore, 
        riskLevel: scoringResult.riskLevel,
        confidence: scoringResult.scoringBreakdown.confidence,
        findingsCount: mockFindings.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Assessment completion failed', { 
        assessmentId, 
        protocolId: protocol.id, 
        error: errorMessage 
      });

      // Mark assessment as failed
      assessment.status = AssessmentStatus.FAILED;
      assessment.metadata.warnings = assessment.metadata.warnings || [];
      assessment.metadata.warnings.push(`Assessment failed: ${errorMessage}`);
      await this.assessmentRepo.save(assessmentId, assessment);

      // Update progress
      if (progress) {
        progress.status = AssessmentStatus.FAILED;
        progress.currentStage = 'Failed';
      }

      // Remove from active assessments
      this.activeAssessments.delete(assessmentId);
    }
  }

  /**
   * Calculate risk level from overall score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.LOW;
    if (score >= 60) return RiskLevel.MEDIUM;
    if (score >= 40) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Generate mock findings (TODO: Replace with actual analyzer results)
   */
  private generateMockFindings(protocol: Protocol, scores: CategoryScores): Finding[] {
    const findings: Finding[] = [];
    let findingCounter = 1;

    if (scores.technical < 70) {
      findings.push({
        id: `finding-${Date.now()}-${findingCounter++}`,
        category: FindingCategory.TECHNICAL,
        severity: FindingSeverity.HIGH,
        title: 'Potential Security Vulnerabilities',
        description: 'Potential security vulnerabilities detected in smart contracts',
        source: 'TechnicalAnalyzer',
        confidence: 75,
        recommendation: 'Conduct thorough security audit of smart contracts'
      });
    }
    
    if (scores.governance < 60) {
      findings.push({
        id: `finding-${Date.now()}-${findingCounter++}`,
        category: FindingCategory.GOVERNANCE,
        severity: FindingSeverity.MEDIUM,
        title: 'Governance Centralization',
        description: 'Governance centralization risks identified',
        source: 'GovernanceAnalyzer',
        confidence: 80,
        recommendation: 'Implement more decentralized governance mechanisms'
      });
    }
    
    if (scores.liquidity < 50) {
      findings.push({
        id: `finding-${Date.now()}-${findingCounter++}`,
        category: FindingCategory.LIQUIDITY,
        severity: FindingSeverity.HIGH,
        title: 'Low Liquidity Risk',
        description: 'Low liquidity levels may impact protocol stability',
        source: 'LiquidityAnalyzer',
        confidence: 90,
        recommendation: 'Increase liquidity through incentive programs'
      });
    }
    
    if (scores.reputation < 60) {
      findings.push({
        id: `finding-${Date.now()}-${findingCounter++}`,
        category: FindingCategory.REPUTATION,
        severity: FindingSeverity.MEDIUM,
        title: 'Limited Team Reputation',
        description: 'Limited development team reputation and track record',
        source: 'ReputationAnalyzer',
        confidence: 70,
        recommendation: 'Improve transparency and team credentials disclosure'
      });
    }

    return findings;
  }

  /**
   * Generate mock recommendations (TODO: Replace with actual analyzer results)
   */
  private generateMockRecommendations(scores: CategoryScores): string[] {
    const recommendations: string[] = [];

    if (scores.technical < 70) {
      recommendations.push('Conduct thorough security audit of smart contracts');
    }
    if (scores.governance < 60) {
      recommendations.push('Implement more decentralized governance mechanisms');
    }
    if (scores.liquidity < 50) {
      recommendations.push('Increase liquidity through incentive programs');
    }
    if (scores.reputation < 60) {
      recommendations.push('Improve transparency and team credentials disclosure');
    }

    return recommendations;
  }

  /**
   * Handle assessment errors
   */
  private async handleAssessmentError(assessmentId: string, error: any): Promise<void> {
    const progress = this.activeAssessments.get(assessmentId);
    
    if (progress) {
      progress.status = AssessmentStatus.FAILED;
      progress.error = error.message || 'Unknown error occurred';
      progress.completedAt = new Date();
    }

    // Update database record
    const assessment = await this.assessmentRepo.findById(assessmentId);
    if (assessment) {
      assessment.status = AssessmentStatus.FAILED;
      assessment.completedAt = new Date();
      await this.assessmentRepo.save(assessmentId, assessment);
    }

    // Remove from active assessments
    this.activeAssessments.delete(assessmentId);

    logger.error('Assessment failed', { assessmentId, error });
  }

  /**
   * Calculate protocol age in days (mock implementation)
   */
  private calculateProtocolAge(protocol: Protocol): number {
    // Calculate based on creation date, fall back to random value for mock
    const createdAt = protocol.createdAt || new Date();
    const ageInMs = Date.now() - createdAt.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    
    // If age is unrealistic (too old or negative), return a mock value
    if (ageInDays < 0 || ageInDays > 2000) {
      return Math.floor(Math.random() * 730) + 30; // 30-760 days
    }
    
    return ageInDays;
  }

  /**
   * Estimate TVL in USD (mock implementation)
   */
  private estimateTvl(protocol: Protocol): number {
    // Mock TVL based on protocol characteristics
    const baseMultiplier = protocol.contractAddresses.length;
    const categoryMultiplier = this.getCategoryTvlMultiplier(protocol.category);
    
    // Generate a realistic TVL between $100K and $500M
    const baseTvl = Math.floor(Math.random() * 50000000) + 100000; // $100K - $50M
    return baseTvl * baseMultiplier * categoryMultiplier;
  }

  /**
   * Estimate audit count (mock implementation)
   */
  private estimateAuditCount(protocol: Protocol): number {
    // Mock audit count based on protocol age and complexity
    const contractCount = protocol.contractAddresses.length;
    const ageInDays = this.calculateProtocolAge(protocol);
    
    // More contracts and older protocols likely have more audits
    let auditCount = 0;
    
    if (ageInDays > 365) auditCount += 2; // Mature protocols
    if (ageInDays > 180) auditCount += 1; // 6+ months old
    if (contractCount > 5) auditCount += 1; // Complex protocols
    if (contractCount > 10) auditCount += 1; // Very complex protocols
    
    // Add some randomness
    auditCount += Math.floor(Math.random() * 3); // 0-2 additional audits
    
    return Math.max(0, auditCount);
  }

  /**
   * Get TVL multiplier based on protocol category
   */
  private getCategoryTvlMultiplier(category?: ProtocolCategory): number {
    switch (category) {
      case ProtocolCategory.DEX:
      case ProtocolCategory.LENDING:
        return 5; // DEXs and lending protocols typically have higher TVL
      case ProtocolCategory.YIELD_FARMING:
      case ProtocolCategory.STABLECOIN:
        return 3; // Moderate TVL
      case ProtocolCategory.DERIVATIVES:
      case ProtocolCategory.BRIDGE:
        return 2; // Lower but significant TVL
      case ProtocolCategory.INSURANCE:
      case ProtocolCategory.DAO:
        return 1.5; // Specialized protocols
      case ProtocolCategory.NFT:
      case ProtocolCategory.OTHER:
      default:
        return 1; // Base multiplier
    }
  }
}
