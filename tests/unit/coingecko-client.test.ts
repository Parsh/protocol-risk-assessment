import { CoinGeckoClient, CoinInfo, CoinDetails } from '../../src/services/coingecko-client';
import { logger } from '../../src/config/logger';

// Mock the logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the ExternalApiClient
jest.mock('../../src/services/external-api-client', () => ({
  ExternalApiClient: class {
    constructor(config: any, cacheDir: string) {}
    
    async makeRequest<T>(endpoint: string, options: any, cacheKey?: string): Promise<{ data: T }> {
      // This will be mocked in individual tests
      throw new Error('Should be mocked');
    }
  }
}));

describe('CoinGeckoClient', () => {
  let client: CoinGeckoClient;
  let mockMakeRequest: jest.SpyInstance;

  beforeEach(() => {
    client = new CoinGeckoClient();
    mockMakeRequest = jest.spyOn(client as any, 'makeRequest');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const client = new CoinGeckoClient();
      expect(client).toBeInstanceOf(CoinGeckoClient);
      expect(logger.info).toHaveBeenCalledWith('CoinGecko client initialized', expect.any(Object));
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        timeout: 60000,
        apiKey: 'test-api-key',
        rateLimit: {
          requestsPerMinute: 100,
          burstLimit: 10
        }
      };
      
      const client = new CoinGeckoClient(customConfig);
      expect(client).toBeInstanceOf(CoinGeckoClient);
    });

    it('should accept custom cache directory', () => {
      const client = new CoinGeckoClient({}, './custom/cache');
      expect(client).toBeInstanceOf(CoinGeckoClient);
    });
  });

  describe('addApiKey', () => {
    it('should add API key for pro tier access', () => {
      const apiKey = 'new-api-key';
      
      client.addApiKey(apiKey);
      
      expect(logger.info).toHaveBeenCalledWith('CoinGecko API key updated');
    });
  });

  describe('getAllCoins', () => {
    it('should fetch all coins successfully', async () => {
      const mockCoins = [
        { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
        { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
        { id: 'uniswap', symbol: 'uni', name: 'Uniswap' }
      ];

      mockMakeRequest.mockResolvedValue({ data: mockCoins });

      const result = await client.getAllCoins();

      expect(result).toEqual(mockCoins);
      expect(mockMakeRequest).toHaveBeenCalledWith('/coins/list', expect.any(Object), expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched coins list from CoinGecko', { 
        coinCount: 3 
      });
    });

    it('should handle errors when fetching coins', async () => {
      const error = new Error('Network error');
      mockMakeRequest.mockRejectedValue(error);

      await expect(client.getAllCoins()).rejects.toThrow('Failed to fetch coins list: Network error');
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch coins list from CoinGecko', { error });
    });
  });

  describe('getCoinsMarkets', () => {
    it('should fetch coins market data successfully', async () => {
      const mockCoinsMarkets: CoinInfo[] = [
        {
          id: 'bitcoin',
          symbol: 'btc', 
          name: 'Bitcoin',
          image: 'https://example.com/btc.png',
          current_price: 45000,
          market_cap: 900000000000,
          market_cap_rank: 1,
          fully_diluted_valuation: 945000000000,
          total_volume: 25000000000,
          high_24h: 46000,
          low_24h: 44000,
          price_change_24h: 1000,
          price_change_percentage_24h: 2.27,
          market_cap_change_24h: 20000000000,
          market_cap_change_percentage_24h: 2.27,
          circulating_supply: 20000000,
          total_supply: 21000000,
          max_supply: 21000000,
          ath: 69000,
          ath_change_percentage: -34.78,
          ath_date: '2021-11-10T14:24:11.849Z',
          atl: 67.81,
          atl_change_percentage: 66295.12,
          atl_date: '2013-07-06T00:00:00.000Z',
          roi: null,
          last_updated: '2023-12-07T10:00:00.000Z'
        }
      ];

      mockMakeRequest.mockResolvedValue({ data: mockCoinsMarkets });

      const result = await client.getCoinsMarkets('usd');

      expect(result).toEqual(mockCoinsMarkets);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/coins/markets?'),
        expect.any(Object),
        expect.any(String)
      );
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched coins market data from CoinGecko', {
        vsCurrency: 'usd',
        coinCount: 1
      });
    });

    it('should handle custom parameters', async () => {
      const mockCoinsMarkets: CoinInfo[] = [];
      mockMakeRequest.mockResolvedValue({ data: mockCoinsMarkets });

      await client.getCoinsMarkets('eur', ['bitcoin', 'ethereum'], {
        order: 'volume_desc',
        perPage: 50,
        page: 2,
        sparkline: true,
        priceChangePercentage: '1h,24h,7d'
      });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('vs_currency=eur'),
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  describe('getCoinDetails', () => {
    it('should fetch coin details successfully', async () => {
      const coinId = 'bitcoin';
      const mockCoinDetails: Partial<CoinDetails> = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        description: { en: 'Bitcoin is a cryptocurrency' },
        market_cap_rank: 1,
        market_data: {
          current_price: { usd: 45000 },
          market_cap: { usd: 900000000000 },
          total_volume: { usd: 25000000000 }
        } as any
      };

      mockMakeRequest.mockResolvedValue({ data: mockCoinDetails });

      const result = await client.getCoinDetails(coinId);

      expect(result).toEqual(mockCoinDetails);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining(`/coins/${coinId}?`),
        expect.any(Object),
        expect.any(String)
      );
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched coin details from CoinGecko', {
        coinId,
        name: mockCoinDetails.name,
        symbol: mockCoinDetails.symbol
      });
    });

    it('should handle URL encoding for coin ID', async () => {
      const coinId = 'coin with spaces';
      const mockCoinDetails = { id: coinId, name: 'Test Coin' } as CoinDetails;

      mockMakeRequest.mockResolvedValue({ data: mockCoinDetails });

      await client.getCoinDetails(coinId);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/coins/coin%20with%20spaces?'),
        expect.any(Object),
        expect.any(String)
      );
    });

    it('should handle custom options', async () => {
      const coinId = 'bitcoin';
      const mockCoinDetails = { id: coinId } as CoinDetails;
      
      mockMakeRequest.mockResolvedValue({ data: mockCoinDetails });

      await client.getCoinDetails(coinId, {
        localization: true,
        tickers: true,
        marketData: true,
        communityData: true,
        developerData: true,
        sparkline: true
      });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('localization=true'),
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  describe('getCoinMarketChart', () => {
    it('should fetch market chart data successfully', async () => {
      const coinId = 'bitcoin';
      const mockChartData = {
        prices: [[1638835200000, 45000], [1638921600000, 46000]],
        market_caps: [[1638835200000, 900000000000], [1638921600000, 920000000000]],
        total_volumes: [[1638835200000, 25000000000], [1638921600000, 26000000000]]
      };

      mockMakeRequest.mockResolvedValue({ data: mockChartData });

      const result = await client.getCoinMarketChart(coinId, 'usd', 30);

      expect(result).toEqual(mockChartData);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining(`/coins/${coinId}/market_chart?`),
        expect.any(Object),
        expect.any(String)
      );
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched coin market chart from CoinGecko', {
        coinId,
        vsCurrency: 'usd',
        days: 30,
        priceDataPoints: 2
      });
    });

    it('should handle interval parameter', async () => {
      const mockChartData = {
        prices: [[1638835200000, 45000]],
        market_caps: [[1638835200000, 900000000000]],
        total_volumes: [[1638835200000, 25000000000]]
      };

      mockMakeRequest.mockResolvedValue({ data: mockChartData });

      await client.getCoinMarketChart('bitcoin', 'usd', 365, 'daily');

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('interval=daily'),
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  describe('getSimplePrice', () => {
    it('should fetch simple price successfully', async () => {
      const mockPriceData = {
        bitcoin: { usd: 45000, eur: 39000 },
        ethereum: { usd: 3000, eur: 2600 }
      };

      mockMakeRequest.mockResolvedValue({ data: mockPriceData });

      const result = await client.getSimplePrice(['bitcoin', 'ethereum'], ['usd', 'eur']);

      expect(result).toEqual(mockPriceData);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/simple/price?'),
        expect.any(Object),
        expect.any(String)
      );
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched simple price from CoinGecko', {
        coinCount: 2,
        currencies: ['usd', 'eur']
      });
    });

    it('should handle additional options', async () => {
      const mockPriceData = {
        bitcoin: { 
          usd: 45000, 
          usd_market_cap: 900000000000,
          usd_24h_vol: 25000000000,
          usd_24h_change: 2.27,
          last_updated_at: 1638835200
        }
      };

      mockMakeRequest.mockResolvedValue({ data: mockPriceData });

      await client.getSimplePrice(['bitcoin'], ['usd'], {
        includeMarketCap: true,
        include24hrVol: true,
        include24hrChange: true,
        includeLastUpdatedAt: true,
        precision: 2
      });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('include_market_cap=true'),
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  describe('getCoinByContractAddress', () => {
    it('should fetch coin by contract address successfully', async () => {
      const platform = 'ethereum';
      const contractAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
      const mockCoinDetails = {
        id: 'uniswap',
        symbol: 'uni',
        name: 'Uniswap'
      } as CoinDetails;

      mockMakeRequest.mockResolvedValue({ data: mockCoinDetails });

      const result = await client.getCoinByContractAddress(platform, contractAddress);

      expect(result).toEqual(mockCoinDetails);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        `/coins/${platform}/contract/${contractAddress}`,
        expect.any(Object),
        expect.any(String)
      );
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched coin by contract address from CoinGecko', {
        platform,
        contractAddress,
        coinId: mockCoinDetails.id,
        name: mockCoinDetails.name
      });
    });

    it('should handle URL encoding for platform and address', async () => {
      const platform = 'binance smart chain';
      const contractAddress = '0x address with spaces';
      const mockCoinDetails = { id: 'test' } as CoinDetails;

      mockMakeRequest.mockResolvedValue({ data: mockCoinDetails });

      await client.getCoinByContractAddress(platform, contractAddress);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        '/coins/binance%20smart%20chain/contract/0x%20address%20with%20spaces',
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  describe('searchCoins', () => {
    it('should search coins successfully', async () => {
      const query = 'bitcoin';
      const mockSearchResults = {
        coins: [
          {
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'BTC',
            market_cap_rank: 1,
            thumb: 'https://example.com/btc-thumb.png',
            large: 'https://example.com/btc-large.png'
          }
        ],
        exchanges: [],
        icos: [],
        categories: [],
        nfts: []
      };

      mockMakeRequest.mockResolvedValue({ data: mockSearchResults });

      const result = await client.searchCoins(query);

      expect(result).toEqual(mockSearchResults);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/search?'),
        expect.any(Object),
        expect.any(String)
      );
      expect(logger.info).toHaveBeenCalledWith('Successfully searched coins in CoinGecko', {
        query,
        coinResults: 1
      });
    });
  });

  describe('getAssetPlatforms', () => {
    it('should fetch asset platforms successfully', async () => {
      const mockPlatforms = [
        { id: 'ethereum', chain_identifier: 1, name: 'Ethereum', shortname: 'eth' },
        { id: 'arbitrum-one', chain_identifier: 42161, name: 'Arbitrum One', shortname: 'arb' }
      ];

      mockMakeRequest.mockResolvedValue({ data: mockPlatforms });

      const result = await client.getAssetPlatforms();

      expect(result).toEqual(mockPlatforms);
      expect(mockMakeRequest).toHaveBeenCalledWith('/asset_platforms', expect.any(Object), expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched asset platforms from CoinGecko', {
        platformCount: 2
      });
    });
  });

  describe('getCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        { category_id: 'decentralized-finance-defi', name: 'Decentralized Finance (DeFi)' },
        { category_id: 'exchange-based-tokens', name: 'Exchange-based Tokens' }
      ];

      mockMakeRequest.mockResolvedValue({ data: mockCategories });

      const result = await client.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockMakeRequest).toHaveBeenCalledWith('/coins/categories/list', expect.any(Object), expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched categories from CoinGecko', {
        categoryCount: 2
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      const mockPingResponse = { gecko_says: '(V3) To the Moon!' };
      mockMakeRequest.mockResolvedValue({ data: mockPingResponse });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(mockMakeRequest).toHaveBeenCalledWith('/ping', expect.any(Object), expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('CoinGecko API health check passed');
    });

    it('should return false when API is unhealthy', async () => {
      const error = new Error('API unavailable');
      mockMakeRequest.mockRejectedValue(error);

      const result = await client.healthCheck();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('CoinGecko API health check failed', { error });
    });
  });

  describe('Authentication', () => {
    it('should include API key in headers when available', async () => {
      const clientWithApiKey = new CoinGeckoClient({ apiKey: 'test-api-key' });
      const mockMakeRequestWithKey = jest.spyOn(clientWithApiKey as any, 'makeRequest');
      mockMakeRequestWithKey.mockResolvedValue({ data: [] });

      await clientWithApiKey.getAllCoins();

      expect(mockMakeRequestWithKey).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-cg-pro-api-key': 'test-api-key'
          })
        }),
        expect.any(String)
      );
    });

    it('should not include API key header when not available', async () => {
      mockMakeRequest.mockResolvedValue({ data: [] });

      await client.getAllCoins();

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'x-cg-pro-api-key': expect.any(String)
          })
        }),
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockMakeRequest.mockRejectedValue(networkError);

      await expect(client.getAllCoins()).rejects.toThrow('Failed to fetch coins list: ECONNREFUSED');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockMakeRequest.mockRejectedValue(timeoutError);

      await expect(client.getCoinDetails('bitcoin')).rejects.toThrow('Failed to fetch coin details for bitcoin: Request timeout');
    });

    it('should handle unknown errors', async () => {
      const unknownError = 'String error';
      mockMakeRequest.mockRejectedValue(unknownError);

      await expect(client.getSimplePrice(['bitcoin'])).rejects.toThrow('Failed to fetch simple price: Unknown error');
    });

    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Too Many Requests');
      mockMakeRequest.mockRejectedValue(rateLimitError);

      await expect(client.getCoinsMarkets()).rejects.toThrow('Failed to fetch coins market data: Too Many Requests');
    });
  });

  describe('Caching', () => {
    it('should generate consistent cache keys', async () => {
      mockMakeRequest.mockResolvedValue({ data: [] });

      await client.getAllCoins();
      await client.getAllCoins();

      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
      
      // Both calls should use the same cache key pattern
      const call1 = mockMakeRequest.mock.calls[0];
      const call2 = mockMakeRequest.mock.calls[1];
      expect(call1![2]).toEqual(call2![2]);
    });

    it('should generate different cache keys for different endpoints', async () => {
      mockMakeRequest.mockResolvedValue({ data: [] });

      await client.getAllCoins();
      await client.getAssetPlatforms();

      const call1 = mockMakeRequest.mock.calls[0];
      const call2 = mockMakeRequest.mock.calls[1];
      expect(call1![2]).not.toEqual(call2![2]);
    });
  });
});
