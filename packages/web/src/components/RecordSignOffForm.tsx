import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SignOffInput } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useNotification } from '../contexts/NotificationContext';
import styles from './RecordSignOffForm.module.css';

const signOffSchema = z.object({
  squad: z.string().min(1, 'Squad is required'),
  approverName: z.string().min(1, 'Approver name is required'),
  comments: z.string()
});

type SignOffFormData = z.infer<typeof signOffSchema>;

interface RecordSignOffFormProps {
  releaseId: string;
  requiredSquads: string[];
  onSuccess?: () => void;
}

export function RecordSignOffForm({ releaseId, requiredSquads, onSuccess }: RecordSignOffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { releaseService } = useServices();
  const { success, error } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SignOffFormData>({
    resolver: zodResolver(signOffSchema),
    defaultValues: {
      squad: requiredSquads[0] || '',
      comments: ''
    }
  });

  const onSubmit = async (data: SignOffFormData) => {
    setIsSubmitting(true);

    try {
      await releaseService.recordSignOff(releaseId, data as SignOffInput);
      success('Sign-off recorded successfully', 3000);
      reset();
      onSuccess?.();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to record sign-off', null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="squad" className={styles.label}>
          Squad *
        </label>
        <select
          id="squad"
          {...register('squad')}
          className={styles.select}
          disabled={isSubmitting}
        >
          {requiredSquads.map((squad) => (
            <option key={squad} value={squad}>
              {squad}
            </option>
          ))}
        </select>
        {errors.squad && (
          <span className={styles.error}>{errors.squad.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="approverName" className={styles.label}>
          Approver Name *
        </label>
        <input
          id="approverName"
          type="text"
          {...register('approverName')}
          className={styles.input}
          disabled={isSubmitting}
        />
        {errors.approverName && (
          <span className={styles.error}>{errors.approverName.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="comments" className={styles.label}>
          Comments
        </label>
        <textarea
          id="comments"
          {...register('comments')}
          className={styles.textarea}
          rows={3}
          disabled={isSubmitting}
          placeholder="Optional comments..."
        />
        {errors.comments && (
          <span className={styles.error}>{errors.comments.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? 'Recording Sign-Off...' : 'Record Sign-Off'}
      </button>
    </form>
  );
}
