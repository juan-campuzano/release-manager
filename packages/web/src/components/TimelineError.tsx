/**
 * TimelineError component
 *
 * Displays an error message with a retry button when the timeline API request fails.
 * Requirements: 2.3
 */

import styles from './TimelineError.module.css';

interface TimelineErrorProps {
  error: Error;
  onRetry: () => void;
  className?: string;
}

export function TimelineError({ error, onRetry, className }: TimelineErrorProps): JSX.Element {
  return (
    <div className={`${styles.container} ${className || ''}`} role="alert">
      <p className={styles.message}>{error.message || 'Unable to load timeline events.'}</p>
      <button className={styles.retryButton} onClick={onRetry} type="button">
        Retry
      </button>
    </div>
  );
}
