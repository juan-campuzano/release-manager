/**
 * Result type for error handling
 * Provides a type-safe way to handle success and failure cases
 */

export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  success: true;
  value: T;
}

export interface Failure<E> {
  success: false;
  error: E;
}

/**
 * Create a success result
 */
export function Success<T>(value: T): Success<T> {
  return { success: true, value };
}

/**
 * Create a failure result
 */
export function Failure<E>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Check if a result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

/**
 * Check if a result is a failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}
