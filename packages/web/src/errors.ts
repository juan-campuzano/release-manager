/**
 * Custom error classes for API operations
 */

/**
 * API Error - thrown when API returns an error response
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Network Error - thrown when network request fails
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Validation Error - thrown when form validation fails
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
