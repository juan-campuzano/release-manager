import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ITGCStatusInput } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import styles from './UpdateITGCForm.module.css';

const itgcSchema = z.object({
  compliant: z.boolean(),
  rolloutComplete: z.boolean(),
  details: z.string()
});

type ITGCFormData = z.infer<typeof itgcSchema>;

interface UpdateITGCFormProps {
  releaseId: string;
  currentStatus?: ITGCStatusInput;
  onSuccess?: () => void;
}

export function UpdateITGCForm({ releaseId, currentStatus, onSuccess }: UpdateITGCFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { releaseService } = useServices();
  const { success, error } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ITGCFormData>({
    resolver: zodResolver(itgcSchema),
    defaultValues: currentStatus || {
      compliant: false,
      rolloutComplete: false,
      details: ''
    }
  });

  const onSubmit = async (data: ITGCFormData) => {
    setIsSubmitting(true);

    try {
      await releaseService.updateITGCStatus(releaseId, data as ITGCStatusInput);
      success('ITGC status updated successfully', 3000);
      onSuccess?.();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to update ITGC status', null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.checkboxField}>
        <label htmlFor="compliant" className={styles.checkboxLabel}>
          <input
            id="compliant"
            type="checkbox"
            {...register('compliant')}
            className={styles.checkbox}
            disabled={isSubmitting}
          />
          <span>Compliant</span>
        </label>
        {errors.compliant && (
          <span className={styles.error}>{errors.compliant.message}</span>
        )}
      </div>

      <div className={styles.checkboxField}>
        <label htmlFor="rolloutComplete" className={styles.checkboxLabel}>
          <input
            id="rolloutComplete"
            type="checkbox"
            {...register('rolloutComplete')}
            className={styles.checkbox}
            disabled={isSubmitting}
          />
          <span>Rollout Complete</span>
        </label>
        {errors.rolloutComplete && (
          <span className={styles.error}>{errors.rolloutComplete.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="details" className={styles.label}>
          Details
        </label>
        <textarea
          id="details"
          {...register('details')}
          className={styles.textarea}
          rows={4}
          disabled={isSubmitting}
          placeholder="Enter compliance details..."
        />
        {errors.details && (
          <span className={styles.error}>{errors.details.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? 'Updating...' : 'Update ITGC Status'}
      </button>
    </form>
  );
}
