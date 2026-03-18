import { Release } from '../types';
import styles from './ReleaseHeader.module.css';

interface ReleaseHeaderProps {
  release: Release;
}

export function ReleaseHeader({ release }: ReleaseHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>
          {release.platform} {release.version}
        </h1>
        <span className={`${styles.status} ${styles[`status-${release.status.toLowerCase()}`]}`}>
          {release.status}
        </span>
      </div>
    </div>
  );
}
