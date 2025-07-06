/**
 * Core domain models for the DeFi Risk Assessment service
 * Phase 2 - Stage 2.1: Enhanced Data Models with Validation
 */

import Joi from 'joi';

//
// ENUMS - Core enumeration types
//

// Protocol categories for better organization
export enum ProtocolCategory {
  DEX = 'DEX',
  LENDING = 'LENDING',
  YIELD_FARMING = 'YIELD_FARMING',
  DERIVATIVES = 'DERIVATIVES',
  INSURANCE = 'INSURANCE',
  BRIDGE = 'BRIDGE',
  DAO = 'DAO',
  STABLECOIN = 'STABLECOIN',
  NFT = 'NFT',
  OTHER = 'OTHER'
}

// Assessment status enumeration
export enum AssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Risk level enumeration
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Analysis depth enumeration
export enum AnalysisDepth {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  COMPREHENSIVE = 'COMPREHENSIVE'
}

// Assessment priority levels
export enum AssessmentPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// Finding categories for risk analysis
export enum FindingCategory {
  TECHNICAL = 'TECHNICAL',
  GOVERNANCE = 'GOVERNANCE',
  LIQUIDITY = 'LIQUIDITY',
  REPUTATION = 'REPUTATION',
  OPERATIONAL = 'OPERATIONAL'
}

// Finding severity levels
export enum FindingSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

// Supported blockchain networks
export enum Blockchain {
  ETHEREUM = 'ethereum',
  BSC = 'bsc',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom'
}

//
// CORE INTERFACES - Domain entity definitions
//

// Basic entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category scores for different risk dimensions
export interface CategoryScores {
  technical: number;        // 0-100: Smart contract security
  governance: number;       // 0-100: Governance structure
  liquidity: number;        // 0-100: Liquidity risks
  reputation: number;       // 0-100: Developer/team reputation
}

// Assessment metadata
export interface AssessmentMetadata {
  analysisVersion: string;
  analysisDepth: AnalysisDepth;
  executionTime: number; // milliseconds
  dataSourcesUsed: string[];
  warnings?: string[];
  externalDataFreshness?: { [source: string]: Date };
}

// Individual findings from analysis
export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  recommendation?: string;
  source: string; // Which analyzer produced this finding
  confidence: number; // 0-100
  metadata?: { [key: string]: any };
}

// Protocol model
export interface Protocol extends BaseEntity {
  name: string;
  contractAddresses: string[];
  blockchain: string;
  tokenSymbol?: string;
  website?: string;
  documentation?: string;
  description?: string;
  category?: ProtocolCategory;
  tags?: string[];
}

// Risk assessment model
export interface RiskAssessment extends BaseEntity {
  protocolId: string;
  status: AssessmentStatus;
  overallScore: number;
  riskLevel: RiskLevel;
  categoryScores: CategoryScores;
  recommendations: string[];
  metadata: AssessmentMetadata;
  findings?: Finding[];
  completedAt?: Date;
}

//
// INPUT/REQUEST INTERFACES - For API operations
//

// Protocol input for creating new protocols
export interface ProtocolInput {
  name: string;
  contractAddresses: string[];
  blockchain: string;
  tokenSymbol?: string;
  website?: string;
  documentation?: string;
  description?: string;
  category?: ProtocolCategory;
  tags?: string[];
}

// Assessment request input
export interface AssessmentRequest {
  protocolId?: string; // If assessing existing protocol
  protocol?: ProtocolInput; // If creating new protocol for assessment
  analysisDepth?: AnalysisDepth;
  priority?: AssessmentPriority;
  enabledAnalyzers?: string[]; // Which analyzers to run
}

//
// INDEX INTERFACES - For efficient lookups
//

// Index models for efficient lookups
export interface ProtocolIndex {
  [id: string]: {
    name: string;
    blockchain: string;
    category?: ProtocolCategory;
    lastUpdated: Date;
    assessmentCount: number;
    latestAssessmentId?: string;
    averageRiskScore?: number;
  };
}

export interface AssessmentIndex {
  [id: string]: {
    protocolId: string;
    status: AssessmentStatus;
    overallScore: number;
    riskLevel: RiskLevel;
    analysisDepth: AnalysisDepth;
    createdAt: Date;
    completedAt?: Date;
    executionTime?: number;
  };
}

//
// VALIDATION SCHEMAS - Using Joi for runtime validation
//

// Common validation patterns
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/;

