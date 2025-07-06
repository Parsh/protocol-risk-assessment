/**
 * Core domain models for the DeFi Risk Assessment service
 */

// Basic entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
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
}

// Category scores for different risk dimensions
export interface CategoryScores {
  technical: number;
  governance: number;
  liquidity: number;
  reputation: number;
}

// Assessment metadata
export interface AssessmentMetadata {
  analysisVersion: string;
  analysisDepth: AnalysisDepth;
  executionTime: number; // milliseconds
  dataSourcesUsed: string[];
  warnings?: string[];
}

// Enums
export enum AssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AnalysisDepth {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  COMPREHENSIVE = 'COMPREHENSIVE'
}

// Index models for efficient lookups
export interface ProtocolIndex {
  [id: string]: {
    name: string;
    blockchain: string;
    lastUpdated: Date;
    assessmentCount: number;
  };
}

export interface AssessmentIndex {
  [id: string]: {
    protocolId: string;
    status: AssessmentStatus;
    overallScore: number;
    riskLevel: RiskLevel;
    createdAt: Date;
    completedAt?: Date;
  };
}
