/**
 * LoadingSpinner component
 * 
 * Reusable loading spinner with size variants
 * Requirements: 16.5, 16.6, 20.5
 */

import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function LoadingSpinner({ size = 'medium', className }: LoadingSpinnerProps): JSX.Element {
  return (
    <div 
      className={`${styles.spinner} ${styles[size]} ${className || ''}`}
      role="status"
      aria-label="Loading"
    >
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
}
