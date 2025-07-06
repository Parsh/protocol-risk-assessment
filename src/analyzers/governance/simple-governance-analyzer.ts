/**
 * Simplified Governance Analyzer
 * Returns governance risk scores for integration with AssessmentOrchestrator
 * Phase 6 - Stage 6.1: Governance Risk Assessment
 */

import { logger } from '../../config/logger';

export interface GovernanceInput {
  protocolName: string;
  contractAddresses: string[];
  blockchain: string;
  tokenSymbol?: string;
  governanceTokenAddress?: string;
}

export interface GovernanceScore {
  governanceScore: number; // 0-100, higher = more risk
  findings: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: 'GOVERNANCE';
    title: string;
    description: string;
  }>;
  metadata: {
    analysisTime: number;
    useMockData: boolean;
    dataPoints: number;
  };
}

export class SimpleGovernanceAnalyzer {
  private readonly USE_MOCK_DATA = true;

  constructor() {
    logger.info('SimpleGovernanceAnalyzer initialized', {
      service: 'governance-analyzer',
      useMockData: this.USE_MOCK_DATA
    });
  }

  /**
   * Analyze governance and return a simple score
   */
  async analyzeGovernance(input: GovernanceInput): Promise<GovernanceScore> {
    const startTime = Date.now();
    
    logger.info('Starting governance analysis', { 
      protocolName: input.protocolName,
      blockchain: input.blockchain
    });

    try {
      // Generate governance score based on protocol characteristics
      const governanceScore = this.calculateGovernanceScore(input);
      const findings = this.generateFindings(input, governanceScore);

      const result: GovernanceScore = {
        governanceScore,
        findings,
        metadata: {
          analysisTime: Date.now() - startTime,
          useMockData: this.USE_MOCK_DATA,
          dataPoints: 4 // Token distribution, voting power, multi-sig, proposals
        }
      };

      logger.info('Governance analysis completed', {
        protocolName: input.protocolName,
        governanceScore: Math.round(governanceScore),
        findingsCount: findings.length,
        executionTime: result.metadata.analysisTime
      });

      return result;

    } catch (error) {
      logger.error('Governance analysis failed', {
        protocolName: input.protocolName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return conservative high-risk score on failure
      return {
        governanceScore: 75,
        findings: [{
          severity: 'HIGH',
          category: 'GOVERNANCE',
          title: 'Governance Analysis Failed',
          description: 'Unable to analyze governance structure - assuming higher risk'
        }],
        metadata: {
          analysisTime: Date.now() - startTime,
          useMockData: true,
          dataPoints: 0
        }
      };
    }
  }

  /**
   * Calculate governance score with mock data
   */
  private calculateGovernanceScore(input: GovernanceInput): number {
    // Generate consistent but varied scores based on protocol name
    const seed = this.hashString(input.protocolName);
    
    let score = 30; // Base score (moderate risk)
    
    // Token distribution analysis (mock)
    const concentrationRisk = 20 + (seed % 40); // 20-60% concentration risk
    score += concentrationRisk * 0.3;
    
    // Voting power analysis (mock)
    const votingRisk = 15 + (seed % 35); // 15-50% voting risk
    score += votingRisk * 0.25;
    
    // Multi-sig analysis (mock)
    const hasMultiSig = seed % 4 !== 0; // 75% have multi-sig
    const multiSigRisk = hasMultiSig ? 10 + (seed % 30) : 80; // High risk if no multi-sig
    score += multiSigRisk * 0.25;
    
    // Proposal activity analysis (mock)
    const proposalRisk = 20 + (seed % 30); // 20-50% proposal risk
    score += proposalRisk * 0.2;
    
    // Normalize and cap score
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    
    logger.debug('Governance score calculated', {
      protocolName: input.protocolName,
      concentrationRisk: Math.round(concentrationRisk),
      votingRisk: Math.round(votingRisk),
      multiSigRisk: Math.round(multiSigRisk),
      proposalRisk: Math.round(proposalRisk),
      finalScore,
      hasMultiSig
    });
    
    return finalScore;
  }

  /**
   * Generate governance findings based on score
   */
  private generateFindings(input: GovernanceInput, score: number): Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: 'GOVERNANCE';
    title: string;
    description: string;
  }> {
    const findings = [];
    const seed = this.hashString(input.protocolName);
    
    // High token concentration (common issue)
    if (seed % 3 === 0) {
      findings.push({
        severity: 'MEDIUM' as const,
        category: 'GOVERNANCE' as const,
        title: 'Token Concentration Risk',
        description: 'High concentration of tokens in top holders may lead to centralization concerns'
      });
    }
    
    // Multi-sig analysis
    const hasMultiSig = seed % 4 !== 0;
    if (!hasMultiSig) {
      findings.push({
        severity: 'HIGH' as const,
        category: 'GOVERNANCE' as const,
        title: 'No Multi-Signature Protection',
        description: 'Protocol lacks multi-signature wallet protection for critical functions'
      });
    } else if (seed % 5 === 0) {
      findings.push({
        severity: 'LOW' as const,
        category: 'GOVERNANCE' as const,
        title: 'Multi-Sig Configuration',
        description: 'Multi-signature wallet detected but threshold could be optimized'
      });
    }
    
    // Voting participation
    if (seed % 6 === 0) {
      findings.push({
        severity: 'MEDIUM' as const,
        category: 'GOVERNANCE' as const,
        title: 'Low Voter Participation',
        description: 'Governance proposals show low voter participation rates'
      });
    }
    
    // Timelock mechanism
    if (seed % 7 === 0) {
      findings.push({
        severity: 'MEDIUM' as const,
        category: 'GOVERNANCE' as const,
        title: 'Timelock Implementation',
        description: 'Consider implementing timelock mechanisms for critical governance changes'
      });
    }
    
    // Overall governance health
    if (score >= 70) {
      findings.push({
        severity: 'HIGH' as const,
        category: 'GOVERNANCE' as const,
        title: 'High Governance Risk',
        description: 'Multiple governance issues detected requiring immediate attention'
      });
    } else if (score >= 50) {
      findings.push({
        severity: 'MEDIUM' as const,
        category: 'GOVERNANCE' as const,
        title: 'Moderate Governance Risk',
        description: 'Some governance improvements recommended for better decentralization'
      });
    } else if (score <= 30) {
      findings.push({
        severity: 'INFO' as const,
        category: 'GOVERNANCE' as const,
        title: 'Good Governance Structure',
        description: 'Protocol demonstrates strong governance practices'
      });
    }
    
    return findings;
  }

  /**
   * Simple hash function for consistent mock data
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const simpleGovernanceAnalyzer = new SimpleGovernanceAnalyzer();
