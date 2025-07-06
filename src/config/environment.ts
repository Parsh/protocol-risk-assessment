interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  dataDir: string;
  logLevel: string;
  apiTimeout: number;
  // External API configurations
  etherscanApiKey?: string | undefined;
  coingeckoApiKey?: string | undefined;
  defillama: {
    baseUrl: string;
    timeout: number;
  };
}

const development: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: 'development',
  dataDir: process.env.DATA_DIR || './data',
  logLevel: 'debug',
  apiTimeout: 30000,
  etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  coingeckoApiKey: process.env.COINGECKO_API_KEY,
  defillama: {
    baseUrl: 'https://api.llama.fi',
    timeout: 10000,
  },
};

const production: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: 'production',
  dataDir: process.env.DATA_DIR || './data',
  logLevel: 'info',
  apiTimeout: 45000,
  etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  coingeckoApiKey: process.env.COINGECKO_API_KEY,
  defillama: {
    baseUrl: 'https://api.llama.fi',
    timeout: 15000,
  },
};

const test: EnvironmentConfig = {
  port: 0, // Random port for testing
  nodeEnv: 'test',
  dataDir: './test-data',
  logLevel: 'error',
  apiTimeout: 5000,
  defillama: {
    baseUrl: 'https://api.llama.fi',
    timeout: 5000,
  },
};

const getConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return production;
    case 'test':
      return test;
    case 'development':
    default:
      return development;
  }
};

export default getConfig;
export type { EnvironmentConfig };
