/**
 * Metrics Collector for external analytics platforms
 * Provides methods to retrieve quality metrics and DAU data
 */

import { DAUStats } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { IntegrationError } from '../common/errors';
import { Cache } from '../data/cache';

/**
 * Analytics platform credentials
 */
export interface AnalyticsCredentials {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
}

/**
 * Configuration for retry logic
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
}

/**
 * Metrics collector for external analytics platforms
 */
export class MetricsCollector {
  private credentials: AnalyticsCredentials | null = null;
  private cache: Cache;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000
  };
  
  constructor(cache: Cache) {
    this.cache = cache;
  }
  
  /**
   * Authenticate with analytics platform
   * @param credentials Analytics platform credentials
   * @returns Result indicating success or failure
   */
  async authenticate(credentials: AnalyticsCredentials): Promise<Result<void, IntegrationError>> {
    try {
      // Store credentials for future requests
      this.credentials = credentials;
      
      // Verify credentials by making a test request
      // In a real implementation, this would call the analytics API
      // For now, we'll just validate the credentials structure
      if (!credentials.apiKey || !credentials.projectId) {
        return Failure(new IntegrationError('Invalid credentials: apiKey and projectId are required'));
      }
      
      return Success(undefined);
    } catch (error) {
      const integrationError = new IntegrationError(
        'Analytics platform authentication failed',
        error as Error
      );
      
      console.error('Analytics authentication failed:', error);
      
      return Failure(integrationError);
    }
  }
  
  /**
   * Retrieve crash rate for a release
   * @param releaseId Release identifier
   * @returns Result with crash rate percentage
   */
  async getCrashRate(releaseId: string): Promise<Result<number, IntegrationError>> {
    if (!this.credentials) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `metrics:crashRate:${releaseId}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        // In a real implementation, this would call the analytics API
        // For now, we'll simulate the API call
        const crashRate = await this.fetchCrashRateFromAPI(releaseId);
        
        // Cache the result with 60-second TTL
        this.cache.set(cacheKey, crashRate, Cache.TTL_60_SECONDS);
        
        return Success(crashRate);
      } catch (error) {
        // Try to return cached data if available
        const fallbackCached = this.cache.get<number>(cacheKey);
        if (fallbackCached !== null && fallbackCached !== undefined) {
          console.warn(`Analytics API failed, using cached crash rate for ${releaseId}`, error);
          return Success(fallbackCached);
        }
        
        return Failure(new IntegrationError(
          `Failed to retrieve crash rate for release ${releaseId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Retrieve CPU exception rate for a release
   * @param releaseId Release identifier
   * @returns Result with CPU exception rate percentage
   */
  async getCPUExceptionRate(releaseId: string): Promise<Result<number, IntegrationError>> {
    if (!this.credentials) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `metrics:cpuExceptionRate:${releaseId}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        // In a real implementation, this would call the analytics API
        const cpuExceptionRate = await this.fetchCPUExceptionRateFromAPI(releaseId);
        
        // Cache the result with 60-second TTL
        this.cache.set(cacheKey, cpuExceptionRate, Cache.TTL_60_SECONDS);
        
        return Success(cpuExceptionRate);
      } catch (error) {
        // Try to return cached data if available
        const fallbackCached = this.cache.get<number>(cacheKey);
        if (fallbackCached !== null && fallbackCached !== undefined) {
          console.warn(`Analytics API failed, using cached CPU exception rate for ${releaseId}`, error);
          return Success(fallbackCached);
        }
        
        return Failure(new IntegrationError(
          `Failed to retrieve CPU exception rate for release ${releaseId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Retrieve Daily Active Users data for a release
   * @param releaseId Release identifier
   * @returns Result with DAU statistics
   */
  async getDAUData(releaseId: string): Promise<Result<DAUStats, IntegrationError>> {
    if (!this.credentials) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `metrics:dau:${releaseId}`;
    const cached = this.cache.get<DAUStats>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        // In a real implementation, this would call the analytics API
        const dauStats = await this.fetchDAUDataFromAPI(releaseId);
        
        // Cache the result with 60-second TTL
        this.cache.set(cacheKey, dauStats, Cache.TTL_60_SECONDS);
        
        return Success(dauStats);
      } catch (error) {
        // Try to return cached data if available
        const fallbackCached = this.cache.get<DAUStats>(cacheKey);
        if (fallbackCached !== null && fallbackCached !== undefined) {
          console.warn(`Analytics API failed, using cached DAU data for ${releaseId}`, error);
          return Success(fallbackCached);
        }
        
        return Failure(new IntegrationError(
          `Failed to retrieve DAU data for release ${releaseId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Simulate fetching crash rate from analytics API
   * In production, this would make an actual HTTP request
   */
  private async fetchCrashRateFromAPI(_releaseId: string): Promise<number> {
    // Simulate API call delay
    await this.sleep(100);
    
    // In production, this would be:
    // const response = await fetch(`${this.credentials!.baseUrl}/metrics/crash-rate`, {
    //   headers: { 'Authorization': `Bearer ${this.credentials!.apiKey}` },
    //   body: JSON.stringify({ releaseId, projectId: this.credentials!.projectId })
    // });
    // return response.json().crashRate;
    
    // For now, return a simulated value
    return 0.5; // 0.5% crash rate
  }
  
  /**
   * Simulate fetching CPU exception rate from analytics API
   * In production, this would make an actual HTTP request
   */
  private async fetchCPUExceptionRateFromAPI(_releaseId: string): Promise<number> {
    // Simulate API call delay
    await this.sleep(100);
    
    // In production, this would make an actual API call
    return 0.3; // 0.3% CPU exception rate
  }
  
  /**
   * Simulate fetching DAU data from analytics API
   * In production, this would make an actual HTTP request
   */
  private async fetchDAUDataFromAPI(_releaseId: string): Promise<DAUStats> {
    // Simulate API call delay
    await this.sleep(100);
    
    // In production, this would make an actual API call
    return {
      dailyActiveUsers: 50000,
      trend: [48000, 49000, 49500, 50000, 50500, 51000, 50000],
      collectedAt: new Date()
    };
  }
  
  /**
   * Retry an operation with exponential backoff
   * @param operation Operation to retry
   * @returns Result of the operation
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<Result<T, IntegrationError>>
  ): Promise<Result<T, IntegrationError>> {
    let lastError: IntegrationError | null = null;
    
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      const result = await operation();
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Check if error is retryable
      if (!this.isRetryableError(result.error)) {
        return result;
      }
      
      // Don't sleep on the last attempt
      if (attempt < this.retryConfig.maxRetries - 1) {
        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await this.sleep(delay);
      }
    }
    
    return Failure(lastError || new IntegrationError('Max retries exceeded'));
  }
  
  /**
   * Check if an error is retryable
   * @param error Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: IntegrationError): boolean {
    // Retry on network errors, timeouts, and rate limiting
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('503')
    );
  }
  
  /**
   * Sleep for a specified duration
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
