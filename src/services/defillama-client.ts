import { ExternalApiClient } from './external-api-client';
import { logger } from '../config/logger';
import { AxiosRequestConfig } from 'axios';

export interface ProtocolInfo {
  id: string;
  name: string;
  address: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string;
  audits: string;
  audit_note: string;
  gecko_id: string;
  cmcId: string;
  category: string;
  chains: string[];
  module: string;
  twitter: string;
  forkedFrom: string[];
  oracles: string[];
  listedAt: number;
  methodology: string;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h: number;
  change_1d: number;
  change_7d: number;
  tokenBreakdowns: Record<string, number>;
  mcap: number;
}

export interface ProtocolTvlHistory {
  date: number; // Unix timestamp
  totalLiquidityUSD: number;
}

export interface ProtocolYield {
  pool: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number;
  apyReward: number;
  il7d: number;
  apyBase7d: number;
  apyMean30d: number;
  volumeUsd1d: number;
  volumeUsd7d: number;
  outlier: boolean;
  impliedIl: number;
  poolMeta: string;
  underlyingTokens: string[];
  rewardTokens: string[];
  count: number;
  countSingleExposure: number;
  exposure: string;
  category: string;
  stablecoin: boolean;
}

export interface DeFiLlamaConfig {
  baseUrl: string;
  timeout: number;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

/**
 * Client for interacting with DeFiLlama API
 * Provides access to DeFi protocol data including TVL, yields, and protocol information
 * 
 * @see https://defillama.com/docs/api
 */
export class DeFiLlamaClient extends ExternalApiClient {
  private static readonly DEFAULT_CONFIG: DeFiLlamaConfig = {
    baseUrl: 'https://api.llama.fi',
    timeout: 30000, // 30 seconds
    rateLimit: {
      requestsPerMinute: 300, // DeFiLlama allows 300 requests per minute
      burstLimit: 10
    }
  };

  constructor(config: Partial<DeFiLlamaConfig> = {}, cacheDir: string = './data/cache/defillama') {
    const finalConfig = { ...DeFiLlamaClient.DEFAULT_CONFIG, ...config };
    
    // Convert to ApiClientConfig format expected by parent
    const apiClientConfig = {
      baseUrl: finalConfig.baseUrl,
      rateLimit: {
        requestsPerSecond: finalConfig.rateLimit.requestsPerMinute / 60,
        burstSize: finalConfig.rateLimit.burstLimit
      },
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000
      },
      timeout: finalConfig.timeout,
      circuitBreaker: {
        failureThreshold: 5,
        timeoutMs: finalConfig.timeout,
        resetTimeoutMs: 60000
      },
      cache: {
        enabled: true,
        ttlMs: 600000, // 10 minutes
        maxSize: 1000
      }
    };

    super(apiClientConfig, cacheDir);

    logger.info('DeFiLlama client initialized', {
      baseUrl: finalConfig.baseUrl,
      timeout: finalConfig.timeout,
      rateLimit: finalConfig.rateLimit
    });
  }

