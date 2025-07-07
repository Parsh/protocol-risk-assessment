/**
 * Production Environment Configuration
 * Centralized configuration management with validation
 */

import { config } from 'dotenv';
import Joi from 'joi';
import { logger } from './logger';

// Load environment variables
config();

// Configuration schema for validation
const configSchema = Joi.object({
  // Application settings
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  API_PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  
  // API Rate limiting
  API_RATE_LIMIT: Joi.number().positive().default(100),
  API_RATE_WINDOW: Joi.number().positive().default(900000), // 15 minutes
  
  // External API keys (optional)
  ETHERSCAN_API_KEY: Joi.string().optional(),
  COINGECKO_API_KEY: Joi.string().optional(),
  
  // Analysis configuration
  SLITHER_TIMEOUT: Joi.number().positive().default(300000), // 5 minutes
  PARALLEL_ANALYSIS: Joi.boolean().default(true),
  CACHE_TTL: Joi.number().positive().default(3600000), // 1 hour
  
  // Risk scoring weights (must sum to 1.0)
  TECHNICAL_WEIGHT: Joi.number().min(0).max(1).default(0.4),
  GOVERNANCE_WEIGHT: Joi.number().min(0).max(1).default(0.25),
  LIQUIDITY_WEIGHT: Joi.number().min(0).max(1).default(0.2),
  REPUTATION_WEIGHT: Joi.number().min(0).max(1).default(0.15),
  
  // Security
  ADMIN_API_KEY: Joi.string().optional(),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:3001'),
  
  // Data storage
  DATA_DIR: Joi.string().default('./data'),
  BACKUP_ENABLED: Joi.boolean().default(true),
  BACKUP_INTERVAL: Joi.string().default('24h'),
  BACKUP_RETENTION: Joi.string().default('7d'),
  
  // Advanced configuration
  CIRCUIT_BREAKER_THRESHOLD: Joi.number().positive().default(5),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().positive().default(60000),
  FILE_OPERATION_TIMEOUT: Joi.number().positive().default(10000),
  FILE_LOCK_TIMEOUT: Joi.number().positive().default(5000),
  MAX_HEAP_SIZE: Joi.string().default('512m'),
  GC_INTERVAL: Joi.number().positive().default(300000)
}).unknown(true); // Allow unknown environment variables

// Validate configuration
const { error, value: envVars } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

// Validate that risk scoring weights sum to 1.0
const totalWeight = envVars.TECHNICAL_WEIGHT + envVars.GOVERNANCE_WEIGHT + 
                   envVars.LIQUIDITY_WEIGHT + envVars.REPUTATION_WEIGHT;

if (Math.abs(totalWeight - 1.0) > 0.001) {
  throw new Error(`Risk scoring weights must sum to 1.0, got ${totalWeight}`);
}

// Production configuration object
export const productionConfig = {
  // Application
  nodeEnv: envVars.NODE_ENV,
  port: envVars.API_PORT,
  logLevel: envVars.LOG_LEVEL,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  
  // API Configuration
  api: {
    rateLimit: {
      max: envVars.API_RATE_LIMIT,
      windowMs: envVars.API_RATE_WINDOW
    },
    cors: {
      origins: envVars.CORS_ORIGINS.split(',').map((origin: string) => origin.trim())
    }
  },
  
  // External API keys
  apiKeys: {
    etherscan: envVars.ETHERSCAN_API_KEY || null,
    coingecko: envVars.COINGECKO_API_KEY || null,
    admin: envVars.ADMIN_API_KEY || null
  },
  
  // Analysis settings
  analysis: {
    slitherTimeout: envVars.SLITHER_TIMEOUT,
    parallelExecution: envVars.PARALLEL_ANALYSIS,
    cacheTtl: envVars.CACHE_TTL
  },
  
  // Risk scoring configuration
  riskScoring: {
    weights: {
      technical: envVars.TECHNICAL_WEIGHT,
      governance: envVars.GOVERNANCE_WEIGHT,
      liquidity: envVars.LIQUIDITY_WEIGHT,
      reputation: envVars.REPUTATION_WEIGHT
    },
    thresholds: {
      critical: 80,
      high: 60,
      medium: 30,
      low: 0
    }
  },
  
  // Data storage
  storage: {
    dataDir: envVars.DATA_DIR,
    backup: {
      enabled: envVars.BACKUP_ENABLED,
      interval: envVars.BACKUP_INTERVAL,
      retention: envVars.BACKUP_RETENTION
    }
  },
  
  // Advanced settings
  advanced: {
    circuitBreaker: {
      threshold: envVars.CIRCUIT_BREAKER_THRESHOLD,
      timeout: envVars.CIRCUIT_BREAKER_TIMEOUT
    },
    fileOperations: {
      timeout: envVars.FILE_OPERATION_TIMEOUT,
      lockTimeout: envVars.FILE_LOCK_TIMEOUT
    },
    memory: {
      maxHeapSize: envVars.MAX_HEAP_SIZE,
      gcInterval: envVars.GC_INTERVAL
    }
  }
};

// Configuration validation for production
if (productionConfig.isProduction) {
  // Log production configuration validation
  logger.logSystemEvent('Production Configuration Validation', {
    nodeEnv: productionConfig.nodeEnv,
    logLevel: productionConfig.logLevel,
    port: productionConfig.port,
    dataDir: productionConfig.storage.dataDir
  });
  
  // Validate required production settings
  const productionRequirements = {
    'LOG_LEVEL should be info or error in production': 
      ['info', 'error'].includes(productionConfig.logLevel),
    'Rate limiting should be enabled in production': 
      productionConfig.api.rateLimit.max > 0,
    'Data directory should be absolute path in production': 
      productionConfig.storage.dataDir.startsWith('/') || process.platform === 'win32'
  };
  
  const violations = Object.entries(productionRequirements)
    .filter(([_, valid]) => !valid)
    .map(([requirement]) => requirement);
  
  if (violations.length > 0) {
    logger.warn('Production configuration warnings:', { violations });
    violations.forEach(violation => logger.warn(`  - ${violation}`));
  } else {
    logger.info('Production configuration validation passed');
  }
}

// Export configuration
export default productionConfig;

// Export specific config sections for convenience
export const {
  nodeEnv,
  port,
  logLevel,
  isProduction,
  isDevelopment,
  isTest,
  api: apiConfig,
  apiKeys,
  analysis: analysisConfig,
  riskScoring: riskScoringConfig,
  storage: storageConfig,
  advanced: advancedConfig
} = productionConfig;
