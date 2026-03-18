import { renderHook, waitFor, act } from '@testing-library/react';
import { useReleaseEvents, clearReleaseEventsCache } from './useReleaseEvents';
import { APIClient } from '../client';
import type { ReleaseEvent } from '../types/releaseEvent';

describe('useReleaseEvents', () => {
  let mockApiClient: jest.Mocked<APIClient>;

  const mockEvents: ReleaseEvent[] = [
    {
      id: 'evt-1',
      releaseId: 'rel-1',
      type: 'stage_change',
      timestamp: '2024-01-15T14:30:00Z',
      userId: 'user-1',
      userName: 'John Doe',
      data: {
        previousStage: 'Release Branching',
        newStage: 'Final Release Candidate',
      },
    } as ReleaseEvent,
    {
      id: 'evt-2',
      releaseId: 'rel-1',
      type: 'release_created',
      timestamp: '2024-01-10T10:00:00Z',
      data: {
        platform: 'iOS',
        version: '1.0.0',
        createdBy: 'Jane Smith',
      },
    } as ReleaseEvent,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearReleaseEventsCache();

    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch events on mount', async () => {
    mockApiClient.get.mockResolvedValue({ events: mockEvents });

    const { result } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/rel-1/events');
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Network error');
    mockApiClient.get.mockRejectedValue(error);

    const { result } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.events).toEqual([]);
  });

  it('should wrap non-Error rejections in an Error', async () => {
    mockApiClient.get.mockRejectedValue('string error');

    const { result } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch release events');
  });

  it('should use cached data within 60 seconds', async () => {
    mockApiClient.get.mockResolvedValue({ events: mockEvents });

    const { result, unmount } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    unmount();

    // Re-mount — should use cache
    const { result: result2 } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(result2.current.events).toEqual(mockEvents);
    // Still only 1 API call — second mount used cache
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  it('should bypass cache on manual refresh', async () => {
    mockApiClient.get.mockResolvedValue({ events: mockEvents });

    const { result } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);

    const updatedEvents = [mockEvents[0]];
    mockApiClient.get.mockResolvedValue({ events: updatedEvents });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.events).toEqual(updatedEvents);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
  });

  it('should auto-refresh every 60 seconds', async () => {
    mockApiClient.get.mockResolvedValue({ events: mockEvents });

    const { result } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);

    // Advance 60 seconds — should trigger auto-refresh
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should clean up interval on unmount', async () => {
    mockApiClient.get.mockResolvedValue({ events: mockEvents });

    const { result, unmount } = renderHook(() => useReleaseEvents('rel-1', mockApiClient));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    unmount();

    // Advance time — should NOT trigger another fetch
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  it('should fetch new events when releaseId changes', async () => {
    const events2: ReleaseEvent[] = [
      {
        id: 'evt-3',
        releaseId: 'rel-2',
        type: 'release_created',
        timestamp: '2024-02-01T10:00:00Z',
        data: { platform: 'Android', version: '2.0.0', createdBy: 'Bob' },
      } as ReleaseEvent,
    ];

    mockApiClient.get
      .mockResolvedValueOnce({ events: mockEvents })
      .mockResolvedValueOnce({ events: events2 });

    const { result, rerender } = renderHook(
      ({ id }) => useReleaseEvents(id, mockApiClient),
      { initialProps: { id: 'rel-1' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);

    rerender({ id: 'rel-2' });

    await waitFor(() => {
      expect(result.current.events).toEqual(events2);
    });

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/rel-2/events');
  });
});
