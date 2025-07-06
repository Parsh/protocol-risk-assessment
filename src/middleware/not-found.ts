import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from './error-handler';

/**
 * Middleware to handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};
