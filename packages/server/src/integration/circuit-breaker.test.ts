/**
 * Tests for Circuit Breaker
 */

import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  
  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000 // 1 second for testing
    });
  });
  
  describe('Initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
    
    it('should have zero failure count', () => {
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });
    
    it('should have zero success count', () => {
      expect(circuitBreaker.getSuccessCount()).toBe(0);
    });
  });
  
  describe('Successful operations', () => {
    it('should execute operation and return result', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const fallback = jest.fn().mockReturnValue('fallback');
      
      const result = await circuitBreaker.execute(operation, fallback);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
    });
    
    it('should remain in CLOSED state after successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const fallback = jest.fn().mockReturnValue('fallback');
      
      await circuitBreaker.execute(operation, fallback);
      await circuitBreaker.execute(operation, fallback);
      await circuitBreaker.execute(operation, fallback);
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Failed operations', () => {
    it('should throw error on failure in CLOSED state', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const fallback = jest.fn().mockReturnValue('fallback');
      
      await expect(circuitBreaker.execute(operation, fallback)).rejects.toThrow('Operation failed');
    });
    
    it('should increment failure count on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      try {
        await circuitBreaker.execute(operation, fallback);
      } catch (error) {
        // Expected
      }
      
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });
    
    it('should open circuit after reaching failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, fallback);
        } catch (error) {
          // Expected - errors are thrown in CLOSED state
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
    
    it('should use fallback when circuit is OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, fallback);
        } catch (error) {
          // Expected - errors are thrown in CLOSED state
        }
      }
      
      // Next call should use fallback without calling operation
      const result = await circuitBreaker.execute(operation, fallback);
      
      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalled();
      // Operation should not be called when circuit is OPEN
      expect(operation).toHaveBeenCalledTimes(3); // Only the initial 3 calls
    });
  });
  
  describe('HALF_OPEN state', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, fallback);
        } catch (error) {
          // Expected - errors are thrown in CLOSED state
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Mock successful operation
      operation.mockResolvedValue('success');
      
      // Next call should transition to HALF_OPEN and execute
      await circuitBreaker.execute(operation, fallback);
      
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });
    
    it('should close circuit after enough successes in HALF_OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, fallback);
        } catch (error) {
          // Expected - errors are thrown in CLOSED state
        }
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Mock successful operations
      operation.mockResolvedValue('success');
      
      // Execute successful operations (threshold is 2)
      await circuitBreaker.execute(operation, fallback);
      await circuitBreaker.execute(operation, fallback);
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });
    
    it('should reopen circuit on failure in HALF_OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, fallback);
        } catch (error) {
          // Expected - errors are thrown in CLOSED state
        }
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Next call will transition to HALF_OPEN but fail, throwing error
      await expect(circuitBreaker.execute(operation, fallback)).rejects.toThrow('Failed');
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });
  
  describe('Manual reset', () => {
    it('should reset circuit to CLOSED state', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, fallback);
        } catch (error) {
          // Expected - errors are thrown in CLOSED state
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      // Reset
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(circuitBreaker.getSuccessCount()).toBe(0);
    });
  });
  
  describe('Failure tracking', () => {
    it('should track last failure time', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockReturnValue('fallback');
      
      const beforeTime = new Date();
      
      try {
        await circuitBreaker.execute(operation, fallback);
      } catch (error) {
        // Expected
      }
      
      const afterTime = new Date();
      const lastFailureTime = circuitBreaker.getLastFailureTime();
      
      expect(lastFailureTime).not.toBeNull();
      expect(lastFailureTime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(lastFailureTime!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
    
    it('should reset failure count on success in CLOSED state', async () => {
      const operation = jest.fn();
      const fallback = jest.fn().mockReturnValue('fallback');
      
      // Fail once
      operation.mockRejectedValue(new Error('Failed'));
      try {
        await circuitBreaker.execute(operation, fallback);
      } catch (error) {
        // Expected
      }
      
      expect(circuitBreaker.getFailureCount()).toBe(1);
      
      // Succeed
      operation.mockResolvedValue('success');
      await circuitBreaker.execute(operation, fallback);
      
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });
  });
});
