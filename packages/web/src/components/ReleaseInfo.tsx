import { Release } from '../types';
import { formatDate } from '../utils/formatters';
import styles from './ReleaseInfo.module.css';

interface ReleaseInfoProps {
  release: Release;
}

export function ReleaseInfo({ release }: ReleaseInfoProps) {
  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Version Information</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Version:</span>
            <span className={styles.value}>{release.version}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Branch:</span>
            <span className={styles.value}>{release.branchName}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Repository:</span>
            <a href={release.repositoryUrl} className={styles.link} target="_blank" rel="noopener noreferrer">
              {release.repositoryUrl}
            </a>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Source Type:</span>
            <span className={styles.value}>{release.sourceType}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Build Information</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Latest Build:</span>
            <span className={styles.value}>{release.latestBuild || 'N/A'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Latest Passing Build:</span>
            <span className={styles.value}>{release.latestPassingBuild || 'N/A'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Latest App Store Build:</span>
            <span className={styles.value}>{release.latestAppStoreBuild || 'N/A'}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Release State</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Current Stage:</span>
            <span className={styles.value}>{release.currentStage}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{release.status}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Rollout Percentage:</span>
            <div className={styles.rolloutContainer}>
              <span className={styles.value}>{release.rolloutPercentage}%</span>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${release.rolloutPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Timestamps</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Created:</span>
            <span className={styles.value}>{formatDate(release.createdAt)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Last Updated:</span>
            <span className={styles.value}>{formatDate(release.updatedAt)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Last Synced:</span>
            <span className={styles.value}>{release.lastSyncedAt ? formatDate(release.lastSyncedAt) : 'N/A'}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
