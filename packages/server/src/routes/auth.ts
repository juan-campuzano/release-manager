/**
 * Authentication routes (mock implementation for development)
 */

import { Router, Request, Response } from 'express';

/**
 * Create authentication routes
 */
export function createAuthRoutes(): Router {
  const router = Router();

  /**
   * Mock login endpoint
   * In mock mode, accepts any credentials
   */
  router.post('/login', (req: Request, res: Response): void => {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      res.status(400).json({
        error: 'Username and password are required'
      });
      return;
    }

    // In mock mode, accept any credentials
    // In production, this would validate against a database
    const mockToken = Buffer.from(`${username}:${Date.now()}`).toString('base64');

    res.json({
      token: mockToken,
      user: {
        username
      }
    });
  });

  return router;
}
