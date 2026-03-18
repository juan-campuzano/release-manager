import { useState, useEffect, useCallback, useRef } from 'react';
import { TagDetectionInfo } from '../types';
import { TagStatusService } from '../services/TagStatusService';
import { useAutoRefresh } from './useAutoRefresh';

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

interface UseTagStatusResult {
  tagStatus: TagDetectionInfo | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Custom hook for fetching and auto-refreshing tag detection status for a release.
 *
 * - Fetches on mount only when `isActive` is true
 * - Auto-refreshes every 30 seconds via useAutoRefresh
 * - Supports manual refresh via the returned refresh function
 */
export function useTagStatus(
  releaseId: string,
  service: TagStatusService,
  isActive: boolean
): UseTagStatusResult {
  const [tagStatus, setTagStatus] = useState<TagDetectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const hasFetchedRef = useRef<boolean>(false);

  const fetchTagStatus = useCallback(async () => {
    if (!isActive) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await service.getTagStatus(releaseId);
      if (isMountedRef.current) {
        setTagStatus(data);
        hasFetchedRef.current = true;
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tag status'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [releaseId, service, isActive]);

  const refreshTagStatus = useCallback(async () => {
    if (!isActive) return;

    try {
      setError(null);
      const data = await service.getTagStatus(releaseId);
      if (isMountedRef.current) {
        setTagStatus(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to refresh tag status'));
      }
    }
  }, [releaseId, service, isActive]);

  const refresh = useCallback(() => {
    refreshTagStatus();
  }, [refreshTagStatus]);

  // Fetch on mount when isActive is true
  useEffect(() => {
    if (isActive) {
      fetchTagStatus();
    }
  }, [isActive, fetchTagStatus]);

  // Auto-refresh every 30 seconds (only after initial fetch completes)
  useAutoRefresh(refreshTagStatus, {
    interval: AUTO_REFRESH_INTERVAL,
    enabled: isActive && hasFetchedRef.current && !isLoading,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    tagStatus,
    isLoading,
    error,
    refresh,
  };
}
