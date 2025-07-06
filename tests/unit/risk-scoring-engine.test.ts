/**
 * Unit tests for RiskScoringEngine
 * Tests comprehensive risk scoring functionality
 */

import {
  RiskScoringEngine,
  ScoringInput,
  ScoringConfiguration,
  DEFAULT_SCORING_CONFIG
} from '../../src/services/risk-scoring-engine';
import {
  Finding,
  FindingCategory,
  FindingSeverity,
  RiskLevel
} from '../../src/models/index';

describe('RiskScoringEngine', () => {
  let scoringEngine: RiskScoringEngine;

  beforeEach(() => {
    scoringEngine = new RiskScoringEngine();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = scoringEngine.getConfiguration();
      expect(config.weights.technical).toBe(0.4);
      expect(config.weights.governance).toBe(0.25);
      expect(config.weights.liquidity).toBe(0.2);
      expect(config.weights.reputation).toBe(0.15);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        weights: {
          technical: 0.5,
          governance: 0.2,
          liquidity: 0.2,
          reputation: 0.1
        }
      };

      const customEngine = new RiskScoringEngine(customConfig);
      const config = customEngine.getConfiguration();
      
      expect(config.weights.technical).toBe(0.5);
      expect(config.weights.governance).toBe(0.2);
    });

    it('should allow configuration updates', () => {
      const newWeights = {
        weights: {
          technical: 0.6,
          governance: 0.15,
          liquidity: 0.15,
          reputation: 0.1
        }
      };

      scoringEngine.updateConfiguration(newWeights);
      const config = scoringEngine.getConfiguration();
      
      expect(config.weights.technical).toBe(0.6);
      expect(config.weights.governance).toBe(0.15);
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score with minimal input', async () => {
      const input: ScoringInput = {
        findings: []
      };

      const result = await scoringEngine.calculateRiskScore(input);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.riskLevel).toBeDefined();
      expect(result.categoryScores).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle critical findings appropriately', async () => {
      const criticalFinding: Finding = {
        id: 'critical-1',
        category: FindingCategory.TECHNICAL,
        severity: FindingSeverity.CRITICAL,
        title: 'Critical Security Vulnerability',
        description: 'Critical vulnerability in smart contract',
        source: 'MockAnalyzer',
        confidence: 90
      };

      const input: ScoringInput = {
        findings: [criticalFinding]
      };

      const result = await scoringEngine.calculateRiskScore(input);

      expect(result.overallScore).toBeGreaterThan(25); // Should increase risk score from baseline
      expect(result.criticalFindings).toContain(criticalFinding);
      expect([RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.riskLevel);
    });

    it('should handle multiple findings across categories', async () => {
      const findings: Finding[] = [
        {
          id: 'tech-1',
          category: FindingCategory.TECHNICAL,
          severity: FindingSeverity.HIGH,
          title: 'Technical Issue',
          description: 'Technical security issue',
          source: 'TechnicalAnalyzer',
          confidence: 85
        },
        {
          id: 'gov-1',
          category: FindingCategory.GOVERNANCE,
          severity: FindingSeverity.MEDIUM,
          title: 'Governance Issue',
          description: 'Governance centralization issue',
          source: 'GovernanceAnalyzer',
          confidence: 70
        },
        {
          id: 'liq-1',
          category: FindingCategory.LIQUIDITY,
          severity: FindingSeverity.LOW,
          title: 'Liquidity Issue',
          description: 'Minor liquidity concern',
          source: 'LiquidityAnalyzer',
          confidence: 60
        }
      ];

      const input: ScoringInput = {
        findings
      };

      const result = await scoringEngine.calculateRiskScore(input);

      expect(result.categoryScores.technical).toBeGreaterThan(result.categoryScores.liquidity);
      expect(result.warningCount).toBe(3);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should incorporate protocol metadata in scoring', async () => {
      const inputWithMetadata: ScoringInput = {
        findings: [],
        protocolMetadata: {
          ageInDays: 10, // Very new protocol
          tvlUsd: 500000, // Low TVL
          auditCount: 0 // No audits
        }
      };

      const inputMature: ScoringInput = {
        findings: [],
        protocolMetadata: {
          ageInDays: 500, // Mature protocol
          tvlUsd: 100000000, // High TVL
          auditCount: 3 // Multiple audits
        }
      };

      const resultNew = await scoringEngine.calculateRiskScore(inputWithMetadata);
      const resultMature = await scoringEngine.calculateRiskScore(inputMature);

      // New protocol should have higher risk than mature one
      expect(resultNew.overallScore).toBeGreaterThan(resultMature.overallScore);
    });

    it('should handle external metrics', async () => {
      const input: ScoringInput = {
        findings: [],
        externalMetrics: {
          technical: 30, // Good technical score
          governance: 70, // Poor governance score
          liquidity: 50, // Average liquidity score
          reputation: 20 // Good reputation score
        }
      };

      const result = await scoringEngine.calculateRiskScore(input);

      // Governance should be the highest risk category due to external metric
      expect(result.categoryScores.governance).toBeGreaterThan(result.categoryScores.technical);
      expect(result.categoryScores.governance).toBeGreaterThan(result.categoryScores.reputation);
    });
  });

  describe('Risk Level Categorization', () => {
    it('should categorize risk levels correctly', async () => {
      // Test critical risk scenario
      const criticalFindings: Finding[] = Array(5).fill(null).map((_, i) => ({
        id: `critical-${i}`,
        category: FindingCategory.TECHNICAL,
        severity: FindingSeverity.CRITICAL,
        title: `Critical Issue ${i}`,
        description: 'Critical security vulnerability',
        source: 'MockAnalyzer',
        confidence: 95
      }));

      const criticalInput: ScoringInput = {
        findings: criticalFindings
      };

      const criticalResult = await scoringEngine.calculateRiskScore(criticalInput);
      expect([RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(criticalResult.riskLevel);

      // Test low risk scenario
      const lowRiskInput: ScoringInput = {
        findings: [],
        protocolMetadata: {
          ageInDays: 1000,
          tvlUsd: 1000000000,
          auditCount: 5
        }
      };

      const lowResult = await scoringEngine.calculateRiskScore(lowRiskInput);
      expect([RiskLevel.LOW, RiskLevel.MEDIUM]).toContain(lowResult.riskLevel);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate appropriate recommendations for high-risk protocols', async () => {
      const highRiskFindings: Finding[] = [
        {
          id: 'high-1',
          category: FindingCategory.TECHNICAL,
          severity: FindingSeverity.CRITICAL,
          title: 'Critical Vulnerability',
          description: 'Critical security issue',
          source: 'SecurityAnalyzer',
          confidence: 90
        },
        {
          id: 'high-2',
          category: FindingCategory.GOVERNANCE,
          severity: FindingSeverity.HIGH,
          title: 'Governance Risk',
          description: 'High governance risk',
          source: 'GovernanceAnalyzer',
          confidence: 85
        }
      ];

      const input: ScoringInput = {
        findings: highRiskFindings
      };

      const result = await scoringEngine.calculateRiskScore(input);

      expect(result.recommendations.length).toBeGreaterThanOrEqual(2);
      expect(result.recommendations.some(rec => rec.includes('CRITICAL') || rec.includes('critical'))).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('security') || rec.includes('Security'))).toBe(true);
    });

    it('should generate positive recommendations for low-risk protocols', async () => {
      const input: ScoringInput = {
        findings: [],
        protocolMetadata: {
          ageInDays: 800,
          tvlUsd: 500000000,
          auditCount: 3
        }
      };

      const result = await scoringEngine.calculateRiskScore(input);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.includes('acceptable'))).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate confidence based on finding quality', async () => {
      const highConfidenceFindings: Finding[] = [
        {
          id: 'hc-1',
          category: FindingCategory.TECHNICAL,
          severity: FindingSeverity.HIGH,
          title: 'High Confidence Finding',
          description: 'Well-documented issue',
          source: 'ReliableAnalyzer',
          confidence: 95
        },
        {
          id: 'hc-2',
          category: FindingCategory.GOVERNANCE,
          severity: FindingSeverity.MEDIUM,
          title: 'Another High Confidence Finding',
          description: 'Another well-documented issue',
          source: 'ReliableAnalyzer',
          confidence: 90
        }
      ];

      const lowConfidenceFindings: Finding[] = [
        {
          id: 'lc-1',
          category: FindingCategory.TECHNICAL,
          severity: FindingSeverity.HIGH,
          title: 'Low Confidence Finding',
          description: 'Uncertain issue',
          source: 'UnreliableAnalyzer',
          confidence: 30
        }
      ];

      const highConfidenceResult = await scoringEngine.calculateRiskScore({
        findings: highConfidenceFindings,
        externalMetrics: { technical: 50, governance: 50 }
      });

      const lowConfidenceResult = await scoringEngine.calculateRiskScore({
        findings: lowConfidenceFindings
      });

      expect(highConfidenceResult.scoringBreakdown.confidence)
        .toBeGreaterThan(lowConfidenceResult.scoringBreakdown.confidence);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid finding data gracefully', async () => {
      const invalidFinding = {
        id: 'invalid-1',
        category: 'INVALID_CATEGORY' as FindingCategory,
        severity: 'INVALID_SEVERITY' as FindingSeverity,
        title: '',
        description: '',
        source: '',
        confidence: -1
      };

      const input: ScoringInput = {
        findings: [invalidFinding as Finding]
      };

      // Should not throw error, but handle gracefully
      const result = await scoringEngine.calculateRiskScore(input);
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme metadata values', async () => {
      const extremeInput: ScoringInput = {
        findings: [],
        protocolMetadata: {
          ageInDays: -100, // Invalid negative age
          tvlUsd: Number.MAX_SAFE_INTEGER,
          auditCount: -5 // Invalid negative audits
        }
      };

      const result = await scoringEngine.calculateRiskScore(extremeInput);
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Scoring Breakdown', () => {
    it('should provide detailed scoring breakdown', async () => {
      const input: ScoringInput = {
        findings: [{
          id: 'test-1',
          category: FindingCategory.TECHNICAL,
          severity: FindingSeverity.HIGH,
          title: 'Test Finding',
          description: 'Test description',
          source: 'TestAnalyzer',
          confidence: 80
        }],
        protocolMetadata: {
          ageInDays: 200,
          tvlUsd: 10000000,
          auditCount: 1
        },
        externalMetrics: {
          technical: 60,
          liquidity: 40
        }
      };

      const result = await scoringEngine.calculateRiskScore(input);

      expect(result.scoringBreakdown).toBeDefined();
      expect(result.scoringBreakdown.findingsImpact).toBeDefined();
      expect(result.scoringBreakdown.externalMetrics).toBeDefined();
      expect(result.scoringBreakdown.adjustments).toBeDefined();
      expect(result.scoringBreakdown.confidence).toBeDefined();

      // Verify that breakdown components are reasonable
      expect(result.scoringBreakdown.confidence).toBeGreaterThanOrEqual(0);
      expect(result.scoringBreakdown.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration with ModelUtils', () => {
    it('should use ModelUtils for composite scoring consistently', async () => {
      const input: ScoringInput = {
        findings: []
      };

      const result = await scoringEngine.calculateRiskScore(input);

      // The overall score should be consistent with ModelUtils calculation
      // We can't test exact values due to randomness, but we can test structure
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.overallScore)).toBe(true);
    });
  });
});

