import { BSCScanClient, createBSCScanClient } from '../../src/services/bscscan-client';

// Mock the external-api-client dependency
jest.mock('../../src/services/external-api-client');
jest.mock('../../src/config/logger');

describe('BSCScanClient', () => {
  let client: BSCScanClient;

  beforeEach(() => {
    client = createBSCScanClient({
      network: 'mainnet'
    });
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with mainnet network by default', () => {
      expect(client.getNetwork()).toBe('mainnet');
    });

    it('should initialize with custom network', () => {
      const testnetClient = createBSCScanClient({
        network: 'testnet'
      });
      expect(testnetClient.getNetwork()).toBe('testnet');
    });

    it('should throw error for unsupported network', () => {
      expect(() => {
        new BSCScanClient({
          baseUrl: '',
          network: 'invalid' as any,
          rateLimit: { requestsPerSecond: 5, burstSize: 10 },
          retry: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 1000 },
          timeout: 10000,
          circuitBreaker: { failureThreshold: 5, timeoutMs: 10000, resetTimeoutMs: 60000 },
          cache: { enabled: true, ttlMs: 300000, maxSize: 1000 }
        });
      }).toThrow('Unsupported BSC network: invalid');
    });
  });

  describe('Address Validation', () => {
    it('should validate valid BSC addresses', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      
      // Should not throw for valid address
      expect(() => {
        (client as any).validateBSCAddress(validAddress);
      }).not.toThrow();
    });

    it('should reject invalid BSC addresses', () => {
      const invalidAddresses = [
        '',
        'invalid',
        '0x123', // too short
        '0x12345678901234567890123456789012345678901', // too long
        '1234567890123456789012345678901234567890', // missing 0x
        '0xZZZZ567890123456789012345678901234567890' // invalid characters
      ];

      invalidAddresses.forEach(address => {
        expect(() => {
          (client as any).validateBSCAddress(address);
        }).toThrow();
      });
    });
  });

  describe('API Key Management', () => {
    it('should not include API key in headers', () => {
      const headers = (client as any).getAuthHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('Query String Building', () => {
    it('should build proper query strings', () => {
      const params = {
        module: 'account',
        action: 'balance',
        address: '0x1234567890123456789012345678901234567890',
        tag: 'latest'
      };

      const queryString = (client as any).buildQueryString(params);
      
      expect(queryString).toContain('module=account');
      expect(queryString).toContain('action=balance');
      expect(queryString).toContain('address=0x1234567890123456789012345678901234567890');
      expect(queryString).toContain('tag=latest');
    });

    it('should handle special characters in query params', () => {
      const params = {
        test: 'value with spaces',
        special: 'chars&symbols'
      };

      const queryString = (client as any).buildQueryString(params);
      
      expect(queryString).toContain('test=value+with+spaces');
      expect(queryString).toContain('special=chars%26symbols');
    });
  });

  describe('Network URL Mapping', () => {
    it('should return correct URLs for different networks', () => {
      expect((BSCScanClient as any).getBaseUrl('mainnet')).toBe('https://api.bscscan.com/api');
      expect((BSCScanClient as any).getBaseUrl('testnet')).toBe('https://api-testnet.bscscan.com/api');
    });
  });

  describe('Factory Function', () => {
    it('should create client with default configuration', () => {
      const defaultClient = createBSCScanClient({});
      expect(defaultClient.getNetwork()).toBe('mainnet');
    });

    it('should create client with custom configuration', () => {
      const customClient = createBSCScanClient({
        network: 'testnet',
        apiKey: 'test-key',
        rateLimit: {
          requestsPerSecond: 10,
          burstSize: 20
        }
      });

      expect(customClient.getNetwork()).toBe('testnet');
    });
  });

  describe('Multiple Balances Validation', () => {
    it('should validate address count limit', async () => {
      const tooManyAddresses = Array(21).fill(0).map((_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      await expect(
        client.getMultipleBalances(tooManyAddresses)
      ).rejects.toThrow('Maximum 20 addresses allowed per request');
    });

    it('should handle empty address array', async () => {
      // Mock the makeRequest method to avoid actual API calls
      const mockMakeRequest = jest.fn().mockResolvedValue({
        data: { status: '1', result: [] },
        status: 200,
        headers: {},
        cached: false,
        timestamp: new Date()
      });
      (client as any).makeRequest = mockMakeRequest;

      const result = await client.getMultipleBalances([]);
      expect(result).toEqual({});
      expect(mockMakeRequest).not.toHaveBeenCalled();
    });
  });
});
