/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';

/**
 * Create health check routes
 */
export function createHealthRoutes(): Router {
  const router = Router();

  // Check if running in mock mode
  const useMockData = process.env.USE_MOCK_DATA === 'true';
  const mode = useMockData ? 'mock' : 'database';

  // Basic health check
  router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Detailed health check
  router.get('/detailed', (_req: Request, res: Response) => {
    const healthInfo: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      mode
    };

    // In database mode, we would include database connection status
    // In mock mode, we skip database checks entirely
    if (!useMockData) {
      // Database connection status would be checked here
      // For now, we just indicate that database checks would happen
      healthInfo.database = {
        status: 'connected' // This would be actual database health check
      };
    }

    res.json(healthInfo);
  });

  return router;
}
