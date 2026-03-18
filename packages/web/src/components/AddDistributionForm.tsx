import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DistributionInput } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import styles from './AddDistributionForm.module.css';

const distributionSchema = z.object({
  channel: z.string().min(1, 'Channel name is required'),
  status: z.enum(['pending', 'submitted', 'approved', 'live'])
});

type DistributionFormData = z.infer<typeof distributionSchema>;

interface AddDistributionFormProps {
  releaseId: string;
  onSuccess?: () => void;
}

export function AddDistributionForm({ releaseId, onSuccess }: AddDistributionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { releaseService } = useServices();
  const { success, error } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<DistributionFormData>({
    resolver: zodResolver(distributionSchema),
    defaultValues: {
      status: 'pending'
    }
  });

  const onSubmit = async (data: DistributionFormData) => {
    setIsSubmitting(true);

    try {
      await releaseService.addDistribution(releaseId, data as DistributionInput);
      success('Distribution added successfully', 3000);
      reset();
      onSuccess?.();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to add distribution', null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="channel" className={styles.label}>
          Channel Name *
        </label>
        <input
          id="channel"
          type="text"
          {...register('channel')}
          className={styles.input}
          placeholder="e.g., App Store, Google Play"
          disabled={isSubmitting}
        />
        {errors.channel && (
          <span className={styles.error}>{errors.channel.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="status" className={styles.label}>
          Status *
        </label>
        <select
          id="status"
          {...register('status')}
          className={styles.select}
          disabled={isSubmitting}
        >
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="live">Live</option>
        </select>
        {errors.status && (
          <span className={styles.error}>{errors.status.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? 'Adding Distribution...' : 'Add Distribution'}
      </button>
    </form>
  );
}
