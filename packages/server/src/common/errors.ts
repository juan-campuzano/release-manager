/**
 * Custom error types for the Release Manager Tool
 */

/**
 * Base error class for all application errors
 */
export class ApplicationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for external integration failures (GitHub, Azure, etc.)
 */
export class IntegrationError extends ApplicationError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    public readonly errors: string[] = []
  ) {
    super(message);
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error for concurrent modification conflicts
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error for configuration parsing failures
 */
export class ParseError extends ApplicationError {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
