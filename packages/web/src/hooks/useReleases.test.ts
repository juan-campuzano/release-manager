import { renderHook, waitFor } from '@testing-library/react';
import { useReleases, clearReleasesCache } from './useReleases';
import { ReleaseService } from '../services/ReleaseService';
import { Release, Platform } from '../types';

describe('useReleases', () => {
  let mockReleaseService: jest.Mocked<ReleaseService>;
  let mockReleases: Release[];

  beforeEach(() => {
    // Clear all mocks and cache before each test
    jest.clearAllMocks();
    clearReleasesCache();
    
    mockReleaseService = {
      getActiveReleases: jest.fn(),
    } as any;

    mockReleases = [
      {
        id: '1',
        platform: 'iOS',
        version: '1.0.0',
        status: 'Current',
      } as Release,
      {
        id: '2',
        platform: 'Android',
        version: '2.0.0',
        status: 'Current',
      } as Release,
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch releases on mount', async () => {
    mockReleaseService.getActiveReleases.mockResolvedValue(mockReleases);

    const { result } = renderHook(() => useReleases(mockReleaseService));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.releases).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.releases).toEqual(mockReleases);
    expect(result.current.error).toBeNull();
    expect(mockReleaseService.getActiveReleases).toHaveBeenCalledWith(undefined);
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch');
    mockReleaseService.getActiveReleases.mockRejectedValue(error);

    const { result } = renderHook(() => useReleases(mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.releases).toEqual([]);
  });

  it('should filter by platform', async () => {
    const iosReleases = [mockReleases[0]];
    mockReleaseService.getActiveReleases.mockResolvedValue(iosReleases);

    const { result } = renderHook(() => useReleases(mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Filter by iOS
    result.current.filterByPlatform('iOS');

    await waitFor(() => {
      expect(mockReleaseService.getActiveReleases).toHaveBeenCalledWith('iOS');
    });
  });

  it('should refresh data and bypass cache', async () => {
    mockReleaseService.getActiveReleases.mockResolvedValue(mockReleases);

    const { result } = renderHook(() => useReleases(mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockReleaseService.getActiveReleases).toHaveBeenCalledTimes(1);

    // Refresh should fetch again
    await result.current.refresh();

    expect(mockReleaseService.getActiveReleases).toHaveBeenCalledTimes(2);
  });

  it('should use cached data within TTL', async () => {
    mockReleaseService.getActiveReleases.mockResolvedValue(mockReleases);

    const { result, unmount } = renderHook(() => useReleases(mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockReleaseService.getActiveReleases).toHaveBeenCalledTimes(1);

    // Unmount and remount within cache TTL
    unmount();

    const { result: result2 } = renderHook(() => useReleases(mockReleaseService));

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // Should use cached data, so only 1 API call total
    expect(mockReleaseService.getActiveReleases).toHaveBeenCalledTimes(1);
    expect(result2.current.releases).toEqual(mockReleases);
  });

  it('should clear platform filter when set to null', async () => {
    mockReleaseService.getActiveReleases.mockResolvedValue(mockReleases);

    const { result } = renderHook(() => useReleases(mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set platform filter
    result.current.filterByPlatform('iOS');

    await waitFor(() => {
      expect(mockReleaseService.getActiveReleases).toHaveBeenCalledWith('iOS');
    });

    // Clear filter
    result.current.filterByPlatform(null);

    await waitFor(() => {
      expect(mockReleaseService.getActiveReleases).toHaveBeenCalledWith(undefined);
    });
  });
});
