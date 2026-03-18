import { useState, useEffect, useCallback, useRef } from 'react';
import { Release, Platform } from '../types';
import { ReleaseService } from '../services/ReleaseService';

interface UseReleasesResult {
  releases: Release[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  filterByPlatform: (platform: Platform | null) => void;
}

interface CacheEntry {
  data: Release[];
  timestamp: number;
}

const CACHE_TTL = 60000; // 60 seconds

// Module-level cache shared across all hook instances
const cache = new Map<string, CacheEntry>();

/**
 * Clear the cache (for testing purposes)
 * @internal
 */
export function clearReleasesCache(): void {
  cache.clear();
}

/**
 * Custom hook for fetching and managing releases list
 * Implements caching with 60s TTL and manual refresh
 */
export function useReleases(releaseService: ReleaseService): UseReleasesResult {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  
  const isMountedRef = useRef<boolean>(true);

  const getCacheKey = (platform: Platform | null): string => {
    return `releases:${platform || 'all'}`;
  };

  const getCachedData = (platform: Platform | null): Release[] | null => {
    const key = getCacheKey(platform);
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

  const setCachedData = (platform: Platform | null, data: Release[]): void => {
    const key = getCacheKey(platform);
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  const fetchReleases = useCallback(async (platformFilter: Platform | null) => {
    try {
      console.log('[useReleases] Starting fetch, platform:', platformFilter);
      setIsLoading(true);
      setError(null);
      
      // Check cache first
      const cachedData = getCachedData(platformFilter);
      if (cachedData) {
        console.log('[useReleases] Using cached data, count:', cachedData.length);
        if (isMountedRef.current) {
          setReleases(cachedData);
          setIsLoading(false);
        }
        return;
      }
      
      // Fetch from API
      console.log('[useReleases] Fetching from API...');
      const data = await releaseService.getActiveReleases(platformFilter || undefined);
      console.log('[useReleases] API response received, count:', data?.length, 'data:', data);
      console.log('[useReleases] Data type:', typeof data, 'Is array:', Array.isArray(data));
      
      if (isMountedRef.current) {
        setReleases(data || []);
        setCachedData(platformFilter, data || []);
        setIsLoading(false);
        console.log('[useReleases] State updated, loading set to false');
      }
    } catch (err) {
      console.error('[useReleases] Error fetching releases:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch releases'));
        setIsLoading(false);
      }
    }
  }, [releaseService]);

  const refresh = useCallback(async () => {
    // Clear cache for current platform filter
    const key = getCacheKey(platform);
    cache.delete(key);
    
    await fetchReleases(platform);
  }, [platform, fetchReleases]);

  const filterByPlatform = useCallback((newPlatform: Platform | null) => {
    setPlatform(newPlatform);
  }, []);

  // Fetch releases when platform filter changes
  useEffect(() => {
    fetchReleases(platform);
  }, [platform, fetchReleases]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    releases,
    isLoading,
    error,
    refresh,
    filterByPlatform,
  };
}
