import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { BackButton } from '../components/BackButton';
import { ReleaseHeader } from '../components/ReleaseHeader';
import { ReleaseInfo } from '../components/ReleaseInfo';
import { StageControl } from '../components/StageControl';
import { BuildInfoForm } from '../components/BuildInfoForm';
import { ReleaseTimeline } from '../components/ReleaseTimeline';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useRelease } from '../hooks/useRelease';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useServices } from '../contexts/ServicesContext';
import type { ReleaseStage } from '../types';
import styles from './ReleaseDetailPage.module.css';

export function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { releaseService } = useServices();
  const { release, isLoading, error, refresh } = useRelease(id!, releaseService);

  const handleStageUpdate = useCallback(async (stage: ReleaseStage) => {
    await releaseService.updateStage(id!, stage);
    refresh();
  }, [id, releaseService, refresh]);

  const handleBuildInfoUpdate = useCallback(async (buildInfo: {
    latestBuild?: string;
    latestPassingBuild?: string;
    latestAppStoreBuild?: string;
  }) => {
    await releaseService.updateBuildInfo(id!, buildInfo);
    refresh();
  }, [id, releaseService, refresh]);

  // Auto-refresh every 30 seconds
  useAutoRefresh(refresh, { interval: 30000, enabled: !isLoading && !error });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Breadcrumb />
        <BackButton to="/" label="Back to Releases" />
        <div className={styles.loading}>Loading release details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Breadcrumb />
        <BackButton to="/" label="Back to Releases" />
        <div className={styles.error}>
          <h2>Error Loading Release</h2>
          <p>{error.message}</p>
          <button onClick={refresh} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className={styles.container}>
        <Breadcrumb />
        <BackButton to="/" label="Back to Releases" />
        <div className={styles.error}>
          <h2>Release Not Found</h2>
          <p>The release you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Breadcrumb />
      <BackButton to="/" label="Back to Releases" />
      
      <div className={styles.header}>
        <ReleaseHeader release={release} />
        <button onClick={refresh} className={styles.refreshButton} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <ReleaseInfo release={release} />

      <BuildInfoForm
        releaseId={release.id}
        latestBuild={release.latestBuild}
        latestPassingBuild={release.latestPassingBuild}
        latestAppStoreBuild={release.latestAppStoreBuild}
        onUpdate={handleBuildInfoUpdate}
      />

      <StageControl
        releaseId={release.id}
        currentStage={release.currentStage}
        onUpdate={handleStageUpdate}
      />

      <ErrorBoundary>
        <ReleaseTimeline releaseId={release.id} />
      </ErrorBoundary>
    </div>
  );
}
