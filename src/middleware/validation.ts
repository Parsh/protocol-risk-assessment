import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error-handler';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

/**
 * Validation middleware factory function
 * @param schema - Joi validation schema for different request parts
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Body: ${detail.message}`));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Query: ${detail.message}`));
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Params: ${detail.message}`));
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error } = schema.headers.validate(req.headers, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Headers: ${detail.message}`));
      }
    }

    // If validation errors exist, throw ValidationError
    if (validationErrors.length > 0) {
      throw new ValidationError('Validation failed', {
        errors: validationErrors,
        path: req.path,
        method: req.method,
      });
    }

    next();
  };
};

/**
 * Simple validation middleware for request body only
 * @param schema - Joi validation schema for request body
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return validate({ body: schema });
};

// Common validation schemas
export const commonSchemas = {
  // Ethereum address validation
  ethereumAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Must be a valid Ethereum address (0x followed by 40 hex characters)',
    }),

  // Transaction hash validation
  transactionHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'Must be a valid transaction hash (0x followed by 64 hex characters)',
    }),

  // Block number validation
  blockNumber: Joi.alternatives()
    .try(
      Joi.number().integer().min(0),
      Joi.string().valid('latest', 'earliest', 'pending')
    )
    .messages({
      'alternatives.match': 'Must be a valid block number (integer >= 0) or "latest", "earliest", "pending"',
    }),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  },

  // Protocol identifier
  protocolId: Joi.string()
    .alphanum()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Protocol ID must contain only alphanumeric characters',
      'string.min': 'Protocol ID must be at least 1 character long',
      'string.max': 'Protocol ID must not exceed 50 characters',
    }),

  // Risk score
  riskScore: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .messages({
      'number.min': 'Risk score must be between 0 and 100',
      'number.max': 'Risk score must be between 0 and 100',
      'number.precision': 'Risk score must have at most 2 decimal places',
    }),
};
