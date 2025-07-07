/**
 * Mock Data Factory for Testing
 * Generates realistic test data for protocols and risk assessments
 */

import {
  Protocol,
  ProtocolInput,
  RiskAssessment,
  AssessmentRequest,
  ProtocolCategory,
  Blockchain,
  AssessmentStatus,
  RiskLevel,
  AnalysisDepth,
  FindingCategory,
  FindingSeverity,
  AssessmentPriority,
  CategoryScores,
  AssessmentMetadata,
  Finding
} from '../src/models/index';
import { ModelFactory } from '../src/models/index';

export class MockDataFactory {
  private static counter = 0;

  /**
   * Generate a UUID v4 (for tests)
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate a unique test identifier
   */
  static generateId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${++this.counter}`;
  }

  /**
   * Generate a valid Ethereum address (40 characters)
   */
  static generateEthereumAddress(): string {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Generate mock protocol input data
   */
  static createProtocolInput(overrides: Partial<ProtocolInput> = {}): ProtocolInput {
    const defaults: ProtocolInput = {
      name: `Test Protocol ${this.counter + 1}`,
      contractAddresses: [
        this.generateEthereumAddress(),
        this.generateEthereumAddress()
      ],
      blockchain: Blockchain.ETHEREUM,
      tokenSymbol: `TKN${this.counter + 1}`,
      website: `https://test-protocol-${this.counter + 1}.com`,
      documentation: `https://docs.test-protocol-${this.counter + 1}.com`,
      description: `A test DeFi protocol for automated testing purposes`,
      category: ProtocolCategory.DEX,
      tags: ['test', 'defi', 'automated']
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate mock protocol data
   */
  static createProtocol(overrides: Partial<Protocol> = {}): Protocol {
    const input = this.createProtocolInput(overrides);
    const protocol = ModelFactory.createProtocol(input);
    
    return { ...protocol, ...overrides };
  }

  /**
   * Generate multiple protocols
   */
  static createProtocols(count: number, baseOverrides: Partial<Protocol> = {}): Protocol[] {
    return Array.from({ length: count }, (_, index) => {
      const overrides = {
        ...baseOverrides,
        name: `${baseOverrides.name || 'Test Protocol'} ${index + 1}`,
        contractAddresses: [
          this.generateEthereumAddress(),
          this.generateEthereumAddress()
        ]
      };
      return this.createProtocol(overrides);
    });
  }

