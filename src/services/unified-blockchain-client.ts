/**
 * Unified Blockchain Client
 * Provides a unified interface to interact with multiple blockchain APIs
 * Currently supports Ethereum only
 */

import { EtherscanClient, createEtherscanClient, Transaction } from './etherscan-client';
import { logger } from '../config/logger';
import { Blockchain } from '../models';

export interface BlockchainClientConfig {
  ethereum?: {
    apiKey?: string;
    network?: 'mainnet' | 'goerli' | 'sepolia';
  };
  rateLimit?: {
    requestsPerSecond?: number;
    burstSize?: number;
  };
}

export interface ContractMetadata {
  address: string;
  blockchain: Blockchain;
  sourceCode?: string;
  abi?: string;
  contractName?: string;
  compilerVersion?: string;
  isVerified: boolean;
  creationTxHash?: string;
  creator?: string;
  balance?: string;
}

export interface TransactionSummary {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  isError: boolean;
}

export class UnifiedBlockchainClient {
  private etherscanClient?: EtherscanClient;

  constructor(config: BlockchainClientConfig) {
    // Initialize blockchain clients based on configuration
    if (config.ethereum) {
      const ethConfig: any = {
        network: config.ethereum.network,
        rateLimit: config.rateLimit
      };
      if (config.ethereum.apiKey) {
        ethConfig.apiKey = config.ethereum.apiKey;
      }
      
      this.etherscanClient = createEtherscanClient(ethConfig);
      logger.info('Ethereum client initialized', {
        service: 'unified-blockchain-client',
        network: config.ethereum.network || 'mainnet',
        hasApiKey: !!config.ethereum.apiKey
      });
    }

    logger.info('UnifiedBlockchainClient initialized', {
      service: 'unified-blockchain-client',
      supportedChains: this.getSupportedChains()
    });
  }

  /**
   * Get list of supported blockchains
   */
  getSupportedChains(): Blockchain[] {
    const chains: Blockchain[] = [];
    if (this.etherscanClient) chains.push(Blockchain.ETHEREUM);
    return chains;
  }

