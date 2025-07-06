/**
 * Smart Contract Analyzer
 * Main analyzer for smart contract security assessment using Slither
 */

import { slitherService } from './slither.service';
import { VulnerabilityParser } from './vulnerability-parser';
import { technicalRiskCalculator } from './technical-risk-calculator';
import {
  SlitherOptions,
  SlitherReport,
  Vulnerability,
  AnalysisSummary,
  SlitherMetadata,
  DeFiRiskCategories
} from './types';
import { logger } from '../../config/logger';

export interface SmartContractAnalysisResult {
  vulnerabilities: Vulnerability[];
  technicalScore: number;
  riskCategories: DeFiRiskCategories;
  summary: AnalysisSummary;
  metadata: SlitherMetadata;
  recommendations: string[];
  detailedBreakdown: any;
  rawSlitherReport?: SlitherReport;
}

export interface SmartContractInput {
  contractAddress: string;
  sourceCode?: string;
  contractName?: string;
  blockchain?: string;
}

export class SmartContractAnalyzer {
  /**
   * Analyze a smart contract for security vulnerabilities
   */
  async analyzeContract(
    input: SmartContractInput,
    options: SlitherOptions = {}
  ): Promise<SmartContractAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting smart contract analysis', {
        contractAddress: input.contractAddress,
        contractName: input.contractName,
        blockchain: input.blockchain
      });

      // Get contract source code if not provided
      const sourceCode = input.sourceCode || await this.getContractSourceCode(input);
      const contractName = input.contractName || this.extractContractName(sourceCode);

      // Run Slither analysis
      const slitherReport = await slitherService.analyzeContract(
        sourceCode,
        contractName,
        options
      );

      logger.debug('Slither analysis completed, parsing vulnerabilities', {
        contractAddress: input.contractAddress,
        reportSuccess: slitherReport.success,
        detectorsCount: slitherReport.results?.detectors?.length || 0
      });

      // Parse vulnerabilities from Slither results
      const vulnerabilities = VulnerabilityParser.parseVulnerabilities(
        slitherReport.results?.detectors || []
      );

      logger.debug('Vulnerabilities parsed successfully', {
        contractAddress: input.contractAddress,
        vulnerabilitiesCount: vulnerabilities.length
      });

      // Calculate technical risk score
      const technicalScore = technicalRiskCalculator.calculateTechnicalScore(vulnerabilities);

      // Categorize DeFi-specific risks
      const riskCategories = technicalRiskCalculator.categorizeDeFiRisks(vulnerabilities);

      // Generate analysis summary
      const summary = VulnerabilityParser.generateSummary(
        vulnerabilities,
        Date.now() - startTime,
        1
      );

      // Generate metadata
      const metadata = VulnerabilityParser.generateMetadata(
        slitherReport.version,
        options.configFile || 'default',
        slitherReport.results?.detectors?.length || 0
      );

      // Generate recommendations
      const recommendations = technicalRiskCalculator.generateTechnicalRecommendations(
        vulnerabilities,
        technicalScore
      );

      // Generate detailed breakdown
      const detailedBreakdown = technicalRiskCalculator.generateRiskBreakdown(vulnerabilities);

      const result: SmartContractAnalysisResult = {
        vulnerabilities,
        technicalScore,
        riskCategories,
        summary,
        metadata,
        recommendations,
        detailedBreakdown,
        rawSlitherReport: slitherReport
      };

      logger.info('Smart contract analysis completed', {
        contractAddress: input.contractAddress,
        technicalScore,
        vulnerabilityCount: vulnerabilities.length,
        executionTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Smart contract analysis failed', {
        contractAddress: input.contractAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });

      // Return a safe fallback result for failed analysis
      return this.createFailureResult(error, Date.now() - startTime);
    }
  }

  /**
   * Analyze multiple contracts in a project directory
   */
  async analyzeProject(
    projectPath: string,
    options: SlitherOptions = {}
  ): Promise<SmartContractAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting project analysis', { projectPath });

      // Run Slither analysis on the entire project
      const slitherReport = await slitherService.analyzeDirectory(projectPath, options);

      // Parse and process results similar to single contract analysis
      const vulnerabilities = VulnerabilityParser.parseVulnerabilities(
        slitherReport.results?.detectors || []
      );

      const technicalScore = technicalRiskCalculator.calculateTechnicalScore(vulnerabilities);
      const riskCategories = technicalRiskCalculator.categorizeDeFiRisks(vulnerabilities);
      
      const summary = VulnerabilityParser.generateSummary(
        vulnerabilities,
        Date.now() - startTime,
        this.estimateContractCount(slitherReport)
      );

      const metadata = VulnerabilityParser.generateMetadata(
        slitherReport.version,
        options.configFile || 'default',
        slitherReport.results?.detectors?.length || 0
      );

      const recommendations = technicalRiskCalculator.generateTechnicalRecommendations(
        vulnerabilities,
        technicalScore
      );

      const detailedBreakdown = technicalRiskCalculator.generateRiskBreakdown(vulnerabilities);

      const result: SmartContractAnalysisResult = {
        vulnerabilities,
        technicalScore,
        riskCategories,
        summary,
        metadata,
        recommendations,
        detailedBreakdown,
        rawSlitherReport: slitherReport
      };

      logger.info('Project analysis completed', {
        projectPath,
        technicalScore,
        vulnerabilityCount: vulnerabilities.length,
        executionTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Project analysis failed', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });

      return this.createFailureResult(error, Date.now() - startTime);
    }
  }

  /**
   * Get contract source code from blockchain (placeholder for actual implementation)
   */
  private async getContractSourceCode(input: SmartContractInput): Promise<string> {
    // This is a placeholder - in a real implementation, this would fetch
    // source code from blockchain explorers (Etherscan, etc.)
    
    if (!input.sourceCode) {
      throw new Error(`No source code provided for contract ${input.contractAddress}`);
    }

    return input.sourceCode;
  }

  /**
   * Extract contract name from source code
   */
  private extractContractName(sourceCode: string): string {
    // Simple regex to extract the main contract name
    const contractMatch = sourceCode.match(/contract\s+(\w+)/);
    return contractMatch?.[1] || 'UnknownContract';
  }

  /**
   * Estimate number of contracts from Slither report
   */
  private estimateContractCount(slitherReport: SlitherReport): number {
    // Estimate based on the number of unique contract elements in findings
    const contractNames = new Set<string>();
    
    const detectors = slitherReport.results?.detectors || [];
    for (const detector of detectors) {
      for (const element of detector.elements) {
        if (element.type === 'contract') {
          contractNames.add(element.name);
        }
      }
    }

    return Math.max(1, contractNames.size);
  }

  /**
   * Create a fallback result for failed analysis
   */
  private createFailureResult(error: any, executionTime: number): SmartContractAnalysisResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
    
    return {
      vulnerabilities: [],
      technicalScore: 100, // Max risk for failed analysis
      riskCategories: {
        flashLoanVulnerabilities: 0,
        oracleManipulation: 0,
        reentrancyRisks: 0,
        accessControlIssues: 0,
        upgradeabilityRisks: 0,
        governanceVulnerabilities: 0
      },
      summary: {
        totalVulnerabilities: 0,
        highSeverityCount: 0,
        mediumSeverityCount: 0,
        lowSeverityCount: 0,
        informationalCount: 0,
        executionTime,
        contractsAnalyzed: 0
      },
      metadata: {
        slitherVersion: 'unknown',
        compilationSuccess: false,
        analysisTimestamp: new Date(),
        configUsed: 'default',
        detectorCount: 0
      },
      recommendations: [
        'Analysis failed - manual security review required',
        `Error: ${errorMessage}`,
        'Consider checking contract source code availability and compilation requirements'
      ],
      detailedBreakdown: {
        severityDistribution: {},
        confidenceDistribution: {},
        detectorFrequency: {},
        riskHeatmap: []
      }
    };
  }

  /**
   * Validate contract input
   */
  validateInput(input: SmartContractInput): void {
    if (!input.contractAddress) {
      throw new Error('Contract address is required');
    }

    if (!input.sourceCode) {
      throw new Error('Contract source code is required for analysis');
    }

    // Basic validation for Ethereum-like addresses
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.contractAddress)) {
      throw new Error('Invalid contract address format');
    }
  }

  /**
   * Get supported detector list
   */
  getSupportedDetectors(): string[] {
    return [
      'reentrancy-eth',
      'reentrancy-no-eth',
      'reentrancy-benign',
      'timestamp',
      'tx-origin',
      'unchecked-transfer',
      'uninitialized-storage',
      'dangerous-delegatecall',
      'unchecked-lowlevel',
      'controlled-delegatecall',
      'assembly',
      'suicidal',
      'arbitrary-send-eth',
      'missing-zero-check',
      'locked-ether',
      'tautology',
      'boolean-cst',
      'incorrect-equality',
      'divide-before-multiply',
      'void-cst'
    ];
  }
}

export const smartContractAnalyzer = new SmartContractAnalyzer();
