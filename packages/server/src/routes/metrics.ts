/**
 * Metrics API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Services } from '../services';

/**
 * Create metrics routes
 */
export function createMetricsRoutes(services: Services): Router {
  const router = Router();
  const { metricsAggregator } = services;

  // Get quality metrics for a release
  router.get('/:releaseId/quality', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await metricsAggregator.collectQualityMetrics(req.params.releaseId);

      if (!result.success) {
        throw result.error;
      }

      res.json({ qualityMetrics: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get DAU statistics for a release
  router.get('/:releaseId/dau', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await metricsAggregator.collectDAUStatistics(req.params.releaseId);

      if (!result.success) {
        throw result.error;
      }

      res.json({ dauStats: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get rollout percentage for a release
  router.get('/:releaseId/rollout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await metricsAggregator.getRolloutPercentage(req.params.releaseId);

      if (!result.success) {
        throw result.error;
      }

      res.json({ rolloutPercentage: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get ITGC status for a release
  router.get('/:releaseId/itgc', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await metricsAggregator.getITGCStatus(req.params.releaseId);

      if (!result.success) {
        throw result.error;
      }

      res.json({ itgcStatus: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Evaluate quality metrics thresholds
  router.post('/evaluate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = metricsAggregator.evaluateThresholds(req.body);
      res.json({ evaluation });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
