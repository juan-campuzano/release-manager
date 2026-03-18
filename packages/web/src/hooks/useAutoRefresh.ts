import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  interval: number; // milliseconds
  enabled: boolean;
}

/**
 * Custom hook for automatic interval-based callback execution
 * Supports enable/disable toggle for controlling auto-refresh behavior
 * 
 * @param callback - Function to execute at each interval
 * @param options - Configuration with interval duration and enabled flag
 * 
 * @example
 * // Auto-refresh every 60 seconds
 * useAutoRefresh(() => fetchData(), { interval: 60000, enabled: true });
 * 
 * @example
 * // Conditionally enable auto-refresh
 * useAutoRefresh(() => fetchData(), { interval: 30000, enabled: isActive });
 */
export function useAutoRefresh(
  callback: () => void,
  options: UseAutoRefreshOptions
): void {
  const { interval, enabled } = options;
  const savedCallback = useRef(callback);

  // Update the saved callback if it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't set up interval if not enabled
    if (!enabled) {
      return;
    }

    // Function to call the saved callback
    const tick = () => {
      savedCallback.current();
    };

    // Set up interval
    const id = setInterval(tick, interval);

    // Clean up interval on unmount or when dependencies change
    return () => {
      clearInterval(id);
    };
  }, [interval, enabled]);
}
