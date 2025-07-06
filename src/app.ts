import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/environment';
import { logger } from './config/logger';
import { requestLogger } from './middleware/logging';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { 
  requestLoggingMiddleware, 
  securityLoggingMiddleware, 
  errorLoggingMiddleware,
  setupProcessEventLogging 
} from './middleware/monitoring';
import { setupSwagger } from './config/swagger';
import { healthRouter } from './routes/health';
import protocolRouter from './routes/protocols';
import assessmentRouter from './routes/assessments';

// Setup process event logging for production
setupProcessEventLogging();

export function createApp(): express.Application {
  const app = express();

  // Log application startup
  logger.logStartup(config);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Production monitoring middleware
  if (config.nodeEnv === 'production') {
    app.use(requestLoggingMiddleware);
    app.use(securityLoggingMiddleware);
  }

  // Request logging
  app.use(requestLogger);

  // Setup Swagger API documentation
  setupSwagger(app);

  // API routes
  app.use('/api/v1', healthRouter);
  console.log('🔌 Health routes mounted at /api/v1');
  
  console.log('🔍 Protocol router type:', typeof protocolRouter);
  console.log('🔍 Protocol router stack length:', protocolRouter?.stack?.length || 'unknown');
  app.use('/api/v1/protocols', protocolRouter);
  console.log('🔌 Protocol routes mounted at /api/v1/protocols');

  app.use('/api/v1/assessments', assessmentRouter);
  console.log('🔌 Assessment routes mounted at /api/v1/assessments');

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  if (config.nodeEnv === 'production') {
    app.use(errorLoggingMiddleware);
  }
  app.use(errorHandler);

  return app;
}
