/**
 * Slither Integration Test
 * Tests the Slither analysis functionality
 */

import { promises as fs } from 'fs';
import path from 'path';
import { smartContractAnalyzer } from './src/analyzers/smart-contract';
import { logger } from './src/config/logger';

async function testSlitherIntegration(): Promise<void> {
  try {
    console.log('🔍 Testing Slither Integration...\n');

    // Read the test contract
    const contractPath = path.join(__dirname, './tmp/slither-analysis/VulnerableTestContract.sol');
    const contractSource = await fs.readFile(contractPath, 'utf8');

    console.log('📄 Test contract loaded successfully');
    console.log(`📍 Contract path: ${contractPath}`);
    console.log(`📏 Contract size: ${contractSource.length} characters\n`);

    // Run analysis
    console.log('🚀 Starting Slither analysis...');
    const startTime = Date.now();

    const result = await smartContractAnalyzer.analyzeContract({
      contractAddress: '0x1234567890123456789012345678901234567890',
      sourceCode: contractSource,
      contractName: 'VulnerableTestContract',
      blockchain: 'ethereum'
    });

    const executionTime = Date.now() - startTime;

    console.log('✅ Analysis completed successfully!\n');

    // Display results
    console.log('📊 ANALYSIS RESULTS');
    console.log('==================');
    console.log(`⏱️  Execution Time: ${executionTime}ms`);
    console.log(`🎯 Technical Score: ${result.technicalScore}/100`);
    console.log(`🔍 Vulnerabilities Found: ${result.vulnerabilities.length}`);
    console.log(`📋 Slither Version: ${result.metadata.slitherVersion}`);
    console.log(`🏗️  Compilation Success: ${result.metadata.compilationSuccess}\n`);

    // Vulnerability breakdown
    if (result.vulnerabilities.length > 0) {
      console.log('🚨 VULNERABILITIES DETECTED');
      console.log('===========================');
      
      result.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.detector} (${vuln.severity}/${vuln.confidence})`);
        console.log(`   📝 ${vuln.description}`);
        console.log(`   📍 ${vuln.location.filename}:${vuln.location.startLine}`);
        console.log(`   💡 ${vuln.recommendation}\n`);
      });
    }

    // Risk categories
    console.log('🏷️  DEFI RISK CATEGORIES');
    console.log('========================');
    console.log(`🔄 Reentrancy Risks: ${result.riskCategories.reentrancyRisks.toFixed(1)}/100`);
    console.log(`🔐 Access Control: ${result.riskCategories.accessControlIssues.toFixed(1)}/100`);
    console.log(`⚡ Flash Loan Risks: ${result.riskCategories.flashLoanVulnerabilities.toFixed(1)}/100`);
    console.log(`📊 Oracle Manipulation: ${result.riskCategories.oracleManipulation.toFixed(1)}/100`);
    console.log(`🔧 Upgradeability: ${result.riskCategories.upgradeabilityRisks.toFixed(1)}/100`);
    console.log(`🗳️  Governance: ${result.riskCategories.governanceVulnerabilities.toFixed(1)}/100\n`);

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS');
      console.log('==================');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log();
    }

    // Analysis summary
    console.log('📈 ANALYSIS SUMMARY');
    console.log('==================');
    console.log(`📊 High Severity: ${result.summary.highSeverityCount}`);
    console.log(`📊 Medium Severity: ${result.summary.mediumSeverityCount}`);
    console.log(`📊 Low Severity: ${result.summary.lowSeverityCount}`);
    console.log(`📊 Informational: ${result.summary.informationalCount}`);
    console.log(`⚡ Total Analysis Time: ${result.summary.executionTime}ms`);

    console.log('\n✅ Slither integration test completed successfully!');

  } catch (error) {
    console.error('❌ Slither integration test failed:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      if (error.stack) {
        console.error(`Stack trace: ${error.stack}`);
      }
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSlitherIntegration();
}

export { testSlitherIntegration };
