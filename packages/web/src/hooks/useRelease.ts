import { useState, useEffect, useCallback, useRef } from 'react';
import { Release, ReleaseStage, ReleaseStatus } from '../types';
import { ReleaseService } from '../services/ReleaseService';

interface UseReleaseResult {
  release: Release | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  updateStage: (stage: ReleaseStage) => Promise<void>;
  updateStatus: (status: ReleaseStatus) => Promise<void>;
  updateRollout: (percentage: number) => Promise<void>;
}

interface CacheEntry {
  data: Release;
  timestamp: number;
}

const CACHE_TTL = 30000; // 30 seconds

// Module-level cache shared across all hook instances
const cache = new Map<string, CacheEntry>();

/**
 * Clear the cache (for testing purposes)
 * @internal
 */
export function clearReleaseCache(): void {
  cache.clear();
}

/**
 * Custom hook for fetching and managing a single release
 * Implements caching with 30s TTL and manual refresh
 */
export function useRelease(
  releaseId: string,
  releaseService: ReleaseService
): UseReleaseResult {
  const [release, setRelease] = useState<Release | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const isMountedRef = useRef<boolean>(true);

  const getCacheKey = (id: string): string => {
    return `release:${id}`;
  };

  const getCachedData = (id: string): Release | null => {
    const key = getCacheKey(id);
    const cached = cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  };

  const setCachedData = (id: string, data: Release): void => {
    const key = getCacheKey(id);
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  const fetchRelease = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check cache first
      const cachedData = getCachedData(id);
      if (cachedData) {
        if (isMountedRef.current) {
          setRelease(cachedData);
          setIsLoading(false);
        }
        return;
      }
      
      // Fetch from API
      const data = await releaseService.getReleaseById(id);
      
      if (isMountedRef.current) {
        setRelease(data);
        setCachedData(id, data);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch release'));
        setIsLoading(false);
      }
    }
  }, [releaseService]);

  const refresh = useCallback(async () => {
    // Clear cache for current release
    const key = getCacheKey(releaseId);
    cache.delete(key);
    
    await fetchRelease(releaseId);
  }, [releaseId, fetchRelease]);

  const updateStage = useCallback(async (stage: ReleaseStage) => {
    try {
      setError(null);
      const updatedRelease = await releaseService.updateStage(releaseId, stage);
      
      if (isMountedRef.current) {
        setRelease(updatedRelease);
        setCachedData(releaseId, updatedRelease);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to update stage'));
      }
      throw err;
    }
  }, [releaseId, releaseService]);

  const updateStatus = useCallback(async (status: ReleaseStatus) => {
    try {
      setError(null);
      const updatedRelease = await releaseService.updateStatus(releaseId, status);
      
      if (isMountedRef.current) {
        setRelease(updatedRelease);
        setCachedData(releaseId, updatedRelease);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to update status'));
      }
      throw err;
    }
  }, [releaseId, releaseService]);

  const updateRollout = useCallback(async (percentage: number) => {
    try {
      setError(null);
      const updatedRelease = await releaseService.updateRollout(releaseId, percentage);
      
      if (isMountedRef.current) {
        setRelease(updatedRelease);
        setCachedData(releaseId, updatedRelease);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to update rollout'));
      }
      throw err;
    }
  }, [releaseId, releaseService]);

  // Fetch release when releaseId changes
  useEffect(() => {
    if (releaseId) {
      fetchRelease(releaseId);
    }
  }, [releaseId, fetchRelease]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    release,
    isLoading,
    error,
    refresh,
    updateStage,
    updateStatus,
    updateRollout,
  };
}
