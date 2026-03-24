/**
 * Team management API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { TeamStore } from '../data/team-store';
import { ConflictError, NotFoundError, ValidationError } from '../common/errors';

/**
 * Create team routes
 */
export function createTeamRoutes(teamStore: TeamStore): Router {
  const router = Router();

  // List all teams
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await teamStore.getAll();

      if (!result.success) {
        throw result.error;
      }

      res.json({ teams: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Create a new team
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('Validation failed', ['Team name is required']);
      }

      const result = await teamStore.create(name.trim());

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ team: result.value });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({ error: 'Conflict', message: error.message });
        return;
      }
      next(error);
    }
  });

  // Get team detail by ID
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await teamStore.getById(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.json({ team: result.value });
    } catch (error) {
      next(error);
    }
  });

  // Delete a team
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await teamStore.delete(req.params.id);

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Add a member to a team
  router.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('Validation failed', ['Member name is required']);
      }

      const result = await teamStore.addMember(req.params.id, name.trim(), email);

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ member: result.value });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }
      next(error);
    }
  });

  // Remove a member from a team
  router.delete('/:id/members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await teamStore.removeMember(req.params.id, req.params.memberId);

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
