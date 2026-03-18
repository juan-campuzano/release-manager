/**
 * Release management API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Services } from '../services';
import { ReleaseConfiguration, ReleaseStage, ReleaseStatus, Platform, EventType } from '../domain/types';
import { NotFoundError, IntegrationError } from '../common/errors';

/**
 * Create release routes
 */
export function createReleaseRoutes(services: Services): Router {
  const router = Router();
  const { releaseManager } = services;

  // Get all active releases
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const platform = req.query.platform as Platform | undefined;
      const result = await releaseManager.getActiveReleases(platform);

      if (!result.success) {
        throw result.error;
      }

      res.json({ releases: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get release history (must be before /:id to avoid matching "history" as an ID)
  router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        platform: req.query.platform as Platform | undefined,
        status: req.query.status as ReleaseStatus | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const result = await releaseManager.getReleaseHistory(filters);

      if (!result.success) {
        throw result.error;
      }

      res.json({ releases: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get events for a release
  router.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Verify release exists
      const releaseResult = await releaseManager.getRelease(id);
      if (!releaseResult.success) {
        throw new NotFoundError(`Release ${id} not found`);
      }

      // Parse query parameters
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const types = req.query.types
        ? (req.query.types as string).split(',').map(t => t.trim()) as EventType[]
        : undefined;

      const events = services.eventStore.getEventsByReleaseId(id, { limit, offset, types });

      res.json({ events });
    } catch (error) {
      next(error);
    }
  });

  // Get pipeline executions for a release
  router.get('/:id/pipeline-executions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!services.pipelineFetcher) {
        res.json({ executions: [] });
        return;
      }

      const result = await services.pipelineFetcher.getExecutions(id);

      if (!result.success) {
        if (result.error instanceof IntegrationError) {
          res.status(502).json({
            error: 'Integration Error',
            message: result.error.message
          });
          return;
        }
        throw result.error;
      }

      res.json({ executions: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get tag detection status for a release
  router.get('/:id/tag-status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tagStatus = await services.tagWatcher.getTagStatus(id);
      res.json({ tagStatus });
    } catch (error) {
      next(error);
    }
  });

  // Get a specific release
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.getRelease(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Create a new release
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config: ReleaseConfiguration = req.body;
      const result = await releaseManager.createRelease(config);

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update release stage
  router.patch('/:id/stage', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stage } = req.body;
      const result = await releaseManager.updateReleaseStage(req.params.id, stage as ReleaseStage);

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update release status
  router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const result = await releaseManager.updateReleaseStatus(req.params.id, status as ReleaseStatus);

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update build information
  router.patch('/:id/builds', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { latestBuild, latestPassingBuild, latestAppStoreBuild } = req.body;
      const result = await releaseManager.updateBuildInfo(req.params.id, {
        latestBuild,
        latestPassingBuild,
        latestAppStoreBuild
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Add a blocker
  router.post('/:id/blockers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.addBlocker(req.params.id, req.body);

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Resolve a blocker
  router.patch('/:id/blockers/:blockerId/resolve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.resolveBlocker(req.params.id, req.params.blockerId);

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get blockers
  router.get('/:id/blockers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.getBlockers(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ blockers: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Record squad sign-off
  router.post('/:id/signoffs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { squad, approvedBy, comments } = req.body;
      const result = await releaseManager.recordSignOff(req.params.id, squad, approvedBy, comments);

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get sign-off status
  router.get('/:id/signoffs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.getSignOffStatus(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ signOffStatus: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update rollout percentage
  router.patch('/:id/rollout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { percentage } = req.body;
      const result = await releaseManager.updateRolloutPercentage(req.params.id, percentage);

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Add distribution channel
  router.post('/:id/distributions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { channel, status } = req.body;
      const result = await releaseManager.addDistributionChannel(req.params.id, channel, status);

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update distribution status
  router.patch('/:id/distributions/:channel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const result = await releaseManager.updateDistributionStatus(
        req.params.id,
        req.params.channel,
        status
      );

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get distributions
  router.get('/:id/distributions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.getDistributions(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ distributions: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update ITGC status
  router.patch('/:id/itgc', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { compliant, rolloutComplete, details } = req.body;
      const result = await releaseManager.updateITGCStatus(
        req.params.id,
        compliant,
        rolloutComplete,
        details
      );

      if (!result.success) {
        throw result.error;
      }

      res.json({ release: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get ITGC status
  router.get('/:id/itgc', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await releaseManager.getITGCStatus(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ itgcStatus: result.value });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
