/**
 * Production monitoring middleware
 * Logs requests and integrates with the production logger
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

/**
 * Request logging middleware for production monitoring
 */
export const requestLoggingMiddleware = (
  req: RequestWithStartTime,
  res: Response,
  next: NextFunction
) => {
  req.startTime = Date.now();

  // Log the incoming request
  logger.info('Incoming Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    type: 'request_start'
  });

  // Override res.end to log when response is sent
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Log the completed request
    logger.logRequest(
      req.method,
      req.url,
      res.statusCode,
      responseTime,
      req.get('User-Agent')
    );

    // Log error responses with more detail
    if (res.statusCode >= 400) {
      logger.warn('HTTP Error Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'error_response'
      });
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Security event logging middleware
 */
export const securityLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log potential security events
  const suspiciousPatterns = [
    /\.\./g,  // Directory traversal
    /<script/gi,  // XSS attempts
    /union\s+select/gi,  // SQL injection
    /eval\s*\(/gi,  // Code injection
  ];

  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(requestData)) {
      logger.logSecurityEvent('Suspicious Request Pattern', {
        pattern: pattern.toString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    }
  });

  next();
};

/**
 * Error logging middleware (should be last)
 */
export const errorLoggingMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error with context
  logger.error('Unhandled Error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query
    },
    type: 'unhandled_error'
  });

  // Send error response
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }

  next(error);
};

/**
 * Process event logging for production monitoring
 */
export const setupProcessEventLogging = () => {
  // Log uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      type: 'uncaught_exception'
    });
    
    // Give logger time to write, then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Log unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack,
        name: reason.name
      } : reason,
      promise: promise.toString(),
      type: 'unhandled_rejection'
    });
  });

  // Log graceful shutdown
  process.on('SIGTERM', () => {
    logger.logShutdown('SIGTERM received');
  });

  process.on('SIGINT', () => {
    logger.logShutdown('SIGINT received');
  });
};
