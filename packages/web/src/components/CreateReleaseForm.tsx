import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Platform, ReleaseConfig, RepositoryConfig } from '../types';
import { useServices } from '../contexts/ServicesContext';
import styles from './CreateReleaseForm.module.css';

/**
 * Zod schema for release configuration validation
 * 
 * Requirements: 2.5, 2.6
 */
const releaseConfigSchema = z.object({
  platform: z.enum(['iOS', 'Android', 'Desktop'], {
    errorMap: () => ({ message: 'Please select a platform' }),
  }),
  version: z.string()
    .min(1, 'Version is required')
    .regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning format (e.g., 1.2.3)'),
  branchName: z.string().min(1, 'Branch name is required'),
  repositoryUrl: z.string()
    .min(1, 'Repository URL is required')
    .url('Must be a valid URL'),
  sourceType: z.enum(['github', 'azure'], {
    errorMap: () => ({ message: 'Please select a source type' }),
  }),
  requiredSquads: z.string()
    .min(1, 'At least one squad is required'),
  crashRateThreshold: z.coerce.number()
    .min(0, 'Crash rate threshold must be at least 0')
    .max(100, 'Crash rate threshold must be at most 100'),
  cpuExceptionRateThreshold: z.coerce.number()
    .min(0, 'CPU exception rate threshold must be at least 0')
    .max(100, 'CPU exception rate threshold must be at most 100'),
  rolloutStages: z.string()
    .min(1, 'At least one rollout stage is required'),
  ciPipelineId: z.string().optional(),
  analyticsProjectId: z.string().optional(),
});

type ReleaseConfigFormData = z.infer<typeof releaseConfigSchema>;

/**
 * Props for CreateReleaseForm component
 */
