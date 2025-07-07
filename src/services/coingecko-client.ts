import { ExternalApiClient } from './external-api-client';
import { logger } from '../config/logger';
import { AxiosRequestConfig } from 'axios';

export interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  } | null;
  last_updated: string;
}

export interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  asset_platform_id: string;
  platforms: Record<string, string>;
  detail_platforms: Record<string, {
    decimal_place: number;
    contract_address: string;
  }>;
  block_time_in_minutes: number;
  hashing_algorithm: string;
  categories: string[];
  public_notice: string;
  additional_notices: string[];
  description: Record<string, string>;
  links: {
    homepage: string[];
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    announcement_url: string[];
    twitter_screen_name: string;
    facebook_username: string;
    bitcointalk_thread_identifier: string;
    telegram_channel_identifier: string;
    subreddit_url: string;
    repos_url: {
      github: string[];
      bitbucket: string[];
    };
  };
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  country_origin: string;
  genesis_date: string;
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  watchlist_portfolio_users: number;
  market_cap_rank: number;
  coingecko_rank: number;
  coingecko_score: number;
  developer_score: number;
  community_score: number;
  liquidity_score: number;
  public_interest_score: number;
  market_data: {
    current_price: Record<string, number>;
    total_value_locked: Record<string, number>;
    mcap_to_tvl_ratio: number;
    fdv_to_tvl_ratio: number;
    roi: {
      times: number;
      currency: string;
      percentage: number;
    } | null;
    ath: Record<string, number>;
    ath_change_percentage: Record<string, number>;
    ath_date: Record<string, string>;
    atl: Record<string, number>;
    atl_change_percentage: Record<string, number>;
    atl_date: Record<string, string>;
    market_cap: Record<string, number>;
    market_cap_rank: number;
    fully_diluted_valuation: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_14d: number;
    price_change_percentage_30d: number;
    price_change_percentage_60d: number;
    price_change_percentage_200d: number;
    price_change_percentage_1y: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    price_change_24h_in_currency: Record<string, number>;
    price_change_percentage_1h_in_currency: Record<string, number>;
    price_change_percentage_24h_in_currency: Record<string, number>;
    price_change_percentage_7d_in_currency: Record<string, number>;
    price_change_percentage_14d_in_currency: Record<string, number>;
    price_change_percentage_30d_in_currency: Record<string, number>;
    price_change_percentage_60d_in_currency: Record<string, number>;
    price_change_percentage_200d_in_currency: Record<string, number>;
    price_change_percentage_1y_in_currency: Record<string, number>;
    market_cap_change_24h_in_currency: Record<string, number>;
    market_cap_change_percentage_24h_in_currency: Record<string, number>;
    total_supply: number;
    max_supply: number;
    circulating_supply: number;
    last_updated: string;
  };
  community_data: {
    facebook_likes: number;
    twitter_followers: number;
    reddit_average_posts_48h: number;
    reddit_average_comments_48h: number;
    reddit_subscribers: number;
    reddit_accounts_active_48h: number;
    telegram_channel_user_count: number;
  };
  developer_data: {
    forks: number;
    stars: number;
    subscribers: number;
    total_issues: number;
    closed_issues: number;
    pull_requests_merged: number;
    pull_request_contributors: number;
    code_additions_deletions_4_weeks: {
      additions: number;
      deletions: number;
    };
    commit_count_4_weeks: number;
    last_4_weeks_commit_activity_series: number[];
  };
  public_interest_stats: {
    alexa_rank: number;
    bing_matches: number;
  };
  status_updates: any[];
  last_updated: string;
}

export interface CoinMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinGeckoConfig {
  baseUrl: string;
  timeout: number;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

/**
 * Client for interacting with CoinGecko API
 * Provides access to cryptocurrency market data, prices, and token information
 * 
 * @see https://www.coingecko.com/en/api/documentation
 */
export class CoinGeckoClient extends ExternalApiClient {
  private static readonly DEFAULT_CONFIG: CoinGeckoConfig = {
    baseUrl: 'https://api.coingecko.com/api/v3',
    timeout: 30000, // 30 seconds
    rateLimit: {
      requestsPerMinute: 30, // CoinGecko free tier allows 30 requests per minute
      burstLimit: 5
    }
  };

  private apiKey?: string;

  constructor(config: Partial<CoinGeckoConfig> = {}, cacheDir: string = './data/cache/coingecko') {
    const finalConfig = { ...CoinGeckoClient.DEFAULT_CONFIG, ...config };
    
    // Convert to ApiClientConfig format expected by parent
    const apiClientConfig = {
      baseUrl: finalConfig.baseUrl,
      ...(finalConfig.apiKey && { apiKey: finalConfig.apiKey }),
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
        ttlMs: 300000, // 5 minutes
        maxSize: 1000
      }
    };