export const ValidationSchemas = {
  // Protocol validation schema
  protocol: Joi.object<Protocol>({
    id: Joi.string().uuid().optional(), // Optional for create, required for update
    name: Joi.string().min(2).max(100).required()
      .messages({
        'string.min': 'Protocol name must be at least 2 characters',
        'string.max': 'Protocol name cannot exceed 100 characters'
      }),
    contractAddresses: Joi.array()
      .items(Joi.string().pattern(ethereumAddressRegex).messages({
        'string.pattern.base': 'Invalid Ethereum address format'
      }))
      .min(1)
      .max(20)
      .required()
      .messages({
        'array.min': 'At least one contract address is required',
        'array.max': 'Cannot have more than 20 contract addresses'
      }),
    blockchain: Joi.string().valid(...Object.values(Blockchain)).required()
      .messages({
        'any.only': 'Blockchain must be one of: ' + Object.values(Blockchain).join(', ')
      }),
    tokenSymbol: Joi.string().min(1).max(10).optional()
      .messages({
        'string.max': 'Token symbol cannot exceed 10 characters'
      }),
    website: Joi.string().pattern(urlRegex).optional()
      .messages({
        'string.pattern.base': 'Website must be a valid URL'
      }),
    documentation: Joi.string().pattern(urlRegex).optional()
      .messages({
        'string.pattern.base': 'Documentation must be a valid URL'
      }),
    description: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Description cannot exceed 1000 characters'
      }),
    category: Joi.string().valid(...Object.values(ProtocolCategory)).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional()
  }),

  // Protocol input validation (for creating new protocols)
  protocolInput: Joi.object<ProtocolInput>({
    name: Joi.string().min(2).max(100).required(),
    contractAddresses: Joi.array()
      .items(Joi.string().pattern(ethereumAddressRegex))
      .min(1)
      .max(20)
      .required(),
    blockchain: Joi.string().valid(...Object.values(Blockchain)).required(),
    tokenSymbol: Joi.string().min(1).max(10).optional(),
    website: Joi.string().pattern(urlRegex).optional(),
    documentation: Joi.string().pattern(urlRegex).optional(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid(...Object.values(ProtocolCategory)).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
  }),

  // Update protocol validation (allows partial updates)
  protocolUpdate: Joi.object<Partial<Protocol>>({
    name: Joi.string().min(2).max(100).optional(),
    contractAddresses: Joi.array()
      .items(Joi.string().pattern(ethereumAddressRegex))
      .min(1)
      .max(20)
      .optional(),
    blockchain: Joi.string().valid(...Object.values(Blockchain)).optional(),
    tokenSymbol: Joi.string().min(1).max(10).optional(),
    website: Joi.string().pattern(urlRegex).optional(),
    documentation: Joi.string().pattern(urlRegex).optional(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid(...Object.values(ProtocolCategory)).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Risk assessment validation schema
  riskAssessment: Joi.object<RiskAssessment>({
    id: Joi.string().uuid().optional(),
    protocolId: Joi.string().uuid().required(),
    status: Joi.string().valid(...Object.values(AssessmentStatus)).required(),
    overallScore: Joi.number().min(0).max(100).required(),
    riskLevel: Joi.string().valid(...Object.values(RiskLevel)).required(),
    categoryScores: Joi.object({
      technical: Joi.number().min(0).max(100).required(),
      governance: Joi.number().min(0).max(100).required(),
      liquidity: Joi.number().min(0).max(100).required(),
      reputation: Joi.number().min(0).max(100).required()
    }).required(),
    recommendations: Joi.array().items(Joi.string().max(500)).max(20).required(),
    metadata: Joi.object({
      analysisVersion: Joi.string().required(),
      analysisDepth: Joi.string().valid(...Object.values(AnalysisDepth)).required(),
      executionTime: Joi.number().positive().required(),
      dataSourcesUsed: Joi.array().items(Joi.string()).required(),
      warnings: Joi.array().items(Joi.string()).optional(),
      externalDataFreshness: Joi.object().pattern(Joi.string(), Joi.date()).optional()
    }).required(),
    findings: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      category: Joi.string().valid(...Object.values(FindingCategory)).required(),
      severity: Joi.string().valid(...Object.values(FindingSeverity)).required(),
      title: Joi.string().max(200).required(),
      description: Joi.string().max(2000).required(),
      recommendation: Joi.string().max(1000).optional(),
      source: Joi.string().required(),
      confidence: Joi.number().min(0).max(100).required(),
      metadata: Joi.object().optional()
    })).optional(),
    completedAt: Joi.date().optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional()
  }),

  // Assessment request validation schema
  assessmentRequest: Joi.object<AssessmentRequest>({
    protocolId: Joi.string().uuid().optional(),
    protocol: Joi.when('protocolId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.object().required()
    }),
    analysisDepth: Joi.string().valid(...Object.values(AnalysisDepth)).default(AnalysisDepth.STANDARD),
    priority: Joi.string().valid(...Object.values(AssessmentPriority)).default(AssessmentPriority.NORMAL),
    enabledAnalyzers: Joi.array().items(Joi.string()).optional()
  }).xor('protocolId', 'protocol').messages({
    'object.xor': 'Either protocolId or protocol data must be provided, but not both'
  }),

  // Finding validation schema
  finding: Joi.object<Finding>({
    id: Joi.string().required(),
    category: Joi.string().valid(...Object.values(FindingCategory)).required(),
    severity: Joi.string().valid(...Object.values(FindingSeverity)).required(),
    title: Joi.string().max(200).required(),
    description: Joi.string().max(2000).required(),
    recommendation: Joi.string().max(1000).optional(),
    source: Joi.string().required(),
    confidence: Joi.number().min(0).max(100).required(),
    metadata: Joi.object().optional()
  })
};

