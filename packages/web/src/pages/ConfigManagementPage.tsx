import { useState, useEffect, FormEvent } from 'react';
import { RepositoryConfig } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import styles from './ConfigManagementPage.module.css';

interface ConfigFormData {
  name: string;
  repositoryUrl: string;
  sourceType: 'github' | 'azure';
  requiredSquads: string;
  crashRateThreshold: string;
  cpuExceptionRateThreshold: string;
  rolloutStages: string;
  ciPipelineId: string;
  analyticsProjectId: string;
}

const emptyFormData: ConfigFormData = {
  name: '',
  repositoryUrl: '',
  sourceType: 'github',
  requiredSquads: '',
  crashRateThreshold: '',
  cpuExceptionRateThreshold: '',
  rolloutStages: '',
  ciPipelineId: '',
  analyticsProjectId: '',
};

function configToFormData(config: RepositoryConfig): ConfigFormData {
  return {
    name: config.name,
    repositoryUrl: config.repositoryUrl,
    sourceType: config.sourceType,
    requiredSquads: config.requiredSquads.join(', '),
    crashRateThreshold: String(config.qualityThresholds.crashRateThreshold),
    cpuExceptionRateThreshold: String(config.qualityThresholds.cpuExceptionRateThreshold),
    rolloutStages: config.rolloutStages.join(', '),
    ciPipelineId: config.ciPipelineId ?? '',
    analyticsProjectId: config.analyticsProjectId ?? '',
  };
}

/**
 * ConfigManagementPage component
 *
 * Displays a table of all repository configurations with CRUD operations.
 * Provides a form to create/edit configs and confirmation dialog for deletes.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export function ConfigManagementPage() {
  const { configService } = useServices();
  const { success, error: showError } = useNotification();

  const [configs, setConfigs] = useState<RepositoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RepositoryConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>(emptyFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RepositoryConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoadError(null);
      const data = await configService.getAll();
      setConfigs(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load configurations';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleShowCreateForm = () => {
    setEditingConfig(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const handleEdit = (config: RepositoryConfig) => {
    setEditingConfig(config);
    setFormData(configToFormData(config));
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingConfig(null);
    setFormData(emptyFormData);
  };

  const handleFormChange = (field: keyof ConfigFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        repositoryUrl: formData.repositoryUrl.trim(),
        sourceType: formData.sourceType,
        requiredSquads: formData.requiredSquads.split(',').map(s => s.trim()).filter(Boolean),
        qualityThresholds: {
          crashRateThreshold: Number(formData.crashRateThreshold),
          cpuExceptionRateThreshold: Number(formData.cpuExceptionRateThreshold),
        },
        rolloutStages: formData.rolloutStages.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)),
        ...(formData.ciPipelineId.trim() ? { ciPipelineId: formData.ciPipelineId.trim() } : {}),
        ...(formData.analyticsProjectId.trim() ? { analyticsProjectId: formData.analyticsProjectId.trim() } : {}),
      };

      if (editingConfig) {
        await configService.update(editingConfig.id, payload);
        success('Configuration updated successfully');
      } else {
        await configService.create(payload);
        success('Configuration created successfully');
      }

      setShowForm(false);
      setEditingConfig(null);
      setFormData(emptyFormData);
      await fetchConfigs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save configuration';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (config: RepositoryConfig) => {
    setDeleteTarget(config);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await configService.delete(deleteTarget.id);
      success('Configuration deleted successfully');
      setDeleteTarget(null);
      await fetchConfigs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete configuration';
      showError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Repository Configurations</h1>
        <button
          type="button"
          className={styles.createButton}
          onClick={showForm ? handleCancelForm : handleShowCreateForm}
          aria-label={showForm ? 'Cancel' : 'Create new configuration'}
        >
          {showForm ? 'Cancel' : 'Create New Configuration'}
        </button>
      </div>

      {loadError && (
        <div className={styles.errorMessage} role="alert">
          {loadError}
        </div>
      )}

      {showForm && (
        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>
            {editingConfig ? 'Edit Configuration' : 'Create New Configuration'}
          </h2>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-name">Name</label>
                <input
                  id="config-name"
                  className={styles.input}
                  type="text"
                  value={formData.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g. My Repo Config"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-repo-url">Repository URL</label>
                <input
                  id="config-repo-url"
                  className={styles.input}
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={e => handleFormChange('repositoryUrl', e.target.value)}
                  required
                  placeholder="https://github.com/org/repo"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-source-type">Source Type</label>
                <select
                  id="config-source-type"
                  className={styles.select}
                  value={formData.sourceType}
                  onChange={e => handleFormChange('sourceType', e.target.value)}
                >
                  <option value="github">GitHub</option>
                  <option value="azure">Azure</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-squads">Required Squads</label>
                <input
                  id="config-squads"
                  className={styles.input}
                  type="text"
                  value={formData.requiredSquads}
                  onChange={e => handleFormChange('requiredSquads', e.target.value)}
                  required
                  placeholder="squad1, squad2"
                />
                <p className={styles.helpText}>Comma-separated list of squad names</p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-crash-rate">Crash Rate Threshold (%)</label>
                <input
                  id="config-crash-rate"
                  className={styles.input}
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={formData.crashRateThreshold}
                  onChange={e => handleFormChange('crashRateThreshold', e.target.value)}
                  required
                  placeholder="0-100"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-cpu-rate">CPU Exception Rate Threshold (%)</label>
                <input
                  id="config-cpu-rate"
                  className={styles.input}
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={formData.cpuExceptionRateThreshold}
                  onChange={e => handleFormChange('cpuExceptionRateThreshold', e.target.value)}
                  required
                  placeholder="0-100"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="config-rollout-stages">Rollout Stages (%)</label>
              <input
                id="config-rollout-stages"
                className={styles.input}
                type="text"
                value={formData.rolloutStages}
                onChange={e => handleFormChange('rolloutStages', e.target.value)}
                required
                placeholder="1, 5, 10, 50, 100"
              />
              <p className={styles.helpText}>Comma-separated list of rollout percentages (0-100)</p>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-ci-pipeline">CI Pipeline ID (optional)</label>
                <input
                  id="config-ci-pipeline"
                  className={styles.input}
                  type="text"
                  value={formData.ciPipelineId}
                  onChange={e => handleFormChange('ciPipelineId', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="config-analytics">Analytics Project ID (optional)</label>
                <input
                  id="config-analytics"
                  className={styles.input}
                  type="text"
                  value={formData.analyticsProjectId}
                  onChange={e => handleFormChange('analyticsProjectId', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingConfig
                    ? 'Update Configuration'
                    : 'Create Configuration'}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancelForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <div className={styles.loading}>Loading configurations...</div>}

      {!isLoading && configs.length === 0 && !loadError && (
        <div className={styles.emptyState}>
          No repository configurations found. Create one to get started.
        </div>
      )}

      {!isLoading && configs.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Repository URL</th>
                <th>Source Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(config => (
                <tr key={config.id}>
                  <td>{config.name}</td>
                  <td>{config.repositoryUrl}</td>
                  <td>{config.sourceType}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => handleEdit(config)}
                        aria-label={`Edit ${config.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeleteClick(config)}
                        aria-label={`Delete ${config.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className={styles.dialog}>
            <h3 id="delete-dialog-title" className={styles.dialogTitle}>Delete Configuration</h3>
            <p className={styles.dialogMessage}>
              Are you sure you want to delete &quot;{deleteTarget.name}&quot;? This action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
