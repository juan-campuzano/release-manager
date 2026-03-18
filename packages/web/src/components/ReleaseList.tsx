import { useNavigate } from 'react-router-dom';
import { Release } from '../types';
import { ReleaseCard } from './ReleaseCard';
import styles from './ReleaseList.module.css';

interface ReleaseListProps {
  releases: Release[];
  isLoading: boolean;
}

/**
 * Release list component for displaying releases in a grid
 * 
 * Requirements: 3.2, 3.4
 */
export function ReleaseList({ releases, isLoading }: ReleaseListProps): JSX.Element {
  const navigate = useNavigate();

  console.log('[ReleaseList] Render - isLoading:', isLoading, 'releases count:', releases?.length, 'releases:', releases);

  if (isLoading) {
    return (
      <div className={styles.skeletonContainer}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
          </div>
        ))}
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No releases found</p>
      </div>
    );
  }

  return (
    <div className={styles.releaseList}>
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          onClick={() => navigate(`/releases/${release.id}`)}
        />
      ))}
    </div>
  );
}
