/**
 * Base External API Client
 * Provides common functionality for all external API integrations including
 * rate limiting, retry logic, circuit breaker pattern, and response caching
 */

import { logger } from '../config/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerSecond: number;
    burstSize: number;
  };
  retry: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  timeout: number;
  circuitBreaker: {
    failureThreshold: number;
    timeoutMs: number;
    resetTimeoutMs: number;
  };
  cache: {
    enabled: boolean;
    ttlMs: number;
    maxSize: number;
  };
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  cached: boolean;
  timestamp: Date;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryable: boolean;
  response?: any;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

interface CacheEntry {
  data: any;
  timestamp: Date;
  expiresAt: Date;
}

interface RateLimiterState {
  tokens: number;
  lastRefill: Date;
}

export abstract class ExternalApiClient {
  protected config: ApiClientConfig;
  private circuitBreaker: CircuitBreakerStats;
  private cache: Map<string, CacheEntry>;
  private rateLimiter: RateLimiterState;
  private cacheDir: string;

  constructor(config: ApiClientConfig, cacheDir: string) {
    this.config = config;
    this.cacheDir = cacheDir;
    
    // Initialize circuit breaker
    this.circuitBreaker = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0
    };

    // Initialize cache
    this.cache = new Map();

    // Initialize rate limiter
    this.rateLimiter = {
      tokens: config.rateLimit.burstSize,
      lastRefill: new Date()
    };

