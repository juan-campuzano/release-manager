import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReleaseEvent } from '../types/releaseEvent';
import { APIClient } from '../client';

interface GetEventsResponse {
  events: ReleaseEvent[];
}

export interface UseReleaseEventsResult {
  events: ReleaseEvent[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

interface CacheEntry {
  data: ReleaseEvent[];
  timestamp: number;
}

const CACHE_DURATION = 60000; // 60 seconds
const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

// Module-level cache shared across all hook instances
const cache = new Map<string, CacheEntry>();

/**
 * Clear the cache (for testing purposes)
 * @internal
 */
export function clearReleaseEventsCache(): void {
  cache.clear();
}

/**
 * Custom hook for fetching release events with auto-refresh and caching.
 *
 * - Fetches events from GET /api/releases/:id/events
 * - Caches responses for 60 seconds to avoid redundant requests
 * - Auto-refreshes every 60 seconds via setInterval
 * - Exposes a manual refresh() that bypasses the cache
 */
export function useReleaseEvents(
  releaseId: string,
  apiClient: APIClient
): UseReleaseEventsResult {
  const [events, setEvents] = useState<ReleaseEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const clientRef = useRef<APIClient>(apiClient);

  const fetchEvents = useCallback(async (bypassCache = false) => {
    try {
      if (!bypassCache) {
        const cached = cache.get(releaseId);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          if (isMountedRef.current) {
            setEvents(cached.data);
            setLoading(false);
          }
          return;
        }
      }

      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const response = await clientRef.current.get<GetEventsResponse>(
        `/api/releases/${releaseId}/events`
      );

      const fetchedEvents = response.events;
      cache.set(releaseId, { data: fetchedEvents, timestamp: Date.now() });

      if (isMountedRef.current) {
        setEvents(fetchedEvents);
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch release events'));
        setLoading(false);
      }
    }
  }, [releaseId]);

  // Manual refresh bypasses cache
  const refresh = useCallback(() => {
    cache.delete(releaseId);
    fetchEvents(true);
  }, [releaseId, fetchEvents]);

  // Initial fetch when releaseId changes
  useEffect(() => {
    if (releaseId) {
      fetchEvents();
    }
  }, [releaseId, fetchEvents]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!releaseId) return;

    const intervalId = setInterval(() => {
      fetchEvents(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [releaseId, fetchEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { events, loading, error, refresh };
}
