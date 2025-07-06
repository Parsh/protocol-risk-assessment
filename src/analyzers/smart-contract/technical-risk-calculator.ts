/**
 * Technical Risk Calculator
 * Calculates technical risk scores from Slither analysis results
 */

import {
  Vulnerability,
  VulnerabilityScore,
  DeFiRiskCategories,
  SlitherImpact,
  SlitherConfidence,
  AnalysisSummary
} from './types';
import { logger } from '../../config/logger';

export class TechnicalRiskCalculator {
  private readonly SEVERITY_WEIGHTS = {
    [SlitherImpact.HIGH]: 10,
    [SlitherImpact.MEDIUM]: 5,
    [SlitherImpact.LOW]: 2,
    [SlitherImpact.INFORMATIONAL]: 0,
    [SlitherImpact.OPTIMIZATION]: 0
  };

  private readonly CONFIDENCE_MULTIPLIERS = {
    [SlitherConfidence.HIGH]: 1.0,
    [SlitherConfidence.MEDIUM]: 0.7,
    [SlitherConfidence.LOW]: 0.4
  };

  private readonly DEFI_DETECTOR_CATEGORIES = {
    flashLoan: ['reentrancy-eth', 'reentrancy-no-eth', 'dangerous-delegatecall'],
    oracle: ['timestamp', 'tautology', 'incorrect-equality'],
    reentrancy: ['reentrancy-eth', 'reentrancy-no-eth', 'reentrancy-benign'],
    accessControl: ['tx-origin', 'suicidal', 'controlled-delegatecall', 'arbitrary-send-eth'],
    upgradeability: ['dangerous-delegatecall', 'controlled-delegatecall'],
    governance: ['arbitrary-send-eth', 'missing-zero-check', 'suicidal']
  };

  /**
   * Calculate overall technical risk score from vulnerabilities
   */
  calculateTechnicalScore(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) {
      return 0;
    }

    let totalWeightedScore = 0;
    let maxPossibleScore = 0;
    const vulnerabilityScores: VulnerabilityScore[] = [];

    logger.debug('Starting technical score calculation', {
      vulnerabilityCount: vulnerabilities.length,
      firstVulnerability: vulnerabilities[0] ? {
        detector: vulnerabilities[0].detector,
        severity: vulnerabilities[0].severity,
        confidence: vulnerabilities[0].confidence
      } : null
    });

    for (const vulnerability of vulnerabilities) {
      const baseScore = this.SEVERITY_WEIGHTS[vulnerability.severity];
      const confidenceMultiplier = this.CONFIDENCE_MULTIPLIERS[vulnerability.confidence];
      const weightedScore = baseScore * confidenceMultiplier;

      logger.debug('Processing vulnerability', {
        detector: vulnerability.detector,
        severity: vulnerability.severity,
        confidence: vulnerability.confidence,
        baseScore,
        confidenceMultiplier,
        weightedScore
      });

      vulnerabilityScores.push({
        severity: vulnerability.severity,
        confidence: vulnerability.confidence,
        baseScore,
        weightedScore
      });

      totalWeightedScore += weightedScore;
      maxPossibleScore += this.SEVERITY_WEIGHTS[SlitherImpact.HIGH]; // Max possible per vulnerability
    }

    // Apply exponential scaling for multiple high-severity issues
    const scalingFactor = this.calculateScalingFactor(vulnerabilities);
    const scaledScore = totalWeightedScore * scalingFactor;

    // Normalize to 0-100 scale
    const normalizedScore = Math.min(100, (scaledScore / (maxPossibleScore * 0.1)) * 100);

    logger.debug('Technical risk score calculated', {
      vulnerabilityCount: vulnerabilities.length,
      totalWeightedScore,
      scalingFactor,
      scaledScore,
      normalizedScore
    });