//
// TYPE GUARDS - For runtime type checking
//

export const TypeGuards = {
  isProtocol(obj: any): obj is Protocol {
    return !!(obj && 
           typeof obj.id === 'string' &&
           typeof obj.name === 'string' &&
           Array.isArray(obj.contractAddresses) &&
           typeof obj.blockchain === 'string' &&
           obj.createdAt instanceof Date &&
           obj.updatedAt instanceof Date);
  },

  isRiskAssessment(obj: any): obj is RiskAssessment {
    return !!(obj &&
           typeof obj.id === 'string' &&
           typeof obj.protocolId === 'string' &&
           typeof obj.status === 'string' &&
           typeof obj.overallScore === 'number' &&
           typeof obj.riskLevel === 'string' &&
           obj.categoryScores &&
           Array.isArray(obj.recommendations) &&
           obj.metadata);
  },

  isFinding(obj: any): obj is Finding {
    return obj &&
           typeof obj.id === 'string' &&
           typeof obj.category === 'string' &&
           typeof obj.severity === 'string' &&
           typeof obj.title === 'string' &&
           typeof obj.description === 'string' &&
           typeof obj.source === 'string' &&
           typeof obj.confidence === 'number';
  },

  isValidBlockchain(blockchain: string): blockchain is Blockchain {
    return Object.values(Blockchain).includes(blockchain as Blockchain);
  },

  isValidRiskLevel(level: string): level is RiskLevel {
    return Object.values(RiskLevel).includes(level as RiskLevel);
  },

  isValidProtocolCategory(category: string): category is ProtocolCategory {
    return Object.values(ProtocolCategory).includes(category as ProtocolCategory);
  },

  isValidAssessmentStatus(status: string): status is AssessmentStatus {
    return Object.values(AssessmentStatus).includes(status as AssessmentStatus);
  }
};

//
// UTILITY FUNCTIONS - For data manipulation and calculations
//

