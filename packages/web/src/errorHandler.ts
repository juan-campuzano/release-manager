import { AxiosError, isAxiosError } from 'axios';
import { APIError, NetworkError, ValidationError } from './errors';

/**
 * Check if an error is a network error (no response from server)
 */
export function isNetworkError(error: AxiosError): boolean {
  return !error.response && (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ENETUNREACH' ||
    error.message.toLowerCase().includes('network')
  );
}

/**
 * Transform Axios error into custom error types
 */
export function handleAPIError(error: unknown): Error {
  // If it's already one of our custom errors, return it
  if (error instanceof APIError || error instanceof NetworkError || error instanceof ValidationError) {
    return error;
  }

  // Handle Axios errors
  if (isAxiosError(error)) {
    // Network errors (no response from server)
    if (isNetworkError(error)) {
      return new NetworkError(
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    }

    // Server responded with an error
    if (error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data;

      // Validation errors (400)
      if (statusCode === 400 && responseData?.errors) {
        return new ValidationError(
          responseData.message || 'Validation failed',
          responseData.errors
        );
      }

      // Client errors (4xx)
      if (statusCode >= 400 && statusCode < 500) {
        return new APIError(
          responseData?.message || responseData?.error || 'Request failed',
          statusCode,
          responseData
        );
      }

      // Server errors (5xx)
      if (statusCode >= 500) {
        return new APIError(
          'An unexpected server error occurred. Please try again later.',
          statusCode,
          responseData
        );
      }

      // Other status codes
      return new APIError(
        responseData?.message || 'An error occurred',
        statusCode,
        responseData
      );
    }

    // Request was made but no response received (timeout, etc.)
    if (error.request) {
      return new NetworkError(
        'The request timed out. Please check your connection and try again.'
      );
    }
  }

  // Generic error fallback
  if (error instanceof Error) {
    return error;
  }

  // Unknown error type
  return new Error('An unexpected error occurred');
}

/**
 * Get user-friendly error message from error object
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof APIError) {
    // For 4xx errors, show the API message
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return error.message;
    }
    // For 5xx errors, show generic message
    return 'An unexpected server error occurred. Please try again later.';
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is retryable (for use in retry logic)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof APIError) {
    // Retry on specific status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.statusCode);
  }

  if (isAxiosError(error)) {
    // Network errors are retryable
    if (isNetworkError(error)) {
      return true;
    }

    // Specific status codes are retryable
    if (error.response) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.response.status);
    }
  }

  return false;
}
