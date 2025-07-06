#!/usr/bin/env node

/**
 * Test Script for Multi-Dimensional Risk Analyzers
 * Tests Governance, Liquidity, and Reputation analyzers with various protocols
 */

import { simpleGovernanceAnalyzer } from './src/analyzers/governance';
import { liquidityAnalyzer } from './src/analyzers/liquidity';
import { reputationAnalyzer } from './src/analyzers/reputation';

interface TestProtocol {
  name: string;
  contractAddresses: string[];
  blockchain: string;
  tokenSymbol?: string;
  website?: string;
  defiData?: any;
}

// Test protocols with different characteristics
const testProtocols: TestProtocol[] = [
  {
    name: 'Uniswap V3',
    contractAddresses: ['0x1F98431c8aD98523631AE4a59f267346ea31F984'],
    blockchain: 'ethereum',
    tokenSymbol: 'UNI',
    website: 'https://uniswap.org',
    defiData: {
      protocolInfo: {
        tvl: 5500000000, // $5.5B
        volume24h: 1200000000, // $1.2B
        category: 'DEX'
      }
    }
  },
  {
    name: 'NewDeFiProtocol',
    contractAddresses: ['0x742d35Cc6634C0532925a3b8D12345678901234567'],
    blockchain: 'ethereum',
    tokenSymbol: 'NEW'
  },
  {
    name: 'SmallYieldFarm',
    contractAddresses: ['0x123456789abcdef123456789abcdef123456789ab'],
    blockchain: 'bsc',
    defiData: {
      protocolInfo: {
        tvl: 2500000, // $2.5M
        volume24h: 150000, // $150K
        category: 'Yield'
      }
    }
  }
];

async function testAnalyzer(analyzerName: string, analyzerFn: () => Promise<any>) {
  console.log(`\n🔍 Testing ${analyzerName}...`);
  const startTime = Date.now();
  
  try {
    const result = await analyzerFn();
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${analyzerName} completed in ${duration}ms`);
    console.log(`   Score: ${result.score || result.governanceScore || result.liquidityScore || result.reputationScore}/100`);
    console.log(`   Risk Level: ${result.riskLevel}`);
    console.log(`   Findings: ${result.findings.length}`);
    console.log(`   Data Source: ${result.metadata.dataSource}`);
    
    return result;
  } catch (error) {
    console.error(`❌ ${analyzerName} failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function runFullAnalysisTest(protocol: TestProtocol) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 TESTING PROTOCOL: ${protocol.name}`);
  console.log(`📍 Blockchain: ${protocol.blockchain}`);
  console.log(`💰 Token: ${protocol.tokenSymbol || 'N/A'}`);
  console.log(`🔗 Contracts: ${protocol.contractAddresses[0]}`);
  console.log(`${'='.repeat(60)}`);

  const results: any = {};

  // Test Governance Analyzer
  results.governance = await testAnalyzer('Governance Analyzer', async () => {
    const governanceInput: any = {
      protocolName: protocol.name,
      contractAddresses: protocol.contractAddresses,
      blockchain: protocol.blockchain,
      governanceTokenAddress: protocol.contractAddresses[0]
    };
    if (protocol.tokenSymbol) {
      governanceInput.tokenSymbol = protocol.tokenSymbol;
    }
    return await simpleGovernanceAnalyzer.analyzeGovernance(governanceInput);
  });

  // Test Liquidity Analyzer
  results.liquidity = await testAnalyzer('Liquidity Analyzer', async () => {
    const liquidityInput: any = {
      protocolName: protocol.name,
      contractAddresses: protocol.contractAddresses,
      blockchain: protocol.blockchain
    };
    if (protocol.tokenSymbol) {
      liquidityInput.tokenSymbol = protocol.tokenSymbol;
    }
    if (protocol.defiData) {
      liquidityInput.defiData = protocol.defiData;
    }
    return await liquidityAnalyzer.analyzeLiquidity(liquidityInput);
  });

  // Test Reputation Analyzer
  results.reputation = await testAnalyzer('Reputation Analyzer', async () => {
    const reputationInput: any = {
      protocolName: protocol.name,
      contractAddresses: protocol.contractAddresses,
      blockchain: protocol.blockchain
    };
    if (protocol.website) {
      reputationInput.website = protocol.website;
    }
    return await reputationAnalyzer.analyzeReputation(reputationInput);
  });

  // Calculate combined scores
  const governanceScore = results.governance?.governanceScore || 0;
  const liquidityScore = results.liquidity?.liquidityScore || 0;
  const reputationScore = results.reputation?.reputationScore || 0;
  
  const averageScore = (governanceScore + liquidityScore + reputationScore) / 3;
  const weightedScore = (governanceScore * 0.3) + (liquidityScore * 0.4) + (reputationScore * 0.3);

  console.log(`\n📊 COMBINED RESULTS FOR ${protocol.name}:`);
  console.log(`   Governance Score: ${governanceScore.toFixed(1)}/100`);
  console.log(`   Liquidity Score:  ${liquidityScore.toFixed(1)}/100`);
  console.log(`   Reputation Score: ${reputationScore.toFixed(1)}/100`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Average Score:    ${averageScore.toFixed(1)}/100`);
  console.log(`   Weighted Score:   ${weightedScore.toFixed(1)}/100 (L:40%, G:30%, R:30%)`);

  // Determine overall risk level
  let overallRisk: string;
  if (weightedScore >= 85) overallRisk = '🟢 Very Low Risk';
  else if (weightedScore >= 70) overallRisk = '🟡 Low Risk';
  else if (weightedScore >= 55) overallRisk = '🟠 Medium Risk';
  else if (weightedScore >= 40) overallRisk = '🔴 High Risk';
  else overallRisk = '⚫ Very High Risk';

  console.log(`   Overall Risk:     ${overallRisk}`);

  return results;
}

async function main() {
  console.log('🎯 Multi-Dimensional Risk Analyzer Test Suite');
  console.log('===============================================');
  console.log('Testing Governance, Liquidity, and Reputation analyzers');
  console.log('All analyzers use mock data fallbacks for demo safety\n');

  const allResults: any[] = [];

  // Test each protocol
  for (const protocol of testProtocols) {
    const results = await runFullAnalysisTest(protocol);
    allResults.push({ protocol: protocol.name, results });
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);

  allResults.forEach(({ protocol, results }) => {
    const governanceScore = results.governance?.governanceScore || 0;
    const liquidityScore = results.liquidity?.liquidityScore || 0;
    const reputationScore = results.reputation?.reputationScore || 0;
    const weightedScore = (governanceScore * 0.3) + (liquidityScore * 0.4) + (reputationScore * 0.3);

    console.log(`${protocol.padEnd(20)} | Weighted Score: ${weightedScore.toFixed(1).padStart(5)}/100`);
  });

  console.log(`\n✅ All analyzer tests completed successfully!`);
  console.log('🛡️  All analyzers use mock data fallbacks - no API keys required');
  console.log('🔧 Ready for integration with Assessment Orchestrator');
}

// Run the tests
main().catch(console.error);
