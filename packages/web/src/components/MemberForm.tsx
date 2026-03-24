import { useState, FormEvent } from 'react';
import styles from './MemberForm.module.css';

interface MemberFormProps {
  onSubmit: (name: string, email?: string) => Promise<void>;
}

export function MemberForm({ onSubmit }: MemberFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Member name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      await onSubmit(trimmedName, trimmedEmail || undefined);
      setName('');
      setEmail('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to add member');
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
          placeholder="Member name"
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          disabled={isSubmitting}
          aria-label="Member name"
          aria-invalid={error ? 'true' : 'false'}
        />
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
      <div className={styles.field}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className={styles.input}
          disabled={isSubmitting}
          aria-label="Member email"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? 'Adding...' : 'Add Member'}
      </button>
    </form>
  );
}
