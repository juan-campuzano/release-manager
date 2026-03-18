import { useState, useEffect, useCallback, useRef } from 'react';
import { CIExecution } from '../types';
import { PipelineExecutionService } from '../services/PipelineExecutionService';
import { useAutoRefresh } from './useAutoRefresh';

const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

interface UsePipelineExecutionsResult {
  executions: CIExecution[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Custom hook for fetching and auto-refreshing CI pipeline executions.
 *
 * - Fetches on mount when `hasCiPipeline` is true
 * - Auto-refreshes every 60 seconds via useAutoRefresh
 * - Tracks isRefreshing separately from initial isLoading
 * - Supports manual refresh via the returned refresh function
 */
export function usePipelineExecutions(
  releaseId: string,
  service: PipelineExecutionService,
  hasCiPipeline: boolean
): UsePipelineExecutionsResult {
  const [executions, setExecutions] = useState<CIExecution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const hasFetchedRef = useRef<boolean>(false);

  // Initial fetch on mount
  const fetchExecutions = useCallback(async () => {
    if (!hasCiPipeline) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await service.getExecutions(releaseId);
      if (isMountedRef.current) {
        setExecutions(data);
        hasFetchedRef.current = true;
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pipeline executions'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [releaseId, service, hasCiPipeline]);

  // Refresh fetch — uses isRefreshing instead of isLoading
  const refreshExecutions = useCallback(async () => {
    if (!hasCiPipeline) return;

    try {
      setIsRefreshing(true);
      setError(null);
      const data = await service.getExecutions(releaseId);
      if (isMountedRef.current) {
        setExecutions(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to refresh pipeline executions'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [releaseId, service, hasCiPipeline]);

  // Manual refresh function exposed to consumers
  const refresh = useCallback(() => {
    refreshExecutions();
  }, [refreshExecutions]);

  // Fetch on mount when hasCiPipeline is true
  useEffect(() => {
    if (hasCiPipeline) {
      fetchExecutions();
    }
  }, [hasCiPipeline, fetchExecutions]);

  // Auto-refresh every 60 seconds (only after initial fetch completes)
  useAutoRefresh(refreshExecutions, {
    interval: AUTO_REFRESH_INTERVAL,
    enabled: hasCiPipeline && hasFetchedRef.current && !isLoading,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    executions,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
