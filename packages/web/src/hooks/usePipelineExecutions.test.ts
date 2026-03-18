import { renderHook, act, waitFor } from '@testing-library/react';
import { usePipelineExecutions } from './usePipelineExecutions';
import { PipelineExecutionService } from '../services/PipelineExecutionService';
import { CIExecution } from '../types';

// Mock useAutoRefresh to capture its arguments
const mockUseAutoRefresh = jest.fn();
jest.mock('./useAutoRefresh', () => ({
  useAutoRefresh: (...args: unknown[]) => mockUseAutoRefresh(...args),
}));

const mockExecutions: CIExecution[] = [
  {
    id: '1',
    runNumber: '42',
    status: 'passed',
    branch: 'main',
    commitSha: 'abc1234567890',
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:05:00Z',
  },
  {
    id: '2',
    runNumber: '41',
    status: 'running',
    branch: 'feature/test',
    commitSha: 'def4567890123',
    startedAt: '2024-01-15T09:00:00Z',
  },
];

function createMockService(overrides?: Partial<PipelineExecutionService>): PipelineExecutionService {
  return {
    getExecutions: jest.fn().mockResolvedValue(mockExecutions),
    ...overrides,
  } as unknown as PipelineExecutionService;
}

describe('usePipelineExecutions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAutoRefresh.mockImplementation(() => {});
  });

  it('should fetch executions on mount when hasCiPipeline is true', async () => {
    const service = createMockService();

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, true)
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.executions).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.executions).toEqual(mockExecutions);
    expect(result.current.error).toBeNull();
    expect(service.getExecutions).toHaveBeenCalledWith('release-1');
  });

  it('should not fetch when hasCiPipeline is false', async () => {
    const service = createMockService();

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, false)
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.executions).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(service.getExecutions).not.toHaveBeenCalled();
  });

  it('should set error when fetch fails', async () => {
    const service = createMockService({
      getExecutions: jest.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as Partial<PipelineExecutionService>);

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Network error'));
    expect(result.current.executions).toEqual([]);
  });

  it('should wrap non-Error exceptions in an Error', async () => {
    const service = createMockService({
      getExecutions: jest.fn().mockRejectedValue('string error'),
    } as unknown as Partial<PipelineExecutionService>);

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch pipeline executions');
  });

  it('should use useAutoRefresh with 60-second interval', () => {
    const service = createMockService();

    renderHook(() => usePipelineExecutions('release-1', service, true));

    expect(mockUseAutoRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ interval: 60000 })
    );
  });

  it('should disable auto-refresh when hasCiPipeline is false', () => {
    const service = createMockService();

    renderHook(() => usePipelineExecutions('release-1', service, false));

    expect(mockUseAutoRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ enabled: false })
    );
  });

  it('should set isRefreshing during manual refresh (not isLoading)', async () => {
    const service = createMockService();

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, true)
    );

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger manual refresh
    act(() => {
      result.current.refresh();
    });

    // isRefreshing should be true, isLoading should remain false
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(result.current.executions).toEqual(mockExecutions);
  });

  it('should set isRefreshing during auto-refresh callback', async () => {
    const service = createMockService();
    let capturedCallback: (() => void) | null = null;

    mockUseAutoRefresh.mockImplementation((cb: () => void) => {
      capturedCallback = cb;
    });

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, true)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate auto-refresh callback
    expect(capturedCallback).not.toBeNull();
    act(() => {
      capturedCallback!();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('should handle error during refresh and keep previous data', async () => {
    const getExecutionsMock = jest.fn()
      .mockResolvedValueOnce(mockExecutions)
      .mockRejectedValueOnce(new Error('Refresh failed'));

    const service = createMockService({
      getExecutions: getExecutionsMock,
    } as unknown as Partial<PipelineExecutionService>);

    const { result } = renderHook(() =>
      usePipelineExecutions('release-1', service, true)
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.executions).toEqual(mockExecutions);

    // Trigger refresh that fails
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    // Previous data should still be visible
    expect(result.current.executions).toEqual(mockExecutions);
    expect(result.current.error).toEqual(new Error('Refresh failed'));
  });
});
