import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import styles from './BuildInfoForm.module.css';

interface BuildInfoFormProps {
  releaseId: string;
  latestBuild: string;
  latestPassingBuild: string;
  latestAppStoreBuild: string;
  onUpdate: (buildInfo: {
    latestBuild?: string;
    latestPassingBuild?: string;
    latestAppStoreBuild?: string;
  }) => Promise<void>;
  hasCiPipeline?: boolean;
}

export function BuildInfoForm({
  releaseId,
  latestBuild,
  latestPassingBuild,
  latestAppStoreBuild,
  onUpdate,
  hasCiPipeline = false,
}: BuildInfoFormProps) {
  const [build, setBuild] = useState(latestBuild);
  const [passingBuild, setPassingBuild] = useState(latestPassingBuild);
  const [appStoreBuild, setAppStoreBuild] = useState(latestAppStoreBuild);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onUpdate({
        latestBuild: build || undefined,
        latestPassingBuild: passingBuild || undefined,
        latestAppStoreBuild: appStoreBuild || undefined,
      });
      success('Build information updated', 3000);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to update build info', null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.title}>Update Build Information</h3>
      {hasCiPipeline && (
        <div className={styles.autoFetchNotice} role="status">
          <span className={styles.autoFetchIcon} aria-hidden="true">ℹ</span>
          Build information is being auto-fetched from the CI pipeline.
        </div>
      )}
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor={`build-${releaseId}`} className={styles.label}>Latest Build</label>
          <input
            id={`build-${releaseId}`}
            type="text"
            value={build}
            onChange={(e) => setBuild(e.target.value)}
            className={styles.input}
            placeholder="e.g. build-123"
            disabled={isSubmitting}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`passing-${releaseId}`} className={styles.label}>Latest Passing Build</label>
          <input
            id={`passing-${releaseId}`}
            type="text"
            value={passingBuild}
            onChange={(e) => setPassingBuild(e.target.value)}
            className={styles.input}
            placeholder="e.g. build-120"
            disabled={isSubmitting}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`appstore-${releaseId}`} className={styles.label}>Latest App Store Build</label>
          <input
            id={`appstore-${releaseId}`}
            type="text"
            value={appStoreBuild}
            onChange={(e) => setAppStoreBuild(e.target.value)}
            className={styles.input}
            placeholder="e.g. build-118"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Build Info'}
      </button>
    </form>
  );
}
