import { HealthService } from './HealthService';
import { APIClient } from '../client';
import { HealthStatus, DetailedHealthInfo } from '../types';

describe('HealthService', () => {
  let service: HealthService;
  let mockApiClient: jest.Mocked<APIClient>;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
      setAuthToken: jest.fn(),
      clearAuthToken: jest.fn(),
      setUnauthorizedCallback: jest.fn(),
    } as any;

    service = new HealthService(mockApiClient);
  });

  describe('checkHealth', () => {
    it('should check API server health status', async () => {
      const mockHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2024-01-15T10:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockHealth);

      const result = await service.checkHealth();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health');
      expect(result).toEqual(mockHealth);
    });

    it('should handle unhealthy status', async () => {
      const mockHealth: HealthStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-15T10:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockHealth);

      const result = await service.checkHealth();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health');
      expect(result).toEqual(mockHealth);
    });
  });

  describe('getDetailedHealth', () => {
    it('should fetch detailed health information', async () => {
      const mockDetailedHealth: DetailedHealthInfo = {
        status: 'healthy',
        timestamp: '2024-01-15T10:00:00Z',
        uptime: 86400, // 1 day in seconds
        memoryUsage: {
          used: 512000000, // 512 MB
          total: 2048000000, // 2 GB
        },
        version: '1.0.0',
      };

      mockApiClient.get.mockResolvedValue(mockDetailedHealth);

      const result = await service.getDetailedHealth();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/detailed');
      expect(result).toEqual(mockDetailedHealth);
    });
  });
});
