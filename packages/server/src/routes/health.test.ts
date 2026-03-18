/**
 * Unit tests for health check routes
 */

import { createHealthRoutes } from './health';
import { Request, Response } from 'express';

describe('Health Check Routes', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.USE_MOCK_DATA;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.USE_MOCK_DATA = originalEnv;
    } else {
      delete process.env.USE_MOCK_DATA;
    }
  });

  describe('GET /api/health', () => {
    it('should return 200 status with healthy status in mock mode', () => {
      process.env.USE_MOCK_DATA = 'true';
      const router = createHealthRoutes();
      
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      // Get the route handler
      const routes = (router as any).stack;
      const healthRoute = routes.find((r: any) => r.route?.path === '/');
      const handler = healthRoute.route.stack[0].handle;

      handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        })
      );
    });

    it('should return 200 status with healthy status in database mode', () => {
      process.env.USE_MOCK_DATA = 'false';
      const router = createHealthRoutes();
      
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      const routes = (router as any).stack;
      const healthRoute = routes.find((r: any) => r.route?.path === '/');
      const handler = healthRoute.route.stack[0].handle;

      handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        })
      );
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should include mode information as "mock" in mock mode', () => {
      process.env.USE_MOCK_DATA = 'true';
      const router = createHealthRoutes();
      
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn()
      } as unknown as Response;

      const routes = (router as any).stack;
      const detailedRoute = routes.find((r: any) => r.route?.path === '/detailed');
      const handler = detailedRoute.route.stack[0].handle;

      handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          memory: expect.any(Object),
          version: expect.any(String),
          mode: 'mock'
        })
      );
    });

    it('should include mode information as "database" in database mode', () => {
      process.env.USE_MOCK_DATA = 'false';
      const router = createHealthRoutes();
      
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn()
      } as unknown as Response;

      const routes = (router as any).stack;
      const detailedRoute = routes.find((r: any) => r.route?.path === '/detailed');
      const handler = detailedRoute.route.stack[0].handle;

      handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          mode: 'database',
          database: expect.objectContaining({
            status: expect.any(String)
          })
        })
      );
    });

    it('should not include database status in mock mode', () => {
      process.env.USE_MOCK_DATA = 'true';
      const router = createHealthRoutes();
      
      const mockReq = {} as Request;
      let capturedResponse: any;
      const mockRes = {
        json: jest.fn((data) => {
          capturedResponse = data;
        })
      } as unknown as Response;

      const routes = (router as any).stack;
      const detailedRoute = routes.find((r: any) => r.route?.path === '/detailed');
      const handler = detailedRoute.route.stack[0].handle;

      handler(mockReq, mockRes);

      expect(capturedResponse).toBeDefined();
      expect(capturedResponse.database).toBeUndefined();
      expect(capturedResponse.mode).toBe('mock');
    });

    it('should include server uptime, memory usage, and version', () => {
      process.env.USE_MOCK_DATA = 'true';
      const router = createHealthRoutes();
      
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn()
      } as unknown as Response;

      const routes = (router as any).stack;
      const detailedRoute = routes.find((r: any) => r.route?.path === '/detailed');
      const handler = detailedRoute.route.stack[0].handle;

      handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          uptime: expect.any(Number),
          memory: expect.objectContaining({
            rss: expect.any(Number),
            heapTotal: expect.any(Number),
            heapUsed: expect.any(Number),
            external: expect.any(Number)
          }),
          version: expect.any(String)
        })
      );
    });
  });
});
