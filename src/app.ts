import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/environment';
import { requestLogger } from './middleware/logging';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { healthRouter } from './routes/health';
import protocolRouter from './routes/protocols';
import assessmentRouter from './routes/assessments';

export function createApp(): express.Application {
  const app = express();

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

  // Request logging
  app.use(requestLogger);

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
  app.use(errorHandler);

  return app;
}
