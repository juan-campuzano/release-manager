/**
 * Repository configuration API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ConfigStore } from '../data/config-store';
import { ConfigParser } from '../application/config-parser';
import { ConflictError, ValidationError } from '../common/errors';

/**
 * Create config routes
 */
export function createConfigRoutes(configStore: ConfigStore, configParser: ConfigParser): Router {
  const router = Router();

  // Create a new repository configuration
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = configParser.validateRepositoryConfig(req.body);
      if (!validation.valid) {
        throw new ValidationError('Validation failed', validation.errors);
      }

      const result = await configStore.create(req.body);

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ config: result.value });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({ error: 'Conflict', message: error.message });
        return;
      }
      next(error);
    }
  });

  // List all repository configurations
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await configStore.getAll();

      if (!result.success) {
        throw result.error;
      }

      res.json({ configs: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Get a repository configuration by ID
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await configStore.getById(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ config: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Update a repository configuration
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = configParser.validateRepositoryConfig(req.body);
      if (!validation.valid) {
        throw new ValidationError('Validation failed', validation.errors);
      }

      const result = await configStore.update(req.params.id, req.body);

      if (!result.success) {
        throw result.error;
      }

      res.json({ config: result.value });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({ error: 'Conflict', message: error.message });
        return;
      }
      next(error);
    }
  });

  // Delete a repository configuration
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await configStore.delete(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
