import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Login form data type
 */
type LoginFormData = z.infer<typeof loginSchema>;

/**
 * LoginPage component
 * 
 * Provides a login form with username and password fields.
 * Handles authentication and redirects to dashboard on success.
 * 
 * Requirements: 19.1, 19.2, 19.5
 */
export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(data.username, data.password);
      // Redirect to dashboard on successful login
      navigate('/');
    } catch (error) {
      // Display error message
      if (error instanceof Error) {
        setErrorMessage(error.message || 'Login failed. Please check your credentials.');
      } else {
        setErrorMessage('Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Release Manager</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Username field */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              {...register('username')}
              disabled={isSubmitting}
              autoComplete="username"
            />
            {errors.username && (
              <span className={styles.errorText} role="alert">
                {errors.username.message}
              </span>
            )}
          </div>

          {/* Password field */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && (
              <span className={styles.errorText} role="alert">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Error message display */}
          {errorMessage && (
            <div className={styles.errorMessage} role="alert" aria-live="polite">
              {errorMessage}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
            aria-label="Sign in"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
