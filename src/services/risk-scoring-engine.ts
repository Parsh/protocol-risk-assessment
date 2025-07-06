/**
 * Risk Scoring Engine for DeFi Protocol Risk Assessment
 * Phase 3 - Stage 3.3: Multi-Dimensional Risk Scoring
 * 
 * This service provides configurable risk scoring algorithms that calculate
 * composite risk scores from multiple analyzer outputs.
 */

import { 
  CategoryScores, 
  RiskLevel, 
  Finding, 
  FindingCategory, 
  FindingSeverity,
  ModelUtils 
} from '../models/index';
import { logger } from '../config/logger';

/**
 * Configuration for risk scoring weights and thresholds
 */
export interface ScoringConfiguration {
  weights: CategoryScores;
  riskThresholds: {
    critical: number;  // >= critical threshold
    high: number;      // >= high threshold
    medium: number;    // >= medium threshold
    // low: anything below medium threshold
  };
  severityWeights: {
    [key in FindingSeverity]: number;
  };
  confidenceMultipliers: {
    high: number;
    medium: number;
    low: number;
  };
  baselineScores: CategoryScores; // Starting scores before applying findings
}

/**
 * Input data for risk scoring calculations
 */
export interface ScoringInput {
  findings: Finding[];
  protocolMetadata?: {
    ageInDays?: number;
    tvlUsd?: number;
    transactionVolume?: number;
    auditCount?: number;
  };
  externalMetrics?: {
    technical?: number;    // External technical score (0-100)
    governance?: number;   // External governance score (0-100) 
    liquidity?: number;    // External liquidity score (0-100)
    reputation?: number;   // External reputation score (0-100)
  };
}

/**
 * Detailed scoring result with breakdown
 */
export interface ScoringResult {
  categoryScores: CategoryScores;
  overallScore: number;
  riskLevel: RiskLevel;
  recommendations: string[];
  scoringBreakdown: {
    findingsImpact: CategoryScores;
    externalMetrics: CategoryScores;
    adjustments: CategoryScores;
    confidence: number; // 0-100, how confident we are in the score
  };
  criticalFindings: Finding[];
  warningCount: number;
}

/**
 * Default scoring configuration optimized for DeFi protocols
 */
const DEFAULT_SCORING_CONFIG: ScoringConfiguration = {
  weights: {
    technical: 0.4,    // 40% - Smart contract security is critical
    governance: 0.25,  // 25% - Governance structure importance
    liquidity: 0.2,    // 20% - Liquidity risks affect stability
    reputation: 0.15   // 15% - Team reputation and history
  },
  riskThresholds: {
    critical: 80,      // Score >= 80 is critical risk
    high: 60,          // Score >= 60 is high risk
    medium: 30         // Score >= 30 is medium risk, < 30 is low
  },
  severityWeights: {
    [FindingSeverity.CRITICAL]: 25,
    [FindingSeverity.HIGH]: 15,
    [FindingSeverity.MEDIUM]: 8,
    [FindingSeverity.LOW]: 3,
    [FindingSeverity.INFO]: 0
  },
  confidenceMultipliers: {
    high: 1.0,         // 100% weight for high confidence findings
    medium: 0.7,       // 70% weight for medium confidence
    low: 0.4           // 40% weight for low confidence
  },
  baselineScores: {
    technical: 20,     // Start with moderate risk assumption
    governance: 30,    // Governance often has some risk
    liquidity: 25,     // Liquidity risk baseline
    reputation: 35     // Reputation baseline (unknown = some risk)
  }
};

/**
 * Risk Scoring Engine - Multi-dimensional risk calculation service
 */
export class RiskScoringEngine {
  private config: ScoringConfiguration;
  
  constructor(config?: Partial<ScoringConfiguration>) {
    this.config = this.mergeConfigurations(DEFAULT_SCORING_CONFIG, config);
    logger.info('RiskScoringEngine initialized', { 
      weights: this.config.weights,
      thresholds: this.config.riskThresholds 
    });
  }

