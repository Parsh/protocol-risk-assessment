import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';
import { config } from '../config/environment';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path: string;
    details?: any;
    stack?: string;
  };
}

// Main error handler middleware
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Don't process if response was already sent
  if (res.headersSent) {
    return next(error);
  }

  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: any;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if ('statusCode' in error && error.statusCode) {
    statusCode = error.statusCode;
    code = (error as ApiError).code || 'API_ERROR';
    message = error.message;
    details = (error as ApiError).details;
  }

  // Log error details
  const errorLog = {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
  };

  if (statusCode >= 500) {
    logger.error('Server error occurred', errorLog);
  } else {
    logger.warn('Client error occurred', errorLog);
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  // Include details in non-production environments or for validation errors
  if (config.nodeEnv !== 'production' || statusCode === 400) {
    if (details) {
      errorResponse.error.details = details;
    }
    // Include stack trace in development
    if (config.nodeEnv === 'development' && error.stack) {
      errorResponse.error.stack = error.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
