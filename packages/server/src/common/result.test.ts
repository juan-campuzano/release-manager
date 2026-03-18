/**
 * Tests for Result type utilities
 */

import { Result, Success, Failure, isSuccess, isFailure } from './result';

describe('Result Type', () => {
  describe('Success', () => {
    it('should create a success result', () => {
      const result = Success(42);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should be identified by isSuccess', () => {
      const result = Success('test');
      
      expect(isSuccess(result)).toBe(true);
      expect(isFailure(result)).toBe(false);
    });
  });

  describe('Failure', () => {
    it('should create a failure result', () => {
      const error = new Error('Something went wrong');
      const result = Failure(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should be identified by isFailure', () => {
      const result = Failure(new Error('test'));
      
      expect(isFailure(result)).toBe(true);
      expect(isSuccess(result)).toBe(false);
    });
  });

  describe('Type narrowing', () => {
    it('should narrow types correctly with isSuccess', () => {
      const result: Result<number, Error> = Success(42);
      
      if (isSuccess(result)) {
        // TypeScript should know result.value exists
        expect(result.value).toBe(42);
      } else {
        fail('Should be success');
      }
    });

    it('should narrow types correctly with isFailure', () => {
      const error = new Error('test');
      const result: Result<number, Error> = Failure(error);
      
      if (isFailure(result)) {
        // TypeScript should know result.error exists
        expect(result.error).toBe(error);
      } else {
        fail('Should be failure');
      }
    });
  });
});