  /**
   * Make request and extract data from response
   */
  protected async makeDataRequest<T>(endpoint: string): Promise<T> {
    const cacheKey = `defillama-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const response = await this.makeRequest<T>(endpoint, { method: 'GET' } as AxiosRequestConfig, cacheKey);
    return response.data;
  }

  /**
   * Get all protocols with their basic information
   */
  async getAllProtocols(): Promise<ProtocolInfo[]> {
    try {
      logger.debug('Fetching all protocols from DeFiLlama');
      
      const response = await this.makeDataRequest<ProtocolInfo[]>('/protocols');
      
      logger.info('Successfully fetched protocols from DeFiLlama', { 
        protocolCount: response.length 
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch protocols from DeFiLlama', { error });
      throw new Error(`Failed to fetch protocols: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information for a specific protocol
   */
  async getProtocol(protocolSlug: string): Promise<ProtocolInfo> {
    try {
      logger.debug('Fetching protocol details from DeFiLlama', { protocolSlug });
      
      const response = await this.makeDataRequest<ProtocolInfo>(`/protocol/${encodeURIComponent(protocolSlug)}`);
      
      logger.info('Successfully fetched protocol details from DeFiLlama', { 
        protocolSlug,
        name: response.name,
        tvl: response.tvl
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch protocol details from DeFiLlama', { 
        protocolSlug, 
        error 
      });
      throw new Error(`Failed to fetch protocol ${protocolSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get TVL history for a specific protocol
   */
  async getProtocolTvlHistory(protocolSlug: string): Promise<ProtocolTvlHistory[]> {
    try {
      logger.debug('Fetching protocol TVL history from DeFiLlama', { protocolSlug });
      
      const response = await this.makeDataRequest<ProtocolTvlHistory[]>(`/protocol/${encodeURIComponent(protocolSlug)}`);
      
      logger.info('Successfully fetched protocol TVL history from DeFiLlama', { 
        protocolSlug,
        dataPoints: response.length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch protocol TVL history from DeFiLlama', { 
        protocolSlug, 
        error 
      });
      throw new Error(`Failed to fetch TVL history for ${protocolSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current TVL across all protocols
   */
  async getCurrentTvl(): Promise<{ totalTvl: number; protocols: number }> {
    try {
      logger.debug('Fetching current TVL from DeFiLlama');
      
      const response = await this.makeDataRequest<{ totalTvl: number; protocols: number }>('/tvl');
      
      logger.info('Successfully fetched current TVL from DeFiLlama', { 
        totalTvl: response.totalTvl,
        protocols: response.protocols
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch current TVL from DeFiLlama', { error });
      throw new Error(`Failed to fetch current TVL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get yield pools data
   */
  async getYieldPools(): Promise<ProtocolYield[]> {
    try {
      logger.debug('Fetching yield pools from DeFiLlama');
      
      const response = await this.makeDataRequest<{ status: string; data: ProtocolYield[] }>('/yields');
      
      if (response.status !== 'success') {
        throw new Error(`API returned status: ${response.status}`);
      }
      
      logger.info('Successfully fetched yield pools from DeFiLlama', { 
        poolCount: response.data.length 
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch yield pools from DeFiLlama', { error });
      throw new Error(`Failed to fetch yield pools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get yield pools for a specific protocol
   */
  async getProtocolYields(protocolSlug: string): Promise<ProtocolYield[]> {
    try {
      logger.debug('Fetching protocol yields from DeFiLlama', { protocolSlug });
      
      const allYields = await this.getYieldPools();
      const protocolYields = allYields.filter(pool => 
        pool.project.toLowerCase() === protocolSlug.toLowerCase()
      );
      
      logger.info('Successfully filtered protocol yields from DeFiLlama', { 
        protocolSlug,
        yieldCount: protocolYields.length
      });
      
      return protocolYields;
    } catch (error) {
      logger.error('Failed to fetch protocol yields from DeFiLlama', { 
        protocolSlug, 
        error 
      });
      throw new Error(`Failed to fetch yields for ${protocolSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for protocols by name or symbol
   */
  async searchProtocols(query: string): Promise<ProtocolInfo[]> {
    try {
      logger.debug('Searching protocols in DeFiLlama', { query });
      
      const allProtocols = await this.getAllProtocols();
      const searchTerm = query.toLowerCase();
      
      const results = allProtocols.filter(protocol => 
        protocol.name.toLowerCase().includes(searchTerm) ||
        protocol.symbol.toLowerCase().includes(searchTerm) ||
        protocol.slug.toLowerCase().includes(searchTerm)
      );
      
      logger.info('Successfully searched protocols in DeFiLlama', { 
        query,
        resultCount: results.length
      });
      
      return results;
    } catch (error) {
      logger.error('Failed to search protocols in DeFiLlama', { 
        query, 
        error 
      });
      throw new Error(`Failed to search protocols for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get protocol information by contract address
   */
  async getProtocolByAddress(contractAddress: string): Promise<ProtocolInfo | null> {
    try {
      logger.debug('Searching protocol by address in DeFiLlama', { contractAddress });
      
      const allProtocols = await this.getAllProtocols();
      const normalizedAddress = contractAddress.toLowerCase();
      
      const result = allProtocols.find(protocol => 
        protocol.address && protocol.address.toLowerCase() === normalizedAddress
      );
      
      if (result) {
        logger.info('Successfully found protocol by address in DeFiLlama', { 
          contractAddress,
          protocolName: result.name
        });
      } else {
        logger.debug('No protocol found for address in DeFiLlama', { contractAddress });
      }
      
      return result || null;
    } catch (error) {
      logger.error('Failed to search protocol by address in DeFiLlama', { 
        contractAddress, 
        error 
      });
      throw new Error(`Failed to search protocol by address ${contractAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get protocol categories and their TVL
   */
  async getProtocolCategories(): Promise<Record<string, number>> {
    try {
      logger.debug('Fetching protocol categories from DeFiLlama');
      
      const response = await this.makeDataRequest<Record<string, number>>('/categories');
      
      logger.info('Successfully fetched protocol categories from DeFiLlama', { 
        categoryCount: Object.keys(response).length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch protocol categories from DeFiLlama', { error });
      throw new Error(`Failed to fetch protocol categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get chain TVL data
   */
  async getChainTvl(): Promise<Record<string, number>> {
    try {
      logger.debug('Fetching chain TVL from DeFiLlama');
      
      const response = await this.makeDataRequest<Record<string, number>>('/chains');
      
      logger.info('Successfully fetched chain TVL from DeFiLlama', { 
        chainCount: Object.keys(response).length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch chain TVL from DeFiLlama', { error });
      throw new Error(`Failed to fetch chain TVL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for DeFiLlama API
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug('Performing health check for DeFiLlama API');
      
      await this.getCurrentTvl();
      
      logger.info('DeFiLlama API health check passed');
      return true;
    } catch (error) {
      logger.error('DeFiLlama API health check failed', { error });
      return false;
    }
  }
}