interface CreateReleaseFormProps {
  onSubmit: (config: ReleaseConfig) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * CreateReleaseForm component
 * 
 * Form for creating new releases with validation
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 16.3, 16.4, 16.5, 16.6
 */
const DEFAULT_FORM_VALUES: ReleaseConfigFormData = {
  platform: 'iOS',
  version: '',
  branchName: '',
  repositoryUrl: '',
  sourceType: 'github',
  requiredSquads: '',
  crashRateThreshold: 5,
  cpuExceptionRateThreshold: 5,
  rolloutStages: '1,10,50,100',
};

export function CreateReleaseForm({ onSubmit, isSubmitting }: CreateReleaseFormProps) {
  const { configService } = useServices();
  const [configs, setConfigs] = useState<RepositoryConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ReleaseConfigFormData>({
    resolver: zodResolver(releaseConfigSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    configService.getAll().then(setConfigs).catch(() => {
      // Silently handle fetch failure - dropdown will just be empty
    });
  }, [configService]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const configId = e.target.value;
    setSelectedConfigId(configId);

    if (!configId) {
      // "None" selected - reset to defaults
      setValue('repositoryUrl', DEFAULT_FORM_VALUES.repositoryUrl);
      setValue('sourceType', DEFAULT_FORM_VALUES.sourceType);
      setValue('requiredSquads', DEFAULT_FORM_VALUES.requiredSquads);
      setValue('crashRateThreshold', DEFAULT_FORM_VALUES.crashRateThreshold);
      setValue('cpuExceptionRateThreshold', DEFAULT_FORM_VALUES.cpuExceptionRateThreshold);
      setValue('rolloutStages', DEFAULT_FORM_VALUES.rolloutStages);
      setValue('ciPipelineId', '');
      setValue('analyticsProjectId', '');
      return;
    }

    const config = configs.find(c => c.id === configId);
    if (!config) return;

    setValue('repositoryUrl', config.repositoryUrl);
    setValue('sourceType', config.sourceType);
    setValue('requiredSquads', config.requiredSquads.join(', '));
    setValue('crashRateThreshold', config.qualityThresholds.crashRateThreshold);
    setValue('cpuExceptionRateThreshold', config.qualityThresholds.cpuExceptionRateThreshold);
    setValue('rolloutStages', config.rolloutStages.join(', '));
    if (config.ciPipelineId) {
      setValue('ciPipelineId', config.ciPipelineId);
    }
    if (config.analyticsProjectId) {
      setValue('analyticsProjectId', config.analyticsProjectId);
    }
  };

  const handleFormSubmit = async (data: ReleaseConfigFormData) => {
    // Parse comma-separated values
    const requiredSquads = data.requiredSquads
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const rolloutStagesStr = data.rolloutStages
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const rolloutStages = rolloutStagesStr.map(Number);
    
    // Validate rollout stages are valid numbers
    if (rolloutStages.some(s => isNaN(s) || s < 0 || s > 100)) {
      return;
    }

    const config: ReleaseConfig = {
      platform: data.platform as Platform,
      version: data.version,
      branchName: data.branchName,
      repositoryUrl: data.repositoryUrl,
      sourceType: data.sourceType,
      requiredSquads,
      qualityThresholds: {
        crashRateThreshold: data.crashRateThreshold,
        cpuExceptionRateThreshold: data.cpuExceptionRateThreshold,
      },
      rolloutStages,
      ...(selectedConfigId ? { repositoryConfigId: selectedConfigId } : {}),
      ...(data.ciPipelineId ? { ciPipelineId: data.ciPipelineId } : {}),
      ...(data.analyticsProjectId ? { analyticsProjectId: data.analyticsProjectId } : {}),
    };

    await onSubmit(config);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="repoConfig" className={styles.label}>
          Repository Configuration
        </label>
        <select
          id="repoConfig"
          className={styles.select}
          value={selectedConfigId}
          onChange={handleConfigChange}
          disabled={isSubmitting}
        >
          <option value="">None (manual entry)</option>
          {configs.map(config => (
            <option key={config.id} value={config.id}>
              {config.name}
            </option>
          ))}
        </select>
        <span className={styles.helpText}>
          Select a saved configuration to auto-populate fields
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="platform" className={styles.label}>
          Platform <span className={styles.required}>*</span>
        </label>
        <select
          id="platform"
          {...register('platform')}
          className={styles.select}
          disabled={isSubmitting}
          aria-invalid={errors.platform ? 'true' : 'false'}
        >
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
          <option value="Desktop">Desktop</option>
        </select>
        {errors.platform && (
          <span className={styles.error} role="alert">
            {errors.platform.message}
          </span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="version" className={styles.label}>
          Version <span className={styles.required}>*</span>
        </label>
        <input
          id="version"
          type="text"
          {...register('version')}
          className={styles.input}
          placeholder="1.0.0"
          disabled={isSubmitting}
          aria-invalid={errors.version ? 'true' : 'false'}
          aria-describedby="version-help"
        />
        <span id="version-help" className={styles.helpText}>
          Must follow semantic versioning (e.g., 1.2.3)
        </span>
        {errors.version && (
          <span className={styles.error} role="alert">
            {errors.version.message}
          </span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="branchName" className={styles.label}>
          Branch Name <span className={styles.required}>*</span>
        </label>
        <input
          id="branchName"
          type="text"
          {...register('branchName')}
          className={styles.input}
          placeholder="release/1.0.0"
          disabled={isSubmitting}
          aria-invalid={errors.branchName ? 'true' : 'false'}
        />
        {errors.branchName && (
          <span className={styles.error} role="alert">
            {errors.branchName.message}
          </span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="repositoryUrl" className={styles.label}>
          Repository URL <span className={styles.required}>*</span>
        </label>
        <input
          id="repositoryUrl"
          type="url"
          {...register('repositoryUrl')}
          className={styles.input}
          placeholder="https://github.com/org/repo"
          disabled={isSubmitting}
          aria-invalid={errors.repositoryUrl ? 'true' : 'false'}
        />
        {errors.repositoryUrl && (
          <span className={styles.error} role="alert">
            {errors.repositoryUrl.message}
          </span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="sourceType" className={styles.label}>
          Source Type <span className={styles.required}>*</span>
        </label>
        <select
          id="sourceType"
          {...register('sourceType')}
          className={styles.select}
          disabled={isSubmitting}
          aria-invalid={errors.sourceType ? 'true' : 'false'}
        >
          <option value="github">GitHub</option>
          <option value="azure">Azure DevOps</option>
        </select>
        {errors.sourceType && (
          <span className={styles.error} role="alert">
            {errors.sourceType.message}
          </span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="requiredSquads" className={styles.label}>
          Required Squads <span className={styles.required}>*</span>
        </label>
        <input
          id="requiredSquads"
          type="text"
          {...register('requiredSquads')}
          className={styles.input}
          placeholder="Squad A, Squad B, Squad C"
          disabled={isSubmitting}
          aria-invalid={errors.requiredSquads ? 'true' : 'false'}
          aria-describedby="squads-help"
        />
        <span id="squads-help" className={styles.helpText}>
          Comma-separated list of squad names
        </span>
        {errors.requiredSquads && (
          <span className={styles.error} role="alert">
            {errors.requiredSquads.message}
          </span>
        )}
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="crashRateThreshold" className={styles.label}>
            Crash Rate Threshold (%) <span className={styles.required}>*</span>
          </label>
          <input
            id="crashRateThreshold"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('crashRateThreshold')}
            className={styles.input}
            disabled={isSubmitting}
            aria-invalid={errors.crashRateThreshold ? 'true' : 'false'}
          />
          {errors.crashRateThreshold && (
            <span className={styles.error} role="alert">
              {errors.crashRateThreshold.message}
            </span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cpuExceptionRateThreshold" className={styles.label}>
            CPU Exception Rate Threshold (%) <span className={styles.required}>*</span>
          </label>
          <input
            id="cpuExceptionRateThreshold"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('cpuExceptionRateThreshold')}
            className={styles.input}
            disabled={isSubmitting}
            aria-invalid={errors.cpuExceptionRateThreshold ? 'true' : 'false'}
          />
          {errors.cpuExceptionRateThreshold && (
            <span className={styles.error} role="alert">
              {errors.cpuExceptionRateThreshold.message}
            </span>
          )}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="rolloutStages" className={styles.label}>
          Rollout Stages (%) <span className={styles.required}>*</span>
        </label>
        <input
          id="rolloutStages"
          type="text"
          {...register('rolloutStages')}
          className={styles.input}
          placeholder="1, 10, 50, 100"
          disabled={isSubmitting}
          aria-invalid={errors.rolloutStages ? 'true' : 'false'}
          aria-describedby="rollout-help"
        />
        <span id="rollout-help" className={styles.helpText}>
          Comma-separated percentages (0-100)
        </span>
        {errors.rolloutStages && (
          <span className={styles.error} role="alert">
            {errors.rolloutStages.message}
          </span>
        )}
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="ciPipelineId" className={styles.label}>
            CI Pipeline ID
          </label>
          <input
            id="ciPipelineId"
            type="text"
            {...register('ciPipelineId')}
            className={styles.input}
            placeholder="pipeline-123"
            disabled={isSubmitting}
          />
          <span className={styles.helpText}>
            Optional CI pipeline identifier
          </span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="analyticsProjectId" className={styles.label}>
            Analytics Project ID
          </label>
          <input
            id="analyticsProjectId"
            type="text"
            {...register('analyticsProjectId')}
            className={styles.input}
            placeholder="project-456"
            disabled={isSubmitting}
          />
          <span className={styles.helpText}>
            Optional analytics project identifier
          </span>
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
          aria-label="Create release"
        >
          {isSubmitting ? (
            <>
              <span className={styles.spinner} />
              Creating...
            </>
          ) : (
            'Create Release'
          )}
        </button>
      </div>
    </form>
  );
}