export const ModelUtils = {
  /**
   * Generate a protocol ID from name and primary contract address
   */
  generateProtocolId(name: string, primaryContract: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const contractSuffix = primaryContract.slice(-8);
    const timestamp = Date.now().toString(36);
    return `${cleanName}-${contractSuffix}-${timestamp}`;
  },

  /**
   * Calculate overall risk score from category scores
   */
  calculateOverallScore(categoryScores: CategoryScores, weights?: Partial<CategoryScores>): number {
    const defaultWeights = {
      technical: 0.4,     // 40% weight on technical security
      governance: 0.25,   // 25% weight on governance
      liquidity: 0.2,     // 20% weight on liquidity
      reputation: 0.15    // 15% weight on reputation
    };

    const finalWeights = { ...defaultWeights, ...weights };
    
    return Math.round(
      categoryScores.technical * finalWeights.technical +
      categoryScores.governance * finalWeights.governance +
      categoryScores.liquidity * finalWeights.liquidity +
      categoryScores.reputation * finalWeights.reputation
    );
  },

  /**
   * Determine risk level from overall score
   */
  determineRiskLevel(overallScore: number): RiskLevel {
    if (overallScore >= 80) return RiskLevel.CRITICAL;
    if (overallScore >= 60) return RiskLevel.HIGH;
    if (overallScore >= 30) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  },

  /**
   * Validate Ethereum address format
   */
  isValidEthereumAddress(address: string): boolean {
    return ethereumAddressRegex.test(address);
  },

  /**
   * Sanitize protocol input for safe storage
   */
  sanitizeProtocolInput(input: ProtocolInput): ProtocolInput {
    return {
      name: input.name.trim(),
      contractAddresses: input.contractAddresses.map(addr => addr.toLowerCase()),
      blockchain: input.blockchain.toLowerCase() as Blockchain,
      ...(input.tokenSymbol && { tokenSymbol: input.tokenSymbol.toUpperCase() }),
      ...(input.website && { website: input.website }),
      ...(input.documentation && { documentation: input.documentation }),
      ...(input.description && { description: input.description.trim() }),
      ...(input.category && { category: input.category }),
      ...(input.tags && { tags: input.tags.map(tag => tag.toLowerCase().trim()).filter(Boolean) })
    };
  },

  /**
   * Create a new base entity with timestamps
   */
  createBaseEntity(id: string): BaseEntity {
    const now = new Date();
    return {
      id,
      createdAt: now,
      updatedAt: now
    };
  },

  /**
   * Update entity timestamps
   */
  updateEntityTimestamp<T extends BaseEntity>(entity: T): T {
    return {
      ...entity,
      updatedAt: new Date()
    };
  },

  /**
   * Generate finding ID from assessment ID and finding index
   */
  generateFindingId(assessmentId: string, findingIndex: number): string {
    return `${assessmentId}-finding-${findingIndex.toString().padStart(3, '0')}`;
  },

  /**
   * Calculate confidence weighted severity score
   */
  calculateSeverityScore(findings: Finding[]): number {
    if (findings.length === 0) return 0;

    const severityWeights = {
      [FindingSeverity.CRITICAL]: 100,
      [FindingSeverity.HIGH]: 75,
      [FindingSeverity.MEDIUM]: 50,
      [FindingSeverity.LOW]: 25,
      [FindingSeverity.INFO]: 5
    };

    const totalWeightedScore = findings.reduce((sum, finding) => {
      const severityWeight = severityWeights[finding.severity];
      const confidenceMultiplier = finding.confidence / 100;
      return sum + (severityWeight * confidenceMultiplier);
    }, 0);

    return Math.round(totalWeightedScore / findings.length);
  },

  /**
   * Generate recommendations based on findings
   */
  generateRecommendationsFromFindings(findings: Finding[]): string[] {
    const recommendations = new Set<string>();

    findings.forEach(finding => {
      if (finding.recommendation) {
        recommendations.add(finding.recommendation);
      }

      // Add generic recommendations based on severity and category
      if (finding.severity === FindingSeverity.CRITICAL) {
        recommendations.add('Immediate security audit required before production deployment');
      }

      if (finding.category === FindingCategory.TECHNICAL && finding.severity === FindingSeverity.HIGH) {
        recommendations.add('Conduct comprehensive smart contract security review');
      }

      if (finding.category === FindingCategory.GOVERNANCE) {
        recommendations.add('Review and strengthen governance mechanisms');
      }

      if (finding.category === FindingCategory.LIQUIDITY) {
        recommendations.add('Implement liquidity risk monitoring and mitigation strategies');
      }
    });

    return Array.from(recommendations).slice(0, 10); // Limit to 10 recommendations
  }
};

//
// FACTORY FUNCTIONS - For creating new instances
//

export const ModelFactory = {
  /**
   * Create a new protocol instance
   */
  createProtocol(input: ProtocolInput, id?: string): Protocol {
    if (!input.contractAddresses || input.contractAddresses.length === 0) {
      throw new Error('At least one contract address is required');
    }
    
    const protocolId = id || ModelUtils.generateProtocolId(input.name, input.contractAddresses[0]!);
    const baseEntity = ModelUtils.createBaseEntity(protocolId);
    const sanitizedInput = ModelUtils.sanitizeProtocolInput(input);

    return {
      ...baseEntity,
      ...sanitizedInput
    };
  },

  /**
   * Create a new risk assessment instance
   */
  createRiskAssessment(
    protocolId: string,
    categoryScores: CategoryScores,
    metadata: AssessmentMetadata,
    findings: Finding[] = [],
    id?: string
  ): RiskAssessment {
    const assessmentId = id || `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const baseEntity = ModelUtils.createBaseEntity(assessmentId);
    const overallScore = ModelUtils.calculateOverallScore(categoryScores);
    const riskLevel = ModelUtils.determineRiskLevel(overallScore);
    const recommendations = ModelUtils.generateRecommendationsFromFindings(findings);

    return {
      ...baseEntity,
      protocolId,
      status: AssessmentStatus.PENDING,
      overallScore,
      riskLevel,
      categoryScores,
      recommendations,
      metadata,
      findings
    };
  },

  /**
   * Create a new finding instance
   */
  createFinding(
    category: FindingCategory,
    severity: FindingSeverity,
    title: string,
    description: string,
    source: string,
    confidence: number,
    recommendation?: string,
    metadata?: any
  ): Finding {
    const findingId = `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const finding: Finding = {
      id: findingId,
      category,
      severity,
      title,
      description,
      source,
      confidence: Math.max(0, Math.min(100, confidence)), // Ensure confidence is within 0-100
    };

    if (recommendation) {
      finding.recommendation = recommendation;
    }

    if (metadata) {
      finding.metadata = metadata;
    }

    return finding;
  }
};
