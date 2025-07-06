/**
 * Polygonscan API Client
 * Provides access to Polygon blockchain data via Polygonscan API
 */

import { ExternalApiClient, ApiClientConfig, ApiResponse } from './external-api-client';
import { logger } from '../config/logger';
import * as path from 'path';

export interface PolygonscanConfig extends ApiClientConfig {
  network?: 'mainnet' | 'mumbai';
}

export interface ContractSourceResponse {
  status: string;
  message: string;
  result: ContractSource[];
}

export interface ContractSource {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export interface ContractVerificationResponse {
  status: string;
  message: string;
  result: string; // 'Verified' or error message
}

export interface TransactionResponse {
  status: string;
  message: string;
  result: Transaction[];
}

export interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

export interface ContractCreationResponse {
  status: string;
  message: string;
  result: ContractCreation[];
}

export interface ContractCreation {
  contractAddress: string;
  contractCreator: string;
  txHash: string;
}

export interface BalanceResponse {
  status: string;
  message: string;
  result: string;
}

export class PolygonscanClient extends ExternalApiClient {
  private readonly network: string;

  constructor(config: PolygonscanConfig) {
    const baseUrl = PolygonscanClient.getBaseUrl(config.network || 'mainnet');
    const cacheDir = path.join(process.cwd(), 'data', 'cache', 'polygonscan');
    
    super({
      ...config,
      baseUrl
    }, cacheDir);

    this.network = config.network || 'mainnet';

    logger.info('PolygonscanClient initialized', {
      service: 'polygonscan-client',
      network: this.network,
      baseUrl,
      hasApiKey: !!config.apiKey
    });
  }

  private static getBaseUrl(network: string): string {
    switch (network) {
      case 'mainnet':
        return 'https://api.polygonscan.com/api';
      case 'mumbai':
        return 'https://api-testnet.polygonscan.com/api';
      default:
        throw new Error(`Unsupported Polygon network: ${network}`);
    }
  }

  /**
   * Override auth headers for Polygonscan API key format
   */
  protected getAuthHeaders(): Record<string, string> {
    // Polygonscan uses API key as query parameter, not header
    return {};
  }

  /**
   * Add API key to query parameters
   */
  private addApiKey(params: Record<string, string>): Record<string, string> {
    if (this.config && this.config.apiKey) {
      return {
        ...params,
        apikey: this.config.apiKey
      };
    }
    return params;
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams(params);
    return searchParams.toString();
  }

