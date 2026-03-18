import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BlockerInput } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import styles from './AddBlockerForm.module.css';

const blockerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['critical', 'high', 'medium']),
  assignee: z.string().min(1, 'Assignee is required'),
  issueUrl: z.string().url('Must be a valid URL')
});

type BlockerFormData = z.infer<typeof blockerSchema>;

interface AddBlockerFormProps {
  releaseId: string;
  onSuccess?: () => void;
}

export function AddBlockerForm({ releaseId, onSuccess }: AddBlockerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { releaseService } = useServices();
  const { success, error } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<BlockerFormData>({
    resolver: zodResolver(blockerSchema),
    defaultValues: {
      severity: 'medium'
    }
  });

  const onSubmit = async (data: BlockerFormData) => {
    setIsSubmitting(true);

    try {
      await releaseService.addBlocker(releaseId, data as BlockerInput);
      success('Blocker added successfully', 3000);
      reset();
      onSuccess?.();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to add blocker', null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>
          Title *
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          className={styles.input}
          disabled={isSubmitting}
        />
        {errors.title && (
          <span className={styles.error}>{errors.title.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          Description *
        </label>
        <textarea
          id="description"
          {...register('description')}
          className={styles.textarea}
          rows={4}
          disabled={isSubmitting}
        />
        {errors.description && (
          <span className={styles.error}>{errors.description.message}</span>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="severity" className={styles.label}>
            Severity *
          </label>
          <select
            id="severity"
            {...register('severity')}
            className={styles.select}
            disabled={isSubmitting}
          >
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {errors.severity && (
            <span className={styles.error}>{errors.severity.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="assignee" className={styles.label}>
            Assignee *
          </label>
          <input
            id="assignee"
            type="text"
            {...register('assignee')}
            className={styles.input}
            disabled={isSubmitting}
          />
          {errors.assignee && (
            <span className={styles.error}>{errors.assignee.message}</span>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="issueUrl" className={styles.label}>
          Issue URL *
        </label>
        <input
          id="issueUrl"
          type="url"
          {...register('issueUrl')}
          className={styles.input}
          placeholder="https://..."
          disabled={isSubmitting}
        />
        {errors.issueUrl && (
          <span className={styles.error}>{errors.issueUrl.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? 'Adding Blocker...' : 'Add Blocker'}
      </button>
    </form>
  );
}
