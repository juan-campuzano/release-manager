/**
 * TimelineEmptyState component
 *
 * Displays a helpful message when a release has no timeline events.
 * Optionally shows the release creation date as a reference point.
 * Requirements: 12.1, 12.2, 12.3
 */

import { formatAbsoluteTime } from '../utils/formatEventTimestamp';
import styles from './TimelineEmptyState.module.css';

interface TimelineEmptyStateProps {
  createdAt?: string;
  className?: string;
}

export function TimelineEmptyState({ createdAt, className }: TimelineEmptyStateProps): JSX.Element {
  return (
    <div className={`${styles.container} ${className || ''}`} role="status">
      <p className={styles.message}>
        No events yet. Events will appear as the release progresses.
      </p>
      {createdAt && (
        <p className={styles.createdAt}>
          Release created on{' '}
          <time dateTime={createdAt}>{formatAbsoluteTime(createdAt)}</time>
        </p>
      )}
    </div>
  );
}
