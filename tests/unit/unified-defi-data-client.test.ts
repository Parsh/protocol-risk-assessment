import { UnifiedDeFiDataClient, UnifiedProtocolData } from '../../src/services/unified-defi-data-client';
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

// Mock the DeFiLlama client
const mockDeFiLlamaClient = {
  getProtocol: jest.fn(),
  getProtocolYields: jest.fn(),
  searchProtocols: jest.fn(),
  getProtocolByAddress: jest.fn(),
  getCurrentTvl: jest.fn(),
  getProtocolCategories: jest.fn(),
  getChainTvl: jest.fn(),
  healthCheck: jest.fn()
};

// Mock the CoinGecko client
const mockCoinGeckoClient = {
  addApiKey: jest.fn(),
  getCoinDetails: jest.fn(),
  getCoinsMarkets: jest.fn(),
  searchCoins: jest.fn(),
  getCoinByContractAddress: jest.fn(),
  healthCheck: jest.fn()
};

jest.mock('../../src/services/defillama-client', () => ({
  DeFiLlamaClient: jest.fn(() => mockDeFiLlamaClient)
}));

jest.mock('../../src/services/coingecko-client', () => ({
  CoinGeckoClient: jest.fn(() => mockCoinGeckoClient)
}));

describe('UnifiedDeFiDataClient', () => {
  let client: UnifiedDeFiDataClient;

  beforeEach(() => {
    client = new UnifiedDeFiDataClient();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const client = new UnifiedDeFiDataClient();
      expect(client).toBeInstanceOf(UnifiedDeFiDataClient);
      expect(logger.info).toHaveBeenCalledWith('Unified DeFi data client initialized', expect.any(Object));
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        defillama: {
          timeout: 60000,
          rateLimit: { requestsPerMinute: 500, burstLimit: 20 }
        },
        coingecko: {
          timeout: 45000,
          apiKey: 'test-key',
          rateLimit: { requestsPerMinute: 100, burstLimit: 10 }
        },
        cacheDir: './custom/cache'
      };

      const client = new UnifiedDeFiDataClient(customConfig);
      expect(client).toBeInstanceOf(UnifiedDeFiDataClient);
    });
  });

  describe('addCoinGeckoApiKey', () => {
    it('should add API key to CoinGecko client', () => {
      const apiKey = 'test-api-key';
      
      client.addCoinGeckoApiKey(apiKey);
      
      expect(mockCoinGeckoClient.addApiKey).toHaveBeenCalledWith(apiKey);
      expect(logger.info).toHaveBeenCalledWith('CoinGecko API key added to unified client');
    });
  });

  describe('getProtocolData', () => {
    it('should combine DeFiLlama and CoinGecko data successfully', async () => {
      const protocolId = 'uniswap';
      
      const mockDeFiProtocol = {
        id: '1',
        name: 'Uniswap',
        symbol: 'UNI',
        description: 'Decentralized exchange',
        url: 'https://uniswap.org',
        logo: 'https://example.com/uni-logo.png',
        chain: 'ethereum',
        address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
        chains: ['ethereum'],
        category: 'dexes',
        tvl: 1000000000,
        change_1d: 2.5,
        change_7d: -1.2,
        mcap: 5000000000,
        audits: '3',
        audit_note: 'Audited by multiple firms',
        slug: 'uniswap'
      };

      const mockYields = [
        {
          pool: 'UNI-ETH',
          project: 'uniswap',
          symbol: 'UNI-ETH',
          tvlUsd: 50000000,
          apy: 12.5
        }
      ];

      const mockCoinDetails = {
        id: 'uniswap',
        symbol: 'uni',
        name: 'Uniswap',
        description: { en: 'A protocol for decentralized exchange' },
        links: {
          homepage: ['https://uniswap.org']
        },
        image: {
          large: 'https://example.com/uni-large.png'
        },
        platforms: {
          ethereum: '0x1f98431c8ad98523631ae4a59f267346ea31f984'
        },
        market_data: {
          current_price: { usd: 25 },
          price_change_percentage_24h: 3.2,
          price_change_percentage_7d: -0.8,
          total_volume: { usd: 100000000 }
        }
      };

      const mockMarketData = {
        id: 'uniswap',
        current_price: 25,
        market_cap: 5000000000,
        price_change_percentage_24h: 3.2,
        total_volume: 100000000
      };

      mockDeFiLlamaClient.getProtocol.mockResolvedValue(mockDeFiProtocol);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue(mockYields);
      mockCoinGeckoClient.getCoinDetails.mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([mockMarketData]);

      const result = await client.getProtocolData(protocolId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Uniswap');
      expect(result!.symbol).toBe('UNI');
      expect(result!.tvl).toBe(1000000000);
      expect(result!.price).toBe(25);
      expect(result!.yields).toHaveLength(1);
      expect(result!.dataSource.defillama).toBe(true);
      expect(result!.dataSource.coingecko).toBe(true);
      expect(result!.contractAddresses.ethereum).toBe('0x1f98431c8ad98523631ae4a59f267346ea31f984');
    });

    it('should handle DeFiLlama-only data', async () => {
      const protocolId = 'defillama-only';
      
      const mockDeFiProtocol = {
        id: '1',
        name: 'DeFi Protocol',
        symbol: 'DEFI',
        tvl: 500000000,
        category: 'lending',
        chains: ['ethereum'],
        slug: 'defi-protocol'
      };

      mockDeFiLlamaClient.getProtocol.mockResolvedValue(mockDeFiProtocol);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockRejectedValue(new Error('Not found'));

      const result = await client.getProtocolData(protocolId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('DeFi Protocol');
      expect(result!.dataSource.defillama).toBe(true);
      expect(result!.dataSource.coingecko).toBe(false);
    });

    it('should handle CoinGecko-only data', async () => {
      const protocolId = 'coingecko-only';
      
      const mockCoinDetails = {
        id: 'coingecko-coin',
        symbol: 'CGC',
        name: 'CoinGecko Coin',
        description: { en: 'A coin only on CoinGecko' },
        market_data: {
          current_price: { usd: 10 }
        }
      };

      mockDeFiLlamaClient.getProtocol.mockRejectedValue(new Error('Not found'));
      mockDeFiLlamaClient.searchProtocols.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([]);

      const result = await client.getProtocolData(protocolId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('CoinGecko Coin');
      expect(result!.dataSource.defillama).toBe(false);
      expect(result!.dataSource.coingecko).toBe(true);
    });

    it('should return null when protocol not found in either source', async () => {
      const protocolId = 'nonexistent';

      mockDeFiLlamaClient.getProtocol.mockRejectedValue(new Error('Not found'));
      mockDeFiLlamaClient.searchProtocols.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockRejectedValue(new Error('Not found'));
      mockCoinGeckoClient.searchCoins.mockResolvedValue({ coins: [], exchanges: [], icos: [], categories: [], nfts: [] });

      const result = await client.getProtocolData(protocolId);

      expect(result).toBeNull();
    });

    it('should handle search fallback for DeFiLlama', async () => {
      const protocolId = 'search-test';
      
      const mockSearchResult = {
        id: '1',
        name: 'Search Result',
        slug: 'search-result',
        tvl: 100000000,
        category: 'dexes',
        chains: ['ethereum']
      };

      mockDeFiLlamaClient.getProtocol.mockRejectedValue(new Error('Not found'));
      mockDeFiLlamaClient.searchProtocols.mockResolvedValue([mockSearchResult]);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockRejectedValue(new Error('Not found'));
      mockCoinGeckoClient.searchCoins.mockResolvedValue({ coins: [], exchanges: [], icos: [], categories: [], nfts: [] });

      const result = await client.getProtocolData(protocolId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Search Result');
      expect(mockDeFiLlamaClient.searchProtocols).toHaveBeenCalledWith(protocolId);
    });

    it('should handle search fallback for CoinGecko', async () => {
      const protocolId = 'coin-search-test';
      
      const mockSearchResult = {
        coins: [{ id: 'test-coin', name: 'Test Coin', symbol: 'TEST', market_cap_rank: 100, thumb: '', large: '' }],
        exchanges: [],
        icos: [],
        categories: [],
        nfts: []
      };

      const mockCoinDetails = {
        id: 'test-coin',
        name: 'Test Coin',
        symbol: 'test',
        market_data: {
          current_price: { usd: 5 }
        }
      };

      mockDeFiLlamaClient.getProtocol.mockRejectedValue(new Error('Not found'));
      mockDeFiLlamaClient.searchProtocols.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.searchCoins.mockResolvedValue(mockSearchResult);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([]);

      const result = await client.getProtocolData(protocolId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Coin');
      expect(mockCoinGeckoClient.searchCoins).toHaveBeenCalledWith(protocolId);
    });
  });

  describe('getProtocolByAddress', () => {
    it('should find protocol by contract address', async () => {
      const contractAddress = '0x1f98431c8ad98523631ae4a59f267346ea31f984';
      const chain = 'ethereum';

      const mockDeFiProtocol = {
        id: '1',
        name: 'Uniswap',
        address: contractAddress,
        chain: 'ethereum',
        tvl: 1000000000,
        category: 'dexes',
        chains: ['ethereum'],
        slug: 'uniswap'
      };

      const mockCoinDetails = {
        id: 'uniswap',
        name: 'Uniswap',
        platforms: {
          ethereum: contractAddress
        }
      };

      mockDeFiLlamaClient.getProtocolByAddress.mockResolvedValue(mockDeFiProtocol);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinByContractAddress.mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([]);

      const result = await client.getProtocolByAddress(contractAddress, chain);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Uniswap');
      expect(result!.contractAddresses.ethereum).toBe(contractAddress);
      expect(mockDeFiLlamaClient.getProtocolByAddress).toHaveBeenCalledWith(contractAddress);
      expect(mockCoinGeckoClient.getCoinByContractAddress).toHaveBeenCalledWith('ethereum', contractAddress);
    });

    it('should handle chain mapping for CoinGecko', async () => {
      const contractAddress = '0x123456789';
      const chain = 'bsc';

      mockDeFiLlamaClient.getProtocolByAddress.mockResolvedValue(null);
      mockCoinGeckoClient.getCoinByContractAddress.mockRejectedValue(new Error('Not found'));

      await client.getProtocolByAddress(contractAddress, chain);

      expect(mockCoinGeckoClient.getCoinByContractAddress).toHaveBeenCalledWith('binance-smart-chain', contractAddress);
    });

    it('should return null when address not found', async () => {
      const contractAddress = '0xnonexistent';

      mockDeFiLlamaClient.getProtocolByAddress.mockResolvedValue(null);
      mockCoinGeckoClient.getCoinByContractAddress.mockRejectedValue(new Error('Not found'));

      const result = await client.getProtocolByAddress(contractAddress);

      expect(result).toBeNull();
    });
  });

  describe('searchProtocols', () => {
    it('should search protocols across both sources', async () => {
      const query = 'uni';
      const limit = 5;

      const mockDeFiResults = [
        {
          id: '1',
          name: 'Uniswap',
          slug: 'uniswap',
          tvl: 1000000000,
          category: 'dexes',
          chains: ['ethereum']
        }
      ];

      const mockCoinGeckoResults = {
        coins: [
          { id: '1', name: 'Uniswap', symbol: 'UNI', market_cap_rank: 50, thumb: '', large: '' }
        ],
        exchanges: [],
        icos: [],
        categories: [],
        nfts: []
      };

      const mockCoinDetails = {
        id: '1',
        name: 'Uniswap',
        symbol: 'uni'
      };

      mockDeFiLlamaClient.searchProtocols.mockResolvedValue(mockDeFiResults);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.searchCoins.mockResolvedValue(mockCoinGeckoResults);
      mockCoinGeckoClient.getCoinDetails.mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([]);

      const result = await client.searchProtocols(query, limit);

      expect(result).toHaveLength(1); // Should deduplicate by ID
      expect(result[0]!.name).toBe('Uniswap');
      expect(mockDeFiLlamaClient.searchProtocols).toHaveBeenCalledWith(query);
    });

    it('should handle search errors gracefully', async () => {
      const query = 'error-test';

      mockDeFiLlamaClient.searchProtocols.mockRejectedValue(new Error('DeFiLlama error'));
      mockCoinGeckoClient.searchCoins.mockRejectedValue(new Error('CoinGecko error'));

      const result = await client.searchProtocols(query);

      expect(result).toHaveLength(0);
      expect(logger.debug).toHaveBeenCalledWith('DeFiLlama search failed', { query });
      expect(logger.debug).toHaveBeenCalledWith('CoinGecko search failed', { query });
    });

    it('should respect the limit parameter', async () => {
      const query = 'test';
      const limit = 2;

      const mockDeFiResults = Array(5).fill(null).map((_, i) => ({
        id: `protocol-${i}`,
        name: `Protocol ${i}`,
        slug: `protocol-${i}`,
        tvl: 1000000,
        category: 'dexes',
        chains: ['ethereum']
      }));

      mockDeFiLlamaClient.searchProtocols.mockResolvedValue(mockDeFiResults);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.searchCoins.mockResolvedValue({ coins: [], exchanges: [], icos: [], categories: [], nfts: [] });

      const result = await client.searchProtocols(query, limit);

      expect(result).toHaveLength(limit);
    });
  });

  describe('getMarketOverview', () => {
    it('should fetch market overview successfully', async () => {
      const mockTvlData = { totalTvl: 50000000000, protocols: 1500 };
      const mockCategories = {
        'dexes': 15000000000,
        'lending': 10000000000,
        'yield': 8000000000,
        'bridges': 5000000000,
        'staking': 3000000000,
        'derivatives': 2000000000
      };
      const mockChains = {
        'ethereum': 25000000000,
        'bsc': 8000000000,
        'polygon': 5000000000,
        'avalanche': 3000000000,
        'arbitrum': 2000000000,
        'optimism': 1000000000
      };

      mockDeFiLlamaClient.getCurrentTvl.mockResolvedValue(mockTvlData);
      mockDeFiLlamaClient.getProtocolCategories.mockResolvedValue(mockCategories);
      mockDeFiLlamaClient.getChainTvl.mockResolvedValue(mockChains);

      const result = await client.getMarketOverview();

      expect(result.totalTvl).toBe(50000000000);
      expect(result.protocolCount).toBe(1500);
      expect(Object.keys(result.topCategories)).toHaveLength(5);
      expect(Object.keys(result.topChains)).toHaveLength(5);
      expect(result.topCategories['dexes']).toBe(15000000000);
      expect(result.topChains['ethereum']).toBe(25000000000);
    });

    it('should handle market overview errors', async () => {
      const error = new Error('API error');
      mockDeFiLlamaClient.getCurrentTvl.mockRejectedValue(error);

      await expect(client.getMarketOverview()).rejects.toThrow('Failed to fetch market overview: API error');
    });
  });

  describe('healthCheck', () => {
    it('should return health status for both sources', async () => {
      mockDeFiLlamaClient.healthCheck.mockResolvedValue(true);
      mockCoinGeckoClient.healthCheck.mockResolvedValue(true);

      const result = await client.healthCheck();

      expect(result.defillama).toBe(true);
      expect(result.coingecko).toBe(true);
      expect(result.overall).toBe(true);
    });

    it('should handle partial health check failures', async () => {
      mockDeFiLlamaClient.healthCheck.mockResolvedValue(true);
      mockCoinGeckoClient.healthCheck.mockResolvedValue(false);

      const result = await client.healthCheck();

      expect(result.defillama).toBe(true);
      expect(result.coingecko).toBe(false);
      expect(result.overall).toBe(true); // At least one is healthy
    });

    it('should handle complete health check failures', async () => {
      mockDeFiLlamaClient.healthCheck.mockRejectedValue(new Error('DeFiLlama down'));
      mockCoinGeckoClient.healthCheck.mockRejectedValue(new Error('CoinGecko down'));

      const result = await client.healthCheck();

      expect(result.defillama).toBe(false);
      expect(result.coingecko).toBe(false);
      expect(result.overall).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockDeFiLlamaClient.getProtocol.mockRejectedValue(networkError);
      mockDeFiLlamaClient.searchProtocols.mockRejectedValue(networkError);
      mockCoinGeckoClient.getCoinDetails.mockRejectedValue(networkError);
      mockCoinGeckoClient.searchCoins.mockRejectedValue(networkError);

      const result = await client.getProtocolData('test');
      expect(result).toBeNull();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockDeFiLlamaClient.searchProtocols.mockRejectedValue(timeoutError);
      mockCoinGeckoClient.searchCoins.mockRejectedValue(timeoutError);

      const result = await client.searchProtocols('test');
      expect(result).toEqual([]);
    });

    it('should handle unknown errors', async () => {
      const unknownError = 'String error';
      mockDeFiLlamaClient.getCurrentTvl.mockRejectedValue(unknownError);

      await expect(client.getMarketOverview()).rejects.toThrow('Failed to fetch market overview: Unknown error');
    });
  });

  describe('Data Combination Logic', () => {
    it('should prefer DeFiLlama data for TVL and protocol info', async () => {
      const protocolId = 'test';
      
      const mockDeFiProtocol = {
        id: '1',
        name: 'DeFi Name',
        symbol: 'DEFI',
        tvl: 1000000000,
        category: 'dexes',
        chains: ['ethereum'],
        slug: 'defi-protocol'
      };

      const mockCoinDetails = {
        id: 'test',
        name: 'Coin Name',
        symbol: 'coin',
        market_data: {
          current_price: { usd: 25 }
        }
      };

      mockDeFiLlamaClient.getProtocol.mockResolvedValue(mockDeFiProtocol);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([]);

      const result = await client.getProtocolData(protocolId);

      expect(result!.name).toBe('DeFi Name'); // Prefers DeFiLlama
      expect(result!.symbol).toBe('DEFI'); // Prefers DeFiLlama
      expect(result!.tvl).toBe(1000000000); // From DeFiLlama
      expect(result!.price).toBe(25); // From CoinGecko
    });

    it('should combine contract addresses from both sources', async () => {
      const protocolId = 'test';
      
      const mockDeFiProtocol = {
        id: '1',
        name: 'Test Protocol',
        address: '0xdefi',
        chain: 'ethereum',
        tvl: 1000000000,
        category: 'dexes',
        chains: ['ethereum'],
        slug: 'test-protocol'
      };

      const mockCoinDetails = {
        id: 'test',
        name: 'Test Protocol',
        platforms: {
          'binance-smart-chain': '0xbsc',
          'polygon-pos': '0xpoly'
        }
      };

      mockDeFiLlamaClient.getProtocol.mockResolvedValue(mockDeFiProtocol);
      mockDeFiLlamaClient.getProtocolYields.mockResolvedValue([]);
      mockCoinGeckoClient.getCoinDetails.mockResolvedValue(mockCoinDetails);
      mockCoinGeckoClient.getCoinsMarkets.mockResolvedValue([]);

      const result = await client.getProtocolData(protocolId);

      expect(result!.contractAddresses).toEqual({
        'ethereum': '0xdefi',
        'binance-smart-chain': '0xbsc',
        'polygon-pos': '0xpoly'
      });
    });
  });
});
