/**
 * Circuit Breaker pattern implementation for fault tolerance
 * Prevents cascading failures by stopping requests to failing services
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures before opening circuit
  successThreshold: number;  // Number of successes to close circuit from half-open
  timeout: number;           // Time in ms before attempting to close circuit
}

/**
 * Circuit breaker for external API calls
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date | null = null;
  private nextAttemptTime: Date | null = null;
  
  private config: CircuitBreakerConfig;
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000 // 60 seconds default
    };
  }
  
  /**
   * Execute an operation through the circuit breaker
   * @param operation Operation to execute
   * @param fallback Fallback function to call when circuit is open
   * @returns Result of operation or fallback
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log('Circuit breaker transitioning to HALF_OPEN state');
      } else {
        console.warn('Circuit breaker is OPEN, using fallback');
        return fallback();
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Get the current state of the circuit breaker
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get the failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
  
  /**
   * Get the success count (relevant in HALF_OPEN state)
   */
  getSuccessCount(): number {
    return this.successCount;
  }
  
  /**
   * Get the last failure time
   */
  getLastFailureTime(): Date | null {
    return this.lastFailureTime;
  }
  
  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    console.log('Circuit breaker manually reset to CLOSED state');
  }
  
  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        // Enough successes, close the circuit
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        console.log('Circuit breaker closed after successful recovery');
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }
  
  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in HALF_OPEN state, reopen the circuit
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      console.log('Circuit breaker reopened after failure in HALF_OPEN state');
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've exceeded the failure threshold
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
        console.log(`Circuit breaker opened after ${this.failureCount} failures`);
      }
    }
  }
  
  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return false;
    }
    
    return Date.now() >= this.nextAttemptTime.getTime();
  }
}
