import { DeFiLlamaClient, ProtocolInfo as DeFiProtocolInfo, ProtocolYield } from './defillama-client';
import { CoinGeckoClient, CoinInfo, CoinDetails } from './coingecko-client';
import { logger } from '../config/logger';

export interface UnifiedProtocolData {
  // Basic protocol information
  id: string;
  name: string;
  symbol?: string | undefined;
  description?: string | undefined;
  website?: string | undefined;
  logo?: string | undefined;
  
  // Blockchain information
  chains: string[];
  contractAddresses: Record<string, string>; // chain -> address mapping
  
  // Financial metrics
  tvl: number;
  tvlChange24h?: number | undefined;
  tvlChange7d?: number | undefined;
  
  // Market data
  marketCap?: number | undefined;
  price?: number | undefined;
  priceChange24h?: number | undefined;
  priceChange7d?: number | undefined;
  volume24h?: number | undefined;
  
  // Yield information
  yields: ProtocolYield[];
  
  // Risk indicators
  category: string;
  audits?: string | undefined;
  auditNote?: string | undefined;
  
  // Metadata
  lastUpdated: Date;
  dataSource: {
    defillama: boolean;
    coingecko: boolean;
  };
}

export interface DeFiDataConfig {
  defillama?: {
    timeout?: number;
    rateLimit?: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  coingecko?: {
    timeout?: number;
    apiKey?: string;
    rateLimit?: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  cacheDir?: string;
}

/**
 * Unified client for DeFi data integration
 * Combines data from DeFiLlama and CoinGecko to provide comprehensive protocol information
 */
export class UnifiedDeFiDataClient {
  private defillama: DeFiLlamaClient;
  private coingecko: CoinGeckoClient;

  constructor(config: DeFiDataConfig = {}) {
    const cacheDir = config.cacheDir || './data/cache';
    
    this.defillama = new DeFiLlamaClient(
      config.defillama,
      `${cacheDir}/defillama`
    );
    
    this.coingecko = new CoinGeckoClient(
      config.coingecko,
      `${cacheDir}/coingecko`
    );

    logger.info('Unified DeFi data client initialized', {
      defillama: !!this.defillama,
      coingecko: !!this.coingecko,
      cacheDir
    });
  }

  /**
   * Add CoinGecko API key for pro tier access
   */
  addCoinGeckoApiKey(apiKey: string): void {
    this.coingecko.addApiKey(apiKey);
    logger.info('CoinGecko API key added to unified client');
  }

  /**
   * Get comprehensive protocol data by combining DeFiLlama and CoinGecko data
   */
  async getProtocolData(protocolIdentifier: string): Promise<UnifiedProtocolData | null> {
    try {
      logger.debug('Fetching unified protocol data', { protocolIdentifier });

      // Try to fetch from DeFiLlama first
      let defillProtocol: DeFiProtocolInfo | null = null;
      let defillYields: ProtocolYield[] = [];

      try {
        defillProtocol = await this.defillama.getProtocol(protocolIdentifier);
        defillYields = await this.defillama.getProtocolYields(protocolIdentifier);
      } catch (error) {
        logger.warn('Failed to fetch protocol from DeFiLlama', { 
          protocolIdentifier, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Try searching by name if direct lookup fails
        try {
          const searchResults = await this.defillama.searchProtocols(protocolIdentifier);
          if (searchResults.length > 0) {
            defillProtocol = searchResults[0]!;
            defillYields = await this.defillama.getProtocolYields(defillProtocol.slug);
          }
        } catch (searchError) {
          logger.debug('DeFiLlama search also failed', { protocolIdentifier });
        }
      }

      // Try to fetch from CoinGecko
      let coinDetails: CoinDetails | null = null;
      let coinMarketData: CoinInfo | null = null;

      try {
        coinDetails = await this.coingecko.getCoinDetails(protocolIdentifier);
      } catch (error) {
        logger.debug('Failed to fetch coin details from CoinGecko', { 
          protocolIdentifier,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Try searching by name
        try {
          const searchResults = await this.coingecko.searchCoins(protocolIdentifier);
          if (searchResults.coins.length > 0) {
            const coinId = searchResults.coins[0]!.id;
            coinDetails = await this.coingecko.getCoinDetails(coinId);
          }
        } catch (searchError) {
          logger.debug('CoinGecko search also failed', { protocolIdentifier });
        }
      }

      // Get market data if we have coin details
      if (coinDetails) {
        try {
          const marketResults = await this.coingecko.getCoinsMarkets('usd', [coinDetails.id]);
          if (marketResults.length > 0) {
            coinMarketData = marketResults[0]!;
          }
        } catch (error) {
          logger.debug('Failed to fetch market data from CoinGecko', { coinId: coinDetails.id });
        }
      }

      // If we have no data from either source, return null
      if (!defillProtocol && !coinDetails) {
        logger.info('No protocol data found in either DeFiLlama or CoinGecko', { protocolIdentifier });
        return null;
      }

      // Combine the data
      const unifiedData = this.combineProtocolData(
        defillProtocol,
        defillYields,
        coinDetails,
        coinMarketData
      );

      logger.info('Successfully fetched unified protocol data', {
        protocolIdentifier,
        dataSource: unifiedData.dataSource,
        tvl: unifiedData.tvl,
        marketCap: unifiedData.marketCap
      });

      return unifiedData;
    } catch (error) {
      logger.error('Failed to fetch unified protocol data', {
        protocolIdentifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to fetch protocol data for ${protocolIdentifier}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get protocol data by contract address
   */
  async getProtocolByAddress(contractAddress: string, chain: string = 'ethereum'): Promise<UnifiedProtocolData | null> {
    try {
      logger.debug('Fetching protocol by contract address', { contractAddress, chain });

      // Try DeFiLlama first
      let defillProtocol: DeFiProtocolInfo | null = null;
      let defillYields: ProtocolYield[] = [];

      try {
        defillProtocol = await this.defillama.getProtocolByAddress(contractAddress);
        if (defillProtocol) {
          defillYields = await this.defillama.getProtocolYields(defillProtocol.slug);
        }
      } catch (error) {
        logger.debug('Failed to fetch protocol by address from DeFiLlama', { contractAddress });
      }

      // Try CoinGecko
      let coinDetails: CoinDetails | null = null;
      let coinMarketData: CoinInfo | null = null;

      try {
        // Map chain names to CoinGecko platform IDs
        const platformMapping: Record<string, string> = {
          'ethereum': 'ethereum',
          'arbitrum': 'arbitrum-one',
          'optimism': 'optimistic-ethereum'
        };

        const platform = platformMapping[chain.toLowerCase()] || chain.toLowerCase();
        coinDetails = await this.coingecko.getCoinByContractAddress(platform, contractAddress);
        
        if (coinDetails) {
          const marketResults = await this.coingecko.getCoinsMarkets('usd', [coinDetails.id]);
          if (marketResults.length > 0) {
            coinMarketData = marketResults[0]!;
          }
        }
      } catch (error) {
        logger.debug('Failed to fetch coin by contract address from CoinGecko', { contractAddress, chain });
      }

      if (!defillProtocol && !coinDetails) {
        logger.info('No protocol found for contract address', { contractAddress, chain });
        return null;
      }

      const unifiedData = this.combineProtocolData(
        defillProtocol,
        defillYields,
        coinDetails,
        coinMarketData
      );

      logger.info('Successfully fetched protocol by contract address', {
        contractAddress,
        chain,
        protocolName: unifiedData.name,
        dataSource: unifiedData.dataSource
      });

      return unifiedData;
    } catch (error) {
      logger.error('Failed to fetch protocol by contract address', {
        contractAddress,
        chain,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to fetch protocol by address ${contractAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for protocols across both data sources
   */
  async searchProtocols(query: string, limit: number = 10): Promise<UnifiedProtocolData[]> {
    try {
      logger.debug('Searching protocols across data sources', { query, limit });

      const results: UnifiedProtocolData[] = [];
      const processedIds = new Set<string>();

      // Search DeFiLlama
      try {
        const defillResults = await this.defillama.searchProtocols(query);
        
        for (const protocol of defillResults.slice(0, limit)) {
          if (!processedIds.has(protocol.id)) {
            try {
              const yields = await this.defillama.getProtocolYields(protocol.slug);
              const unifiedData = this.combineProtocolData(protocol, yields, null, null);
              results.push(unifiedData);
              processedIds.add(protocol.id);
            } catch (error) {
              logger.debug('Failed to get yields for protocol', { protocolId: protocol.id });
              const unifiedData = this.combineProtocolData(protocol, [], null, null);
              results.push(unifiedData);
              processedIds.add(protocol.id);
            }
          }
        }
      } catch (error) {
        logger.debug('DeFiLlama search failed', { query });
      }

      // Search CoinGecko if we don't have enough results
      if (results.length < limit) {
        try {
          const coinGeckoResults = await this.coingecko.searchCoins(query);
          
          for (const coin of coinGeckoResults.coins.slice(0, limit - results.length)) {
            if (!processedIds.has(coin.id)) {
              try {
                const coinDetails = await this.coingecko.getCoinDetails(coin.id);
                const marketData = await this.coingecko.getCoinsMarkets('usd', [coin.id]);
                
                const unifiedData = this.combineProtocolData(
                  null,
                  [],
                  coinDetails,
                  marketData.length > 0 ? marketData[0]! : null
                );
                results.push(unifiedData);
                processedIds.add(coin.id);
              } catch (error) {
                logger.debug('Failed to get details for coin', { coinId: coin.id });
              }
            }
          }
        } catch (error) {
          logger.debug('CoinGecko search failed', { query });
        }
      }

      logger.info('Search completed', {
        query,
        resultCount: results.length,
        defillSources: results.filter(r => r.dataSource.defillama).length,
        coingeckoSources: results.filter(r => r.dataSource.coingecko).length
      });

      return results.slice(0, limit);
    } catch (error) {
      logger.error('Failed to search protocols', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to search protocols for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get market overview data
   */
  async getMarketOverview(): Promise<{
    totalTvl: number;
    protocolCount: number;
    topCategories: Record<string, number>;
    topChains: Record<string, number>;
  }> {
    try {
      logger.debug('Fetching market overview');

      const [tvlData, categories, chains] = await Promise.all([
        this.defillama.getCurrentTvl(),
        this.defillama.getProtocolCategories(),
        this.defillama.getChainTvl()
      ]);

      const overview = {
        totalTvl: tvlData.totalTvl,
        protocolCount: tvlData.protocols,
        topCategories: this.getTopEntries(categories, 5),
        topChains: this.getTopEntries(chains, 5)
      };

      logger.info('Successfully fetched market overview', {
        totalTvl: overview.totalTvl,
        protocolCount: overview.protocolCount,
        categoriesCount: Object.keys(overview.topCategories).length,
        chainsCount: Object.keys(overview.topChains).length
      });

      return overview;
    } catch (error) {
      logger.error('Failed to fetch market overview', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to fetch market overview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for both data sources
   */
  async healthCheck(): Promise<{
    defillama: boolean;
    coingecko: boolean;
    overall: boolean;
  }> {
    try {
      logger.debug('Performing health check for DeFi data sources');

      const [defillamaHealth, coingeckoHealth] = await Promise.all([
        this.defillama.healthCheck().catch(() => false),
        this.coingecko.healthCheck().catch(() => false)
      ]);

      const result = {
        defillama: defillamaHealth,
        coingecko: coingeckoHealth,
        overall: defillamaHealth || coingeckoHealth // At least one should work
      };

      logger.info('DeFi data sources health check completed', result);
      return result;
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        defillama: false,
        coingecko: false,
        overall: false
      };
    }
  }

  /**
   * Combine data from DeFiLlama and CoinGecko into unified format
   */
  private combineProtocolData(
    defillProtocol: DeFiProtocolInfo | null,
    defillYields: ProtocolYield[],
    coinDetails: CoinDetails | null,
    coinMarketData: CoinInfo | null
  ): UnifiedProtocolData {
    const now = new Date();
    
    // Determine primary identifier and name
    const id = defillProtocol?.id || coinDetails?.id || 'unknown';
    const name = defillProtocol?.name || coinDetails?.name || 'Unknown Protocol';
    const symbol = defillProtocol?.symbol || coinDetails?.symbol;
    
    // Combine descriptions
    const description = defillProtocol?.description || 
                       (coinDetails?.description?.en) || 
                       undefined;
    
    // Website and logo
    const website = defillProtocol?.url || 
                   coinDetails?.links?.homepage?.[0] || 
                   undefined;
    const logo = defillProtocol?.logo || 
                coinDetails?.image?.large || 
                undefined;
    
    // Blockchain information
    const chains = defillProtocol?.chains || [];
    const contractAddresses: Record<string, string> = {};
    
    if (defillProtocol?.address && defillProtocol.chain) {
      contractAddresses[defillProtocol.chain] = defillProtocol.address;
    }
    
    if (coinDetails?.platforms) {
      Object.entries(coinDetails.platforms).forEach(([chain, address]) => {
        if (address && typeof address === 'string') {
          contractAddresses[chain] = address;
        }
      });
    }
    
    // Financial metrics
    const tvl = defillProtocol?.tvl || 0;
    const tvlChange24h = defillProtocol?.change_1d;
    const tvlChange7d = defillProtocol?.change_7d;
    
    // Market data
    const marketCap = coinMarketData?.market_cap || defillProtocol?.mcap;
    const price = coinMarketData?.current_price || coinDetails?.market_data?.current_price?.usd;
    const priceChange24h = coinMarketData?.price_change_percentage_24h || 
                          coinDetails?.market_data?.price_change_percentage_24h;
    const priceChange7d = coinDetails?.market_data?.price_change_percentage_7d;
    const volume24h = coinMarketData?.total_volume || coinDetails?.market_data?.total_volume?.usd;
    
    // Category and audit info
    const category = defillProtocol?.category || 'unknown';
    const audits = defillProtocol?.audits;
    const auditNote = defillProtocol?.audit_note;
    
    return {
      id,
      name,
      symbol,
      description,
      website,
      logo,
      chains,
      contractAddresses,
      tvl,
      tvlChange24h,
      tvlChange7d,
      marketCap,
      price,
      priceChange24h,
      priceChange7d,
      volume24h,
      yields: defillYields,
      category,
      audits,
      auditNote,
      lastUpdated: now,
      dataSource: {
        defillama: !!defillProtocol,
        coingecko: !!coinDetails
      }
    };
  }

  /**
   * Get top N entries from a record sorted by value
   */
  private getTopEntries(data: Record<string, number>, count: number): Record<string, number> {
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, number>);
  }
}
