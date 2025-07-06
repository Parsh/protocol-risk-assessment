/**
 * Test Findings Aggregation
 * Tests the enhanced orchestrator with findings aggregation from all analyzers
 */

import { AssessmentOrchestrator } from './src/services/assessment-orchestrator';
import { AssessmentRepository, ProtocolRepository } from './src/repositories/index';
import { Protocol, ProtocolCategory, Blockchain, AssessmentPriority, AnalysisDepth } from './src/models/index';
import { logger } from './src/config/logger';

async function testFindingsAggregation() {
  console.log('='.repeat(60));
  console.log('TESTING FINDINGS AGGREGATION FROM ALL ANALYZERS');
  console.log('='.repeat(60));

  try {
    // Initialize repositories and orchestrator
    const orchestrator = new AssessmentOrchestrator();

    // Test protocol with realistic data (will be created via orchestrator)
    const testProtocolData = {
      name: 'Enhanced DeFi Protocol',
      contractAddresses: [
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI token
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'  // Uniswap V2 Router
      ],
      blockchain: 'ethereum',
      tokenSymbol: 'EDF',
      website: 'https://enhanced-defi.io',
      category: ProtocolCategory.DEX,
      tags: ['defi', 'dex', 'enhanced']
    };

    console.log('\n📋 Test Protocol Details:');
    console.log(`  Name: ${testProtocolData.name}`);
    console.log(`  Contracts: ${testProtocolData.contractAddresses.length}`);
    console.log(`  Category: ${testProtocolData.category}`);
    console.log(`  Blockchain: ${testProtocolData.blockchain}`);

    // Start assessment with findings aggregation
    console.log('\n🔍 Starting Enhanced Assessment with Findings Aggregation...');
    const startTime = Date.now();

    const assessmentResponse = await orchestrator.initiateAssessment({
      protocol: testProtocolData,
      priority: AssessmentPriority.HIGH,
      analysisDepth: AnalysisDepth.COMPREHENSIVE
    });

    console.log(`\n✅ Assessment Started: ${assessmentResponse.assessmentId}`);
    console.log(`   Status: ${assessmentResponse.status}`);

    // Wait for completion
    console.log('\n⏳ Waiting for assessment completion...');
    let attempts = 0;
    const maxAttempts = 20; // 2 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
      attempts++;
      
      const progress = await orchestrator.getAssessmentStatus(assessmentResponse.assessmentId);
      if (progress) {
        console.log(`   Progress: ${progress.progress}% - ${progress.currentStage}`);
        
        if (progress.status === 'COMPLETED') {
          console.log('\n🎉 Assessment completed!');
          break;
        }
        
        if (progress.status === 'FAILED') {
          console.log('\n❌ Assessment failed!');
          return;
        }
      }
    }

    // Get final results
    const finalAssessment = await orchestrator.getAssessmentResult(assessmentResponse.assessmentId);
    
    if (!finalAssessment) {
      console.log('❌ Could not retrieve final assessment');
      return;
    }

    const executionTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('FINDINGS AGGREGATION RESULTS');
    console.log('='.repeat(60));

    console.log(`\n📊 Overall Assessment Results:`);
    console.log(`   Overall Score: ${finalAssessment.overallScore}/100`);
    console.log(`   Risk Level: ${finalAssessment.riskLevel}`);
    console.log(`   Execution Time: ${Math.round(executionTime / 1000)}s`);

    console.log(`\n📈 Category Scores:`);
    if (finalAssessment.categoryScores) {
      console.log(`   Technical: ${finalAssessment.categoryScores.technical}/100`);
      console.log(`   Governance: ${finalAssessment.categoryScores.governance}/100`);
      console.log(`   Liquidity: ${finalAssessment.categoryScores.liquidity}/100`);
      console.log(`   Reputation: ${finalAssessment.categoryScores.reputation}/100`);
    }

    console.log(`\n🔍 Findings Analysis:`);
    console.log(`   Total Findings: ${finalAssessment.findings?.length || 0}`);
    
    if (finalAssessment.findings && finalAssessment.findings.length > 0) {
      // Group findings by source
      const findingsBySource = finalAssessment.findings.reduce((acc, finding) => {
        acc[finding.source] = (acc[finding.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`\n   Findings by Source:`);
      Object.entries(findingsBySource).forEach(([source, count]) => {
        console.log(`     ${source}: ${count} findings`);
      });

      // Group findings by severity
      const findingsBySeverity = finalAssessment.findings.reduce((acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`\n   Findings by Severity:`);
      Object.entries(findingsBySeverity).forEach(([severity, count]) => {
        console.log(`     ${severity}: ${count} findings`);
      });

      // Show sample findings
      console.log(`\n📋 Sample Findings (first 3):`);
      finalAssessment.findings.slice(0, 3).forEach((finding, index) => {
        console.log(`\n   ${index + 1}. ${finding.title}`);
        console.log(`      Source: ${finding.source}`);
        console.log(`      Severity: ${finding.severity}`);
        console.log(`      Category: ${finding.category}`);
        console.log(`      Confidence: ${finding.confidence}%`);
        console.log(`      Description: ${finding.description.substring(0, 100)}...`);
      });
    }

    console.log(`\n💡 Recommendations: ${finalAssessment.recommendations?.length || 0}`);
    if (finalAssessment.recommendations && finalAssessment.recommendations.length > 0) {
      finalAssessment.recommendations.slice(0, 2).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.substring(0, 80)}...`);
      });
    }

    console.log(`\n📝 Metadata:`);
    console.log(`   Execution Time: ${finalAssessment.metadata.executionTime}ms`);
    console.log(`   Data Sources: ${finalAssessment.metadata.dataSourcesUsed?.join(', ')}`);
    console.log(`   Warnings: ${finalAssessment.metadata.warnings?.length || 0}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ FINDINGS AGGREGATION TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    logger.error('Findings aggregation test failed', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

// Run test
if (require.main === module) {
  testFindingsAggregation().catch(console.error);
}

export { testFindingsAggregation };
