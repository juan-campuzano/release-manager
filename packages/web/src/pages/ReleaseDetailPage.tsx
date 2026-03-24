import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { BackButton } from '../components/BackButton';
import { ReleaseHeader } from '../components/ReleaseHeader';
import { CardGrid } from '../components/CardGrid';
import { InfoCard } from '../components/InfoCard';
import type { InfoCardField } from '../components/InfoCard';
import { PipelineExecutionsPanel } from '../components/PipelineExecutionsPanel';
import { TagDetectionStatus } from '../components/TagDetectionStatus';
import { ReleaseTimeline } from '../components/ReleaseTimeline';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useRelease } from '../hooks/useRelease';
import { useTagStatus } from '../hooks/useTagStatus';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useServices } from '../contexts/ServicesContext';
import { formatDate } from '../utils/formatters';
import type { RepositoryConfig } from '../types';
import styles from './ReleaseDetailPage.module.css';

export function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { releaseService, configService, tagStatusService } = useServices();
  const { release, isLoading, isRefreshing, error, refresh } = useRelease(id!, releaseService);

  const [hasCiPipeline, setHasCiPipeline] = useState(false);
  const [pipelineRefreshTrigger, setPipelineRefreshTrigger] = useState(0);

  const { tagStatus, isLoading: tagLoading, error: tagError } = useTagStatus(id!, tagStatusService, true);

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

  const versionFields: InfoCardField[] = [
    { label: 'Version', value: release.version },
    { label: 'Branch', value: release.branchName },
    { label: 'Repository', value: release.repositoryUrl, href: release.repositoryUrl },
    { label: 'Source Type', value: release.sourceType },
  ];

  const buildFields: InfoCardField[] = [
    { label: 'Latest Build', value: release.latestBuild },
    { label: 'Latest Passing Build', value: release.latestPassingBuild },
    { label: 'Latest App Store Build', value: release.latestAppStoreBuild },
  ];

  const stateFields: InfoCardField[] = [
    { label: 'Current Stage', value: release.currentStage },
    { label: 'Status', value: release.status },
    { label: 'Rollout Percentage', value: `${release.rolloutPercentage}%` },
  ];

  const timestampFields: InfoCardField[] = [
    { label: 'Created', value: formatDate(release.createdAt) },
    { label: 'Last Updated', value: formatDate(release.updatedAt) },
    { label: 'Last Synced', value: release.lastSyncedAt ? formatDate(release.lastSyncedAt) : null },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumb />
      <BackButton to="/" label="Back to Releases" />

      <div className={styles.header}>
        <ReleaseHeader release={release} />
        <button onClick={handleRefresh} className={styles.refreshButton} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <CardGrid>
        <InfoCard title="Version Information" fields={versionFields} />
        <InfoCard title="Build Information" fields={buildFields} />
        <InfoCard title="Release State" fields={stateFields} />
        <InfoCard title="Timestamps" fields={timestampFields} />
      </CardGrid>

      <TagDetectionStatus tagStatus={tagStatus} isLoading={tagLoading} error={tagError} />

      {hasCiPipeline && (
        <PipelineExecutionsPanel
          releaseId={release.id}
          hasCiPipeline={hasCiPipeline}
          refreshTrigger={pipelineRefreshTrigger}
        />
      )}

      <ErrorBoundary>
        <ReleaseTimeline releaseId={release.id} />
      </ErrorBoundary>
    </div>
  );
}
