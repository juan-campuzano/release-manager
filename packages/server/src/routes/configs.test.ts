/**
 * Unit tests for config routes
 */

// Polyfill setImmediate for jsdom environment
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

import express, { Express } from 'express';
import http from 'http';
import { createConfigRoutes } from './configs';
import { ConfigStore } from '../data/config-store';
import { ConfigParser } from '../application/config-parser';
import { errorHandler } from '../middleware/error-handler';
import { RepositoryConfig } from '../domain/types';
import { Success, Failure } from '../common/result';
import { ConflictError, NotFoundError } from '../common/errors';

// Helper to make requests to the test app
function request(
  server: http.Server,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode!, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode!, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const validConfigInput = {
  name: 'test-config',
  repositoryUrl: 'https://github.com/test/repo',
  sourceType: 'github' as const,
  requiredSquads: ['squad-a'],
  qualityThresholds: { crashRateThreshold: 1, cpuExceptionRateThreshold: 5 },
  rolloutStages: [10, 50, 100],
};

const mockConfig: RepositoryConfig = {
  ...validConfigInput,
  id: 'test-id-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Config Routes', () => {
  let app: Express;
  let server: http.Server;
  let mockConfigStore: jest.Mocked<ConfigStore>;
  let mockConfigParser: jest.Mocked<ConfigParser>;

  beforeEach((done) => {
    mockConfigStore = {
      create: jest.fn(),
      getAll: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockConfigParser = {
      validateRepositoryConfig: jest.fn(),
    } as any;

    app = express();
    app.use(express.json());
    app.use('/api/configs', createConfigRoutes(mockConfigStore, mockConfigParser));
    app.use(errorHandler);

    server = app.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  describe('POST /api/configs', () => {
    it('should return 201 with created config on success', async () => {
      mockConfigParser.validateRepositoryConfig.mockReturnValue({ valid: true, errors: [] });
      mockConfigStore.create.mockResolvedValue(Success(mockConfig));

      const res = await request(server, 'POST', '/api/configs', validConfigInput);

      expect(res.status).toBe(201);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.name).toBe('test-config');
      expect(mockConfigParser.validateRepositoryConfig).toHaveBeenCalledWith(validConfigInput);
      expect(mockConfigStore.create).toHaveBeenCalledWith(validConfigInput);
    });

    it('should return 400 when validation fails', async () => {
      mockConfigParser.validateRepositoryConfig.mockReturnValue({
        valid: false,
        errors: ['Name is required', 'Repository URL is required'],
      });

      const res = await request(server, 'POST', '/api/configs', {});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.errors).toContain('Name is required');
      expect(mockConfigStore.create).not.toHaveBeenCalled();
    });

    it('should return 409 when config name is a duplicate', async () => {
      mockConfigParser.validateRepositoryConfig.mockReturnValue({ valid: true, errors: [] });
      mockConfigStore.create.mockResolvedValue(
        Failure(new ConflictError("Configuration name 'test-config' is already in use"))
      );

      const res = await request(server, 'POST', '/api/configs', validConfigInput);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('already in use');
    });
  });

  describe('GET /api/configs', () => {
    it('should return 200 with all configs', async () => {
      mockConfigStore.getAll.mockResolvedValue(Success([mockConfig]));

      const res = await request(server, 'GET', '/api/configs');

      expect(res.status).toBe(200);
      expect(res.body.configs).toHaveLength(1);
      expect(res.body.configs[0].name).toBe('test-config');
    });

    it('should return 200 with empty list when no configs exist', async () => {
      mockConfigStore.getAll.mockResolvedValue(Success([]));

      const res = await request(server, 'GET', '/api/configs');

      expect(res.status).toBe(200);
      expect(res.body.configs).toHaveLength(0);
    });
  });

  describe('GET /api/configs/:id', () => {
    it('should return 200 with config when found', async () => {
      mockConfigStore.getById.mockResolvedValue(Success(mockConfig));

      const res = await request(server, 'GET', '/api/configs/test-id-123');

      expect(res.status).toBe(200);
      expect(res.body.config.id).toBe('test-id-123');
      expect(mockConfigStore.getById).toHaveBeenCalledWith('test-id-123');
    });

    it('should return 404 when config not found', async () => {
      mockConfigStore.getById.mockResolvedValue(
        Failure(new NotFoundError("Repository configuration 'missing-id' not found"))
      );

      const res = await request(server, 'GET', '/api/configs/missing-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });

  describe('PUT /api/configs/:id', () => {
    it('should return 200 with updated config on success', async () => {
      const updatedConfig = { ...mockConfig, name: 'updated-config' };
      mockConfigParser.validateRepositoryConfig.mockReturnValue({ valid: true, errors: [] });
      mockConfigStore.update.mockResolvedValue(Success(updatedConfig));

      const res = await request(server, 'PUT', '/api/configs/test-id-123', {
        ...validConfigInput,
        name: 'updated-config',
      });

      expect(res.status).toBe(200);
      expect(res.body.config.name).toBe('updated-config');
    });

    it('should return 400 when validation fails', async () => {
      mockConfigParser.validateRepositoryConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid source type'],
      });

      const res = await request(server, 'PUT', '/api/configs/test-id-123', {
        sourceType: 'invalid',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.errors).toContain('Invalid source type');
      expect(mockConfigStore.update).not.toHaveBeenCalled();
    });

    it('should return 404 when config not found', async () => {
      mockConfigParser.validateRepositoryConfig.mockReturnValue({ valid: true, errors: [] });
      mockConfigStore.update.mockResolvedValue(
        Failure(new NotFoundError("Repository configuration 'missing-id' not found"))
      );

      const res = await request(server, 'PUT', '/api/configs/missing-id', validConfigInput);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('should return 409 when updated name conflicts', async () => {
      mockConfigParser.validateRepositoryConfig.mockReturnValue({ valid: true, errors: [] });
      mockConfigStore.update.mockResolvedValue(
        Failure(new ConflictError("Configuration name 'existing' is already in use"))
      );

      const res = await request(server, 'PUT', '/api/configs/test-id-123', {
        ...validConfigInput,
        name: 'existing',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('already in use');
    });
  });

  describe('DELETE /api/configs/:id', () => {
    it('should return 200 with success on deletion', async () => {
      mockConfigStore.delete.mockResolvedValue(Success(undefined));

      const res = await request(server, 'DELETE', '/api/configs/test-id-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockConfigStore.delete).toHaveBeenCalledWith('test-id-123');
    });

    it('should return 404 when config not found', async () => {
      mockConfigStore.delete.mockResolvedValue(
        Failure(new NotFoundError("Repository configuration 'missing-id' not found"))
      );

      const res = await request(server, 'DELETE', '/api/configs/missing-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });
});
