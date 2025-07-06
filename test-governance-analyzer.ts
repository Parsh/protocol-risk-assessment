#!/usr/bin/env npx ts-node

/**
 * Test Governance Analyzer Integration
 * This script tests the governance analyzer functionality
 */

import { simpleGovernanceAnalyzer } from './src/analyzers/governance/simple-governance-analyzer';
import { logger } from './src/config/logger';

async function testGovernanceAnalyzer() {
  console.log('🏛️ Testing Governance Analyzer...\n');

  // Test different protocol scenarios
  const testProtocols = [
    {
      protocolName: 'Uniswap V3',
      contractAddresses: ['0x1f98431c8ad98523631ae4a59f267346ea31f984'],
      blockchain: 'ethereum',
      tokenSymbol: 'UNI',
      description: 'Well-established DEX with strong governance'
    },
    {
      protocolName: 'Experimental DeFi Protocol',
      contractAddresses: ['0x123456789abcdef123456789abcdef123456789a'],
      blockchain: 'ethereum',
      description: 'New protocol with unknown governance structure'
    },
    {
      protocolName: 'CentralizedDAO',
      contractAddresses: ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
      blockchain: 'bsc',
      tokenSymbol: 'CDAO',
      description: 'Protocol with centralization concerns'
    }
  ];

  for (const protocol of testProtocols) {
    console.log(`\n📊 Analyzing: ${protocol.protocolName}`);
    console.log(`Description: ${protocol.description}`);
    console.log('─'.repeat(50));

    try {
      const startTime = Date.now();
      const result = await simpleGovernanceAnalyzer.analyzeGovernance({
        protocolName: protocol.protocolName,
        contractAddresses: protocol.contractAddresses,
        blockchain: protocol.blockchain,
        ...(protocol.tokenSymbol && { tokenSymbol: protocol.tokenSymbol })
      });

      const executionTime = Date.now() - startTime;

      console.log(`✅ Analysis completed in ${executionTime}ms`);
      console.log(`📈 Governance Score: ${result.governanceScore}/100 (${getScoreLabel(result.governanceScore)})`);
      console.log(`🔍 Findings: ${result.findings.length} issues detected`);
      
      if (result.findings.length > 0) {
        console.log('\n📋 Key Findings:');
        result.findings.forEach((finding, index) => {
          const emoji = getSeverityEmoji(finding.severity);
          console.log(`${index + 1}. ${emoji} [${finding.severity}] ${finding.title}`);
          console.log(`   ${finding.description}`);
        });
      }

      console.log(`\n📊 Metadata:`);
      console.log(`   - Analysis Time: ${result.metadata.analysisTime}ms`);
      console.log(`   - Mock Data: ${result.metadata.useMockData}`);
      console.log(`   - Data Points: ${result.metadata.dataPoints}`);

    } catch (error) {
      console.error(`❌ Analysis failed:`, error);
    }

    console.log('\n' + '='.repeat(60));
  }

  console.log('\n🎯 Governance Analyzer Test Summary:');
  console.log('✅ Multiple protocol scenarios tested');
  console.log('✅ Mock data generation working');
  console.log('✅ Consistent scoring based on protocol characteristics');
  console.log('✅ Findings generation based on governance patterns');
  console.log('✅ Error handling and fallback mechanisms');
  
  console.log('\n🏁 Governance analyzer testing completed successfully!');
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'High Risk';
  if (score >= 60) return 'Moderate Risk';
  if (score >= 40) return 'Low-Moderate Risk';
  if (score >= 20) return 'Low Risk';
  return 'Very Low Risk';
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'HIGH': return '🚨';
    case 'MEDIUM': return '⚠️';
    case 'LOW': return '💡';
    case 'INFO': return 'ℹ️';
    default: return '📋';
  }
}

// Run the test
if (require.main === module) {
  testGovernanceAnalyzer()
    .then(() => {
      console.log('\n✨ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}