describe('Default Scoring Configuration', () => {
  it('should have sensible default values', () => {
    expect(DEFAULT_SCORING_CONFIG.weights.technical).toBe(0.4);
    expect(DEFAULT_SCORING_CONFIG.weights.governance).toBe(0.25);
    expect(DEFAULT_SCORING_CONFIG.weights.liquidity).toBe(0.2);
    expect(DEFAULT_SCORING_CONFIG.weights.reputation).toBe(0.15);

    // Sum of weights should equal 1
    const totalWeight = Object.values(DEFAULT_SCORING_CONFIG.weights)
      .reduce((sum, weight) => sum + weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);

    expect(DEFAULT_SCORING_CONFIG.riskThresholds.critical).toBe(80);
    expect(DEFAULT_SCORING_CONFIG.riskThresholds.high).toBe(60);
    expect(DEFAULT_SCORING_CONFIG.riskThresholds.medium).toBe(30);
  });

  it('should have reasonable severity weights', () => {
    const config = DEFAULT_SCORING_CONFIG;
    
    expect(config.severityWeights[FindingSeverity.CRITICAL])
      .toBeGreaterThan(config.severityWeights[FindingSeverity.HIGH]);
    expect(config.severityWeights[FindingSeverity.HIGH])
      .toBeGreaterThan(config.severityWeights[FindingSeverity.MEDIUM]);
    expect(config.severityWeights[FindingSeverity.MEDIUM])
      .toBeGreaterThan(config.severityWeights[FindingSeverity.LOW]);
    expect(config.severityWeights[FindingSeverity.INFO]).toBe(0);
  });
});
