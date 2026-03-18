import { useState } from 'react';
import { Platform, ReleaseConfig, Release } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useReleases } from '../hooks/useReleases';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useNotification } from '../contexts/NotificationContext';
import { PlatformFilter } from '../components/PlatformFilter';
import { ReleaseList } from '../components/ReleaseList';
import { CreateReleaseForm } from '../components/CreateReleaseForm';
import styles from './DashboardPage.module.css';

/**
 * Dashboard page component
 * 
 * Displays active releases with platform filtering and auto-refresh
 * Provides form for creating new releases
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 15.1, 15.2, 15.3, 16.3, 16.4, 16.5, 16.6, 20.1, 20.2, 20.3, 20.5, 20.6
 */
export function DashboardPage() {
  const { releaseService } = useServices();
  const { releases, isLoading, error, refresh, filterByPlatform } = useReleases(releaseService);
  const { success, error: showError } = useNotification();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRelease, setCreatedRelease] = useState<Release | null>(null);

  // Auto-refresh every 60 seconds
  useAutoRefresh(() => {
    refresh().then(() => setLastUpdated(new Date()));
  }, { interval: 60000, enabled: true });

  const handlePlatformChange = (platform: Platform | null) => {
    setSelectedPlatform(platform);
    filterByPlatform(platform);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdated = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCreateRelease = async (config: ReleaseConfig) => {
    setIsSubmitting(true);
    setCreatedRelease(null);
    
    try {
      const newRelease = await releaseService.createRelease(config);
      success('Release created successfully');
      setCreatedRelease(newRelease);
      setShowCreateForm(false);
      await refresh();
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create release';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('[DashboardPage] Render - isLoading:', isLoading, 'releases count:', releases?.length, 'error:', error);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Active Releases</h1>
        <div className={styles.controls}>
          <span className={styles.lastUpdated}>
            Last updated: {formatLastUpdated(lastUpdated)}
          </span>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setShowCreateForm(!showCreateForm)}
            aria-label={showCreateForm ? 'Hide create release form' : 'Show create release form'}
            aria-expanded={showCreateForm}
          >
            {showCreateForm ? 'Cancel' : 'Create Release'}
          </button>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh releases"
          >
            {isRefreshing ? (
              <>
                <span className={styles.spinner} />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          Failed to load releases: {error.message}
        </div>
      )}

      {showCreateForm && (
        <div className={styles.createFormContainer}>
          <h2 className={styles.formTitle}>Create New Release</h2>
          <CreateReleaseForm onSubmit={handleCreateRelease} isSubmitting={isSubmitting} />
        </div>
      )}

      {createdRelease && (
        <div className={styles.successMessage} role="status">
          <h3>Release Created Successfully</h3>
          <div className={styles.releaseDetails}>
            <p><strong>Platform:</strong> {createdRelease.platform}</p>
            <p><strong>Version:</strong> {createdRelease.version}</p>
            <p><strong>Branch:</strong> {createdRelease.branchName}</p>
            <p><strong>Status:</strong> {createdRelease.status}</p>
            <p><strong>Stage:</strong> {createdRelease.currentStage}</p>
          </div>
        </div>
      )}

      <PlatformFilter
        selectedPlatform={selectedPlatform}
        onPlatformChange={handlePlatformChange}
      />

      <ReleaseList releases={releases} isLoading={isLoading} />
    </div>
  );
}
