import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { validate, commonSchemas } from '../middleware/validation';
import { config } from '../config/environment';
import { logger } from '../middleware/logging';
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
 * @swagger
 * /api/v1/status:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check endpoint
 *     description: Returns system health status, uptime, memory usage, and service availability
 *     responses:
 *       200:
 *         description: System health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             example:
 *               status: healthy
 *               timestamp: '2025-07-06T17:00:00.000Z'
 *               version: '1.0.0'
 *               uptime: 3600
 *               environment: production
 *               memory:
 *                 used: 128
 *                 total: 512
 *                 usage: '25.0%'
 *               system:
 *                 platform: darwin
 *                 arch: arm64
 *                 nodeVersion: v20.0.0
 *               services:
 *                 database:
 *                   status: healthy
 *                   responseTime: 15
 *                   lastCheck: '2025-07-06T17:00:00.000Z'
 *                 slither:
 *                   status: healthy
 *                   responseTime: 125
 *                   lastCheck: '2025-07-06T17:00:00.000Z'
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

export { router as healthRouter };
