import { DeFiLlamaClient, ProtocolInfo, ProtocolYield } from '../../src/services/defillama-client';
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

describe('DeFiLlamaClient', () => {
  let client: DeFiLlamaClient;
  let mockMakeRequest: jest.SpyInstance;

  beforeEach(() => {
    client = new DeFiLlamaClient();
    mockMakeRequest = jest.spyOn(client as any, 'makeRequest');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const client = new DeFiLlamaClient();
      expect(client).toBeInstanceOf(DeFiLlamaClient);
      expect(logger.info).toHaveBeenCalledWith('DeFiLlama client initialized', expect.any(Object));
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        timeout: 60000,
        rateLimit: {
          requestsPerMinute: 500,
          burstLimit: 20
        }
      };
      
      const client = new DeFiLlamaClient(customConfig);
      expect(client).toBeInstanceOf(DeFiLlamaClient);
    });

    it('should accept custom cache directory', () => {
      const client = new DeFiLlamaClient({}, './custom/cache');
      expect(client).toBeInstanceOf(DeFiLlamaClient);
    });
  });

  describe('getAllProtocols', () => {
    it('should fetch all protocols successfully', async () => {
      const mockProtocols: ProtocolInfo[] = [
        {
          id: '1',
          name: 'Uniswap',
          address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
          symbol: 'UNI',
          url: 'https://uniswap.org',
          description: 'Decentralized exchange',
          chain: 'ethereum',
          logo: 'https://example.com/logo.png',
          audits: '2',
          audit_note: 'Audited by OpenZeppelin',
          gecko_id: 'uniswap',
          cmcId: '7083',
          category: 'dexes',
          chains: ['ethereum'],
          module: 'uniswap',
          twitter: 'Uniswap',
          forkedFrom: [],
          oracles: ['chainlink'],
          listedAt: 1598306400,
          methodology: 'Token counting',
          slug: 'uniswap',
          tvl: 1000000000,
          chainTvls: { ethereum: 1000000000 },
          change_1h: 1.5,
          change_1d: 2.3,
          change_7d: -0.8,
          tokenBreakdowns: { ETH: 500000000, USDC: 500000000 },
          mcap: 5000000000
        }
      ];

      mockMakeRequest.mockResolvedValue({ data: mockProtocols });

      const result = await client.getAllProtocols();

      expect(result).toEqual(mockProtocols);
      expect(mockMakeRequest).toHaveBeenCalledWith('/protocols', { method: 'GET' }, expect.any(String));
      expect(logger.debug).toHaveBeenCalledWith('Fetching all protocols from DeFiLlama');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched protocols from DeFiLlama', { 
        protocolCount: 1 
      });
    });

    it('should handle errors when fetching protocols', async () => {
      const error = new Error('Network error');
      mockMakeRequest.mockRejectedValue(error);

      await expect(client.getAllProtocols()).rejects.toThrow('Failed to fetch protocols: Network error');
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch protocols from DeFiLlama', { error });
    });
  });

  describe('getProtocol', () => {
    it('should fetch protocol details successfully', async () => {
      const protocolSlug = 'uniswap';
      const mockProtocol: ProtocolInfo = {
        id: '1',
        name: 'Uniswap',
        address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
        symbol: 'UNI',
        url: 'https://uniswap.org',
        description: 'Decentralized exchange',
        chain: 'ethereum',
        logo: 'https://example.com/logo.png',
        audits: '2',
        audit_note: 'Audited by OpenZeppelin',
        gecko_id: 'uniswap',
        cmcId: '7083',
        category: 'dexes',
        chains: ['ethereum'],
        module: 'uniswap',
        twitter: 'Uniswap',
        forkedFrom: [],
        oracles: ['chainlink'],
        listedAt: 1598306400,
        methodology: 'Token counting',
        slug: 'uniswap',
        tvl: 1000000000,
        chainTvls: { ethereum: 1000000000 },
        change_1h: 1.5,
        change_1d: 2.3,
        change_7d: -0.8,
        tokenBreakdowns: { ETH: 500000000, USDC: 500000000 },
        mcap: 5000000000
      };

      mockMakeRequest.mockResolvedValue({ data: mockProtocol });

      const result = await client.getProtocol(protocolSlug);

      expect(result).toEqual(mockProtocol);
      expect(mockMakeRequest).toHaveBeenCalledWith(`/protocol/${protocolSlug}`, { method: 'GET' }, expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched protocol details from DeFiLlama', {
        protocolSlug,
        name: mockProtocol.name,
        tvl: mockProtocol.tvl
      });
    });

    it('should handle URL encoding for protocol slug', async () => {
      const protocolSlug = 'protocol with spaces';
      const mockProtocol = { id: '1', name: 'Test Protocol' } as ProtocolInfo;

      mockMakeRequest.mockResolvedValue({ data: mockProtocol });

      await client.getProtocol(protocolSlug);

      expect(mockMakeRequest).toHaveBeenCalledWith('/protocol/protocol%20with%20spaces', { method: 'GET' }, expect.any(String));
    });
  });

  describe('getCurrentTvl', () => {
    it('should fetch current TVL successfully', async () => {
      const mockTvlData = { totalTvl: 50000000000, protocols: 1500 };

      mockMakeRequest.mockResolvedValue({ data: mockTvlData });

      const result = await client.getCurrentTvl();

      expect(result).toEqual(mockTvlData);
      expect(mockMakeRequest).toHaveBeenCalledWith('/tvl', { method: 'GET' }, expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched current TVL from DeFiLlama', {
        totalTvl: mockTvlData.totalTvl,
        protocols: mockTvlData.protocols
      });
    });
  });

  describe('getYieldPools', () => {
    it('should fetch yield pools successfully', async () => {
      const mockYieldsResponse = {
        status: 'success',
        data: [
          {
            pool: 'pool1',
            project: 'uniswap',
            symbol: 'UNI-ETH',
            tvlUsd: 1000000,
            apy: 12.5,
            apyBase: 10.0,
            apyReward: 2.5,
            il7d: 0.1,
            apyBase7d: 9.8,
            apyMean30d: 11.2,
            volumeUsd1d: 500000,
            volumeUsd7d: 3500000,
            outlier: false,
            impliedIl: 0.05,
            poolMeta: 'V3 pool',
            underlyingTokens: ['ETH', 'USDC'],
            rewardTokens: ['UNI'],
            count: 100,
            countSingleExposure: 50,
            exposure: 'multi',
            category: 'dexes',
            stablecoin: false
          }
        ] as ProtocolYield[]
      };

      mockMakeRequest.mockResolvedValue({ data: mockYieldsResponse });

      const result = await client.getYieldPools();

      expect(result).toEqual(mockYieldsResponse.data);
      expect(mockMakeRequest).toHaveBeenCalledWith('/yields', { method: 'GET' }, expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched yield pools from DeFiLlama', {
        poolCount: 1
      });
    });

    it('should handle API error status', async () => {
      const mockErrorResponse = {
        status: 'error',
        data: []
      };

      mockMakeRequest.mockResolvedValue({ data: mockErrorResponse });

      await expect(client.getYieldPools()).rejects.toThrow('API returned status: error');
    });
  });

  describe('getProtocolYields', () => {
    it('should filter yields for specific protocol', async () => {
      const protocolSlug = 'uniswap';
      const mockAllYields = [
        {
          pool: 'pool1',
          project: 'uniswap',
          symbol: 'UNI-ETH',
          tvlUsd: 1000000,
          apy: 12.5
        },
        {
          pool: 'pool2', 
          project: 'compound',
          symbol: 'cUSDC',
          tvlUsd: 2000000,
          apy: 8.0
        },
        {
          pool: 'pool3',
          project: 'uniswap',
          symbol: 'UNI-USDC',
          tvlUsd: 1500000,
          apy: 15.0
        }
      ] as ProtocolYield[];

      const mockYieldsResponse = {
        status: 'success',
        data: mockAllYields
      };

      mockMakeRequest.mockResolvedValue({ data: mockYieldsResponse });

      const result = await client.getProtocolYields(protocolSlug);

      expect(result).toHaveLength(2);
      expect(result.every(pool => pool.project.toLowerCase() === protocolSlug.toLowerCase())).toBe(true);
    });

    it('should handle case-insensitive protocol matching', async () => {
      const protocolSlug = 'UNISWAP';
      const mockAllYields = [
        {
          pool: 'pool1',
          project: 'uniswap',
          symbol: 'UNI-ETH',
          tvlUsd: 1000000,
          apy: 12.5
        }
      ] as ProtocolYield[];

      const mockYieldsResponse = {
        status: 'success',
        data: mockAllYields
      };

      mockMakeRequest.mockResolvedValue({ data: mockYieldsResponse });

      const result = await client.getProtocolYields(protocolSlug);

      expect(result).toHaveLength(1);
      expect(result[0]!.project).toBe('uniswap');
    });
  });

  describe('searchProtocols', () => {
    it('should search protocols by name', async () => {
      const query = 'uni';
      const mockProtocols: ProtocolInfo[] = [
        {
          id: '1',
          name: 'Uniswap',
          slug: 'uniswap',
          symbol: 'UNI'
        } as ProtocolInfo,
        {
          id: '2', 
          name: 'Compound',
          slug: 'compound',
          symbol: 'COMP'
        } as ProtocolInfo,
        {
          id: '3',
          name: 'Unicorn Protocol',
          slug: 'unicorn',
          symbol: 'UNI'
        } as ProtocolInfo
      ];

      mockMakeRequest.mockResolvedValue({ data: mockProtocols });

      const result = await client.searchProtocols(query);

      expect(result).toHaveLength(2); // Uniswap and Unicorn Protocol
      expect(result.every(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.symbol.toLowerCase().includes(query.toLowerCase()) ||
        p.slug.toLowerCase().includes(query.toLowerCase())
      )).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const query = 'nonexistent';
      const mockProtocols: ProtocolInfo[] = [
        {
          id: '1',
          name: 'Uniswap',
          slug: 'uniswap', 
          symbol: 'UNI'
        } as ProtocolInfo
      ];

      mockMakeRequest.mockResolvedValue({ data: mockProtocols });

      const result = await client.searchProtocols(query);

      expect(result).toHaveLength(0);
    });
  });

  describe('getProtocolByAddress', () => {
    it('should find protocol by contract address', async () => {
      const contractAddress = '0x1f98431c8ad98523631ae4a59f267346ea31f984';
      const mockProtocols: ProtocolInfo[] = [
        {
          id: '1',
          name: 'Uniswap',
          address: contractAddress,
          symbol: 'UNI'
        } as ProtocolInfo,
        {
          id: '2',
          name: 'Compound', 
          address: '0xother',
          symbol: 'COMP'
        } as ProtocolInfo
      ];

      mockMakeRequest.mockResolvedValue({ data: mockProtocols });

      const result = await client.getProtocolByAddress(contractAddress);

      expect(result).not.toBeNull();
      expect(result!.address).toBe(contractAddress);
      expect(result!.name).toBe('Uniswap');
    });

    it('should handle case-insensitive address matching', async () => {
      const contractAddress = '0x1F98431C8AD98523631AE4A59F267346EA31F984';
      const mockProtocols: ProtocolInfo[] = [
        {
          id: '1',
          name: 'Uniswap',
          address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
          symbol: 'UNI'
        } as ProtocolInfo
      ];

      mockMakeRequest.mockResolvedValue({ data: mockProtocols });

      const result = await client.getProtocolByAddress(contractAddress);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Uniswap');
    });

    it('should return null for non-existent address', async () => {
      const contractAddress = '0xnonexistent';
      const mockProtocols: ProtocolInfo[] = [
        {
          id: '1',
          name: 'Uniswap',
          address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
          symbol: 'UNI'
        } as ProtocolInfo
      ];

      mockMakeRequest.mockResolvedValue({ data: mockProtocols });

      const result = await client.getProtocolByAddress(contractAddress);

      expect(result).toBeNull();
    });
  });

  describe('getProtocolCategories', () => {
    it('should fetch protocol categories successfully', async () => {
      const mockCategories = {
        'dexes': 15000000000,
        'lending': 8000000000,
        'yield': 3000000000
      };

      mockMakeRequest.mockResolvedValue({ data: mockCategories });

      const result = await client.getProtocolCategories();

      expect(result).toEqual(mockCategories);
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe('getChainTvl', () => {
    it('should fetch chain TVL successfully', async () => {
      const mockChainTvl = {
        'ethereum': 25000000000,
        'bsc': 8000000000,
        'polygon': 3000000000
      };

      mockMakeRequest.mockResolvedValue({ data: mockChainTvl });

      const result = await client.getChainTvl();

      expect(result).toEqual(mockChainTvl);
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      const mockTvlData = { totalTvl: 50000000000, protocols: 1500 };
      mockMakeRequest.mockResolvedValue({ data: mockTvlData });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('DeFiLlama API health check passed');
    });

    it('should return false when API is unhealthy', async () => {
      const originalError = new Error('API unavailable');
      mockMakeRequest.mockRejectedValue(originalError);

      const result = await client.healthCheck();

      expect(result).toBe(false);
      const wrappedError = new Error('Failed to fetch current TVL: API unavailable');
      expect(logger.error).toHaveBeenCalledWith('DeFiLlama API health check failed', { error: wrappedError });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockMakeRequest.mockRejectedValue(networkError);

      await expect(client.getAllProtocols()).rejects.toThrow('Failed to fetch protocols: ECONNREFUSED');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockMakeRequest.mockRejectedValue(timeoutError);

      await expect(client.getProtocol('test')).rejects.toThrow('Failed to fetch protocol test: Request timeout');
    });

    it('should handle unknown errors', async () => {
      const unknownError = 'String error';
      mockMakeRequest.mockRejectedValue(unknownError);

      await expect(client.getCurrentTvl()).rejects.toThrow('Failed to fetch current TVL: Unknown error');
    });
  });
});
