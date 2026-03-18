import { APIClient } from '../client';
import { QualityMetrics, DAUStats } from '../types';

/**
 * Service for fetching metrics data
 */
export class MetricsService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get quality metrics for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to quality metrics (crash rate and CPU exception rate)
   */
  async getQualityMetrics(releaseId: string): Promise<QualityMetrics> {
    return this.apiClient.get<QualityMetrics>(`/api/metrics/${releaseId}/quality`);
  }

  /**
   * Get Daily Active Users statistics for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to DAU stats with current count, trend, and history
   */
  async getDAUStats(releaseId: string): Promise<DAUStats> {
    return this.apiClient.get<DAUStats>(`/api/metrics/${releaseId}/dau`);
  }

  /**
   * Get rollout percentage for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to rollout percentage (0-100)
   */
  async getRolloutPercentage(releaseId: string): Promise<number> {
    return this.apiClient.get<number>(`/api/metrics/${releaseId}/rollout`);
  }
}
