import { useState, useEffect } from 'react';
import { Distribution, DistributionStatus } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';
import styles from './DistributionList.module.css';

interface DistributionListProps {
  releaseId: string;
}

const STATUSES: DistributionStatus[] = ['pending', 'submitted', 'approved', 'live'];

export function DistributionList({ releaseId }: DistributionListProps) {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const { releaseService } = useServices();
  const { success, error: showError } = useNotification();

  const fetchDistributions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await releaseService.getDistributions(releaseId);
      setDistributions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch distributions'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributions();
  }, [releaseId]);

  const handleStatusUpdate = async (channel: string, newStatus: DistributionStatus) => {
    const distributionId = distributions.find(d => d.channel === channel)?.id;
    if (!distributionId) return;

    setUpdatingIds(prev => new Set(prev).add(distributionId));

    try {
      await releaseService.updateDistribution(releaseId, channel, newStatus);
      success(`Distribution status updated to "${newStatus}"`, 3000);
      await fetchDistributions();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update distribution status', null);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(distributionId);
        return next;
      });
    }
  };

  const getStatusClass = (status: DistributionStatus): string => {
    return styles[`status-${status}`];
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading distributions...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error loading distributions: {error.message}</p>
        <button onClick={fetchDistributions} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (distributions.length === 0) {
    return <div className={styles.empty}>No distributions found</div>;
  }

  return (
    <div className={styles.list}>
      {distributions.map((distribution) => (
        <div key={distribution.id} className={styles.distribution}>
          <div className={styles.header}>
            <h3 className={styles.channel}>{distribution.channel}</h3>
            <span className={`${styles.statusBadge} ${getStatusClass(distribution.status)}`}>
              {distribution.status}
            </span>
          </div>

          <div className={styles.controls}>
            <label htmlFor={`status-${distribution.id}`} className={styles.label}>
              Update Status:
            </label>
            <select
              id={`status-${distribution.id}`}
              value={distribution.status}
              onChange={(e) => handleStatusUpdate(distribution.channel, e.target.value as DistributionStatus)}
              disabled={updatingIds.has(distribution.id)}
              className={styles.select}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.metadata}>
            <span className={styles.metadataLabel}>Last Updated:</span>
            <span className={styles.metadataValue}>{formatDate(distribution.updatedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
