import { TagDetectionInfo } from '../types';
import { formatDate } from '../utils/formatters';
import styles from './TagDetectionStatus.module.css';

interface TagDetectionStatusProps {
  tagStatus: TagDetectionInfo | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function TagDetectionStatus({ tagStatus, isLoading, error }: TagDetectionStatusProps) {
  if (!tagStatus || !tagStatus.active) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.statusIndicator} />
          <h3 className={styles.title}>Tag Detection</h3>
        </div>
        <p className={styles.watching}>Loading tag status…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.statusIndicator} />
          <h3 className={styles.title}>Tag Detection</h3>
        </div>
        <p className={styles.error}>Failed to load tag status</p>
      </div>
    );
  }

  const hasDetectedTag = tagStatus.lastDetectedTag !== null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.statusIndicator} />
        <h3 className={styles.title}>Tag Detection</h3>
      </div>

      {hasDetectedTag ? (
        <>
          <div className={styles.statusItem}>
            <span className={styles.label}>Last Detected Tag</span>
            <span className={styles.tagName}>{tagStatus.lastDetectedTag}</span>
          </div>
          {tagStatus.lastCheckAt && (
            <div className={styles.statusItem}>
              <span className={styles.label}>Last Check</span>
              <span className={styles.timestamp}>{formatDate(tagStatus.lastCheckAt)}</span>
            </div>
          )}
        </>
      ) : (
        <p className={styles.watching}>Watching for tags...</p>
      )}
    </div>
  );
}