  /**
   * Get the appropriate client for a blockchain
   */
  private getClient(blockchain: Blockchain): EtherscanClient {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
        if (!this.etherscanClient) {
          throw new Error('Ethereum client not configured');
        }
        return this.etherscanClient;
      
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  /**
   * Get comprehensive contract metadata
   */
  async getContractMetadata(address: string, blockchain: Blockchain): Promise<ContractMetadata> {
    const client = this.getClient(blockchain);

    logger.info('Fetching contract metadata', {
      service: 'unified-blockchain-client',
      address,
      blockchain
    });

    try {
      // Fetch contract data in parallel
      const [sourceData, creationData, balance] = await Promise.allSettled([
        client.getContractSource(address),
        client.getContractCreation(address),
        client.getBalance(address)
      ]);

      const source = sourceData.status === 'fulfilled' ? sourceData.value : null;
      const creation = creationData.status === 'fulfilled' ? creationData.value : null;
      const balanceResult = balance.status === 'fulfilled' ? balance.value : '0';

      const metadata: ContractMetadata = {
        address,
        blockchain,
        isVerified: source !== null && (source.SourceCode?.length || 0) > 0,
        balance: balanceResult
      };

      if (source) {
        metadata.sourceCode = source.SourceCode;
        metadata.abi = source.ABI;
        metadata.contractName = source.ContractName;
        metadata.compilerVersion = source.CompilerVersion;
      }

      if (creation) {
        metadata.creationTxHash = creation.txHash;
        metadata.creator = creation.contractCreator;
      }

      logger.info('Contract metadata retrieved', {
        service: 'unified-blockchain-client',
        address,
        blockchain,
        isVerified: metadata.isVerified,
        hasCreationData: !!creation,
        contractName: metadata.contractName
      });

      return metadata;
    } catch (error) {
      logger.error('Failed to get contract metadata', {
        service: 'unified-blockchain-client',
        address,
        blockchain,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get recent transactions for an address
   */
  async getRecentTransactions(
    address: string, 
    blockchain: Blockchain, 
    limit: number = 10
  ): Promise<TransactionSummary[]> {
    const client = this.getClient(blockchain);

    try {
      const transactions = await client.getTransactions(address, {
        offset: limit,
        sort: 'desc'
      });

      const summaries: TransactionSummary[] = transactions.map((tx: Transaction) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp),
        blockNumber: parseInt(tx.blockNumber),
        isError: tx.isError === '1'
      }));

      logger.info('Recent transactions retrieved', {
        service: 'unified-blockchain-client',
        address,
        blockchain,
        count: summaries.length
      });

      return summaries;
    } catch (error) {
      logger.error('Failed to get recent transactions', {
        service: 'unified-blockchain-client',
        address,
        blockchain,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check if a contract is verified on any supported blockchain
   */
  async isContractVerified(address: string, blockchain: Blockchain): Promise<boolean> {
    try {
      const client = this.getClient(blockchain);
      return await client.isContractVerified(address);
    } catch (error) {
      logger.error('Failed to check contract verification', {
        service: 'unified-blockchain-client',
        address,
        blockchain,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get balances for multiple addresses on a specific blockchain
   */
  async getMultipleBalances(
    addresses: string[], 
    blockchain: Blockchain
  ): Promise<Record<string, string>> {
    const client = this.getClient(blockchain);

    try {
      const balances = await client.getMultipleBalances(addresses);
      
      logger.info('Multiple balances retrieved', {
        service: 'unified-blockchain-client',
        blockchain,
        count: addresses.length
      });

      return balances;
    } catch (error) {
      logger.error('Failed to get multiple balances', {
        service: 'unified-blockchain-client',
        blockchain,
        addresses: addresses.length,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Test connectivity to all configured blockchain APIs
   */
  async testAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const tests = [];
    if (this.etherscanClient) {
      tests.push(
        this.etherscanClient.testConnection()
          .then((result: boolean) => ({ blockchain: 'ethereum', connected: result }))
          .catch(() => ({ blockchain: 'ethereum', connected: false }))
      );
    }

    const testResults = await Promise.all(tests);
    testResults.forEach((result: { blockchain: string; connected: boolean }) => {
      results[result.blockchain] = result.connected;
    });

    logger.info('Blockchain API connection test completed', {
      service: 'unified-blockchain-client',
      results
    });

    return results;
  }

  /**
   * Get contract creation details across multiple blockchains
   */
  async getContractCreationInfo(
    address: string,
    blockchain: Blockchain
  ): Promise<{ creator: string; txHash: string; timestamp?: number } | null> {
    const client = this.getClient(blockchain);

    try {
      const creation = await client.getContractCreation(address);
      if (!creation) {
        return null;
      }

      // Try to get the transaction details for timestamp
      let timestamp: number | undefined;
      try {
        const transactions = await client.getTransactions(creation.contractCreator, {
          offset: 100,
          sort: 'asc'
        });
        const creationTx = transactions.find((tx: Transaction) => tx.hash === creation.txHash);
        if (creationTx) {
          timestamp = parseInt(creationTx.timeStamp);
        }
      } catch (error) {
        logger.warn('Failed to get creation transaction timestamp', {
          service: 'unified-blockchain-client',
          address,
          blockchain,
          txHash: creation.txHash
        });
      }

      const result = {
        creator: creation.contractCreator,
        txHash: creation.txHash
      } as { creator: string; txHash: string; timestamp?: number };
      
      if (timestamp !== undefined) {
        result.timestamp = timestamp;
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to get contract creation info', {
        service: 'unified-blockchain-client',
        address,
        blockchain,
        error: (error as Error).message
      });
      return null;
    }
  }
}

/**
 * Factory function to create UnifiedBlockchainClient with default configuration
 */
export function createUnifiedBlockchainClient(config: BlockchainClientConfig): UnifiedBlockchainClient {
  return new UnifiedBlockchainClient(config);
}

/**
 * Create a client with Ethereum blockchain support (useful for development/testing)
 */
export function createFullBlockchainClient(options: {
  ethereumApiKey?: string;
  networks?: {
    ethereum?: 'mainnet' | 'goerli' | 'sepolia';
  };
}): UnifiedBlockchainClient {
  const config: BlockchainClientConfig = {
    rateLimit: {
      requestsPerSecond: 5,
      burstSize: 10
    }
  };

  // Only add blockchain configs if they have configuration
  if (options.ethereumApiKey || options.networks?.ethereum) {
    const ethConfig: any = {
      network: options.networks?.ethereum || 'mainnet'
    };
    if (options.ethereumApiKey) {
      ethConfig.apiKey = options.ethereumApiKey;
    }
    config.ethereum = ethConfig;
  }

  return new UnifiedBlockchainClient(config);
}
