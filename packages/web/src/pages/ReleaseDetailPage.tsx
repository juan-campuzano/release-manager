import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { BackButton } from '../components/BackButton';
import { ReleaseHeader } from '../components/ReleaseHeader';
import { ReleaseInfo } from '../components/ReleaseInfo';
import { StageControl } from '../components/StageControl';
import { PipelineExecutionsPanel } from '../components/PipelineExecutionsPanel';
import { ReleaseTimeline } from '../components/ReleaseTimeline';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useRelease } from '../hooks/useRelease';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useServices } from '../contexts/ServicesContext';
import type { ReleaseStage, RepositoryConfig } from '../types';
import styles from './ReleaseDetailPage.module.css';

export function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { releaseService, configService } = useServices();
  const { release, isLoading, error, refresh } = useRelease(id!, releaseService);

  const [hasCiPipeline, setHasCiPipeline] = useState(false);
  const [pipelineRefreshTrigger, setPipelineRefreshTrigger] = useState(0);

  // Determine hasCiPipeline from the release's associated config
  useEffect(() => {
    let cancelled = false;

    async function checkCiPipeline() {
      if (!release?.repositoryConfigId) {
        setHasCiPipeline(false);
        return;
      }
      try {
        const config: RepositoryConfig = await configService.getById(release.repositoryConfigId);
        if (!cancelled) {
          setHasCiPipeline(!!config?.ciPipelineId);
        }
      } catch {
        if (!cancelled) {
          setHasCiPipeline(false);
        }
      }
    }

    checkCiPipeline();
    return () => { cancelled = true; };
  }, [release?.repositoryConfigId, configService]);

  const handleStageUpdate = useCallback(async (stage: ReleaseStage) => {
    await releaseService.updateStage(id!, stage);
    refresh();
  }, [id, releaseService, refresh]);

  const handleRefresh = useCallback(() => {
    refresh();
    setPipelineRefreshTrigger((prev) => prev + 1);
  }, [refresh]);

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
          <button onClick={handleRefresh} className={styles.retryButton}>
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
        <button onClick={handleRefresh} className={styles.refreshButton} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <ReleaseInfo release={release} />

      {hasCiPipeline && (
        <PipelineExecutionsPanel
          releaseId={release.id}
          hasCiPipeline={hasCiPipeline}
          refreshTrigger={pipelineRefreshTrigger}
        />
      )}

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
