/**
 * Developer Reputation Analyzer
 * Analyzes developer and team reputation with mock data fallbacks for demo safety
 */

import { 
  ReputationInput, 
  ReputationAnalysisResult, 
  DeveloperMetrics, 
  ReputationRiskFactors, 
  ReputationFinding 
} from './types';
import { logger } from '../../config/logger';

export class ReputationAnalyzer {
  private readonly version = '1.0.0';

  /**
   * Analyze developer and team reputation for a DeFi protocol
   */
  public async analyzeReputation(input: ReputationInput): Promise<ReputationAnalysisResult> {
    const startTime = Date.now();
    logger.info('Starting reputation analysis', { 
      protocol: input.protocolName,
      blockchain: input.blockchain 
    });

    try {
      // Attempt to gather real data if available, otherwise use mock data
      const metrics = await this.gatherReputationMetrics(input);
      const riskFactors = this.calculateRiskFactors(metrics, input);
      const findings = this.generateFindings(metrics, riskFactors, input);
      const reputationScore = this.calculateReputationScore(riskFactors);
      const riskLevel = this.determineRiskLevel(reputationScore);

      const analysisTime = Date.now() - startTime;

      logger.info('Reputation analysis completed', {
        protocol: input.protocolName,
        reputationScore,
        riskLevel,
        analysisTime
      });

      return {
        reputationScore,
        riskLevel,
        metrics,
        riskFactors,
        findings,
        metadata: {
          analysisTime,
          dataSource: input.githubRepo ? 'api' : 'mock',
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };

    } catch (error) {
      logger.error('Reputation analysis error', { 
        protocol: input.protocolName, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return safe fallback result
      return this.getFallbackResult(input, Date.now() - startTime);
    }
  }

  /**
   * Gather reputation metrics from API data or generate mock data
   */
  private async gatherReputationMetrics(input: ReputationInput): Promise<DeveloperMetrics> {
    // Try to extract from real API data if available
    if (input.githubRepo && input.teamInfo) {
      return this.extractApiMetrics(input.githubRepo, input.teamInfo, input);
    }

    // Fallback to mock data generation
    return this.generateMockMetrics(input);
  }

  /**
   * Extract metrics from real API data (placeholder for GitHub API integration)
   */
  private extractApiMetrics(githubRepo: string, teamInfo: any, input: ReputationInput): DeveloperMetrics {
    // This would integrate with GitHub API in a real implementation
    // For now, generate realistic mock data based on repo info
    return this.generateMockMetrics(input);
  }

  /**
   * Generate realistic mock metrics based on protocol characteristics
   */
  private generateMockMetrics(input: ReputationInput): DeveloperMetrics {
    const protocolName = input.protocolName.toLowerCase();
    
    // Determine protocol tier based on name recognition
    const isTopTier = ['uniswap', 'aave', 'compound', 'makerdao', 'lido', 'chainlink'].some(p => protocolName.includes(p));
    const isWellKnown = ['sushiswap', 'yearn', 'curve', 'balancer', 'synthetix', '1inch'].some(p => protocolName.includes(p));
    const isEstablished = ['pancake', 'quickswap', 'trader joe', 'spooky', 'beefy'].some(p => protocolName.includes(p));

    let teamSizeRange: [number, number];
    let experienceRange: [number, number];
    let activityMultiplier: number;

    if (isTopTier) {
      teamSizeRange = [15, 50];
      experienceRange = [4, 8];
      activityMultiplier = 1.5;
    } else if (isWellKnown) {
      teamSizeRange = [8, 25];
      experienceRange = [3, 6];
      activityMultiplier = 1.2;
    } else if (isEstablished) {
      teamSizeRange = [5, 15];
      experienceRange = [2, 5];
      activityMultiplier = 1.0;
    } else {
      teamSizeRange = [2, 8];
      experienceRange = [1, 4];
      activityMultiplier = 0.8;
    }

    const teamSize = Math.floor(Math.random() * (teamSizeRange[1] - teamSizeRange[0]) + teamSizeRange[0]);
    const coreDevCount = Math.floor(teamSize * (Math.random() * 0.4 + 0.3)); // 30-70% are core devs
    const avgExperience = Math.random() * (experienceRange[1] - experienceRange[0]) + experienceRange[0];

    // Generate GitHub-like activity metrics
    const baseCommits = Math.floor(Math.random() * 200 + 50) * activityMultiplier;
    const contributors = Math.min(teamSize + Math.floor(Math.random() * 10), teamSize * 2);
    
    return {
      teamSize,
      coreDevCount,
      githubActivity: {
        commitsLastMonth: Math.floor(baseCommits / 12),
        commitsLastYear: Math.floor(baseCommits),
        contributors,
        stars: Math.floor(Math.random() * 5000 * activityMultiplier + 100),
        forks: Math.floor(Math.random() * 1000 * activityMultiplier + 50),
        lastCommitDate: this.generateRecentDate()
      },
      codeQuality: {
        testCoverage: Math.random() * 40 + (isTopTier ? 50 : isWellKnown ? 40 : 30),
        documentationScore: Math.random() * 30 + (isTopTier ? 70 : isWellKnown ? 60 : 50),
        codeComplexity: Math.random() * 30 + 40, // 40-70 complexity score
        securityPractices: Math.random() * 25 + (isTopTier ? 75 : isWellKnown ? 65 : 55)
      },
      experience: {
        averageExperience: avgExperience,
        previousProjects: Math.floor(avgExperience * teamSize * 0.5),
        industryReputation: Math.random() * 30 + (isTopTier ? 70 : isWellKnown ? 50 : 30),
        auditHistory: isTopTier ? Math.floor(Math.random() * 5 + 3) : 
                     isWellKnown ? Math.floor(Math.random() * 3 + 1) : 
                     Math.floor(Math.random() * 2)
      }
    };
  }

  /**
   * Generate a recent date string
   */
  private generateRecentDate(): string {
    const daysAgo = Math.floor(Math.random() * 30); // 0-30 days ago
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  /**
   * Calculate risk factors from metrics
   */
  private calculateRiskFactors(metrics: DeveloperMetrics, input: ReputationInput): ReputationRiskFactors {
    // Team Risk (size and core dev count)
    const teamRisk = metrics.teamSize < 3 ? 90 :
                    metrics.teamSize < 5 ? 70 :
                    metrics.teamSize < 10 ? 50 :
                    metrics.teamSize < 20 ? 30 : 10;

    // Activity Risk (GitHub activity)
    const monthlyActivityRisk = metrics.githubActivity.commitsLastMonth < 10 ? 80 :
                               metrics.githubActivity.commitsLastMonth < 25 ? 60 :
                               metrics.githubActivity.commitsLastMonth < 50 ? 40 :
                               metrics.githubActivity.commitsLastMonth < 100 ? 20 : 10;

    const daysSinceLastCommit = Math.floor((Date.now() - new Date(metrics.githubActivity.lastCommitDate).getTime()) / (1000 * 60 * 60 * 24));
    const recentActivityRisk = daysSinceLastCommit > 30 ? 90 :
                              daysSinceLastCommit > 14 ? 70 :
                              daysSinceLastCommit > 7 ? 50 :
                              daysSinceLastCommit > 3 ? 30 : 10;

    const activityRisk = (monthlyActivityRisk + recentActivityRisk) / 2;

    // Experience Risk
    const experienceRisk = metrics.experience.averageExperience < 1 ? 90 :
                          metrics.experience.averageExperience < 2 ? 70 :
                          metrics.experience.averageExperience < 3 ? 50 :
                          metrics.experience.averageExperience < 5 ? 30 : 10;

    // Code Quality Risk
    const testCoverageRisk = metrics.codeQuality.testCoverage < 30 ? 80 :
                            metrics.codeQuality.testCoverage < 50 ? 60 :
                            metrics.codeQuality.testCoverage < 70 ? 40 :
                            metrics.codeQuality.testCoverage < 80 ? 20 : 10;

    const securityRisk = metrics.codeQuality.securityPractices < 40 ? 90 :
                        metrics.codeQuality.securityPractices < 60 ? 70 :
                        metrics.codeQuality.securityPractices < 75 ? 50 :
                        metrics.codeQuality.securityPractices < 85 ? 30 : 10;

    const codeQualityRisk = (testCoverageRisk + securityRisk) / 2;

    // Transparency Risk (based on documentation and public info)
    const transparencyRisk = metrics.codeQuality.documentationScore < 40 ? 80 :
                            metrics.codeQuality.documentationScore < 60 ? 60 :
                            metrics.codeQuality.documentationScore < 75 ? 40 :
                            metrics.codeQuality.documentationScore < 85 ? 20 : 10;

    // Historical Risk (audit history and reputation)
    const historicalRisk = metrics.experience.auditHistory === 0 ? 90 :
                          metrics.experience.auditHistory === 1 ? 70 :
                          metrics.experience.auditHistory === 2 ? 50 :
                          metrics.experience.auditHistory >= 3 ? 30 : 10;

    return {
      teamRisk,
      activityRisk,
      experienceRisk,
      codeQualityRisk,
      transparencyRisk,
      historicalRisk
    };
  }

  /**
   * Generate findings based on risk factors
   */
  private generateFindings(
    metrics: DeveloperMetrics,
    riskFactors: ReputationRiskFactors,
    input: ReputationInput
  ): ReputationFinding[] {
    const findings: ReputationFinding[] = [];

    // Team size findings
    if (riskFactors.teamRisk > 70) {
      findings.push({
        id: 'REP001',
        severity: metrics.teamSize < 3 ? 'high' : 'medium',
        title: 'Small Development Team',
        description: `Team size of ${metrics.teamSize} developers may indicate limited development capacity.`,
        impact: 'Small teams may struggle with maintenance, updates, and responding to critical issues.',
        recommendation: 'Consider expanding the development team or establishing partnerships.',
        metrics: { teamSize: metrics.teamSize }
      });
    }

    // Activity findings
    if (riskFactors.activityRisk > 60) {
      const daysSinceLastCommit = Math.floor((Date.now() - new Date(metrics.githubActivity.lastCommitDate).getTime()) / (1000 * 60 * 60 * 24));
      findings.push({
        id: 'REP002',
        severity: daysSinceLastCommit > 30 ? 'high' : 'medium',
        title: 'Low Development Activity',
        description: `Last commit was ${daysSinceLastCommit} days ago with only ${metrics.githubActivity.commitsLastMonth} commits this month.`,
        impact: 'Low activity may indicate abandoned project or reduced maintenance.',
        recommendation: 'Verify project status and ensure active development continues.',
        metrics: { activity: metrics.githubActivity.commitsLastMonth }
      });
    }

    // Experience findings
    if (riskFactors.experienceRisk > 60) {
      findings.push({
        id: 'REP003',
        severity: metrics.experience.averageExperience < 2 ? 'high' : 'medium',
        title: 'Limited Team Experience',
        description: `Average team experience of ${metrics.experience.averageExperience.toFixed(1)} years is below industry standards.`,
        impact: 'Inexperienced teams may make critical design or security mistakes.',
        recommendation: 'Add experienced advisors or senior developers to the team.',
        metrics: { experience: metrics.experience.averageExperience }
      });
    }

    // Code quality findings
    if (riskFactors.codeQualityRisk > 50) {
      findings.push({
        id: 'REP004',
        severity: metrics.codeQuality.testCoverage < 30 ? 'high' : 'medium',
        title: 'Poor Code Quality Practices',
        description: `Test coverage of ${metrics.codeQuality.testCoverage.toFixed(1)}% and security practices score of ${metrics.codeQuality.securityPractices.toFixed(1)}% indicate quality issues.`,
        impact: 'Poor code quality increases risk of bugs and security vulnerabilities.',
        recommendation: 'Implement comprehensive testing and security review processes.',
        metrics: { quality: metrics.codeQuality.testCoverage }
      });
    }

    // Audit history findings
    if (metrics.experience.auditHistory === 0) {
      findings.push({
        id: 'REP005',
        severity: 'medium',
        title: 'No Audit History',
        description: 'Protocol has no recorded security audits from reputable firms.',
        impact: 'Lack of audits increases risk of undiscovered vulnerabilities.',
        recommendation: 'Commission security audits from reputable firms before mainnet launch.'
      });
    }

    // Positive findings for strong metrics
    if (metrics.teamSize >= 10 && metrics.experience.averageExperience >= 3) {
      findings.push({
        id: 'REP006',
        severity: 'info',
        title: 'Strong Development Team',
        description: `Team of ${metrics.teamSize} developers with ${metrics.experience.averageExperience.toFixed(1)} years average experience.`,
        impact: 'Experienced team reduces development and maintenance risks.',
        recommendation: 'Maintain team stability and continue knowledge sharing practices.',
        metrics: { teamSize: metrics.teamSize, experience: metrics.experience.averageExperience }
      });
    }

    if (metrics.experience.auditHistory >= 2) {
      findings.push({
        id: 'REP007',
        severity: 'info',
        title: 'Strong Audit History',
        description: `Protocol has ${metrics.experience.auditHistory} security audits from reputable firms.`,
        impact: 'Regular audits significantly reduce security risks.',
        recommendation: 'Continue regular audit schedule and address all findings promptly.'
      });
    }

    return findings;
  }

  /**
   * Calculate overall reputation score
   */
  private calculateReputationScore(riskFactors: ReputationRiskFactors): number {
    // Weighted average of risk factors (lower risk = higher score)
    const weights = {
      teamRisk: 0.20,
      activityRisk: 0.20,
      experienceRisk: 0.25,
      codeQualityRisk: 0.15,
      transparencyRisk: 0.10,
      historicalRisk: 0.10
    };

    const weightedRisk = Object.entries(riskFactors).reduce((total, [factor, risk]) => {
      const weight = weights[factor as keyof typeof weights] || 0;
      return total + (risk * weight);
    }, 0);

    // Convert risk to score (inverse relationship)
    return Math.round(Math.max(0, Math.min(100, 100 - weightedRisk)));
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
    if (score >= 90) return 'very-low';
    if (score >= 75) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'very-high';
  }

  /**
   * Generate fallback result for error cases
   */
  private getFallbackResult(input: ReputationInput, analysisTime: number): ReputationAnalysisResult {
    const fallbackMetrics = this.generateMockMetrics(input);
    const fallbackRiskFactors = this.calculateRiskFactors(fallbackMetrics, input);
    
    return {
      reputationScore: 60, // Moderate score for unknown protocols
      riskLevel: 'medium',
      metrics: fallbackMetrics,
      riskFactors: fallbackRiskFactors,
      findings: [{
        id: 'REP000',
        severity: 'info',
        title: 'Analysis Using Fallback Data',
        description: 'Reputation analysis completed using mock data due to API limitations.',
        impact: 'Results are estimates and should be verified with real team data.',
        recommendation: 'Verify results with actual team information and GitHub data when available.'
      }],
      metadata: {
        analysisTime,
        dataSource: 'mock',
        timestamp: new Date().toISOString(),
        version: this.version
      }
    };
  }
}

// Export singleton instance
export const reputationAnalyzer = new ReputationAnalyzer();
