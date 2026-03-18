import { renderHook, act, waitFor } from '@testing-library/react';
import { useTagStatus } from './useTagStatus';
import { TagStatusService } from '../services/TagStatusService';
import { TagDetectionInfo } from '../types';

// Mock useAutoRefresh to capture its arguments
const mockUseAutoRefresh = jest.fn();
jest.mock('./useAutoRefresh', () => ({
  useAutoRefresh: (...args: unknown[]) => mockUseAutoRefresh(...args),
}));

const mockTagStatus: TagDetectionInfo = {
  active: true,
  lastDetectedTag: 'v1.2.3',
  lastCheckAt: '2025-01-15T10:30:00Z',
};

function createMockService(overrides?: Partial<TagStatusService>): TagStatusService {
  return {
    getTagStatus: jest.fn().mockResolvedValue(mockTagStatus),
    ...overrides,
  } as unknown as TagStatusService;
}

describe('useTagStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAutoRefresh.mockImplementation(() => {});
  });

  it('should fetch tag status on mount when isActive is true', async () => {
    const service = createMockService();

    const { result } = renderHook(() =>
      useTagStatus('release-1', service, true)
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tagStatus).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tagStatus).toEqual(mockTagStatus);
    expect(result.current.error).toBeNull();
    expect(service.getTagStatus).toHaveBeenCalledWith('release-1');
  });

  it('should not fetch when isActive is false', () => {
    const service = createMockService();

    const { result } = renderHook(() =>
      useTagStatus('release-1', service, false)
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tagStatus).toBeNull();
    expect(result.current.error).toBeNull();
    expect(service.getTagStatus).not.toHaveBeenCalled();
  });

  it('should set error when fetch fails', async () => {
    const service = createMockService({
      getTagStatus: jest.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as Partial<TagStatusService>);

    const { result } = renderHook(() =>
      useTagStatus('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Network error'));
    expect(result.current.tagStatus).toBeNull();
  });

  it('should wrap non-Error exceptions in an Error', async () => {
    const service = createMockService({
      getTagStatus: jest.fn().mockRejectedValue('string error'),
    } as unknown as Partial<TagStatusService>);

    const { result } = renderHook(() =>
      useTagStatus('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch tag status');
  });

  it('should use useAutoRefresh with 30-second interval', () => {
    const service = createMockService();

    renderHook(() => useTagStatus('release-1', service, true));

    expect(mockUseAutoRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ interval: 30000 })
    );
  });

  it('should disable auto-refresh when isActive is false', () => {
    const service = createMockService();

    renderHook(() => useTagStatus('release-1', service, false));

    expect(mockUseAutoRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ enabled: false })
    );
  });

  it('should support manual refresh', async () => {
    const service = createMockService();

    const { result } = renderHook(() =>
      useTagStatus('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger manual refresh
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(service.getTagStatus).toHaveBeenCalledTimes(2);
    });

    expect(result.current.tagStatus).toEqual(mockTagStatus);
  });

  it('should handle error during refresh and keep previous data', async () => {
    const getTagStatusMock = jest.fn()
      .mockResolvedValueOnce(mockTagStatus)
      .mockRejectedValueOnce(new Error('Refresh failed'));

    const service = createMockService({
      getTagStatus: getTagStatusMock,
    } as unknown as Partial<TagStatusService>);

    const { result } = renderHook(() =>
      useTagStatus('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tagStatus).toEqual(mockTagStatus);

    // Trigger refresh that fails
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(new Error('Refresh failed'));
    });

    // Previous data should still be visible
    expect(result.current.tagStatus).toEqual(mockTagStatus);
  });
});
