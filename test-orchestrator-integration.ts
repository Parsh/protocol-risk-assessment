#!/usr/bin/env npx ts-node

/**
 * End-to-End Integration Test for Assessment Orchestrator with Slither
 * This script tests the full assessment workflow with real Slither analysis
 */

import { AssessmentOrchestrator, AssessmentRequest } from './src/services/assessment-orchestrator';
import { AssessmentStatus, ProtocolCategory, AnalysisDepth, AssessmentPriority } from './src/models/index';
import { logger } from './src/config/logger';

async function testOrchestratorIntegration() {
  console.log('🚀 Starting Assessment Orchestrator Integration Test with Slither...\n');

  const orchestrator = new AssessmentOrchestrator();

  // Use a simple test protocol with a verified contract
  const testRequest: AssessmentRequest = {
    protocol: {
      name: 'USDC Token Contract',
      contractAddresses: ['0xa0b86a33e6b4d74d7c2b8e0e2c3e6a4bd1e1a4c0'], // USDC proxy contract on Ethereum
      blockchain: 'ethereum',
      tokenSymbol: 'USDC',
      website: 'https://centre.io',
      documentation: 'https://centre.io/usdc',
      category: ProtocolCategory.STABLECOIN,
      tags: ['stablecoin', 'usdc', 'centre']
    },
    priority: AssessmentPriority.HIGH,
    analysisDepth: AnalysisDepth.STANDARD
  };

  try {
    console.log('📋 Initiating assessment request...');
    const response = await orchestrator.initiateAssessment(testRequest);
    
    console.log('✅ Assessment initiated:', {
      assessmentId: response.assessmentId,
      status: response.status,
      estimatedCompletionTime: response.estimatedCompletionTime
    });

    // Wait for the assessment to complete
    let progress = await orchestrator.getAssessmentStatus(response.assessmentId);
    let checks = 0;
    const maxChecks = 60; // 5 minutes max

    console.log('\n⏳ Monitoring assessment progress...');
    
    while (progress.status === AssessmentStatus.IN_PROGRESS && checks < maxChecks) {
      console.log(`📊 Progress: ${progress.progress}% - ${progress.currentStage || 'Processing...'}`);
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      progress = await orchestrator.getAssessmentStatus(response.assessmentId);
      checks++;
    }

    if (progress.status === AssessmentStatus.COMPLETED) {
      console.log('\n🎉 Assessment completed successfully!');
      
      // Get the full assessment result
      const assessment = await orchestrator.getAssessmentResult(response.assessmentId);
      
      if (assessment) {
        console.log('\n📄 Assessment Results:');
        console.log('====================');
        console.log(`Protocol ID: ${assessment.protocolId}`);
        console.log(`Overall Risk Level: ${assessment.riskLevel}`);
        console.log(`Overall Score: ${assessment.overallScore}/100`);
        
        console.log('\n📊 Category Scores:');
        console.log(`- Technical: ${assessment.categoryScores.technical}/100`);
        console.log(`- Governance: ${assessment.categoryScores.governance}/100`);
        console.log(`- Liquidity: ${assessment.categoryScores.liquidity}/100`);
        console.log(`- Reputation: ${assessment.categoryScores.reputation}/100`);
        
        console.log(`\n🔍 Findings: ${assessment.findings?.length || 0} total`);
        
        if (assessment.findings && assessment.findings.length > 0) {
          console.log('\n🚨 Key Findings:');
          assessment.findings.slice(0, 5).forEach((finding, index) => {
            console.log(`${index + 1}. [${finding.severity}] ${finding.title}`);
            console.log(`   Category: ${finding.category}`);
            if (finding.description.length > 100) {
              console.log(`   Description: ${finding.description.substring(0, 100)}...`);
            } else {
              console.log(`   Description: ${finding.description}`);
            }
            console.log('');
          });
        }

        console.log('\n✨ Integration test completed successfully!');
        console.log('✅ SmartContractAnalyzer is properly integrated with AssessmentOrchestrator');
        
      } else {
        console.log('❌ Could not retrieve assessment result');
      }
      
    } else if (progress.status === AssessmentStatus.FAILED) {
      console.log('\n❌ Assessment failed');
      console.log('Status:', progress.status);
      
    } else {
      console.log('\n⏰ Assessment timed out');
      console.log('Final status:', progress.status);
      console.log('Final progress:', progress.progress);
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
if (require.main === module) {
  testOrchestratorIntegration()
    .then(() => {
      console.log('\n🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testOrchestratorIntegration };