    this.initializeCacheDirectory();
  }

  /**
   * Make an HTTP request with all resilience patterns applied
   */
  protected async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.config.baseUrl}${endpoint}`;
    
    // Check cache first
    if (cacheKey && this.config.cache.enabled) {
      const cachedResponse = await this.getCachedResponse<T>(cacheKey);
      if (cachedResponse) {
        logger.debug(`Cache hit for ${cacheKey}`, { 
          service: 'external-api-client',
          url: fullUrl 
        });
        return cachedResponse;
      }
    }

    // Check circuit breaker
    this.checkCircuitBreaker();

    // Apply rate limiting
    await this.waitForRateLimit();

    // Execute request with retry logic
    const response = await this.executeWithRetry<T>(fullUrl, options);

    // Update circuit breaker on success
    this.onRequestSuccess();

    // Cache response if enabled
    if (cacheKey && this.config.cache.enabled) {
      await this.cacheResponse(cacheKey, response);
    }

    return response;
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    url: string, 
    options: RequestInit
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | undefined;

    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        const startTime = Date.now();
        
        // Add headers (remove timeout as it's not part of RequestInit)
        const requestOptions: RequestInit = {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers
          }
        };

        logger.debug(`Making API request (attempt ${attempt})`, {
          service: 'external-api-client',
          url,
          method: options.method || 'GET'
        });

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const requestOptionsWithSignal: RequestInit = {
          ...requestOptions,
          signal: controller.signal
        };

        try {
          const response = await fetch(url, requestOptionsWithSignal);
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;

          if (!response.ok) {
            const error = await this.createApiError(response, attempt, responseTime);
            
            if (error.retryable && attempt < this.config.retry.maxAttempts) {
              logger.warn(`Retryable error on attempt ${attempt}`, {
                service: 'external-api-client',
                error: error.message,
                status: error.status
              });
              
              await this.delay(this.calculateBackoffDelay(attempt));
              continue;
            }
            
            throw error;
          }

          const data = await response.json() as T;
          
          logger.info(`API request successful`, {
            service: 'external-api-client',
            url,
            status: response.status,
            responseTime
          });

          return {
            data,
            status: response.status,
            headers: this.extractHeaders(response),
            cached: false,
            timestamp: new Date()
          };

        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error as ApiError;
          
          // Update circuit breaker on failure
          this.onRequestFailure();

          if (attempt === this.config.retry.maxAttempts) {
            logger.error(`All retry attempts exhausted`, {
              service: 'external-api-client',
              url,
              attempts: attempt,
              error: lastError.message
            });
            break;
          }

          if (!lastError.retryable) {
            logger.error(`Non-retryable error, stopping retries`, {
              service: 'external-api-client',
              url,
              error: lastError.message
            });
            break;
          }

          await this.delay(this.calculateBackoffDelay(attempt));
        }
      } catch (error) {
        lastError = error as ApiError;
        
        // Update circuit breaker on failure
        this.onRequestFailure();

        if (attempt === this.config.retry.maxAttempts) {
          logger.error(`All retry attempts exhausted`, {
            service: 'external-api-client',
            url,
            attempts: attempt,
            error: lastError.message
          });
          break;
        }

        if (!lastError.retryable) {
          logger.error(`Non-retryable error, stopping retries`, {
            service: 'external-api-client',
            url,
            error: lastError.message
          });
          break;
        }

        await this.delay(this.calculateBackoffDelay(attempt));
      }
    }

    if (!lastError) {
      lastError = new Error('Request failed with unknown error') as ApiError;
      lastError.retryable = false;
    }

    throw lastError;
  }

  /**
   * Check circuit breaker state and handle accordingly
   */
  private checkCircuitBreaker(): void {
    const now = new Date();

    switch (this.circuitBreaker.state) {
      case CircuitBreakerState.OPEN:
        if (this.circuitBreaker.nextAttemptTime && now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
          logger.info('Circuit breaker moving to HALF_OPEN state', {
            service: 'external-api-client'
          });
        } else {
          throw this.createCircuitBreakerError();
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // Allow one request to test if service is back
        break;

      case CircuitBreakerState.CLOSED:
        // Normal operation
        break;
    }
  }

  /**
   * Handle successful request for circuit breaker
   */
  private onRequestSuccess(): void {
    if (this.circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
      this.circuitBreaker.state = CircuitBreakerState.CLOSED;
      this.circuitBreaker.failureCount = 0;
      logger.info('Circuit breaker closed after successful request', {
        service: 'external-api-client'
      });
    }
  }

  /**
   * Handle failed request for circuit breaker
   */
  private onRequestFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = CircuitBreakerState.OPEN;
      this.circuitBreaker.nextAttemptTime = new Date(
        Date.now() + this.config.circuitBreaker.resetTimeoutMs
      );
      
      logger.warn('Circuit breaker opened due to failures', {
        service: 'external-api-client',
        failureCount: this.circuitBreaker.failureCount,
        resetTime: this.circuitBreaker.nextAttemptTime
      });
    }
  }

  /**
   * Wait for rate limit tokens to be available
   */
  private async waitForRateLimit(): Promise<void> {
    const now = new Date();
    const timeSinceLastRefill = now.getTime() - this.rateLimiter.lastRefill.getTime();
    
    // Refill tokens based on time elapsed
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000 * this.config.rateLimit.requestsPerSecond);
    if (tokensToAdd > 0) {
      this.rateLimiter.tokens = Math.min(
        this.config.rateLimit.burstSize,
        this.rateLimiter.tokens + tokensToAdd
      );
      this.rateLimiter.lastRefill = now;
    }

    // Wait if no tokens available
    if (this.rateLimiter.tokens <= 0) {
      const waitTime = 1000 / this.config.rateLimit.requestsPerSecond;
      logger.debug(`Rate limit reached, waiting ${waitTime}ms`, {
        service: 'external-api-client'
      });
      await this.delay(waitTime);
      this.rateLimiter.tokens = 1;
    } else {
      this.rateLimiter.tokens--;
    }
  }

  /**
   * Get cached response if available and not expired
   */
  private async getCachedResponse<T>(cacheKey: string): Promise<ApiResponse<T> | null> {
    // Check memory cache first
    const memoryEntry = this.cache.get(cacheKey);
    if (memoryEntry && new Date() < memoryEntry.expiresAt) {
      return {
        data: memoryEntry.data,
        status: 200,
        headers: {},
        cached: true,
        timestamp: memoryEntry.timestamp
      };
    }

    // Check disk cache
    try {
      const cacheFile = path.join(this.cacheDir, `${this.sanitizeCacheKey(cacheKey)}.json`);
      const cacheData = await fs.readFile(cacheFile, 'utf-8');
      const entry: CacheEntry = JSON.parse(cacheData);
      
      if (new Date() < new Date(entry.expiresAt)) {
        // Update memory cache
        this.cache.set(cacheKey, {
          ...entry,
          timestamp: new Date(entry.timestamp),
          expiresAt: new Date(entry.expiresAt)
        });
        
        return {
          data: entry.data,
          status: 200,
          headers: {},
          cached: true,
          timestamp: new Date(entry.timestamp)
        };
      }
    } catch (error) {
      // Cache miss or invalid cache file
    }

    return null;
  }

  /**
   * Cache response to memory and disk
   */
  private async cacheResponse<T>(cacheKey: string, response: ApiResponse<T>): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.cache.ttlMs);
    const entry: CacheEntry = {
      data: response.data,
      timestamp: response.timestamp,
      expiresAt
    };

    // Store in memory cache
    this.cache.set(cacheKey, entry);

    // Enforce cache size limit
    if (this.cache.size > this.config.cache.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // Store in disk cache
    try {
      const cacheFile = path.join(this.cacheDir, `${this.sanitizeCacheKey(cacheKey)}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2));
    } catch (error) {
      logger.warn('Failed to write cache to disk', {
        service: 'external-api-client',
        cacheKey,
        error: (error as Error).message
      });
    }
  }

  /**
   * Create standardized API error
   */
  private async createApiError(
    response: Response, 
    attempt: number, 
    responseTime: number
  ): Promise<ApiError> {
    let errorBody: any;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = 'Unable to read error response';
    }

    const error = new Error(
      `API request failed: ${response.status} ${response.statusText}`
    ) as ApiError;

    error.status = response.status;
    error.response = errorBody;
    error.retryable = this.isRetryableStatus(response.status);

    logger.error(`API request failed`, {
      service: 'external-api-client',
      status: response.status,
      attempt,
      responseTime,
      retryable: error.retryable
    });

    return error;
  }

  /**
   * Create circuit breaker error
   */
  private createCircuitBreakerError(): ApiError {
    const error = new Error('Circuit breaker is OPEN') as ApiError;
    error.code = 'CIRCUIT_BREAKER_OPEN';
    error.retryable = false;
    return error;
  }

  /**
   * Determine if HTTP status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.retry.initialDelayMs * 
      Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }

  /**
   * Extract response headers
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Get authentication headers
   */
  protected getAuthHeaders(): Record<string, string> {
    if (!this.config.apiKey) {
      return {};
    }

    // Override in subclasses for specific auth patterns
    return {
      'Authorization': `Bearer ${this.config.apiKey}`
    };
  }

  /**
   * Sanitize cache key for file system
   */
  private sanitizeCacheKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  /**
   * Initialize cache directory
   */
  private async initializeCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      logger.warn('Failed to create cache directory', {
        service: 'external-api-client',
        cacheDir: this.cacheDir,
        error: (error as Error).message
      });
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get client statistics
   */
  public getStats(): {
    circuitBreaker: CircuitBreakerStats;
    cache: {
      size: number;
      hitRate: number;
    };
    rateLimiter: {
      tokensAvailable: number;
      requestsPerSecond: number;
    };
  } {
    return {
      circuitBreaker: { ...this.circuitBreaker },
      cache: {
        size: this.cache.size,
        hitRate: 0 // TODO: Implement hit rate tracking
      },
      rateLimiter: {
        tokensAvailable: this.rateLimiter.tokens,
        requestsPerSecond: this.config.rateLimit.requestsPerSecond
      }
    };
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    this.cache.clear();
    
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      logger.warn('Failed to clear disk cache', {
        service: 'external-api-client',
        error: (error as Error).message
      });
    }
  }
}
