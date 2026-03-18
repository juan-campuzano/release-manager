import { useState, useEffect } from 'react';
import { SignOff } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { formatDate } from '../utils/formatters';
import styles from './SignOffList.module.css';

interface SignOffListProps {
  releaseId: string;
}

export function SignOffList({ releaseId }: SignOffListProps) {
  const [signOffs, setSignOffs] = useState<SignOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { releaseService } = useServices();

  const fetchSignOffs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await releaseService.getSignOffs(releaseId);
      setSignOffs(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sign-offs'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignOffs();
  }, [releaseId]);

  if (isLoading) {
    return <div className={styles.loading}>Loading sign-offs...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error loading sign-offs: {error.message}</p>
        <button onClick={fetchSignOffs} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (signOffs.length === 0) {
    return <div className={styles.empty}>No sign-offs found</div>;
  }

  return (
    <div className={styles.list}>
      {signOffs.map((signOff) => (
        <div
          key={signOff.id}
          className={`${styles.signOff} ${signOff.approved ? styles.approved : styles.pending}`}
        >
          <div className={styles.header}>
            <div className={styles.squadInfo}>
              <span className={styles.icon}>
                {signOff.approved ? '✓' : '⏳'}
              </span>
              <h3 className={styles.squad}>{signOff.squad}</h3>
            </div>
            <span className={`${styles.status} ${signOff.approved ? styles.statusApproved : styles.statusPending}`}>
              {signOff.approved ? 'Approved' : 'Pending'}
            </span>
          </div>

          {signOff.approved && (
            <div className={styles.details}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Approver:</span>
                <span className={styles.detailValue}>{signOff.approverName}</span>
              </div>
              {signOff.approvedAt && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Approved:</span>
                  <span className={styles.detailValue}>{formatDate(signOff.approvedAt)}</span>
                </div>
              )}
              {signOff.comments && (
                <div className={styles.comments}>
                  <span className={styles.detailLabel}>Comments:</span>
                  <p className={styles.commentText}>{signOff.comments}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
