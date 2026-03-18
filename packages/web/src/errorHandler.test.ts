import { AxiosError } from 'axios';
import { 
  handleAPIError, 
  getUserErrorMessage, 
  isNetworkError, 
  isRetryableError 
} from './errorHandler';
import { APIError, NetworkError, ValidationError } from './errors';

describe('errorHandler', () => {
  describe('isNetworkError', () => {
    it('should detect network errors by error code', () => {
      const error = new AxiosError(
        'Connection aborted',
        'ECONNABORTED',
        undefined,
        undefined,
        undefined
      );

      expect(isNetworkError(error)).toBe(true);
    });

    it('should detect network errors by message', () => {
      const error = new AxiosError(
        'Network Error',
        undefined,
        undefined,
        undefined,
        undefined
      );

      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for errors with response', () => {
      const error = new AxiosError(
        'Request failed',
        undefined,
        undefined,
        undefined,
        { status: 500, data: {}, statusText: 'Internal Server Error', headers: {}, config: {} as any }
      );

      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('handleAPIError', () => {
    it('should return custom errors as-is', () => {
      const error = new NetworkError('Connection failed');
      expect(handleAPIError(error)).toBe(error);
    });

    it('should convert network errors', () => {
      const error = new AxiosError(
        'Connection aborted',
        'ECONNABORTED',
        undefined,
        undefined,
        undefined
      );

      const result = handleAPIError(error);
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toContain('Unable to connect');
    });

    it('should convert 400 validation errors', () => {
      const error = new AxiosError(
        'Validation failed',
        undefined,
        undefined,
        undefined,
        {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: { field1: 'Required' }
          },
          statusText: 'Bad Request',
          headers: {},
          config: {} as any
        }
      );

      const result = handleAPIError(error);
      expect(result).toBeInstanceOf(ValidationError);
      if (result instanceof ValidationError) {
        expect(result.fields).toEqual({ field1: 'Required' });
      }
    });

    it('should convert 4xx errors to APIError', () => {
      const error = new AxiosError(
        'Not found',
        undefined,
        undefined,
        undefined,
        {
          status: 404,
          data: { message: 'Resource not found' },
          statusText: 'Not Found',
          headers: {},
          config: {} as any
        }
      );

      const result = handleAPIError(error);
      expect(result).toBeInstanceOf(APIError);
      if (result instanceof APIError) {
        expect(result.statusCode).toBe(404);
        expect(result.message).toBe('Resource not found');
      }
    });

    it('should convert 5xx errors with generic message', () => {
      const error = new AxiosError(
        'Server error',
        undefined,
        undefined,
        undefined,
        {
          status: 500,
          data: { message: 'Internal server error' },
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any
        }
      );

      const result = handleAPIError(error);
      expect(result).toBeInstanceOf(APIError);
      if (result instanceof APIError) {
        expect(result.statusCode).toBe(500);
        expect(result.message).toContain('unexpected server error');
      }
    });

    it('should handle timeout errors', () => {
      const error = new AxiosError(
        'Timeout',
        'ECONNABORTED',
        undefined,
        { timeout: 30000 } as any,
        undefined
      );

      const result = handleAPIError(error);
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toContain('Unable to connect');
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      const result = handleAPIError(error);
      expect(result).toBe(error);
    });

    it('should handle unknown error types', () => {
      const result = handleAPIError('string error');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('getUserErrorMessage', () => {
    it('should return NetworkError message', () => {
      const error = new NetworkError('Connection failed');
      expect(getUserErrorMessage(error)).toBe('Connection failed');
    });

    it('should return APIError message for 4xx', () => {
      const error = new APIError('Bad request', 400);
      expect(getUserErrorMessage(error)).toBe('Bad request');
    });

    it('should return generic message for 5xx', () => {
      const error = new APIError('Internal error', 500);
      expect(getUserErrorMessage(error)).toContain('unexpected server error');
    });

    it('should return ValidationError message', () => {
      const error = new ValidationError('Validation failed', {});
      expect(getUserErrorMessage(error)).toBe('Validation failed');
    });

    it('should return Error message', () => {
      const error = new Error('Generic error');
      expect(getUserErrorMessage(error)).toBe('Generic error');
    });

    it('should handle unknown error types', () => {
      expect(getUserErrorMessage('string error')).toBe('An unexpected error occurred');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for NetworkError', () => {
      const error = new NetworkError('Connection failed');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for retryable status codes', () => {
      const retryableCodes = [408, 429, 500, 502, 503, 504];
      retryableCodes.forEach(code => {
        const error = new APIError('Error', code);
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should return false for non-retryable status codes', () => {
      const error = new APIError('Not found', 404);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return true for Axios network errors', () => {
      const error = new AxiosError(
        'Connection aborted',
        'ECONNABORTED',
        undefined,
        undefined,
        undefined
      );

      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for Axios errors with retryable status codes', () => {
      const error = new AxiosError(
        'Server error',
        undefined,
        undefined,
        undefined,
        {
          status: 503,
          data: {},
          statusText: 'Service Unavailable',
          headers: {},
          config: {} as any
        }
      );

      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for unknown error types', () => {
      expect(isRetryableError('string error')).toBe(false);
    });
  });
});
