import { useState, useEffect, useCallback, useRef } from 'react';
import { QualityMetrics, DAUStats } from '../types';
import { MetricsService } from '../services/MetricsService';

interface UseMetricsResult {
  qualityMetrics: QualityMetrics | null;
  dauStats: DAUStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30000; // 30 seconds

// Module-level cache shared across all hook instances
const cache = new Map<string, CacheEntry<any>>();

/**
 * Clear the cache (for testing purposes)
 * @internal
 */
export function clearMetricsCache(): void {
  cache.clear();
}

/**
 * Custom hook for fetching and managing metrics data
 * Implements caching with 30s TTL and manual refresh
 */
export function useMetrics(
  releaseId: string,
  metricsService: MetricsService
): UseMetricsResult {
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [dauStats, setDauStats] = useState<DAUStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const isMountedRef = useRef<boolean>(true);

  const getCacheKey = (id: string, type: 'quality' | 'dau'): string => {
    return `metrics:${id}:${type}`;
  };

  const getCachedData = <T,>(id: string, type: 'quality' | 'dau'): T | null => {
    const key = getCacheKey(id, type);
    const cached = cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  };

  const setCachedData = <T,>(id: string, type: 'quality' | 'dau', data: T): void => {
    const key = getCacheKey(id, type);
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  const fetchMetrics = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check cache first
      const cachedQuality = getCachedData<QualityMetrics>(id, 'quality');
      const cachedDau = getCachedData<DAUStats>(id, 'dau');
      
      if (cachedQuality && cachedDau) {
        if (isMountedRef.current) {
          setQualityMetrics(cachedQuality);
          setDauStats(cachedDau);
          setIsLoading(false);
        }
        return;
      }
      
      // Fetch both metrics in parallel
      const [quality, dau] = await Promise.all([
        metricsService.getQualityMetrics(id),
        metricsService.getDAUStats(id),
      ]);
      
      if (isMountedRef.current) {
        setQualityMetrics(quality);
        setDauStats(dau);
        setCachedData(id, 'quality', quality);
        setCachedData(id, 'dau', dau);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
        setIsLoading(false);
      }
    }
  }, [metricsService]);

  const refresh = useCallback(async () => {
    // Clear cache for current release metrics
    const qualityKey = getCacheKey(releaseId, 'quality');
    const dauKey = getCacheKey(releaseId, 'dau');
    cache.delete(qualityKey);
    cache.delete(dauKey);
    
    await fetchMetrics(releaseId);
  }, [releaseId, fetchMetrics]);

  // Fetch metrics when releaseId changes
  useEffect(() => {
    if (releaseId) {
      fetchMetrics(releaseId);
    }
  }, [releaseId, fetchMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    qualityMetrics,
    dauStats,
    isLoading,
    error,
    refresh,
  };
}
