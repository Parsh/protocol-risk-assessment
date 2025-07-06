/**
 * Jest Test Setup
 * Configures testing environment and utilities
 */

import { logger } from '../src/config/logger';
import * as fs from 'fs';
import * as path from 'path';

// Global test configuration
const TEST_DATA_DIR = path.join(__dirname, '../data/test');
const TEST_TIMEOUT = 30000;

// Environment setup
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = TEST_DATA_DIR;

// Silence logger during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  // Mock logger methods for testing
  jest.spyOn(logger, 'info').mockImplementation(() => {});
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
  jest.spyOn(logger, 'debug').mockImplementation(() => {});
}

// Global setup
beforeAll(async () => {
  // Ensure test data directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
}, TEST_TIMEOUT);

// Cleanup after all tests
afterAll(async () => {
  // Clean up test data directory with robust cleanup
  if (fs.existsSync(TEST_DATA_DIR)) {
    try {
      // First try to fix any permission issues
      const fixPermissions = (dirPath: string) => {
        try {
          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
              fs.chmodSync(itemPath, 0o755);
              fixPermissions(itemPath);
            } else {
              fs.chmodSync(itemPath, 0o644);
            }
          }
          fs.chmodSync(dirPath, 0o755);
        } catch (error) {
          // Ignore permission errors during cleanup
        }
      };
      
      fixPermissions(TEST_DATA_DIR);
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    } catch (error) {
      // If cleanup fails, log but don't fail tests
      console.warn('Test cleanup warning:', error);
    }
  }
});

// Global test utilities
global.testUtils = {
  // Helper to clean test data between tests
  async cleanTestData() {
    if (fs.existsSync(TEST_DATA_DIR)) {
      const files = fs.readdirSync(TEST_DATA_DIR);
      for (const file of files) {
        const filePath = path.join(TEST_DATA_DIR, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
  },

  // Helper to create test data directory structure
  async createTestDataStructure() {
    const dirs = ['protocols', 'assessments', 'backups'];
    for (const dir of dirs) {
      const dirPath = path.join(TEST_DATA_DIR, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  },

  // Test data directory path
  testDataDir: TEST_DATA_DIR,

  // Test timeout constant
  timeout: TEST_TIMEOUT
};

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidProtocol(): R;
      toBeValidAssessment(): R;
    }
  }
  
  var testUtils: {
    cleanTestData(): Promise<void>;
    createTestDataStructure(): Promise<void>;
    testDataDir: string;
    timeout: number;
  };
}

// Custom matchers for domain objects
expect.extend({
  toBeValidProtocol(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      Array.isArray(received.contractAddresses) &&
      typeof received.blockchain === 'string' &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    return {
      message: () => `expected ${received} to be a valid Protocol object`,
      pass
    };
  },

  toBeValidAssessment(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.protocolId === 'string' &&
      typeof received.status === 'string' &&
      typeof received.overallScore === 'number' &&
      typeof received.riskLevel === 'string' &&
      received.categoryScores &&
      Array.isArray(received.recommendations) &&
      received.metadata &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    return {
      message: () => `expected ${received} to be a valid RiskAssessment object`,
      pass
    };
  }
});
