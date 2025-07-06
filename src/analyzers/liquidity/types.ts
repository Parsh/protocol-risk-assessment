/**
 * Liquidity Analysis Types
 * Defines interfaces for liquidity risk assessment
 */

export interface LiquidityInput {
  protocolName: string;
  contractAddresses: string[];
  blockchain: string;
  tokenSymbol?: string;
  defiData?: any; // Optional DeFi data from APIs
}

export interface LiquidityMetrics {
  tvl: number;
  dailyVolume: number;
  marketCap: number;
  circulatingSupply: number;
  liquidityRatio: number;
  depthAnalysis: {
    bid2PercentDepth: number;
    ask2PercentDepth: number;
    bidAskSpread: number;
  };
  poolDistribution: {
    topPoolConcentration: number;
    numberOfPools: number;
    averagePoolSize: number;
  };
}

export interface LiquidityRiskFactors {
  tvlRisk: number;
  volumeRisk: number;
  liquidityDepthRisk: number;
  concentrationRisk: number;
  volatilityRisk: number;
  slippageRisk: number;
}

export interface LiquidityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  metrics?: {
    tvl?: number;
    volume?: number;
    liquidityRatio?: number;
    concentration?: number;
  };
}

export interface LiquidityAnalysisResult {
  liquidityScore: number;
  riskLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  metrics: LiquidityMetrics;
  riskFactors: LiquidityRiskFactors;
  findings: LiquidityFinding[];
  metadata: {
    analysisTime: number;
    dataSource: 'api' | 'mock';
    timestamp: string;
    version: string;
  };
}