  /**
   * Generate mock category scores
   */
  static createCategoryScores(overrides: Partial<CategoryScores> = {}): CategoryScores {
    const defaults: CategoryScores = {
      technical: Math.floor(Math.random() * 100),
      governance: Math.floor(Math.random() * 100),
      liquidity: Math.floor(Math.random() * 100),
      reputation: Math.floor(Math.random() * 100)
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate mock assessment metadata
   */
  static createAssessmentMetadata(overrides: Partial<AssessmentMetadata> = {}): AssessmentMetadata {
    const defaults: AssessmentMetadata = {
      analysisVersion: '1.0.0',
      analysisDepth: AnalysisDepth.STANDARD,
      executionTime: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
      dataSourcesUsed: ['smart-contract-analyzer', 'governance-analyzer', 'liquidity-analyzer'],
      warnings: [],
      externalDataFreshness: {
        'etherscan': new Date(Date.now() - Math.random() * 86400000), // Random within last day
        'coingecko': new Date(Date.now() - Math.random() * 86400000)
      }
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate mock finding
   */
  static createFinding(overrides: Partial<Finding> = {}): Finding {
    const categories = Object.values(FindingCategory);
    const severities = Object.values(FindingSeverity);

    const defaults: Finding = {
      id: this.generateId('finding'),
      category: categories[Math.floor(Math.random() * categories.length)] as FindingCategory,
      severity: severities[Math.floor(Math.random() * severities.length)] as FindingSeverity,
      title: `Test Finding ${this.counter}`,
      description: `This is a test finding generated for automated testing purposes`,
      recommendation: `Consider addressing this test finding`,
      source: 'test-analyzer',
      confidence: Math.floor(Math.random() * 100),
      metadata: {
        testFlag: true,
        generatedAt: new Date().toISOString()
      }
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate mock risk assessment
   */
  static createRiskAssessment(protocolId?: string, overrides: Partial<RiskAssessment> = {}): RiskAssessment {
    const categoryScores = this.createCategoryScores();
    const overallScore = Math.round(
      (categoryScores.technical + categoryScores.governance + 
       categoryScores.liquidity + categoryScores.reputation) / 4
    );

    let riskLevel: RiskLevel;
    if (overallScore >= 80) riskLevel = RiskLevel.LOW;
    else if (overallScore >= 60) riskLevel = RiskLevel.MEDIUM;
    else if (overallScore >= 40) riskLevel = RiskLevel.HIGH;
    else riskLevel = RiskLevel.CRITICAL;

    const defaults: RiskAssessment = {
      id: this.generateId('assessment'),
      protocolId: protocolId || this.generateId('protocol'),
      status: AssessmentStatus.COMPLETED,
      overallScore,
      riskLevel,
      categoryScores,
      recommendations: [
        'Review smart contract security',
        'Improve governance transparency',
        'Monitor liquidity levels',
        'Enhance community engagement'
      ],
      metadata: this.createAssessmentMetadata(),
      findings: [
        this.createFinding(),
        this.createFinding({ severity: FindingSeverity.HIGH }),
        this.createFinding({ category: FindingCategory.GOVERNANCE })
      ],
      completedAt: new Date(),
      createdAt: new Date(Date.now() - Math.random() * 86400000), // Random within last day
      updatedAt: new Date()
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate assessment request
   */
  static createAssessmentRequest(overrides: Partial<AssessmentRequest> = {}): AssessmentRequest {
    const defaults: AssessmentRequest = {
      protocolId: this.generateUUID(),
      analysisDepth: AnalysisDepth.STANDARD,
      priority: AssessmentPriority.NORMAL,
      enabledAnalyzers: ['smart-contract-analyzer', 'governance-analyzer']
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate realistic DeFi protocol scenarios
   */
  static createRealisticScenarios() {
    return {
      // High-quality DEX
      uniswapLike: this.createProtocol({
        name: 'UniswapV3 Clone',
        category: ProtocolCategory.DEX,
        blockchain: Blockchain.ETHEREUM,
        tokenSymbol: 'UNI3',
        description: 'Decentralized exchange with concentrated liquidity'
      }),

      // Risky lending protocol
      riskyLending: this.createProtocol({
        name: 'RiskyLend Protocol',
        category: ProtocolCategory.LENDING,
        blockchain: Blockchain.ETHEREUM,
        tokenSymbol: 'RISK',
        description: 'High-yield lending protocol with experimental features'
      }),

      // Stable farming protocol
      yieldFarm: this.createProtocol({
        name: 'SafeYield Farm',
        category: ProtocolCategory.YIELD_FARMING,
        blockchain: Blockchain.ETHEREUM,
        tokenSymbol: 'SYLD',
        description: 'Conservative yield farming with blue-chip assets'
      }),

      // Cross-chain bridge
      bridge: this.createProtocol({
        name: 'MultiChain Bridge',
        category: ProtocolCategory.BRIDGE,
        blockchain: Blockchain.ETHEREUM,
        tokenSymbol: 'BRDG',
        description: 'Cross-chain asset bridge supporting multiple networks'
      })
    };
  }

  /**
   * Generate edge case test data
   */
  static createEdgeCases() {
    return {
      // Minimal protocol data
      minimal: {
        name: 'Min',
        contractAddresses: ['0x1234567890123456789012345678901234567890'],
        blockchain: Blockchain.ETHEREUM
      },

      // Maximum length data
      maximal: this.createProtocolInput({
        name: 'A'.repeat(200), // Test maximum name length
        description: 'B'.repeat(1000), // Test maximum description length
        tags: Array.from({ length: 20 }, (_, i) => `tag${i}`) // Many tags
      }),

      // Special characters
      specialChars: this.createProtocolInput({
        name: 'Protocol™ with Ѕpëcîål Çhärs & 中文',
        description: 'Testing unicode, emojis 🚀💎, and special chars: !@#$%^&*()'
      }),

      // Empty optional fields
      emptyOptionals: {
        name: 'Empty Optionals Protocol',
        contractAddresses: ['0x1234567890123456789012345678901234567890'],
        blockchain: Blockchain.ETHEREUM
        // All optional fields omitted
      }
    };
  }

  /**
   * Generate performance test data
   */
  static createPerformanceTestData(count: number) {
    const protocols = this.createProtocols(count);
    const assessments = protocols.map(protocol => 
      this.createRiskAssessment(protocol.id)
    );

    return { protocols, assessments };
  }

  /**
   * Reset counter for consistent test runs
   */
  static reset(): void {
    this.counter = 0;
  }
}
