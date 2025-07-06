/**
 * Developer Reputation Analysis Types
 * Defines interfaces for developer and team reputation assessment
 */

export interface ReputationInput {
  protocolName: string;
  contractAddresses: string[];
  blockchain: string;
  githubRepo?: string;
  website?: string;
  teamInfo?: any;
}

export interface DeveloperMetrics {
  teamSize: number;
  coreDevCount: number;
  githubActivity: {
    commitsLastMonth: number;
    commitsLastYear: number;
    contributors: number;
    stars: number;
    forks: number;
    lastCommitDate: string;
  };
  codeQuality: {
    testCoverage: number;
    documentationScore: number;
    codeComplexity: number;
    securityPractices: number;
  };
  experience: {
    averageExperience: number;
    previousProjects: number;
    industryReputation: number;
    auditHistory: number;
  };
}

export interface ReputationRiskFactors {
  teamRisk: number;
  activityRisk: number;
  experienceRisk: number;
  codeQualityRisk: number;
  transparencyRisk: number;
  historicalRisk: number;
}

export interface ReputationFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  metrics?: {
    teamSize?: number;
    experience?: number;
    activity?: number;
    quality?: number;
  };
}

export interface ReputationAnalysisResult {
  reputationScore: number;
  riskLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  metrics: DeveloperMetrics;
  riskFactors: ReputationRiskFactors;
  findings: ReputationFinding[];
  metadata: {
    analysisTime: number;
    dataSource: 'api' | 'mock';
    timestamp: string;
    version: string;
  };
}
