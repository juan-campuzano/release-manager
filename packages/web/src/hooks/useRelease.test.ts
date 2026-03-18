import { renderHook, waitFor } from '@testing-library/react';
import { useRelease, clearReleaseCache } from './useRelease';
import { ReleaseService } from '../services/ReleaseService';
import { Release, ReleaseStage, ReleaseStatus } from '../types';

describe('useRelease', () => {
  let mockReleaseService: jest.Mocked<ReleaseService>;
  let mockRelease: Release;

  beforeEach(() => {
    // Clear all mocks and cache before each test
    jest.clearAllMocks();
    clearReleaseCache();
    
    mockReleaseService = {
      getReleaseById: jest.fn(),
      updateStage: jest.fn(),
      updateStatus: jest.fn(),
      updateRollout: jest.fn(),
    } as any;

    mockRelease = {
      id: '1',
      platform: 'iOS',
      version: '1.0.0',
      status: 'Current',
      currentStage: 'Release Branching',
      rolloutPercentage: 0,
    } as Release;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch release on mount', async () => {
    mockReleaseService.getReleaseById.mockResolvedValue(mockRelease);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.release).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.release).toEqual(mockRelease);
    expect(result.current.error).toBeNull();
    expect(mockReleaseService.getReleaseById).toHaveBeenCalledWith('1');
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch');
    mockReleaseService.getReleaseById.mockRejectedValue(error);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.release).toBeNull();
  });

  it('should refresh data and bypass cache', async () => {
    mockReleaseService.getReleaseById.mockResolvedValue(mockRelease);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockReleaseService.getReleaseById).toHaveBeenCalledTimes(1);

    // Refresh should fetch again
    await result.current.refresh();

    expect(mockReleaseService.getReleaseById).toHaveBeenCalledTimes(2);
  });

  it('should update stage', async () => {
    const updatedRelease = { ...mockRelease, currentStage: 'Roll Out 1%' as ReleaseStage };
    mockReleaseService.getReleaseById.mockResolvedValue(mockRelease);
    mockReleaseService.updateStage.mockResolvedValue(updatedRelease);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updateStage('Roll Out 1%');

    await waitFor(() => {
      expect(result.current.release).toEqual(updatedRelease);
    });

    expect(mockReleaseService.updateStage).toHaveBeenCalledWith('1', 'Roll Out 1%');
  });

  it('should update status', async () => {
    const updatedRelease = { ...mockRelease, status: 'Production' as ReleaseStatus };
    mockReleaseService.getReleaseById.mockResolvedValue(mockRelease);
    mockReleaseService.updateStatus.mockResolvedValue(updatedRelease);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updateStatus('Production');

    await waitFor(() => {
      expect(result.current.release).toEqual(updatedRelease);
    });

    expect(mockReleaseService.updateStatus).toHaveBeenCalledWith('1', 'Production');
  });

  it('should update rollout percentage', async () => {
    const updatedRelease = { ...mockRelease, rolloutPercentage: 50 };
    mockReleaseService.getReleaseById.mockResolvedValue(mockRelease);
    mockReleaseService.updateRollout.mockResolvedValue(updatedRelease);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updateRollout(50);

    await waitFor(() => {
      expect(result.current.release).toEqual(updatedRelease);
    });

    expect(mockReleaseService.updateRollout).toHaveBeenCalledWith('1', 50);
  });

  it('should handle update errors', async () => {
    const error = new Error('Update failed');
    mockReleaseService.getReleaseById.mockResolvedValue(mockRelease);
    mockReleaseService.updateStage.mockRejectedValue(error);

    const { result } = renderHook(() => useRelease('1', mockReleaseService));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.updateStage('Roll Out 1%')).rejects.toThrow('Update failed');
    
    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('should fetch new release when releaseId changes', async () => {
    const release2 = { ...mockRelease, id: '2', version: '2.0.0' };
    mockReleaseService.getReleaseById
      .mockResolvedValueOnce(mockRelease)
      .mockResolvedValueOnce(release2);

    const { result, rerender } = renderHook(
      ({ id }) => useRelease(id, mockReleaseService),
      { initialProps: { id: '1' } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.release).toEqual(mockRelease);

    // Change releaseId
    rerender({ id: '2' });

    await waitFor(() => {
      expect(result.current.release).toEqual(release2);
    });

    expect(mockReleaseService.getReleaseById).toHaveBeenCalledWith('2');
  });
});
