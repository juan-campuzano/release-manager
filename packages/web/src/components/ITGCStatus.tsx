import { ITGCStatus as ITGCStatusType } from '../types';
import { formatDate } from '../utils/formatters';
import styles from './ITGCStatus.module.css';

interface ITGCStatusProps {
  status: ITGCStatusType;
}

export function ITGCStatus({ status }: ITGCStatusProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>ITGC Compliance Status</h3>
      
      <div className={styles.statusGrid}>
        <div className={styles.statusItem}>
          <span className={styles.label}>Compliance Status:</span>
          <span className={`${styles.badge} ${status.compliant ? styles.compliant : styles.nonCompliant}`}>
            {status.compliant ? '✓ Compliant' : '✗ Non-Compliant'}
          </span>
        </div>

        <div className={styles.statusItem}>
          <span className={styles.label}>Rollout Status:</span>
          <span className={`${styles.badge} ${status.rolloutComplete ? styles.complete : styles.incomplete}`}>
            {status.rolloutComplete ? '✓ Complete' : '○ Incomplete'}
          </span>
        </div>
      </div>

      {status.details && (
        <div className={styles.details}>
          <span className={styles.detailsLabel}>Details:</span>
          <p className={styles.detailsText}>{status.details}</p>
        </div>
      )}

      <div className={styles.timestamp}>
        Last checked: {formatDate(status.checkedAt)}
      </div>
    </div>
  );
}
