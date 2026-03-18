import { useState, useEffect } from 'react';
import { Blocker } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';
import styles from './BlockerList.module.css';

interface BlockerListProps {
  releaseId: string;
}

export function BlockerList({ releaseId }: BlockerListProps) {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const { releaseService } = useServices();
  const { success, error: showError } = useNotification();

  const fetchBlockers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await releaseService.getBlockers(releaseId);
      setBlockers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch blockers'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockers();
  }, [releaseId]);

  const handleResolve = async (blockerId: string) => {
    setResolvingIds(prev => new Set(prev).add(blockerId));

    try {
      await releaseService.resolveBlocker(releaseId, blockerId);
      success('Blocker resolved successfully', 3000);
      await fetchBlockers();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to resolve blocker', null);
    } finally {
      setResolvingIds(prev => {
        const next = new Set(prev);
        next.delete(blockerId);
        return next;
      });
    }
  };

  const getSeverityClass = (severity: string): string => {
    return styles[`severity-${severity}`];
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading blockers...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error loading blockers: {error.message}</p>
        <button onClick={fetchBlockers} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (blockers.length === 0) {
    return <div className={styles.empty}>No blockers found</div>;
  }

  return (
    <div className={styles.list}>
      {blockers.map((blocker) => (
        <div
          key={blocker.id}
          className={`${styles.blocker} ${blocker.resolved ? styles.resolved : ''}`}
        >
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>{blocker.title}</h3>
              <span className={`${styles.severity} ${getSeverityClass(blocker.severity)}`}>
                {blocker.severity}
              </span>
            </div>
            {!blocker.resolved && (
              <button
                onClick={() => handleResolve(blocker.id)}
                disabled={resolvingIds.has(blocker.id)}
                className={styles.resolveButton}
              >
                {resolvingIds.has(blocker.id) ? 'Resolving...' : 'Resolve'}
              </button>
            )}
          </div>

          <p className={styles.description}>{blocker.description}</p>

          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Assignee:</span>
              <span className={styles.metadataValue}>{blocker.assignee}</span>
            </div>
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Issue:</span>
              <a
                href={blocker.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                View Issue
              </a>
            </div>
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Created:</span>
              <span className={styles.metadataValue}>{formatDate(blocker.createdAt)}</span>
            </div>
            {blocker.resolvedAt && (
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>Resolved:</span>
                <span className={styles.metadataValue}>{formatDate(blocker.resolvedAt)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
