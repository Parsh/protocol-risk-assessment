/**
 * Unit Tests for Data Models
 * Tests validation, factory methods, type guards, and utilities
 */

import {
  Protocol,
  ProtocolInput,
  RiskAssessment,
  ValidationSchemas,
  ModelFactory,
  ModelUtils,
  TypeGuards,
  ProtocolCategory,
  Blockchain,
  AssessmentStatus,
  RiskLevel,
  AnalysisDepth,
  FindingSeverity,
  FindingCategory
} from '../../src/models/index';
import { MockDataFactory } from '../mock-data.factory';

describe('Data Models - Unit Tests', () => {
  beforeEach(() => {
    MockDataFactory.reset();
  });

  describe('Validation Schemas', () => {
    describe('Protocol Input Validation', () => {
      it('should validate correct protocol input', () => {
        const validInput = MockDataFactory.createProtocolInput();
        const { error, value } = ValidationSchemas.protocolInput.validate(validInput);
        
        expect(error).toBeUndefined();
        expect(value).toEqual(validInput);
      });

      it('should reject missing required fields', () => {
        const invalidInput = {
          name: 'Test Protocol'
          // Missing contractAddresses and blockchain
        };
        
        const { error } = ValidationSchemas.protocolInput.validate(invalidInput);
        expect(error).toBeDefined();
        expect(error!.details.length).toBeGreaterThanOrEqual(1); // At least contractAddresses is missing
      });

      it('should reject invalid contract addresses', () => {
        const invalidInput = MockDataFactory.createProtocolInput({
          contractAddresses: ['invalid-address', '0xinvalid']
        });
        
        const { error } = ValidationSchemas.protocolInput.validate(invalidInput);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('fails to match the required pattern');
      });

      it('should reject invalid blockchain', () => {
        const invalidInput = MockDataFactory.createProtocolInput({
          blockchain: 'invalid-blockchain' as any
        });
        
        const { error } = ValidationSchemas.protocolInput.validate(invalidInput);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('must be one of');
      });

      it('should validate optional fields correctly', () => {
        const inputWithOptionals = MockDataFactory.createProtocolInput({
          website: 'https://test.com',
          documentation: 'https://docs.test.com',
          description: 'Test description',
          category: ProtocolCategory.DEX,
          tags: ['defi', 'test']
        });
        
        const { error } = ValidationSchemas.protocolInput.validate(inputWithOptionals);
        expect(error).toBeUndefined();
      });

      it('should reject invalid URLs', () => {
        const inputWithInvalidUrl = MockDataFactory.createProtocolInput({
          website: 'not-a-url'
        });
        
        const { error } = ValidationSchemas.protocolInput.validate(inputWithInvalidUrl);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('fails to match the required pattern');
      });

      it('should handle edge cases', () => {
        const edgeCases = MockDataFactory.createEdgeCases();
        
        // Test minimal valid input
        const { error: minError } = ValidationSchemas.protocolInput.validate(edgeCases.minimal);
        expect(minError).toBeUndefined();
        
        // Test empty optionals
        const { error: emptyError } = ValidationSchemas.protocolInput.validate(edgeCases.emptyOptionals);
        expect(emptyError).toBeUndefined();
      });
    });

    describe('Assessment Request Validation', () => {
      it('should validate assessment request with protocol ID', () => {
        const request = MockDataFactory.createAssessmentRequest();
        const { error } = ValidationSchemas.assessmentRequest.validate(request);
        expect(error).toBeUndefined();
      });

      it('should validate assessment request with new protocol', () => {
        const request = {
          protocol: MockDataFactory.createProtocolInput(),
          analysisDepth: AnalysisDepth.STANDARD
        };
        const { error } = ValidationSchemas.assessmentRequest.validate(request);
        expect(error).toBeUndefined();
      });

      it('should reject request without protocol ID or protocol data', () => {
        const request = {
          analysisDepth: AnalysisDepth.STANDARD
        };
        const { error } = ValidationSchemas.assessmentRequest.validate(request);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Model Factory', () => {
    describe('Protocol Creation', () => {
      it('should create protocol with all required fields', () => {
        const input = MockDataFactory.createProtocolInput();
        const protocol = ModelFactory.createProtocol(input);

        expect(protocol).toBeValidProtocol();
        expect(protocol.name).toBe(input.name);
        expect(protocol.contractAddresses).toEqual(input.contractAddresses);
        expect(protocol.blockchain).toBe(input.blockchain);
        expect(protocol.id).toBeDefined();
        expect(protocol.createdAt).toBeInstanceOf(Date);
        expect(protocol.updatedAt).toBeInstanceOf(Date);
      });

      it('should generate unique IDs for each protocol', () => {
        const input1 = MockDataFactory.createProtocolInput();
        const input2 = MockDataFactory.createProtocolInput();
        const protocol1 = ModelFactory.createProtocol(input1);
        const protocol2 = ModelFactory.createProtocol(input2);

        expect(protocol1.id).not.toBe(protocol2.id);
      });

      it('should preserve optional fields when provided', () => {
        const input = MockDataFactory.createProtocolInput({
          tokenSymbol: 'TEST',
          website: 'https://test.com',
          description: 'Test protocol',
          category: ProtocolCategory.LENDING,
          tags: ['test', 'lending']
        });
        
        const protocol = ModelFactory.createProtocol(input);
        
        expect(protocol.tokenSymbol).toBe(input.tokenSymbol);
        expect(protocol.website).toBe(input.website);
        expect(protocol.description).toBe(input.description);
        expect(protocol.category).toBe(input.category);
        expect(protocol.tags).toEqual(input.tags);
      });
    });

    describe('Risk Assessment Creation', () => {
      it('should create risk assessment with all required fields', () => {
        const protocolId = 'test-protocol-id';
        const scores = MockDataFactory.createCategoryScores();
        const metadata = MockDataFactory.createAssessmentMetadata();
        
        const assessment = ModelFactory.createRiskAssessment(
          protocolId,
          scores,
          metadata,
          [],
          undefined
        );

        expect(assessment).toBeValidAssessment();
        expect(assessment.protocolId).toBe(protocolId);
        expect(assessment.categoryScores).toEqual(scores);
        expect(assessment.status).toBe(AssessmentStatus.PENDING);
        expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
        expect(assessment.overallScore).toBeLessThanOrEqual(100);
      });

      it('should calculate overall score correctly', () => {
        const scores = {
          technical: 80,
          governance: 60,
          liquidity: 70,
          reputation: 90
        };
        
        const assessment = ModelFactory.createRiskAssessment(
          'test-id',
          scores,
          MockDataFactory.createAssessmentMetadata(),
          []
        );

        const expectedScore = Math.round((80 * 0.4) + (60 * 0.25) + (70 * 0.2) + (90 * 0.15));
        expect(assessment.overallScore).toBe(expectedScore);
      });

      it('should determine risk level based on overall score', () => {
        const testCases = [
          { score: 90, expectedLevel: RiskLevel.CRITICAL },
          { score: 70, expectedLevel: RiskLevel.HIGH },
          { score: 50, expectedLevel: RiskLevel.MEDIUM },
          { score: 20, expectedLevel: RiskLevel.LOW }
        ];

        testCases.forEach(({ score, expectedLevel }) => {
          const scores = {
            technical: score,
            governance: score,
            liquidity: score,
            reputation: score
          };
          
          const assessment = ModelFactory.createRiskAssessment(
            'test-id',
            scores,
            MockDataFactory.createAssessmentMetadata(),
            []
          );

          expect(assessment.riskLevel).toBe(expectedLevel);
        });
      });
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify valid protocols', () => {
      const validProtocol = MockDataFactory.createProtocol();
      expect(TypeGuards.isProtocol(validProtocol)).toBe(true);
    });

    it('should reject invalid protocol objects', () => {
      const invalidProtocols = [
        null,
        undefined,
        {},
        { id: 'test' }, // Missing required fields
        { name: 'test', contractAddresses: [], blockchain: 'eth' } // Missing id and dates
      ];

      invalidProtocols.forEach(invalid => {
        expect(TypeGuards.isProtocol(invalid)).toBe(false);
      });
    });

    it('should correctly identify valid risk assessments', () => {
      const validAssessment = MockDataFactory.createRiskAssessment();
      expect(TypeGuards.isRiskAssessment(validAssessment)).toBe(true);
    });

    it('should reject invalid assessment objects', () => {
      const invalidAssessments = [
        null,
        undefined,
        {},
        { id: 'test' }, // Missing required fields
        { protocolId: 'test', status: 'PENDING' } // Missing other required fields
      ];

      invalidAssessments.forEach(invalid => {
        expect(TypeGuards.isRiskAssessment(invalid)).toBe(false);
      });
    });
  });

  describe('Model Utils', () => {
    describe('calculateOverallScore', () => {
      it('should calculate weighted average of category scores', () => {
        const scores = { technical: 80, governance: 60, liquidity: 70, reputation: 90 };
        const result = ModelUtils.calculateOverallScore(scores);
        // Default weights: technical(40%), governance(25%), liquidity(20%), reputation(15%)
        const expected = Math.round((80 * 0.4) + (60 * 0.25) + (70 * 0.2) + (90 * 0.15));
        expect(result).toBe(expected);
      });

      it('should handle edge cases', () => {
        const edgeCases = [
          { technical: 0, governance: 0, liquidity: 0, reputation: 0 },
          { technical: 100, governance: 100, liquidity: 100, reputation: 100 }
        ];

        edgeCases.forEach(scores => {
          const result = ModelUtils.calculateOverallScore(scores);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        });
      });
    });

    describe('determineRiskLevel', () => {
      it('should return correct risk levels for score ranges', () => {
        const testCases = [
          { score: 95, expected: RiskLevel.CRITICAL },
          { score: 80, expected: RiskLevel.CRITICAL },
          { score: 79, expected: RiskLevel.HIGH },
          { score: 60, expected: RiskLevel.HIGH },
          { score: 59, expected: RiskLevel.MEDIUM },
          { score: 30, expected: RiskLevel.MEDIUM },
          { score: 29, expected: RiskLevel.LOW },
          { score: 0, expected: RiskLevel.LOW }
        ];

        testCases.forEach(({ score, expected }) => {
          expect(ModelUtils.determineRiskLevel(score)).toBe(expected);
        });
      });
    });

    describe('isValidEthereumAddress', () => {
      it('should validate correct Ethereum addresses', () => {
        const validAddresses = [
          '0x1234567890123456789012345678901234567890',
          '0xabcdefABCDEF1234567890123456789012345678',
          '0x0000000000000000000000000000000000000000'
        ];

        validAddresses.forEach(address => {
          expect(ModelUtils.isValidEthereumAddress(address)).toBe(true);
        });
      });

      it('should reject invalid addresses', () => {
        const invalidAddresses = [
          'invalid',
          '0xinvalid',
          '0x123', // Too short
          '0x12345678901234567890123456789012345678901', // Too long
          '1234567890123456789012345678901234567890' // Missing 0x prefix
        ];

        invalidAddresses.forEach(address => {
          expect(ModelUtils.isValidEthereumAddress(address)).toBe(false);
        });
      });
    });
  });

  describe('Enums', () => {
    it('should have valid enum values', () => {
      expect(Object.values(ProtocolCategory)).toContain('DEX');
      expect(Object.values(Blockchain)).toContain('ethereum');
      expect(Object.values(AssessmentStatus)).toContain('PENDING');
      expect(Object.values(RiskLevel)).toContain('LOW');
      expect(Object.values(AnalysisDepth)).toContain('STANDARD');
      expect(Object.values(FindingSeverity)).toContain('CRITICAL');
      expect(Object.values(FindingCategory)).toContain('TECHNICAL');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle special characters in protocol names', () => {
      const specialCharInput = MockDataFactory.createEdgeCases().specialChars;
      const { error } = ValidationSchemas.protocolInput.validate(specialCharInput);
      expect(error).toBeUndefined();
    });

    it('should handle maximum length inputs', () => {
      const maximalInput = MockDataFactory.createEdgeCases().maximal;
      const { error } = ValidationSchemas.protocolInput.validate(maximalInput);
      
      // Some fields might be too long and should be rejected
      if (error) {
        expect(error.details.some(detail => 
          detail.message.includes('length') || detail.message.includes('must be less than')
        )).toBe(true);
      }
    });

    it('should handle empty arrays and null values appropriately', () => {
      const inputWithEmptyArrays = {
        name: 'Test Protocol',
        contractAddresses: [], // Empty array should be rejected
        blockchain: Blockchain.ETHEREUM
      };

      const { error } = ValidationSchemas.protocolInput.validate(inputWithEmptyArrays);
      expect(error).toBeDefined();
      expect(error!.details[0]!.message).toContain('must contain at least 1 items');
    });
  });
});
