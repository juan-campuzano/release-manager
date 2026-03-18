/**
 * PipelineExecutionsPanel component
 *
 * Displays CI pipeline executions for a release with status badges,
 * auto-refresh support, and loading/error states.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { useEffect, useRef } from 'react';
import { CIExecution } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { usePipelineExecutions } from '../hooks/usePipelineExecutions';
import { formatDate } from '../utils/formatters';
import { LoadingSpinner } from './LoadingSpinner';
import styles from './PipelineExecutionsPanel.module.css';

interface PipelineExecutionsPanelProps {
  releaseId: string;
  hasCiPipeline: boolean;
  onRefresh?: () => void;
  /** Increment this value to trigger a refresh from the parent */
  refreshTrigger?: number;
}

const STATUS_CLASS_MAP: Record<CIExecution['status'], string> = {
  pending: styles.statusPending,
  running: styles.statusRunning,
  passed: styles.statusPassed,
  failed: styles.statusFailed,
};

export function PipelineExecutionsPanel({
  releaseId,
  hasCiPipeline,
  onRefresh,
  refreshTrigger,
}: PipelineExecutionsPanelProps) {
  const { pipelineExecutionService } = useServices();
  const { executions, isLoading, isRefreshing, error, refresh } =
    usePipelineExecutions(releaseId, pipelineExecutionService, hasCiPipeline);

  // Trigger refresh when refreshTrigger changes (from parent)
  const prevTriggerRef = useRef(refreshTrigger);
  useEffect(() => {
    if (refreshTrigger !== undefined && prevTriggerRef.current !== undefined && refreshTrigger !== prevTriggerRef.current) {
      refresh();
    }
    prevTriggerRef.current = refreshTrigger;
  }, [refreshTrigger, refresh]);

  if (!hasCiPipeline) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error loading pipeline executions: {error.message}</p>
        <button
          onClick={() => {
            refresh();
            onRefresh?.();
          }}
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  if (executions.length === 0) {
    return <div className={styles.empty}>No pipeline executions found</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Pipeline Executions</h3>
        {isRefreshing && (
          <span className={styles.refreshIndicator}>
            <LoadingSpinner size="small" />
            Refreshing…
          </span>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Run #</th>
            <th>Status</th>
            <th>Branch</th>
            <th>Commit</th>
            <th>Started At</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((execution) => (
            <tr key={execution.id}>
              <td>
                {execution.url ? (
                  <a href={execution.url} target="_blank" rel="noopener noreferrer" className={styles.runLink}>
                    {execution.runNumber}
                  </a>
                ) : (
                  execution.runNumber
                )}
              </td>
              <td>
                <span
                  className={`${styles.statusBadge} ${STATUS_CLASS_MAP[execution.status]}`}
                >
                  {execution.status}
                </span>
              </td>
              <td>{execution.branch}</td>
              <td>
                <span className={styles.commitSha}>
                  {execution.commitSha.substring(0, 7)}
                </span>
              </td>
              <td>{formatDate(execution.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
