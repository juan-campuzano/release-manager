import { Release } from '../types';
import styles from './ReleaseCard.module.css';

interface ReleaseCardProps {
  release: Release;
  onClick: () => void;
}

/**
 * Release card component for displaying release summary
 * 
 * Requirements: 3.2
 */
export function ReleaseCard({ release, onClick }: ReleaseCardProps): JSX.Element {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Production':
        return styles.statusProduction;
      case 'Current':
        return styles.statusCurrent;
      case 'Upcoming':
        return styles.statusUpcoming;
      default:
        return '';
    }
  };

  return (
    <div 
      className={styles.releaseCard}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.header}>
        <div className={styles.platform}>{release.platform}</div>
        <div className={`${styles.status} ${getStatusColor(release.status)}`}>
          {release.status}
        </div>
      </div>
      
      <div className={styles.version}>
        <span className={styles.label}>Version:</span>
        <span className={styles.value}>{release.version}</span>
      </div>
      
      <div className={styles.stage}>
        <span className={styles.label}>Stage:</span>
        <span className={styles.value}>{release.currentStage}</span>
      </div>
      
      <div className={styles.rollout}>
        <span className={styles.label}>Rollout:</span>
        <div className={styles.rolloutBar}>
          <div 
            className={styles.rolloutProgress}
            style={{ width: `${release.rolloutPercentage}%` }}
          />
        </div>
        <span className={styles.rolloutPercentage}>{release.rolloutPercentage}%</span>
      </div>
    </div>
  );
}