  /**
   * Get contract source code
   */
  async getContractSource(contractAddress: string): Promise<ContractSource | null> {
    this.validatePolygonAddress(contractAddress);

    const params = this.addApiKey({
      module: 'contract',
      action: 'getsourcecode',
      address: contractAddress
    });

    const cacheKey = `contract-source-${contractAddress}-${this.network}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<ContractSourceResponse>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Polygonscan API returned error for contract source', {
          service: 'polygonscan-client',
          contractAddress,
          error: response.data.message
        });
        return null;
      }

      const result = response.data.result[0];
      if (!result || !result.SourceCode) {
        logger.info('No source code found for Polygon contract', {
          service: 'polygonscan-client',
          contractAddress
        });
        return null;
      }

      logger.info('Polygon contract source code retrieved', {
        service: 'polygonscan-client',
        contractAddress,
        contractName: result.ContractName,
        compilerVersion: result.CompilerVersion,
        cached: response.cached
      });

      return result;
    } catch (error) {
      logger.error('Failed to get Polygon contract source code', {
        service: 'polygonscan-client',
        contractAddress,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check if contract is verified
   */
  async isContractVerified(contractAddress: string): Promise<boolean> {
    const source = await this.getContractSource(contractAddress);
    return source !== null && source.SourceCode.length > 0;
  }

  /**
   * Get contract creation transaction
   */
  async getContractCreation(contractAddress: string): Promise<ContractCreation | null> {
    this.validatePolygonAddress(contractAddress);

    const params = this.addApiKey({
      module: 'contract',
      action: 'getcontractcreation',
      contractaddresses: contractAddress
    });

    const cacheKey = `contract-creation-${contractAddress}-${this.network}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<ContractCreationResponse>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Polygonscan API returned error for contract creation', {
          service: 'polygonscan-client',
          contractAddress,
          error: response.data.message
        });
        return null;
      }

      const result = response.data.result[0];
      if (!result) {
        return null;
      }

      logger.info('Polygon contract creation info retrieved', {
        service: 'polygonscan-client',
        contractAddress,
        creator: result.contractCreator,
        txHash: result.txHash,
        cached: response.cached
      });

      return result;
    } catch (error) {
      logger.error('Failed to get Polygon contract creation info', {
        service: 'polygonscan-client',
        contractAddress,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get normal transactions for an address
   */
  async getTransactions(
    address: string, 
    options: {
      startBlock?: number;
      endBlock?: number;
      page?: number;
      offset?: number;
      sort?: 'asc' | 'desc';
    } = {}
  ): Promise<Transaction[]> {
    this.validatePolygonAddress(address);

    const params = this.addApiKey({
      module: 'account',
      action: 'txlist',
      address: address,
      startblock: (options.startBlock || 0).toString(),
      endblock: (options.endBlock || 99999999).toString(),
      page: (options.page || 1).toString(),
      offset: (options.offset || 10).toString(),
      sort: options.sort || 'desc'
    });

    const cacheKey = `transactions-${address}-${this.network}-${JSON.stringify(options)}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<TransactionResponse>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Polygonscan API returned error for transactions', {
          service: 'polygonscan-client',
          address,
          error: response.data.message
        });
        return [];
      }

      logger.info('Polygon transactions retrieved', {
        service: 'polygonscan-client',
        address,
        count: response.data.result.length,
        cached: response.cached
      });

      return response.data.result;
    } catch (error) {
      logger.error('Failed to get Polygon transactions', {
        service: 'polygonscan-client',
        address,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get MATIC balance for an address
   */
  async getBalance(address: string): Promise<string> {
    this.validatePolygonAddress(address);

    const params = this.addApiKey({
      module: 'account',
      action: 'balance',
      address: address,
      tag: 'latest'
    });

    const cacheKey = `balance-${address}-${this.network}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<BalanceResponse>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Polygonscan API returned error for balance', {
          service: 'polygonscan-client',
          address,
          error: response.data.message
        });
        return '0';
      }

      logger.info('Polygon balance retrieved', {
        service: 'polygonscan-client',
        address,
        balance: response.data.result,
        cached: response.cached
      });

      return response.data.result;
    } catch (error) {
      logger.error('Failed to get Polygon balance', {
        service: 'polygonscan-client',
        address,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get multiple balances at once
   */
  async getMultipleBalances(addresses: string[]): Promise<Record<string, string>> {
    if (addresses.length === 0) {
      return {};
    }

    if (addresses.length > 20) {
      throw new Error('Maximum 20 addresses allowed per request');
    }

    addresses.forEach(addr => this.validatePolygonAddress(addr));

    const params = this.addApiKey({
      module: 'account',
      action: 'balancemulti',
      address: addresses.join(','),
      tag: 'latest'
    });

    const cacheKey = `balances-${addresses.join(',')}-${this.network}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<{ status: string; message: string; result: Array<{ account: string; balance: string }> }>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Polygonscan API returned error for multiple balances', {
          service: 'polygonscan-client',
          addresses: addresses.length,
          error: response.data.message
        });
        return {};
      }

      const balances: Record<string, string> = {};
      response.data.result.forEach(item => {
        balances[item.account] = item.balance;
      });

      logger.info('Polygon multiple balances retrieved', {
        service: 'polygonscan-client',
        count: addresses.length,
        cached: response.cached
      });

      return balances;
    } catch (error) {
      logger.error('Failed to get Polygon multiple balances', {
        service: 'polygonscan-client',
        addresses: addresses.length,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Validate Polygon address format (same as Ethereum)
   */
  private validatePolygonAddress(address: string): void {
    if (!address || typeof address !== 'string') {
      throw new Error('Address must be a non-empty string');
    }

    // Polygon uses the same address format as Ethereum
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      throw new Error('Invalid Polygon address format');
    }
  }

  /**
   * Get current network
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const params = this.addApiKey({
        module: 'stats',
        action: 'maticprice'
      });

      const endpoint = `?${this.buildQueryString(params)}`;
      const response = await this.makeRequest(endpoint, { method: 'GET' });

      const isConnected = response.status === 200;
      
      logger.info('Polygonscan API connection test', {
        service: 'polygonscan-client',
        network: this.network,
        connected: isConnected
      });

      return isConnected;
    } catch (error) {
      logger.error('Polygonscan API connection test failed', {
        service: 'polygonscan-client',
        network: this.network,
        error: (error as Error).message
      });
      return false;
    }
  }
}

/**
 * Factory function to create PolygonscanClient with default configuration
 */
export function createPolygonscanClient(options: {
  apiKey?: string;
  network?: 'mainnet' | 'mumbai';
  rateLimit?: {
    requestsPerSecond?: number;
    burstSize?: number;
  };
}): PolygonscanClient {
  const config: PolygonscanConfig = {
    baseUrl: '', // Will be set by constructor
    network: options.network || 'mainnet',
    rateLimit: {
      requestsPerSecond: options.rateLimit?.requestsPerSecond || 5, // Polygonscan free tier: 5 requests/second
      burstSize: options.rateLimit?.burstSize || 10
    },
    retry: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000
    },
    timeout: 10000,
    circuitBreaker: {
      failureThreshold: 5,
      timeoutMs: 10000,
      resetTimeoutMs: 60000
    },
    cache: {
      enabled: true,
      ttlMs: 300000, // 5 minutes
      maxSize: 1000
    }
  };

  if (options.apiKey) {
    config.apiKey = options.apiKey;
  }

  return new PolygonscanClient(config);
}
