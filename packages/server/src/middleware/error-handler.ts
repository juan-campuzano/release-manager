/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ApplicationError, ValidationError, NotFoundError, ConflictError } from '../common/errors';
import { logger } from '../common/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Request error', error, {
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Handle specific error types
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      errors: error.errors
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      error: 'Not Found',
      message: error.message
    });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json({
      error: 'Conflict',
      message: error.message
    });
    return;
  }

  if (error instanceof ApplicationError) {
    res.status(500).json({
      error: 'Application Error',
      message: error.message
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message
  });
}
