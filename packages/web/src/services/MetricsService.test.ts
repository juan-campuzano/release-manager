import { MetricsService } from './MetricsService';
import { APIClient } from '../client';
import { QualityMetrics, DAUStats } from '../types';

describe('MetricsService', () => {
  let service: MetricsService;
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

    service = new MetricsService(mockApiClient);
  });

  describe('getQualityMetrics', () => {
    it('should fetch quality metrics for a release', async () => {
      const releaseId = 'release-123';
      const mockMetrics: QualityMetrics = {
        releaseId,
        crashRate: 0.5,
        cpuExceptionRate: 1.2,
        collectedAt: '2024-01-15T10:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockMetrics);

      const result = await service.getQualityMetrics(releaseId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/metrics/${releaseId}/quality`);
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getDAUStats', () => {
    it('should fetch DAU statistics for a release', async () => {
      const releaseId = 'release-123';
      const mockStats: DAUStats = {
        releaseId,
        currentDAU: 50000,
        trend: 'increasing',
        history: [
          { date: '2024-01-14T00:00:00Z', count: 48000 },
          { date: '2024-01-15T00:00:00Z', count: 50000 },
        ],
        collectedAt: '2024-01-15T10:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockStats);

      const result = await service.getDAUStats(releaseId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/metrics/${releaseId}/dau`);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getRolloutPercentage', () => {
    it('should fetch rollout percentage for a release', async () => {
      const releaseId = 'release-123';
      const mockPercentage = 25;

      mockApiClient.get.mockResolvedValue(mockPercentage);

      const result = await service.getRolloutPercentage(releaseId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/metrics/${releaseId}/rollout`);
      expect(result).toEqual(mockPercentage);
    });
  });
});
