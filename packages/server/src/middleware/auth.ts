/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../common/logger';

/**
 * Simple API key authentication middleware
 * In production, this should be replaced with proper OAuth/JWT authentication
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.API_KEY;

  // Skip auth in development if no API key is configured
  if (!expectedApiKey) {
    logger.warn('No API_KEY configured, skipping authentication');
    next();
    return;
  }

  if (!apiKey) {
    logger.warn('Missing API key in request', { path: req.path });
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('Invalid API key', { path: req.path });
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