  /**
   * Calculate comprehensive risk score from various inputs
   */
  async calculateRiskScore(input: ScoringInput): Promise<ScoringResult> {
    const startTime = Date.now();
    
    try {
      // Initialize with baseline scores
      const scores = { ...this.config.baselineScores };
      
      // Apply findings impact
      const findingsImpact = this.calculateFindingsImpact(input.findings);
      
      // Apply external metrics if available
      const externalMetrics = this.applyExternalMetrics(input.externalMetrics);
      
      // Calculate protocol-specific adjustments
      const adjustments = this.calculateProtocolAdjustments(input.protocolMetadata);
      
      // Combine all scoring components
      const finalScores = this.combineScores(scores, findingsImpact, externalMetrics, adjustments);
      
      // Calculate overall weighted score
      const overallScore = this.calculateWeightedScore(finalScores);
      
      // Determine risk level
      const riskLevel = this.categorizeRiskLevel(overallScore);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        input.findings, 
        finalScores, 
        riskLevel
      );
      
      // Identify critical findings
      const criticalFindings = input.findings.filter(
        f => f.severity === FindingSeverity.CRITICAL || f.severity === FindingSeverity.HIGH
      );
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(input.findings, input.externalMetrics);
      
      const result: ScoringResult = {
        categoryScores: finalScores,
        overallScore,
        riskLevel,
        recommendations,
        scoringBreakdown: {
          findingsImpact,
          externalMetrics,
          adjustments,
          confidence
        },
        criticalFindings,
        warningCount: input.findings.length
      };
      
      const executionTime = Date.now() - startTime;
      logger.info('Risk score calculated successfully', {
        overallScore,
        riskLevel,
        executionTime,
        findingsCount: input.findings.length,
        confidence
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error calculating risk score', { error: errorMessage, input });
      throw new Error(`Risk scoring failed: ${errorMessage}`);
    }
  }

  /**
   * Update scoring configuration
   */
  updateConfiguration(newConfig: Partial<ScoringConfiguration>): void {
    this.config = this.mergeConfigurations(this.config, newConfig);
    logger.info('Scoring configuration updated', { newConfig });
  }

  /**
   * Get current scoring configuration
   */
  getConfiguration(): ScoringConfiguration {
    return { ...this.config };
  }

  /**
   * Calculate impact of findings on each risk category
   */
  private calculateFindingsImpact(findings: Finding[]): CategoryScores {
    const impact: CategoryScores = {
      technical: 0,
      governance: 0,
      liquidity: 0,
      reputation: 0
    };

    for (const finding of findings) {
      const severity = this.config.severityWeights[finding.severity];
      const confidence = this.getConfidenceMultiplier(finding.confidence);
      const weightedImpact = severity * confidence;

      // Map finding categories to score categories
      switch (finding.category) {
        case FindingCategory.TECHNICAL:
          impact.technical += weightedImpact;
          break;
        case FindingCategory.GOVERNANCE:
          impact.governance += weightedImpact;
          break;
        case FindingCategory.LIQUIDITY:
          impact.liquidity += weightedImpact;
          break;
        case FindingCategory.REPUTATION:
          impact.reputation += weightedImpact;
          break;
        case FindingCategory.OPERATIONAL:
          // Distribute operational findings across categories
          impact.technical += weightedImpact * 0.4;
          impact.governance += weightedImpact * 0.3;
          impact.liquidity += weightedImpact * 0.2;
          impact.reputation += weightedImpact * 0.1;
          break;
      }
    }

    return impact;
  }

  /**
   * Apply external metrics to scoring
   */
  private applyExternalMetrics(externalMetrics?: ScoringInput['externalMetrics']): CategoryScores {
    const metrics: CategoryScores = {
      technical: 0,
      governance: 0,
      liquidity: 0,
      reputation: 0
    };

    if (!externalMetrics) {
      return metrics;
    }

    // External metrics are 0-100, we use them directly as adjustments
    if (externalMetrics.technical !== undefined) {
      metrics.technical = externalMetrics.technical;
    }
    if (externalMetrics.governance !== undefined) {
      metrics.governance = externalMetrics.governance;
    }
    if (externalMetrics.liquidity !== undefined) {
      metrics.liquidity = externalMetrics.liquidity;
    }
    if (externalMetrics.reputation !== undefined) {
      metrics.reputation = externalMetrics.reputation;
    }

    return metrics;
  }

  /**
   * Calculate protocol-specific adjustments based on metadata
   */
  private calculateProtocolAdjustments(metadata?: ScoringInput['protocolMetadata']): CategoryScores {
    const adjustments: CategoryScores = {
      technical: 0,
      governance: 0,
      liquidity: 0,
      reputation: 0
    };

    if (!metadata) {
      return adjustments;
    }

    // Age adjustments - newer protocols have higher risk
    if (metadata.ageInDays !== undefined) {
      const ageRiskAdjustment = this.calculateAgeRiskAdjustment(metadata.ageInDays);
      adjustments.technical += ageRiskAdjustment;
      adjustments.reputation += ageRiskAdjustment * 0.5;
    }

    // TVL adjustments - higher TVL can indicate stability but also higher attack incentive
    if (metadata.tvlUsd !== undefined) {
      const tvlAdjustment = this.calculateTvlAdjustment(metadata.tvlUsd);
      adjustments.liquidity += tvlAdjustment;
    }

    // Audit count adjustments - more audits reduce technical risk
    if (metadata.auditCount !== undefined) {
      const auditAdjustment = this.calculateAuditAdjustment(metadata.auditCount);
      adjustments.technical -= auditAdjustment; // Negative = reduces risk
    }

    return adjustments;
  }

  /**
   * Combine baseline scores with all adjustments
   */
  private combineScores(
    baseline: CategoryScores,
    findingsImpact: CategoryScores,
    externalMetrics: CategoryScores,
    adjustments: CategoryScores
  ): CategoryScores {
    const combined: CategoryScores = {
      technical: this.clampScore(
        baseline.technical + 
        findingsImpact.technical + 
        (externalMetrics.technical || 0) * 0.3 + // External metrics have 30% weight
        adjustments.technical
      ),
      governance: this.clampScore(
        baseline.governance + 
        findingsImpact.governance + 
        (externalMetrics.governance || 0) * 0.3 +
        adjustments.governance
      ),
      liquidity: this.clampScore(
        baseline.liquidity + 
        findingsImpact.liquidity + 
        (externalMetrics.liquidity || 0) * 0.3 +
        adjustments.liquidity
      ),
      reputation: this.clampScore(
        baseline.reputation + 
        findingsImpact.reputation + 
        (externalMetrics.reputation || 0) * 0.3 +
        adjustments.reputation
      )
    };

    return combined;
  }

  /**
   * Calculate weighted composite score
   */
  private calculateWeightedScore(categoryScores: CategoryScores): number {
    return ModelUtils.calculateOverallScore(categoryScores, this.config.weights);
  }

  /**
   * Categorize risk level based on overall score
   */
  private categorizeRiskLevel(overallScore: number): RiskLevel {
    if (overallScore >= this.config.riskThresholds.critical) {
      return RiskLevel.CRITICAL;
    }
    if (overallScore >= this.config.riskThresholds.high) {
      return RiskLevel.HIGH;
    }
    if (overallScore >= this.config.riskThresholds.medium) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  /**
   * Generate actionable recommendations based on scoring results
   */
  private generateRecommendations(
    findings: Finding[],
    scores: CategoryScores,
    riskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    // Risk level specific recommendations
    if (riskLevel === RiskLevel.CRITICAL) {
      recommendations.push('⚠️ CRITICAL RISK DETECTED - Consider avoiding this protocol until issues are resolved');
    } else if (riskLevel === RiskLevel.HIGH) {
      recommendations.push('⚠️ HIGH RISK - Exercise extreme caution and limit exposure');
    }

    // Category-specific recommendations
    if (scores.technical >= 60) {
      recommendations.push('🔒 Review smart contract security - consider additional audits');
    }
    if (scores.governance >= 60) {
      recommendations.push('🏛️ Analyze governance structure and token distribution');
    }
    if (scores.liquidity >= 60) {
      recommendations.push('💧 Monitor liquidity conditions and slippage risks');
    }
    if (scores.reputation >= 60) {
      recommendations.push('👥 Research development team background and track record');
    }

    // Finding-based recommendations
    const criticalFindings = findings.filter(f => f.severity === FindingSeverity.CRITICAL);
    if (criticalFindings.length > 0) {
      recommendations.push(`🚨 Address ${criticalFindings.length} critical security finding(s) immediately`);
    }

    const highFindings = findings.filter(f => f.severity === FindingSeverity.HIGH);
    if (highFindings.length > 2) {
      recommendations.push(`⚠️ Multiple high-severity issues detected (${highFindings.length}) - comprehensive review needed`);
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ Risk levels are acceptable - continue monitoring for changes');
    } else {
      recommendations.push('📊 Consider implementing continuous monitoring for risk changes');
    }

    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  /**
   * Calculate confidence score in the assessment
   */
  private calculateConfidenceScore(
    findings: Finding[], 
    externalMetrics?: ScoringInput['externalMetrics']
  ): number {
    let confidence = 50; // Base confidence

    // Increase confidence with more findings
    confidence += Math.min(findings.length * 2, 20);

    // Increase confidence with high-confidence findings
    const highConfidenceFindings = findings.filter(f => f.confidence >= 80);
    confidence += highConfidenceFindings.length * 3;

    // Increase confidence if we have external metrics
    if (externalMetrics) {
      const metricsCount = Object.values(externalMetrics).filter(v => v !== undefined).length;
      confidence += metricsCount * 5;
    }

    return this.clampScore(confidence);
  }

  // Helper methods

  private getConfidenceMultiplier(confidence: number): number {
    if (confidence >= 80) return this.config.confidenceMultipliers.high;
    if (confidence >= 50) return this.config.confidenceMultipliers.medium;
    return this.config.confidenceMultipliers.low;
  }

  private calculateAgeRiskAdjustment(ageInDays: number): number {
    // Newer protocols (< 30 days) have higher risk
    if (ageInDays < 30) return 15;
    if (ageInDays < 90) return 10;
    if (ageInDays < 365) return 5;
    return 0; // Mature protocols (1+ years) get no age penalty
  }

  private calculateTvlAdjustment(tvlUsd: number): number {
    // Very low TVL indicates liquidity risk
    if (tvlUsd < 1000000) return 15; // < $1M TVL
    if (tvlUsd < 10000000) return 10; // < $10M TVL
    if (tvlUsd < 100000000) return 5; // < $100M TVL
    return 0; // High TVL protocols get no penalty
  }

  private calculateAuditAdjustment(auditCount: number): number {
    // More audits reduce technical risk
    if (auditCount === 0) return 0;
    if (auditCount === 1) return 5;
    if (auditCount === 2) return 10;
    return 15; // 3+ audits provide maximum benefit
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private mergeConfigurations(
    base: ScoringConfiguration, 
    override?: Partial<ScoringConfiguration>
  ): ScoringConfiguration {
    if (!override) return base;

    return {
      weights: { ...base.weights, ...override.weights },
      riskThresholds: { ...base.riskThresholds, ...override.riskThresholds },
      severityWeights: { ...base.severityWeights, ...override.severityWeights },
      confidenceMultipliers: { ...base.confidenceMultipliers, ...override.confidenceMultipliers },
      baselineScores: { ...base.baselineScores, ...override.baselineScores }
    };
  }
}

// Factory function for creating RiskScoringEngine instances
export function createRiskScoringEngine(config?: Partial<ScoringConfiguration>): RiskScoringEngine {
  return new RiskScoringEngine(config);
}

// Export the default configuration for testing/customization
export { DEFAULT_SCORING_CONFIG };