    return Math.round(normalizedScore);
  }

  /**
   * Calculate scaling factor based on vulnerability distribution
   */
  private calculateScalingFactor(vulnerabilities: Vulnerability[]): number {
    const highSeverityCount = vulnerabilities.filter(v => v.severity === SlitherImpact.HIGH).length;
    const mediumSeverityCount = vulnerabilities.filter(v => v.severity === SlitherImpact.MEDIUM).length;

    // Base scaling factor
    let scalingFactor = 1.0;

    // Increase risk for multiple high-severity issues
    if (highSeverityCount > 1) {
      scalingFactor += (highSeverityCount - 1) * 0.3;
    }

    // Moderate increase for multiple medium-severity issues
    if (mediumSeverityCount > 2) {
      scalingFactor += (mediumSeverityCount - 2) * 0.1;
    }

    // Cap the scaling factor to prevent extreme scores
    return Math.min(scalingFactor, 2.5);
  }

  /**
   * Categorize DeFi-specific risks
   */
  categorizeDeFiRisks(vulnerabilities: Vulnerability[]): DeFiRiskCategories {
    const categories: DeFiRiskCategories = {
      flashLoanVulnerabilities: 0,
      oracleManipulation: 0,
      reentrancyRisks: 0,
      accessControlIssues: 0,
      upgradeabilityRisks: 0,
      governanceVulnerabilities: 0
    };

    for (const vulnerability of vulnerabilities) {
      const detector = vulnerability.detector;
      const severityWeight = this.SEVERITY_WEIGHTS[vulnerability.severity];
      const confidenceMultiplier = this.CONFIDENCE_MULTIPLIERS[vulnerability.confidence];
      const score = severityWeight * confidenceMultiplier;

      // Categorize based on detector patterns
      if (this.DEFI_DETECTOR_CATEGORIES.flashLoan.includes(detector)) {
        categories.flashLoanVulnerabilities += score;
      }

      if (this.DEFI_DETECTOR_CATEGORIES.oracle.includes(detector)) {
        categories.oracleManipulation += score;
      }

      if (this.DEFI_DETECTOR_CATEGORIES.reentrancy.includes(detector)) {
        categories.reentrancyRisks += score;
      }

      if (this.DEFI_DETECTOR_CATEGORIES.accessControl.includes(detector)) {
        categories.accessControlIssues += score;
      }

      if (this.DEFI_DETECTOR_CATEGORIES.upgradeability.includes(detector)) {
        categories.upgradeabilityRisks += score;
      }

      if (this.DEFI_DETECTOR_CATEGORIES.governance.includes(detector)) {
        categories.governanceVulnerabilities += score;
      }
    }

    // Normalize each category to 0-100 scale
    const maxCategoryScore = 50; // Reasonable max for a single category
    return {
      flashLoanVulnerabilities: Math.min(100, (categories.flashLoanVulnerabilities / maxCategoryScore) * 100),
      oracleManipulation: Math.min(100, (categories.oracleManipulation / maxCategoryScore) * 100),
      reentrancyRisks: Math.min(100, (categories.reentrancyRisks / maxCategoryScore) * 100),
      accessControlIssues: Math.min(100, (categories.accessControlIssues / maxCategoryScore) * 100),
      upgradeabilityRisks: Math.min(100, (categories.upgradeabilityRisks / maxCategoryScore) * 100),
      governanceVulnerabilities: Math.min(100, (categories.governanceVulnerabilities / maxCategoryScore) * 100)
    };
  }

  /**
   * Generate technical recommendations based on vulnerability analysis
   */
  generateTechnicalRecommendations(
    vulnerabilities: Vulnerability[],
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    // High-level recommendations based on overall risk score
    if (riskScore >= 80) {
      recommendations.push('CRITICAL: Immediate security audit required before any production deployment');
      recommendations.push('Consider implementing comprehensive security measures and emergency pause functionality');
    } else if (riskScore >= 60) {
      recommendations.push('HIGH RISK: Professional security review strongly recommended');
      recommendations.push('Implement additional security controls and monitoring');
    } else if (riskScore >= 40) {
      recommendations.push('MEDIUM RISK: Review and address identified vulnerabilities');
      recommendations.push('Consider implementing additional security best practices');
    } else if (riskScore >= 20) {
      recommendations.push('LOW RISK: Address minor security concerns and code quality issues');
    } else {
      recommendations.push('Good security posture, continue following security best practices');
    }

    // Specific recommendations based on vulnerability patterns
    const severeCritical = vulnerabilities.filter(v => 
      v.severity === SlitherImpact.HIGH && v.confidence === SlitherConfidence.HIGH
    );

    if (severeCritical.length > 0) {
      recommendations.push(`Address ${severeCritical.length} critical high-confidence vulnerabilities immediately`);
    }

    const reentrancyIssues = vulnerabilities.filter(v => 
      v.detector.includes('reentrancy')
    );

    if (reentrancyIssues.length > 0) {
      recommendations.push('Implement reentrancy guards using OpenZeppelin\'s ReentrancyGuard');
    }

    const accessControlIssues = vulnerabilities.filter(v => 
      ['tx-origin', 'suicidal', 'arbitrary-send-eth'].includes(v.detector)
    );

    if (accessControlIssues.length > 0) {
      recommendations.push('Review and strengthen access control mechanisms');
    }

    const oracleIssues = vulnerabilities.filter(v => 
      ['timestamp', 'incorrect-equality'].includes(v.detector)
    );

    if (oracleIssues.length > 0) {
      recommendations.push('Implement robust oracle price validation and manipulation protection');
    }

    return recommendations;
  }

  /**
   * Calculate vulnerability density (vulnerabilities per 100 lines of code)
   */
  calculateVulnerabilityDensity(
    vulnerabilities: Vulnerability[],
    estimatedLinesOfCode: number = 1000
  ): number {
    if (estimatedLinesOfCode === 0) {
      return 0;
    }

    return (vulnerabilities.length / estimatedLinesOfCode) * 100;
  }

  /**
   * Generate detailed risk breakdown
   */
  generateRiskBreakdown(vulnerabilities: Vulnerability[]): {
    severityDistribution: Record<SlitherImpact, number>;
    confidenceDistribution: Record<SlitherConfidence, number>;
    detectorFrequency: Record<string, number>;
    riskHeatmap: Array<{ detector: string; severity: SlitherImpact; count: number; risk: number }>;
  } {
    const severityDistribution = {
      [SlitherImpact.HIGH]: 0,
      [SlitherImpact.MEDIUM]: 0,
      [SlitherImpact.LOW]: 0,
      [SlitherImpact.INFORMATIONAL]: 0,
      [SlitherImpact.OPTIMIZATION]: 0
    };

    const confidenceDistribution = {
      [SlitherConfidence.HIGH]: 0,
      [SlitherConfidence.MEDIUM]: 0,
      [SlitherConfidence.LOW]: 0
    };

    const detectorFrequency: Record<string, number> = {};
    const detectorRisk: Record<string, { severity: SlitherImpact; count: number; totalRisk: number }> = {};

    for (const vulnerability of vulnerabilities) {
      // Count by severity
      severityDistribution[vulnerability.severity]++;

      // Count by confidence
      confidenceDistribution[vulnerability.confidence]++;

      // Count by detector
      detectorFrequency[vulnerability.detector] = (detectorFrequency[vulnerability.detector] || 0) + 1;

      // Calculate risk per detector
      const riskScore = this.SEVERITY_WEIGHTS[vulnerability.severity] * 
                       this.CONFIDENCE_MULTIPLIERS[vulnerability.confidence];

      if (!detectorRisk[vulnerability.detector]) {
        detectorRisk[vulnerability.detector] = {
          severity: vulnerability.severity,
          count: 0,
          totalRisk: 0
        };
      }

      const detectorData = detectorRisk[vulnerability.detector];
      if (detectorData) {
        detectorData.count++;
        detectorData.totalRisk += riskScore;
      }
    }

    // Generate risk heatmap
    const riskHeatmap = Object.entries(detectorRisk)
      .map(([detector, data]) => ({
        detector,
        severity: data.severity,
        count: data.count,
        risk: data.totalRisk
      }))
      .sort((a, b) => b.risk - a.risk);

    return {
      severityDistribution,
      confidenceDistribution,
      detectorFrequency,
      riskHeatmap
    };
  }
}

export const technicalRiskCalculator = new TechnicalRiskCalculator();
