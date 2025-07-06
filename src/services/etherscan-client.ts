/**
 * Etherscan API Client
 * Provides access to Ethereum blockchain data via Etherscan API
 */

import { ExternalApiClient, ApiClientConfig, ApiResponse } from './external-api-client';
import { logger } from '../config/logger';
import * as path from 'path';

export interface EtherscanConfig extends ApiClientConfig {
  network?: 'mainnet' | 'goerli' | 'sepolia';
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

export class EtherscanClient extends ExternalApiClient {
  private readonly network: string;

  constructor(config: EtherscanConfig) {
    const baseUrl = EtherscanClient.getBaseUrl(config.network || 'mainnet');
    const cacheDir = path.join(process.cwd(), 'data', 'cache', 'etherscan');
    
    super({
      ...config,
      baseUrl
    }, cacheDir);

    this.network = config.network || 'mainnet';

    logger.info('EtherscanClient initialized', {
      service: 'etherscan-client',
      network: this.network,
      baseUrl,
      hasApiKey: !!config.apiKey
    });
  }

  private static getBaseUrl(network: string): string {
    switch (network) {
      case 'mainnet':
        return 'https://api.etherscan.io/api';
      case 'goerli':
        return 'https://api-goerli.etherscan.io/api';
      case 'sepolia':
        return 'https://api-sepolia.etherscan.io/api';
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  /**
   * Override auth headers for Etherscan API key format
   */
  protected getAuthHeaders(): Record<string, string> {
    // Etherscan uses API key as query parameter, not header
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
    this.validateEthereumAddress(contractAddress);

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
        logger.warn('Etherscan API returned error for contract source', {
          service: 'etherscan-client',
          contractAddress,
          error: response.data.message
        });
        return null;
      }

      const result = response.data.result[0];
      if (!result || !result.SourceCode) {
        logger.info('No source code found for contract', {
          service: 'etherscan-client',
          contractAddress
        });
        return null;
      }

      logger.info('Contract source code retrieved', {
        service: 'etherscan-client',
        contractAddress,
        contractName: result.ContractName,
        compilerVersion: result.CompilerVersion,
        cached: response.cached
      });

      return result;
    } catch (error) {
      logger.error('Failed to get contract source code', {
        service: 'etherscan-client',
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
    this.validateEthereumAddress(contractAddress);

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
        logger.warn('Etherscan API returned error for contract creation', {
          service: 'etherscan-client',
          contractAddress,
          error: response.data.message
        });
        return null;
      }

      const result = response.data.result[0];
      if (!result) {
        return null;
      }

      logger.info('Contract creation info retrieved', {
        service: 'etherscan-client',
        contractAddress,
        creator: result.contractCreator,
        txHash: result.txHash,
        cached: response.cached
      });

      return result;
    } catch (error) {
      logger.error('Failed to get contract creation info', {
        service: 'etherscan-client',
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
    this.validateEthereumAddress(address);

    const params = this.addApiKey({
      module: 'account',
      action: 'txlist',
      address,
      startblock: (options.startBlock || 0).toString(),
      endblock: (options.endBlock || 99999999).toString(),
      page: (options.page || 1).toString(),
      offset: (options.offset || 100).toString(),
      sort: options.sort || 'desc'
    });

    const cacheKey = `transactions-${address}-${JSON.stringify(options)}-${this.network}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<TransactionResponse>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Etherscan API returned error for transactions', {
          service: 'etherscan-client',
          address,
          error: response.data.message
        });
        return [];
      }

      logger.info('Transactions retrieved', {
        service: 'etherscan-client',
        address,
        count: response.data.result.length,
        options,
        cached: response.cached
      });

      return response.data.result;
    } catch (error) {
      logger.error('Failed to get transactions', {
        service: 'etherscan-client',
        address,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get ETH balance for an address
   */
  async getBalance(address: string): Promise<string> {
    this.validateEthereumAddress(address);

    const params = this.addApiKey({
      module: 'account',
      action: 'balance',
      address,
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
        logger.warn('Etherscan API returned error for balance', {
          service: 'etherscan-client',
          address,
          error: response.data.message
        });
        return '0';
      }

      logger.info('Balance retrieved', {
        service: 'etherscan-client',
        address,
        balance: response.data.result,
        cached: response.cached
      });

      return response.data.result;
    } catch (error) {
      logger.error('Failed to get balance', {
        service: 'etherscan-client',
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

    addresses.forEach(addr => this.validateEthereumAddress(addr));

    const params = this.addApiKey({
      module: 'account',
      action: 'balancemulti',
      address: addresses.join(','),
      tag: 'latest'
    });

    const cacheKey = `balances-multi-${addresses.sort().join(',')}-${this.network}`;
    const endpoint = `?${this.buildQueryString(params)}`;

    try {
      const response = await this.makeRequest<{
        status: string;
        message: string;
        result: Array<{ account: string; balance: string }>;
      }>(
        endpoint,
        { method: 'GET' },
        cacheKey
      );

      if (response.data.status !== '1') {
        logger.warn('Etherscan API returned error for multiple balances', {
          service: 'etherscan-client',
          addresses,
          error: response.data.message
        });
        return {};
      }

      const balances: Record<string, string> = {};
      response.data.result.forEach(item => {
        balances[item.account.toLowerCase()] = item.balance;
      });

      logger.info('Multiple balances retrieved', {
        service: 'etherscan-client',
        addressCount: addresses.length,
        cached: response.cached
      });

      return balances;
    } catch (error) {
      logger.error('Failed to get multiple balances', {
        service: 'etherscan-client',
        addresses,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Validate Ethereum address format
   */
  private validateEthereumAddress(address: string): void {
    if (!address || typeof address !== 'string') {
      throw new Error('Address must be a non-empty string');
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Invalid Ethereum address format: ${address}`);
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
        action: 'ethsupply'
      });

      const endpoint = `?${this.buildQueryString(params)}`;
      const response = await this.makeRequest(endpoint, { method: 'GET' });

      const isConnected = response.status === 200;
      
      logger.info('Etherscan API connection test', {
        service: 'etherscan-client',
        network: this.network,
        connected: isConnected
      });

      return isConnected;
    } catch (error) {
      logger.error('Etherscan API connection test failed', {
        service: 'etherscan-client',
        network: this.network,
        error: (error as Error).message
      });
      return false;
    }
  }
}

/**
 * Factory function to create EtherscanClient with default configuration
 */
export function createEtherscanClient(options: {
  apiKey?: string;
  network?: 'mainnet' | 'goerli' | 'sepolia';
  rateLimit?: {
    requestsPerSecond?: number;
    burstSize?: number;
  };
}): EtherscanClient {
  const config: EtherscanConfig = {
    baseUrl: '', // Will be set by constructor
    network: options.network || 'mainnet',
    rateLimit: {
      requestsPerSecond: options.rateLimit?.requestsPerSecond || 5, // Etherscan free tier: 5 requests/second
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
      ttlMs: 300000, // 5 minutes for most data
      maxSize: 1000
    }
  };

  // Add apiKey only if provided
  if (options.apiKey) {
    config.apiKey = options.apiKey;
  }

  return new EtherscanClient(config);
}
