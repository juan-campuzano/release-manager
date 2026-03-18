/**
 * Unit tests for GET /api/releases/:id/pipeline-executions endpoint
 */

// Polyfill setImmediate for jsdom environment
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

import express, { Express } from 'express';
import http from 'http';
import { createReleaseRoutes } from './releases';
import { Services } from '../services';
import { errorHandler } from '../middleware/error-handler';
import { CIExecution } from '../domain/types';
import { Success, Failure } from '../common/result';
import { IntegrationError, NotFoundError, ValidationError } from '../common/errors';

// Helper to make requests to the test app
function request(
  server: http.Server,
  method: string,
  path: string
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
    req.end();
  });
}

const mockExecution: CIExecution = {
  id: 'run-1',
  runNumber: '42',
  status: 'passed',
  branch: 'main',
  commitSha: 'abc1234def5678',
  startedAt: '2024-06-01T10:00:00Z',
  completedAt: '2024-06-01T10:05:00Z',
};

describe('GET /api/releases/:id/pipeline-executions', () => {
  let app: Express;
  let server: http.Server;
  let mockServices: Services;
  let mockPipelineFetcher: { getExecutions: jest.Mock };

  beforeEach((done) => {
    mockPipelineFetcher = {
      getExecutions: jest.fn(),
    };

    mockServices = {
      releaseManager: {} as any,
      metricsAggregator: {} as any,
      pollingService: {} as any,
      cache: {} as any,
      eventStore: {} as any,
      pipelineFetcher: mockPipelineFetcher,
    } as any;

    app = express();
    app.use(express.json());
    app.use('/api/releases', createReleaseRoutes(mockServices));
    app.use(errorHandler);

    server = app.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('should return 200 with executions on success', async () => {
    mockPipelineFetcher.getExecutions.mockResolvedValue(
      Success([mockExecution])
    );

    const res = await request(server, 'GET', '/api/releases/rel-1/pipeline-executions');

    expect(res.status).toBe(200);
    expect(res.body.executions).toHaveLength(1);
    expect(res.body.executions[0].id).toBe('run-1');
    expect(res.body.executions[0].runNumber).toBe('42');
    expect(res.body.executions[0].status).toBe('passed');
    expect(mockPipelineFetcher.getExecutions).toHaveBeenCalledWith('rel-1');
  });

  it('should return 200 with empty executions when no config or no ciPipelineId', async () => {
    mockPipelineFetcher.getExecutions.mockResolvedValue(Success([]));

    const res = await request(server, 'GET', '/api/releases/rel-2/pipeline-executions');

    expect(res.status).toBe(200);
    expect(res.body.executions).toEqual([]);
  });

  it('should return 502 when adapter returns IntegrationError', async () => {
    mockPipelineFetcher.getExecutions.mockResolvedValue(
      Failure(new IntegrationError('GitHub API rate limit exceeded'))
    );

    const res = await request(server, 'GET', '/api/releases/rel-1/pipeline-executions');

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Integration Error');
    expect(res.body.message).toBe('GitHub API rate limit exceeded');
  });

  it('should return 404 when release is not found', async () => {
    mockPipelineFetcher.getExecutions.mockResolvedValue(
      Failure(new NotFoundError('Release rel-999 not found'))
    );

    const res = await request(server, 'GET', '/api/releases/rel-999/pipeline-executions');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  it('should return 400 when sourceType is invalid', async () => {
    mockPipelineFetcher.getExecutions.mockResolvedValue(
      Failure(new ValidationError('Unsupported source type: bitbucket'))
    );

    const res = await request(server, 'GET', '/api/releases/rel-1/pipeline-executions');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });
});
