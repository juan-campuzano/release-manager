/**
 * Tests for custom error types
 */

import {
  ApplicationError,
  IntegrationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ParseError,
  AuthenticationError
} from './errors';

describe('Custom Errors', () => {
  describe('ApplicationError', () => {
    it('should create an application error', () => {
      const error = new ApplicationError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ApplicationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should capture cause', () => {
      const cause = new Error('Root cause');
      const error = new ApplicationError('Test error', cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('IntegrationError', () => {
    it('should create an integration error', () => {
      const error = new IntegrationError('GitHub API failed');
      
      expect(error.message).toBe('GitHub API failed');
      expect(error.name).toBe('IntegrationError');
      expect(error).toBeInstanceOf(ApplicationError);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with errors array', () => {
      const errors = ['Field is required', 'Invalid format'];
      const error = new ValidationError('Validation failed', errors);
      
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('Release not found');
      
      expect(error.message).toBe('Release not found');
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError('Release was modified by another user');
      
      expect(error.message).toBe('Release was modified by another user');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('ParseError', () => {
    it('should create a parse error with line and column', () => {
      const error = new ParseError('Invalid JSON', 10, 5);
      
      expect(error.message).toBe('Invalid JSON');
      expect(error.line).toBe(10);
      expect(error.column).toBe(5);
      expect(error.name).toBe('ParseError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an authentication error', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.name).toBe('AuthenticationError');
    });
  });
});
