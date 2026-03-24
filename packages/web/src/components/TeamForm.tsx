import { useState, FormEvent } from 'react';
import styles from './TeamForm.module.css';

interface TeamFormProps {
  onSubmit: (name: string) => Promise<void>;
}

export function TeamForm({ onSubmit }: TeamFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Team name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setName('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create team');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          disabled={isSubmitting}
          aria-label="Team name"
          aria-invalid={error ? 'true' : 'false'}
        />
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? 'Creating...' : 'Create Team'}
      </button>
    </form>
  );
}
