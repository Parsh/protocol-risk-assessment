import { UnifiedBlockchainClient, createUnifiedBlockchainClient } from '../../src/services/unified-blockchain-client';
import { Blockchain } from '../../src/models';

// Mock all the blockchain clients
jest.mock('../../src/services/etherscan-client', () => ({
  createEtherscanClient: jest.fn(() => ({
    isValidAddress: jest.fn(() => true),
    getContractCode: jest.fn(() => Promise.resolve('0x123')),
    getBalance: jest.fn(() => Promise.resolve('1000000000000000000')),
    getContractSource: jest.fn(() => Promise.resolve({ SourceCode: 'contract MockContract {}' })),
    getContractCreation: jest.fn(() => Promise.resolve({ creator: '0x123', txHash: '0xabc' })),
    getMultipleBalances: jest.fn(() => Promise.resolve(['1000000000000000000', '2000000000000000000'])),
    getTransactionHistory: jest.fn(() => Promise.resolve([])),
    addApiKey: jest.fn(),
  }))
}));

jest.mock('../../src/services/bscscan-client', () => ({
  createBSCScanClient: jest.fn(() => ({
    isValidAddress: jest.fn(() => true),
    getContractCode: jest.fn(() => Promise.resolve('0x456')),
    getBalance: jest.fn(() => Promise.resolve('2000000000000000000')),
    getContractSource: jest.fn(() => Promise.resolve({ SourceCode: 'contract MockContract {}' })),
    getContractCreation: jest.fn(() => Promise.resolve({ creator: '0x456', txHash: '0xdef' })),
    getMultipleBalances: jest.fn(() => Promise.resolve(['2000000000000000000', '3000000000000000000'])),
    getTransactionHistory: jest.fn(() => Promise.resolve([])),
    addApiKey: jest.fn(),
  }))
}));

