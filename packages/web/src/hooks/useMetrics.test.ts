import { renderHook, waitFor } from '@testing-library/react';
import { useMetrics, clearMetricsCache } from './useMetrics';
import { MetricsService } from '../services/MetricsService';
import { QualityMetrics, DAUStats } from '../types';

describe('useMetrics', () => {
  let mockMetricsService: jest.Mocked<MetricsService>;
  let mockQualityMetrics: QualityMetrics;
  let mockDAUStats: DAUStats;

  beforeEach(() => {
    // Clear all mocks and cache before each test
    jest.clearAllMocks();
    clearMetricsCache();
    
    mockMetricsService = {
      getQualityMetrics: jest.fn(),
      getDAUStats: jest.fn(),
    } as any;

    mockQualityMetrics = {
      releaseId: '1',
      crashRate: 0.5,
      cpuExceptionRate: 1.2,
      collectedAt: '2024-01-01T00:00:00Z',
    };

    mockDAUStats = {
      releaseId: '1',
      currentDAU: 10000,
      trend: 'increasing',
      history: [
        { date: '2024-01-01', count: 9000 },
        { date: '2024-01-02', count: 10000 },
      ],
      collectedAt: '2024-01-02T00:00:00Z',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch metrics on mount', async () => {
    mockMetricsService.getQualityMetrics.mockResolvedValue(mockQualityMetrics);
    mockMetricsService.getDAUStats.mockResolvedValue(mockDAUStats);

    const { result } = renderHook(() => useMetrics('1', mockMetricsService));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.qualityMetrics).toBeNull();
    expect(result.current.dauStats).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.qualityMetrics).toEqual(mockQualityMetrics);
    expect(result.current.dauStats).toEqual(mockDAUStats);
    expect(result.current.error).toBeNull();
    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledWith('1');
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledWith('1');
  });

  it('should fetch both metrics in parallel', async () => {
    mockMetricsService.getQualityMetrics.mockResolvedValue(mockQualityMetrics);
    mockMetricsService.getDAUStats.mockResolvedValue(mockDAUStats);

    const { result } = renderHook(() => useMetrics('1', mockMetricsService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Both should be called
    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledTimes(1);
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch');
    mockMetricsService.getQualityMetrics.mockRejectedValue(error);
    mockMetricsService.getDAUStats.mockRejectedValue(error);

    const { result } = renderHook(() => useMetrics('1', mockMetricsService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.qualityMetrics).toBeNull();
    expect(result.current.dauStats).toBeNull();
  });

  it('should refresh data and bypass cache', async () => {
    mockMetricsService.getQualityMetrics.mockResolvedValue(mockQualityMetrics);
    mockMetricsService.getDAUStats.mockResolvedValue(mockDAUStats);

    const { result } = renderHook(() => useMetrics('1', mockMetricsService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledTimes(1);
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledTimes(1);

    // Refresh should fetch again
    await result.current.refresh();

    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledTimes(2);
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledTimes(2);
  });

  it('should use cached data within TTL', async () => {
    mockMetricsService.getQualityMetrics.mockResolvedValue(mockQualityMetrics);
    mockMetricsService.getDAUStats.mockResolvedValue(mockDAUStats);

    const { result, unmount } = renderHook(() => useMetrics('1', mockMetricsService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledTimes(1);
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledTimes(1);

    // Unmount and remount within cache TTL
    unmount();

    const { result: result2 } = renderHook(() => useMetrics('1', mockMetricsService));

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // Should use cached data, so only 1 API call total for each metric
    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledTimes(1);
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledTimes(1);
    expect(result2.current.qualityMetrics).toEqual(mockQualityMetrics);
    expect(result2.current.dauStats).toEqual(mockDAUStats);
  });

  it('should fetch new metrics when releaseId changes', async () => {
    const metrics2 = { ...mockQualityMetrics, releaseId: '2' };
    const dau2 = { ...mockDAUStats, releaseId: '2' };

    mockMetricsService.getQualityMetrics
      .mockResolvedValueOnce(mockQualityMetrics)
      .mockResolvedValueOnce(metrics2);
    mockMetricsService.getDAUStats
      .mockResolvedValueOnce(mockDAUStats)
      .mockResolvedValueOnce(dau2);

    const { result, rerender } = renderHook(
      ({ id }) => useMetrics(id, mockMetricsService),
      { initialProps: { id: '1' } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.qualityMetrics).toEqual(mockQualityMetrics);
    expect(result.current.dauStats).toEqual(mockDAUStats);

    // Change releaseId
    rerender({ id: '2' });

    await waitFor(() => {
      expect(result.current.qualityMetrics).toEqual(metrics2);
    });

    expect(mockMetricsService.getQualityMetrics).toHaveBeenCalledWith('2');
    expect(mockMetricsService.getDAUStats).toHaveBeenCalledWith('2');
  });
});
