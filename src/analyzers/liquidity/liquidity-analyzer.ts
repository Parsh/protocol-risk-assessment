/**
 * Liquidity Analyzer
 * Analyzes liquidity risks with mock data fallbacks for demo safety
 */

import { 
  LiquidityInput, 
  LiquidityAnalysisResult, 
  LiquidityMetrics, 
  LiquidityRiskFactors, 
  LiquidityFinding 
} from './types';
import { logger } from '../../config/logger';

export class LiquidityAnalyzer {
  private readonly version = '1.0.0';

  /**
   * Analyze liquidity risks for a DeFi protocol
   */
  public async analyzeLiquidity(input: LiquidityInput): Promise<LiquidityAnalysisResult> {
    const startTime = Date.now();
    logger.info('Starting liquidity analysis', { 
      protocol: input.protocolName,
      blockchain: input.blockchain 
    });

    try {
      // Attempt to use real data if available, otherwise use mock data
      const metrics = await this.gatherLiquidityMetrics(input);
      const riskFactors = this.calculateRiskFactors(metrics, input);
      const findings = this.generateFindings(metrics, riskFactors, input);
      const liquidityScore = this.calculateLiquidityScore(riskFactors);
      const riskLevel = this.determineRiskLevel(liquidityScore);

      const analysisTime = Date.now() - startTime;

      logger.info('Liquidity analysis completed', {
        protocol: input.protocolName,
        liquidityScore,
        riskLevel,
        analysisTime
      });

      return {
        liquidityScore,
        riskLevel,
        metrics,
        riskFactors,
        findings,
        metadata: {
          analysisTime,
          dataSource: input.defiData ? 'api' : 'mock',
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };

    } catch (error) {
      logger.error('Liquidity analysis error', { 
        protocol: input.protocolName, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return safe fallback result
      return this.getFallbackResult(input, Date.now() - startTime);
    }
  }

  /**
   * Gather liquidity metrics from API data or generate mock data
   */
  private async gatherLiquidityMetrics(input: LiquidityInput): Promise<LiquidityMetrics> {
    // Try to extract from real API data first
    if (input.defiData) {
      const protocolData = input.defiData.protocolInfo || input.defiData.protocolByAddress;
      if (protocolData) {
        return this.extractApiMetrics(protocolData, input);
      }
    }

    // Fallback to mock data generation
    return this.generateMockMetrics(input);
  }

  /**
   * Extract metrics from real API data
   */
  private extractApiMetrics(protocolData: any, input: LiquidityInput): LiquidityMetrics {
    const tvl = protocolData.tvl || 0;
    const volume = protocolData.volume24h || tvl * 0.1; // Estimate 10% daily volume
    const marketCap = protocolData.mcap || tvl * 1.5;

    return {
      tvl,
      dailyVolume: volume,
      marketCap,
      circulatingSupply: protocolData.circulatingSupply || marketCap / 10,
      liquidityRatio: tvl > 0 ? volume / tvl : 0,
      depthAnalysis: {
        bid2PercentDepth: tvl * 0.02, // 2% of TVL
        ask2PercentDepth: tvl * 0.02,
        bidAskSpread: tvl > 1000000 ? 0.001 : 0.005 // Lower spread for higher TVL
      },
      poolDistribution: {
        topPoolConcentration: Math.random() * 0.4 + 0.3, // 30-70%
        numberOfPools: Math.floor(tvl / 1000000) + 1,
        averagePoolSize: tvl / (Math.floor(tvl / 1000000) + 1)
      }
    };
  }

  /**
   * Generate realistic mock metrics
   */
  private generateMockMetrics(input: LiquidityInput): LiquidityMetrics {
    // Generate metrics based on protocol characteristics
    const protocolName = input.protocolName.toLowerCase();
    const isLargeCap = ['uniswap', 'aave', 'compound', 'makerdao', 'lido'].some(p => protocolName.includes(p));
    const isMidCap = ['sushiswap', 'yearn', 'curve', 'balancer'].some(p => protocolName.includes(p));

    let baseTvl: number;
    if (isLargeCap) {
      baseTvl = Math.random() * 5000000000 + 1000000000; // $1B - $6B
    } else if (isMidCap) {
      baseTvl = Math.random() * 500000000 + 100000000; // $100M - $600M
    } else {
      baseTvl = Math.random() * 50000000 + 10000000; // $10M - $60M
    }

    const dailyVolume = baseTvl * (Math.random() * 0.2 + 0.05); // 5-25% of TVL
    const marketCap = baseTvl * (Math.random() * 1.0 + 1.2); // 1.2-2.2x TVL

    return {
      tvl: baseTvl,
      dailyVolume,
      marketCap,
      circulatingSupply: marketCap / (Math.random() * 50 + 10), // Random token price
      liquidityRatio: dailyVolume / baseTvl,
      depthAnalysis: {
        bid2PercentDepth: baseTvl * (Math.random() * 0.03 + 0.01), // 1-4% of TVL
        ask2PercentDepth: baseTvl * (Math.random() * 0.03 + 0.01),
        bidAskSpread: baseTvl > 100000000 ? Math.random() * 0.002 + 0.0005 : Math.random() * 0.01 + 0.002
      },
      poolDistribution: {
        topPoolConcentration: Math.random() * 0.5 + 0.2, // 20-70%
        numberOfPools: Math.floor(baseTvl / 10000000) + 2, // More pools for higher TVL
        averagePoolSize: baseTvl / (Math.floor(baseTvl / 10000000) + 2)
      }
    };
  }

  /**
   * Calculate risk factors from metrics
   */
  private calculateRiskFactors(metrics: LiquidityMetrics, input: LiquidityInput): LiquidityRiskFactors {
    // TVL Risk (higher TVL = lower risk)
    const tvlRisk = metrics.tvl < 1000000 ? 90 : 
                   metrics.tvl < 10000000 ? 70 :
                   metrics.tvl < 100000000 ? 50 :
                   metrics.tvl < 1000000000 ? 30 : 10;

    // Volume Risk (based on liquidity ratio)
    const volumeRisk = metrics.liquidityRatio < 0.01 ? 80 :
                      metrics.liquidityRatio < 0.05 ? 60 :
                      metrics.liquidityRatio < 0.1 ? 40 :
                      metrics.liquidityRatio < 0.2 ? 20 : 10;

    // Liquidity Depth Risk
    const depthRatio = (metrics.depthAnalysis.bid2PercentDepth + metrics.depthAnalysis.ask2PercentDepth) / metrics.tvl;
    const liquidityDepthRisk = depthRatio < 0.01 ? 90 :
                              depthRatio < 0.02 ? 70 :
                              depthRatio < 0.04 ? 50 :
                              depthRatio < 0.06 ? 30 : 10;

    // Concentration Risk
    const concentrationRisk = metrics.poolDistribution.topPoolConcentration > 0.8 ? 90 :
                             metrics.poolDistribution.topPoolConcentration > 0.6 ? 70 :
                             metrics.poolDistribution.topPoolConcentration > 0.4 ? 50 :
                             metrics.poolDistribution.topPoolConcentration > 0.2 ? 30 : 10;

    // Volatility Risk (estimated from spread)
    const volatilityRisk = metrics.depthAnalysis.bidAskSpread > 0.01 ? 80 :
                          metrics.depthAnalysis.bidAskSpread > 0.005 ? 60 :
                          metrics.depthAnalysis.bidAskSpread > 0.002 ? 40 :
                          metrics.depthAnalysis.bidAskSpread > 0.001 ? 20 : 10;

    // Slippage Risk (combination of depth and spread)
    const slippageRisk = Math.min(90, (liquidityDepthRisk + volatilityRisk) / 2);

    return {
      tvlRisk,
      volumeRisk,
      liquidityDepthRisk,
      concentrationRisk,
      volatilityRisk,
      slippageRisk
    };
  }

  /**
   * Generate findings based on risk factors
   */
  private generateFindings(
    metrics: LiquidityMetrics, 
    riskFactors: LiquidityRiskFactors, 
    input: LiquidityInput
  ): LiquidityFinding[] {
    const findings: LiquidityFinding[] = [];

    // TVL findings
    if (riskFactors.tvlRisk > 70) {
      findings.push({
        id: 'LIQ001',
        severity: 'high',
        title: 'Low Total Value Locked',
        description: `Protocol TVL of $${(metrics.tvl / 1000000).toFixed(1)}M is below recommended minimum for stable liquidity.`,
        impact: 'Low TVL increases risk of market manipulation and reduces protocol stability.',
        recommendation: 'Monitor TVL growth and consider incentive programs to attract more liquidity.',
        metrics: { tvl: metrics.tvl }
      });
    }

    // Volume findings
    if (riskFactors.volumeRisk > 60) {
      findings.push({
        id: 'LIQ002',
        severity: metrics.liquidityRatio < 0.01 ? 'high' : 'medium',
        title: 'Low Trading Volume',
        description: `Daily volume to TVL ratio of ${(metrics.liquidityRatio * 100).toFixed(2)}% indicates low trading activity.`,
        impact: 'Low volume can lead to poor price discovery and increased slippage.',
        recommendation: 'Implement volume incentives or improve market maker programs.',
        metrics: { volume: metrics.dailyVolume, liquidityRatio: metrics.liquidityRatio }
      });
    }

    // Concentration findings
    if (riskFactors.concentrationRisk > 60) {
      findings.push({
        id: 'LIQ003',
        severity: metrics.poolDistribution.topPoolConcentration > 0.8 ? 'high' : 'medium',
        title: 'High Liquidity Concentration',
        description: `Top pool concentration of ${(metrics.poolDistribution.topPoolConcentration * 100).toFixed(1)}% creates single point of failure.`,
        impact: 'High concentration increases risk of liquidity drainage and market manipulation.',
        recommendation: 'Encourage liquidity distribution across multiple pools and DEXes.',
        metrics: { concentration: metrics.poolDistribution.topPoolConcentration }
      });
    }

    // Depth findings
    if (riskFactors.liquidityDepthRisk > 50) {
      findings.push({
        id: 'LIQ004',
        severity: 'medium',
        title: 'Limited Liquidity Depth',
        description: 'Shallow order book depth may cause significant slippage for large trades.',
        impact: 'Limited depth affects large traders and institutional adoption.',
        recommendation: 'Improve market making strategies and incentivize deeper liquidity provision.'
      });
    }

    // Positive findings for good metrics
    if (metrics.tvl > 100000000) {
      findings.push({
        id: 'LIQ005',
        severity: 'info',
        title: 'Strong TVL Foundation',
        description: `High TVL of $${(metrics.tvl / 1000000).toFixed(1)}M provides good liquidity foundation.`,
        impact: 'High TVL reduces manipulation risks and improves price stability.',
        recommendation: 'Maintain current liquidity levels and monitor for sudden changes.',
        metrics: { tvl: metrics.tvl }
      });
    }

    return findings;
  }

  /**
   * Calculate overall liquidity score
   */
  private calculateLiquidityScore(riskFactors: LiquidityRiskFactors): number {
    // Weighted average of risk factors (lower risk = higher score)
    const weights = {
      tvlRisk: 0.25,
      volumeRisk: 0.20,
      liquidityDepthRisk: 0.20,
      concentrationRisk: 0.15,
      volatilityRisk: 0.10,
      slippageRisk: 0.10
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
  private getFallbackResult(input: LiquidityInput, analysisTime: number): LiquidityAnalysisResult {
    const fallbackMetrics = this.generateMockMetrics(input);
    const fallbackRiskFactors = this.calculateRiskFactors(fallbackMetrics, input);
    
    return {
      liquidityScore: 65, // Moderate score for unknown protocols
      riskLevel: 'medium',
      metrics: fallbackMetrics,
      riskFactors: fallbackRiskFactors,
      findings: [{
        id: 'LIQ000',
        severity: 'info',
        title: 'Analysis Using Fallback Data',
        description: 'Liquidity analysis completed using mock data due to API limitations.',
        impact: 'Results are estimates and should be verified with real market data.',
        recommendation: 'Verify results with real-time liquidity data when available.'
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
export const liquidityAnalyzer = new LiquidityAnalyzer();