jest.mock('../../src/services/polygonscan-client', () => ({
  createPolygonscanClient: jest.fn(() => ({
    isValidAddress: jest.fn(() => true),
    getContractCode: jest.fn(() => Promise.resolve('0x789')),
    getBalance: jest.fn(() => Promise.resolve('3000000000000000000')),
    getContractSource: jest.fn(() => Promise.resolve({ SourceCode: 'contract MockContract {}' })),
    getContractCreation: jest.fn(() => Promise.resolve({ creator: '0x789', txHash: '0xghi' })),
    getMultipleBalances: jest.fn(() => Promise.resolve(['3000000000000000000', '4000000000000000000'])),
    getTransactionHistory: jest.fn(() => Promise.resolve([])),
    addApiKey: jest.fn(),
  }))
}));

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('UnifiedBlockchainClient', () => {
  let client: UnifiedBlockchainClient;

  beforeEach(() => {
    client = createUnifiedBlockchainClient({
      ethereum: {
        network: 'mainnet'
      },
      bsc: {
        network: 'mainnet'
      },
      polygon: {
        network: 'mainnet'
      }
    });
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with all blockchain clients', () => {
      const supportedChains = client.getSupportedChains();
      expect(supportedChains).toContain(Blockchain.ETHEREUM);
      expect(supportedChains).toContain(Blockchain.BSC);
      expect(supportedChains).toContain(Blockchain.POLYGON);
    });

    it('should initialize with only specific blockchain clients', () => {
      const ethOnlyClient = createUnifiedBlockchainClient({
        ethereum: {
          network: 'mainnet',
          apiKey: 'test-key'
        }
      });

      const supportedChains = ethOnlyClient.getSupportedChains();
      expect(supportedChains).toContain(Blockchain.ETHEREUM);
      expect(supportedChains).not.toContain(Blockchain.BSC);
      expect(supportedChains).not.toContain(Blockchain.POLYGON);
    });
  });

  describe('Client Selection', () => {
    it('should return correct client for each blockchain', () => {
      expect(() => client.getContractMetadata('0x1234567890123456789012345678901234567890', Blockchain.ETHEREUM)).not.toThrow();
      expect(() => client.getContractMetadata('0x1234567890123456789012345678901234567890', Blockchain.BSC)).not.toThrow();
      expect(() => client.getContractMetadata('0x1234567890123456789012345678901234567890', Blockchain.POLYGON)).not.toThrow();
    });

    it('should throw error for unsupported blockchain', async () => {
      const ethOnlyClient = createUnifiedBlockchainClient({
        ethereum: {
          network: 'mainnet'
        }
      });

      await expect(
        ethOnlyClient.getContractMetadata('0x1234567890123456789012345678901234567890', Blockchain.BSC)
      ).rejects.toThrow('BSC client not configured');
    });

    it('should throw error for completely unsupported blockchain', async () => {
      await expect(
        client.getContractMetadata('0x1234567890123456789012345678901234567890', 'unsupported' as any)
      ).rejects.toThrow('Unsupported blockchain: unsupported');
    });
  });

  describe('Contract Metadata', () => {
    beforeEach(() => {
      // Mock the underlying client methods
      const mockGetContractSource = jest.fn().mockResolvedValue({
        SourceCode: 'contract TestContract {}',
        ABI: '[]',
        ContractName: 'TestContract',
        CompilerVersion: 'v0.8.0'
      });
      const mockGetContractCreation = jest.fn().mockResolvedValue({
        contractCreator: '0xabcd1234567890123456789012345678901234abcd',
        txHash: '0x1234567890abcdef'
      });
      const mockGetBalance = jest.fn().mockResolvedValue('1000000000000000000');

      // Apply mocks to all clients
      (client as any).etherscanClient = {
        getContractSource: mockGetContractSource,
        getContractCreation: mockGetContractCreation,
        getBalance: mockGetBalance
      };
      (client as any).bscscanClient = {
        getContractSource: mockGetContractSource,
        getContractCreation: mockGetContractCreation,
        getBalance: mockGetBalance
      };
      (client as any).polygonscanClient = {
        getContractSource: mockGetContractSource,
        getContractCreation: mockGetContractCreation,
        getBalance: mockGetBalance
      };
    });

    it('should retrieve comprehensive contract metadata', async () => {
      const metadata = await client.getContractMetadata(
        '0x1234567890123456789012345678901234567890',
        Blockchain.ETHEREUM
      );

      expect(metadata).toMatchObject({
        address: '0x1234567890123456789012345678901234567890',
        blockchain: Blockchain.ETHEREUM,
        isVerified: true,
        sourceCode: 'contract TestContract {}',
        abi: '[]',
        contractName: 'TestContract',
        compilerVersion: 'v0.8.0',
        creationTxHash: '0x1234567890abcdef',
        creator: '0xabcd1234567890123456789012345678901234abcd',
        balance: '1000000000000000000'
      });
    });

    it('should handle contracts without source code', async () => {
      const mockGetContractSource = jest.fn().mockResolvedValue(null);
      (client as any).etherscanClient = {
        getContractSource: mockGetContractSource,
        getContractCreation: jest.fn().mockResolvedValue(null),
        getBalance: jest.fn().mockResolvedValue('0')
      };

      const metadata = await client.getContractMetadata(
        '0x1234567890123456789012345678901234567890',
        Blockchain.ETHEREUM
      );

      expect(metadata.isVerified).toBe(false);
      expect(metadata.sourceCode).toBeUndefined();
      expect(metadata.contractName).toBeUndefined();
    });
  });

  describe('Transaction Retrieval', () => {
    beforeEach(() => {
      const mockGetTransactions = jest.fn().mockResolvedValue([
        {
          hash: '0x123abc',
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          value: '1000000000000000000',
          timeStamp: '1640995200',
          blockNumber: '13916166',
          isError: '0'
        }
      ]);

      (client as any).etherscanClient = { getTransactions: mockGetTransactions };
      (client as any).bscscanClient = { getTransactions: mockGetTransactions };
      (client as any).polygonscanClient = { getTransactions: mockGetTransactions };
    });

    it('should retrieve recent transactions', async () => {
      const transactions = await client.getRecentTransactions(
        '0x1234567890123456789012345678901234567890',
        Blockchain.ETHEREUM,
        5
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        hash: '0x123abc',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '1000000000000000000',
        timestamp: 1640995200,
        blockNumber: 13916166,
        isError: false
      });
    });
  });

  describe('Contract Verification', () => {
    it('should check contract verification status', async () => {
      const mockIsContractVerified = jest.fn().mockResolvedValue(true);
      (client as any).etherscanClient = { isContractVerified: mockIsContractVerified };

      const isVerified = await client.isContractVerified(
        '0x1234567890123456789012345678901234567890',
        Blockchain.ETHEREUM
      );

      expect(isVerified).toBe(true);
      expect(mockIsContractVerified).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
    });

    it('should handle verification check errors gracefully', async () => {
      const mockIsContractVerified = jest.fn().mockRejectedValue(new Error('API Error'));
      (client as any).etherscanClient = { isContractVerified: mockIsContractVerified };

      const isVerified = await client.isContractVerified(
        '0x1234567890123456789012345678901234567890',
        Blockchain.ETHEREUM
      );

      expect(isVerified).toBe(false);
    });
  });

  describe('Multiple Balances', () => {
    it('should retrieve multiple balances', async () => {
      const mockGetMultipleBalances = jest.fn().mockResolvedValue({
        '0x1111111111111111111111111111111111111111': '1000000000000000000',
        '0x2222222222222222222222222222222222222222': '2000000000000000000'
      });
      (client as any).etherscanClient = { getMultipleBalances: mockGetMultipleBalances };

      const balances = await client.getMultipleBalances([
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      ], Blockchain.ETHEREUM);

      expect(balances).toEqual({
        '0x1111111111111111111111111111111111111111': '1000000000000000000',
        '0x2222222222222222222222222222222222222222': '2000000000000000000'
      });
    });
  });

  describe('Connection Testing', () => {
    it('should test all configured connections', async () => {
      const mockTestConnection = jest.fn().mockResolvedValue(true);
      (client as any).etherscanClient = { testConnection: mockTestConnection };
      (client as any).bscscanClient = { testConnection: mockTestConnection };
      (client as any).polygonscanClient = { testConnection: mockTestConnection };

      const results = await client.testAllConnections();

      expect(results).toEqual({
        ethereum: true,
        bsc: true,
        polygon: true
      });
    });

    it('should handle connection failures gracefully', async () => {
      const mockTestConnectionSuccess = jest.fn().mockResolvedValue(true);
      const mockTestConnectionFailure = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      (client as any).etherscanClient = { testConnection: mockTestConnectionSuccess };
      (client as any).bscscanClient = { testConnection: mockTestConnectionFailure };
      (client as any).polygonscanClient = { testConnection: mockTestConnectionSuccess };

      const results = await client.testAllConnections();

      expect(results).toEqual({
        ethereum: true,
        bsc: false,
        polygon: true
      });
    });
  });
});
