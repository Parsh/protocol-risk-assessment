import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { validate, commonSchemas } from '../middleware/validation';
import { config } from '../config/environment';
import { logger } from '../middleware/logging';
import { fileStorageTest } from '../tests/file-storage.test';
import Joi from 'joi';

const router = Router();

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    usage: string;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
  };
  services?: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      lastCheck: string;
    };
  };
}

/**
 * GET /api/v1/status
 * Health check endpoint that returns system status and basic metrics
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const healthResponse: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    uptime: Math.floor(uptime),
    memory: {
      used: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
      usage: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
  };

  // Log health check request
  logger.info('Health check requested', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    status: healthResponse.status,
  });

  res.status(200).json(healthResponse);
}));

/**
 * GET /api/v1/health
 * Simple health check endpoint for load balancers
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /api/v1/ping
 * Minimal ping endpoint
 */
router.get('/ping', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong' });
}));

/**
 * POST /api/v1/test-validation
 * Test endpoint to demonstrate validation middleware
 */
router.post('/test-validation', 
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(50).required(),
      email: Joi.string().email().required(),
      score: commonSchemas.riskScore.optional(),
      addresses: Joi.array().items(commonSchemas.ethereumAddress).min(1).max(5).required(),
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ 
      message: 'Validation passed!',
      data: req.body,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/v1/test-storage
 * Test endpoint to verify file storage operations
 */
router.post('/test-storage', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  let testsStarted = false;
  
  try {
    logger.info('Running file storage tests...');
    testsStarted = true;
    
    // Run all file storage tests
    await fileStorageTest.runAllTests();
    
    const duration = Date.now() - startTime;
    
    const result = {
      success: true,
      message: 'All file storage tests passed successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      tests: [
        'Data directory initialization',
        'Protocol repository operations',
        'Assessment repository operations', 
        'Concurrent file operations',
        'Error handling',
      ],
    };
    
    // Clean up test data after successful tests
    await fileStorageTest.cleanup();
    
    res.status(200).json(result);
    
  } catch (error) {
    logger.error('File storage tests failed:', error);
    
    const duration = Date.now() - startTime;
    
    // Only clean up if tests actually started (to avoid cleaning up partial test data)
    if (testsStarted) {
      try {
        await fileStorageTest.cleanup();
      } catch (cleanupError) {
        logger.warn('Test cleanup failed:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'File storage tests failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/v1/test-concurrent
 * Test endpoint to verify concurrent file operations only
 */
router.post('/test-concurrent', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    logger.info('Running concurrent operations test...');
    
    // Run only concurrent operations test
    await fileStorageTest.testConcurrentOnly();
    
    const duration = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      message: 'Concurrent operations test passed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Concurrent operations test failed:', error);
    
    const duration = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Concurrent operations test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  }
}));

export { router as healthRouter };
