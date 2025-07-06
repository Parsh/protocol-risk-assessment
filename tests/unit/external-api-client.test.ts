import { ExternalApiClient, ApiClientConfig, ApiResponse, CircuitBreakerState } from '../../src/services/external-api-client';
import { logger } from '../../src/config/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock dependencies
jest.mock('../../src/config/logger');
jest.mock('fs/promises');

// Mock fetch globally
global.fetch = jest.fn();

class TestApiClient extends ExternalApiClient {
  constructor(config: ApiClientConfig, cacheDir: string = '/tmp/test-cache') {
    super(config, cacheDir);
  }

  // Expose protected method for testing
  public async testMakeRequest<T>(
    endpoint: string,
    options?: RequestInit,
    cacheKey?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, options, cacheKey);
  }

  // Override getAuthHeaders for testing
  public getAuthHeaders(): Record<string, string> {
    if (!this.config.apiKey) {
      return {};
    }
    return {
      'X-API-Key': this.config.apiKey
    };
  }
}

describe('ExternalApiClient', () => {
  let client: TestApiClient;
  let defaultConfig: ApiClientConfig;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    defaultConfig = {
      baseUrl: 'https://api.example.com',
      apiKey: 'test-api-key',
      rateLimit: {
        requestsPerSecond: 10,
        burstSize: 20
      },
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 100
      },
      timeout: 5000,
      circuitBreaker: {
        failureThreshold: 5,
        timeoutMs: 5000,
        resetTimeoutMs: 30000
      },
      cache: {
        enabled: true,
        ttlMs: 300000, // 5 minutes
        maxSize: 100
      }
    };

    client = new TestApiClient(defaultConfig);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFs = fs as jest.Mocked<typeof fs>;

    // Reset mocks
    jest.clearAllMocks();
    jest.restoreAllMocks(); // Restore any mocked timers
    mockFetch.mockClear();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      const stats = client.getStats();
      
      expect(stats.circuitBreaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.circuitBreaker.failureCount).toBe(0);
      expect(stats.rateLimiter.tokensAvailable).toBe(defaultConfig.rateLimit.burstSize);
      expect(stats.rateLimiter.requestsPerSecond).toBe(defaultConfig.rateLimit.requestsPerSecond);
    });

    it.skip('should create cache directory', async () => {
      // The cache directory creation happens during constructor
      // We need to wait for the async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/test-cache', { recursive: true });
    });
  });

  describe('Rate Limiting', () => {
    it('should consume tokens on requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const initialTokens = client.getStats().rateLimiter.tokensAvailable;
      
      await client.testMakeRequest('/test');
      
      const finalTokens = client.getStats().rateLimiter.tokensAvailable;
      expect(finalTokens).toBe(initialTokens - 1);
    });

    it('should wait when rate limit is exceeded', async () => {
      const slowConfig = {
        ...defaultConfig,
        rateLimit: {
          requestsPerSecond: 1,
          burstSize: 1
        }
      };
      const slowClient = new TestApiClient(slowConfig);

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const startTime = Date.now();
      
      // Make two rapid requests
      await slowClient.testMakeRequest('/test1');
      await slowClient.testMakeRequest('/test2');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Second request should have been delayed
      expect(duration).toBeGreaterThan(800); // Allow some margin for timing
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const mockResponse1 = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };
      
      const mockResponse2 = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' }),
        headers: new Headers()
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as any)
        .mockResolvedValueOnce(mockResponse2 as any);

      const result = await client.testMakeRequest('/test');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ data: 'success' });
      expect(result.status).toBe(200);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('Bad Request')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.testMakeRequest('/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.testMakeRequest('/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(defaultConfig.retry.maxAttempts);
    });

    it.skip('should apply exponential backoff with jitter', async () => {
      const mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        // Don't call the function, just return a timer ID
        return setTimeout(() => {}, 0) as any;
      });

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.testMakeRequest('/test')).rejects.toThrow();
      
      // Should have called setTimeout for delays between retries (not including timeout delays)
      const delayCalls = mockSetTimeout.mock.calls.filter((call: any) => call && call[1] > 50); // Filter out timeout calls
      expect(delayCalls.length).toBe(2); // 2 delays for 3 attempts

      mockSetTimeout.mockRestore();
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      // Make enough failed requests to trigger circuit breaker
      for (let i = 0; i < defaultConfig.circuitBreaker.failureThreshold; i++) {
        try {
          await client.testMakeRequest('/test');
        } catch (error) {
          // Expected to fail
        }
      }

      const stats = client.getStats();
      expect(stats.circuitBreaker.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should reject requests when circuit breaker is open', async () => {
      // First, open the circuit breaker
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      for (let i = 0; i < defaultConfig.circuitBreaker.failureThreshold; i++) {
        try {
          await client.testMakeRequest('/test');
        } catch (error) {
          // Expected to fail
        }
      }

      // Now try to make another request - should be rejected by circuit breaker
      await expect(client.testMakeRequest('/test')).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to half-open state after reset timeout', async () => {
      // Mock Date.now to control time
      const mockNow = jest.spyOn(Date, 'now');
      const baseTime = 1000000000;
      mockNow.mockReturnValue(baseTime);

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      // Open circuit breaker
      for (let i = 0; i < defaultConfig.circuitBreaker.failureThreshold; i++) {
        try {
          await client.testMakeRequest('/test');
        } catch (error) {
          // Expected to fail
        }
      }

      expect(client.getStats().circuitBreaker.state).toBe(CircuitBreakerState.OPEN);

      // Advance time past reset timeout
      mockNow.mockReturnValue(baseTime + defaultConfig.circuitBreaker.resetTimeoutMs + 1000);

      // Next request should transition to half-open (but still fail)
      try {
        await client.testMakeRequest('/test');
      } catch (error) {
        // Expected to fail
      }

      mockNow.mockRestore();
    });

    it('should close circuit breaker on successful request in half-open state', async () => {
      // Mock Date.now to control time
      const mockNow = jest.spyOn(Date, 'now');
      const baseTime = 1000000000;
      mockNow.mockReturnValue(baseTime);

      const mockFailResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      const mockSuccessResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' }),
        headers: new Headers()
      };

      // Open circuit breaker
      mockFetch.mockResolvedValue(mockFailResponse as any);
      for (let i = 0; i < defaultConfig.circuitBreaker.failureThreshold; i++) {
        try {
          await client.testMakeRequest('/test');
        } catch (error) {
          // Expected to fail
        }
      }

      // Advance time past reset timeout
      mockNow.mockReturnValue(baseTime + defaultConfig.circuitBreaker.resetTimeoutMs + 1000);

      // Successful request should close circuit breaker
      mockFetch.mockResolvedValue(mockSuccessResponse as any);
      await client.testMakeRequest('/test');

      expect(client.getStats().circuitBreaker.state).toBe(CircuitBreakerState.CLOSED);
      mockNow.mockRestore();
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue();
    });

    it('should cache successful responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result1 = await client.testMakeRequest('/test', {}, 'test-key');
      const result2 = await client.testMakeRequest('/test', {}, 'test-key');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(true);
      expect(result2.data).toEqual({ data: 'test' });
    });

    it.skip('should write cache to disk', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.testMakeRequest('/test', {}, 'test-key');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-key.json'),
        expect.stringContaining('"data":{"data":"test"}')
      );
    });

    it('should load cache from disk when memory cache misses', async () => {
      const cacheEntry = {
        data: { data: 'cached' },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString()
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await client.testMakeRequest('/test', {}, 'test-key');

      expect(result.cached).toBe(true);
      expect(result.data).toEqual({ data: 'cached' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should respect cache TTL', async () => {
      const expiredCacheEntry = {
        data: { data: 'expired' },
        timestamp: new Date(Date.now() - 400000).toISOString(),
        expiresAt: new Date(Date.now() - 100000).toISOString()
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(expiredCacheEntry));

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'fresh' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.testMakeRequest('/test', {}, 'test-key');

      expect(result.cached).toBe(false);
      expect(result.data).toEqual({ data: 'fresh' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should enforce cache size limit', async () => {
      const smallCacheConfig = {
        ...defaultConfig,
        cache: {
          ...defaultConfig.cache,
          maxSize: 2
        }
      };
      const smallCacheClient = new TestApiClient(smallCacheConfig);

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Add 3 entries to cache (exceeds maxSize of 2)
      await smallCacheClient.testMakeRequest('/test1', {}, 'key1');
      await smallCacheClient.testMakeRequest('/test2', {}, 'key2');
      await smallCacheClient.testMakeRequest('/test3', {}, 'key3');

      expect(smallCacheClient.getStats().cache.size).toBe(2);
    });

    it('should clear cache when requested', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Add entry to cache
      await client.testMakeRequest('/test', {}, 'test-key');
      expect(client.getStats().cache.size).toBe(1);

      // Mock readdir and unlink for disk cache clearing
      mockFs.readdir.mockResolvedValue(['test-key.json', 'other.txt'] as any);
      mockFs.unlink.mockResolvedValue();

      // Clear cache
      await client.clearCache();

      expect(client.getStats().cache.size).toBe(0);
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('test-key.json'));
      expect(mockFs.unlink).not.toHaveBeenCalledWith(expect.stringContaining('other.txt'));
    });
  });

  describe('Request Headers and Authentication', () => {
    it('should include API key in custom header format', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.testMakeRequest('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should work without API key', async () => {
      const configWithoutKey = { ...defaultConfig };
      delete configWithoutKey.apiKey;
      const clientWithoutKey = new TestApiClient(configWithoutKey);

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await clientWithoutKey.testMakeRequest('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      const callArgs = mockFetch.mock.calls[0];
      const options = callArgs ? callArgs[1] : undefined;
      expect((options as RequestInit)?.headers).not.toHaveProperty('X-API-Key');
    });

    it('should merge custom headers with default headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.testMakeRequest('/test', {
        headers: {
          'Custom-Header': 'custom-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
            'Custom-Header': 'custom-value'
          })
        })
      );
    });
  });

  describe('Timeout Handling', () => {
    it.skip('should handle request timeout with AbortController', async () => {
      // Mock a request that never resolves to simulate timeout
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Use fake timers to control timeout
      jest.useFakeTimers();

      const requestPromise = client.testMakeRequest('/test');

      // Advance timers by the timeout amount
      jest.advanceTimersByTime(defaultConfig.timeout);

      // The request should be aborted and reject
      await expect(requestPromise).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const stats = client.getStats();

      expect(stats).toHaveProperty('circuitBreaker');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('rateLimiter');

      expect(stats.circuitBreaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.cache.size).toBe(0);
      expect(stats.rateLimiter.tokensAvailable).toBe(defaultConfig.rateLimit.burstSize);
    });
  });

  describe('Error Handling', () => {
    it('should create proper ApiError for HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Resource not found')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      try {
        await client.testMakeRequest('/test');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('API request failed');
        expect(error.message).toContain('404');
        expect(error.response).toBe('Resource not found');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      try {
        await client.testMakeRequest('/test');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.testMakeRequest('/test')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Logging', () => {
    beforeEach(() => {
      // Reset logger mocks for this section
      jest.clearAllMocks();
    });

    it('should log successful requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.testMakeRequest('/test');

      expect(logger.info).toHaveBeenCalledWith(
        'API request successful',
        expect.objectContaining({
          service: 'external-api-client',
          url: 'https://api.example.com/test',
          status: 200
        })
      );
    });

    it('should log cache hits', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Headers()
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // First request to populate cache
      await client.testMakeRequest('/test', {}, 'test-key');

      // Clear mock calls from first request
      jest.clearAllMocks();

      // Second request should hit cache
      await client.testMakeRequest('/test', {}, 'test-key');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit'),
        expect.objectContaining({
          service: 'external-api-client'
        })
      );
    });

    it.skip('should log retry attempts', async () => {
      const mockResponse1 = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };
      
      const mockResponse2 = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' }),
        headers: new Headers()
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as any)
        .mockResolvedValueOnce(mockResponse2 as any);

      await client.testMakeRequest('/test');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retryable error on attempt'),
        expect.objectContaining({
          service: 'external-api-client'
        })
      );
    });
  });
});