    super(apiClientConfig, cacheDir);

    if (finalConfig.apiKey) {
      this.apiKey = finalConfig.apiKey;
    }

    logger.info('CoinGecko client initialized', {
      baseUrl: finalConfig.baseUrl,
      timeout: finalConfig.timeout,
      rateLimit: finalConfig.rateLimit,
      hasApiKey: !!this.apiKey
    });
  }

  /**
   * Add or update API key for pro tier access
   */
  addApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    logger.info('CoinGecko API key updated');
  }

  /**
   * Make authenticated request with API key if available
   */
  protected async makeAuthenticatedRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const queryString = new URLSearchParams(params).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    const options: AxiosRequestConfig = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        ...(this.apiKey && { 'x-cg-pro-api-key': this.apiKey })
      }
    };

    const cacheKey = `coingecko-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}-${queryString}`;
    const response = await this.makeRequest<T>(fullEndpoint, options, cacheKey);
    
    return response.data;
  }

  /**
   * Get list of all coins with basic information
   */
  async getAllCoins(): Promise<Array<{ id: string; symbol: string; name: string }>> {
    try {
      logger.debug('Fetching all coins from CoinGecko');
      
      const response = await this.makeAuthenticatedRequest<Array<{ id: string; symbol: string; name: string }>>('/coins/list');
      
      logger.info('Successfully fetched coins list from CoinGecko', { 
        coinCount: response.length 
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch coins list from CoinGecko', { error });
      throw new Error(`Failed to fetch coins list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get market data for coins
   */
  async getCoinsMarkets(
    vsCurrency: string = 'usd',
    ids?: string[],
    options: {
      order?: string;
      perPage?: number;
      page?: number;
      sparkline?: boolean;
      priceChangePercentage?: string;
    } = {}
  ): Promise<CoinInfo[]> {
    try {
      logger.debug('Fetching coins market data from CoinGecko', { 
        vsCurrency, 
        ids: ids?.slice(0, 5), // Log only first 5 IDs
        options 
      });
      
      const params: Record<string, any> = {
        vs_currency: vsCurrency,
        order: options.order || 'market_cap_desc',
        per_page: options.perPage || 100,
        page: options.page || 1,
        sparkline: options.sparkline || false,
        price_change_percentage: options.priceChangePercentage || '24h'
      };

      if (ids && ids.length > 0) {
        params.ids = ids.join(',');
      }
      
      const response = await this.makeAuthenticatedRequest<CoinInfo[]>('/coins/markets', params);
      
      logger.info('Successfully fetched coins market data from CoinGecko', { 
        vsCurrency,
        coinCount: response.length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch coins market data from CoinGecko', { 
        vsCurrency, 
        ids, 
        error 
      });
      throw new Error(`Failed to fetch coins market data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information for a specific coin
   */
  async getCoinDetails(
    coinId: string,
    options: {
      localization?: boolean;
      tickers?: boolean;
      marketData?: boolean;
      communityData?: boolean;
      developerData?: boolean;
      sparkline?: boolean;
    } = {}
  ): Promise<CoinDetails> {
    try {
      logger.debug('Fetching coin details from CoinGecko', { coinId, options });
      
      const params: Record<string, any> = {
        localization: options.localization || false,
        tickers: options.tickers || false,
        market_data: options.marketData !== false, // Default to true
        community_data: options.communityData || false,
        developer_data: options.developerData || false,
        sparkline: options.sparkline || false
      };
      
      const response = await this.makeAuthenticatedRequest<CoinDetails>(`/coins/${encodeURIComponent(coinId)}`, params);
      
      logger.info('Successfully fetched coin details from CoinGecko', { 
        coinId,
        name: response.name,
        symbol: response.symbol
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch coin details from CoinGecko', { 
        coinId, 
        error 
      });
      throw new Error(`Failed to fetch coin details for ${coinId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get historical market data for a coin
   */
  async getCoinMarketChart(
    coinId: string,
    vsCurrency: string = 'usd',
    days: number = 30,
    interval?: 'daily'
  ): Promise<CoinMarketChart> {
    try {
      logger.debug('Fetching coin market chart from CoinGecko', { 
        coinId, 
        vsCurrency, 
        days, 
        interval 
      });
      
      const params: Record<string, any> = {
        vs_currency: vsCurrency,
        days: days.toString()
      };

      if (interval) {
        params.interval = interval;
      }
      
      const response = await this.makeAuthenticatedRequest<CoinMarketChart>(
        `/coins/${encodeURIComponent(coinId)}/market_chart`, 
        params
      );
      
      logger.info('Successfully fetched coin market chart from CoinGecko', { 
        coinId,
        vsCurrency,
        days,
        priceDataPoints: response.prices.length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch coin market chart from CoinGecko', { 
        coinId, 
        vsCurrency, 
        days, 
        error 
      });
      throw new Error(`Failed to fetch market chart for ${coinId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get simple price for coins
   */
  async getSimplePrice(
    ids: string[],
    vsCurrencies: string[] = ['usd'],
    options: {
      includeMarketCap?: boolean;
      include24hrVol?: boolean;
      include24hrChange?: boolean;
      includeLastUpdatedAt?: boolean;
      precision?: number;
    } = {}
  ): Promise<Record<string, Record<string, number>>> {
    try {
      logger.debug('Fetching simple price from CoinGecko', { 
        ids: ids.slice(0, 5), // Log only first 5 IDs
        vsCurrencies, 
        options 
      });
      
      const params: Record<string, any> = {
        ids: ids.join(','),
        vs_currencies: vsCurrencies.join(','),
        include_market_cap: options.includeMarketCap || false,
        include_24hr_vol: options.include24hrVol || false,
        include_24hr_change: options.include24hrChange || false,
        include_last_updated_at: options.includeLastUpdatedAt || false
      };

      if (options.precision !== undefined) {
        params.precision = options.precision;
      }
      
      const response = await this.makeAuthenticatedRequest<Record<string, Record<string, number>>>(
        '/simple/price', 
        params
      );
      
      logger.info('Successfully fetched simple price from CoinGecko', { 
        coinCount: Object.keys(response).length,
        currencies: vsCurrencies
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch simple price from CoinGecko', { 
        ids, 
        vsCurrencies, 
        error 
      });
      throw new Error(`Failed to fetch simple price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get coin information by contract address
   */
  async getCoinByContractAddress(
    platform: string,
    contractAddress: string
  ): Promise<CoinDetails> {
    try {
      logger.debug('Fetching coin by contract address from CoinGecko', { 
        platform, 
        contractAddress 
      });
      
      const response = await this.makeAuthenticatedRequest<CoinDetails>(
        `/coins/${encodeURIComponent(platform)}/contract/${encodeURIComponent(contractAddress)}`
      );
      
      logger.info('Successfully fetched coin by contract address from CoinGecko', { 
        platform,
        contractAddress,
        coinId: response.id,
        name: response.name
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch coin by contract address from CoinGecko', { 
        platform, 
        contractAddress, 
        error 
      });
      throw new Error(`Failed to fetch coin by contract address ${contractAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for coins by name or symbol
   */
  async searchCoins(query: string): Promise<{
    coins: Array<{
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      thumb: string;
      large: string;
    }>;
    exchanges: any[];
    icos: any[];
    categories: any[];
    nfts: any[];
  }> {
    try {
      logger.debug('Searching coins in CoinGecko', { query });
      
      const response = await this.makeAuthenticatedRequest<{
        coins: Array<{
          id: string;
          name: string;
          symbol: string;
          market_cap_rank: number;
          thumb: string;
          large: string;
        }>;
        exchanges: any[];
        icos: any[];
        categories: any[];
        nfts: any[];
      }>('/search', { query });
      
      logger.info('Successfully searched coins in CoinGecko', { 
        query,
        coinResults: response.coins.length
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to search coins in CoinGecko', { 
        query, 
        error 
      });
      throw new Error(`Failed to search coins for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get supported asset platforms (blockchains)
   */
  async getAssetPlatforms(): Promise<Array<{
    id: string;
    chain_identifier: number;
    name: string;
    shortname: string;
  }>> {
    try {
      logger.debug('Fetching asset platforms from CoinGecko');
      
      const response = await this.makeAuthenticatedRequest<Array<{
        id: string;
        chain_identifier: number;
        name: string;
        shortname: string;
      }>>('/asset_platforms');
      
      logger.info('Successfully fetched asset platforms from CoinGecko', { 
        platformCount: response.length 
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch asset platforms from CoinGecko', { error });
      throw new Error(`Failed to fetch asset platforms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get coin categories
   */
  async getCategories(): Promise<Array<{
    category_id: string;
    name: string;
  }>> {
    try {
      logger.debug('Fetching categories from CoinGecko');
      
      const response = await this.makeAuthenticatedRequest<Array<{
        category_id: string;
        name: string;
      }>>('/coins/categories/list');
      
      logger.info('Successfully fetched categories from CoinGecko', { 
        categoryCount: response.length 
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to fetch categories from CoinGecko', { error });
      throw new Error(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for CoinGecko API
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug('Performing health check for CoinGecko API');
      
      await this.makeAuthenticatedRequest<{ gecko_says: string }>('/ping');
      
      logger.info('CoinGecko API health check passed');
      return true;
    } catch (error) {
      logger.error('CoinGecko API health check failed', { error });
      return false;
    }
  }
}
