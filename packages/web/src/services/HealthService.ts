import { APIClient } from '../client';
import { HealthStatus, DetailedHealthInfo } from '../types';

/**
 * Service for checking API server health
 */
export class HealthService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Check API server health status
   * Used for periodic health checks
   * @returns Promise resolving to health status
   */
  async checkHealth(): Promise<HealthStatus> {
    return this.apiClient.get<HealthStatus>('/api/health');
  }

  /**
   * Get detailed health information including uptime, memory usage, and version
   * @returns Promise resolving to detailed health information
   */
  async getDetailedHealth(): Promise<DetailedHealthInfo> {
    return this.apiClient.get<DetailedHealthInfo>('/api/health/detailed');
  }
}
