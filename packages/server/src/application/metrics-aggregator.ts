/**
 * Metrics Aggregator service
 * Collects and aggregates quality metrics, DAU statistics, and rollout data
 */

import { QualityMetrics, DAUStats, ITGCStatus } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { IntegrationError } from '../common/errors';
import { MetricsCollector } from '../integration/metrics-collector';
import { ReleaseStore } from '../data/release-store';

/**
 * Threshold evaluation result
 */
export interface ThresholdEvaluation {
  crashRateExceeded: boolean;
  cpuExceptionRateExceeded: boolean;
  overallHealthy: boolean;
  details: string;
}

/**
 * Metrics aggregator configuration
 */
export interface MetricsAggregatorConfig {
  pollingIntervalMs?: number; // Default: 60000 (60 seconds)
}

/**
 * Metrics aggregator service
 * Collects and processes quality metrics, DAU, and rollout data
 */
export class MetricsAggregator {
  private metricsCollector: MetricsCollector;
  private releaseStore: ReleaseStore;
  private pollingIntervalMs: number;
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    metricsCollector: MetricsCollector,
    releaseStore: ReleaseStore,
    config: MetricsAggregatorConfig = {}
  ) {
    this.metricsCollector = metricsCollector;
    this.releaseStore = releaseStore;
    this.pollingIntervalMs = config.pollingIntervalMs || 60000; // 60 seconds default
  }
  
  /**
   * Collect quality metrics for a release
   * @param releaseId Release identifier
   * @returns Result with quality metrics
   */
  async collectQualityMetrics(releaseId: string): Promise<Result<QualityMetrics, IntegrationError>> {
    try {
      // Get the release to retrieve thresholds
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      
      if (!releaseResult.success) {
        return Failure(new IntegrationError(`Release ${releaseId} not found`));
      }
      
      const release = releaseResult.value;
      
      // Collect crash rate
      const crashRateResult = await this.metricsCollector.getCrashRate(releaseId);
      if (!crashRateResult.success) {
        return Failure(crashRateResult.error);
      }
      
      // Collect CPU exception rate
      const cpuExceptionRateResult = await this.metricsCollector.getCPUExceptionRate(releaseId);
      if (!cpuExceptionRateResult.success) {
        return Failure(cpuExceptionRateResult.error);
      }
      
      // Construct quality metrics
      const qualityMetrics: QualityMetrics = {
        crashRate: crashRateResult.value,
        cpuExceptionRate: cpuExceptionRateResult.value,
        thresholds: {
          crashRateThreshold: release.itgcStatus.compliant ? 1.0 : 2.0, // Default thresholds
          cpuExceptionRateThreshold: release.itgcStatus.compliant ? 0.5 : 1.0
        },
        collectedAt: new Date()
      };
      
      return Success(qualityMetrics);
    } catch (error) {
      return Failure(new IntegrationError(
        `Failed to collect quality metrics for release ${releaseId}`,
        error as Error
      ));
    }
  }
  
  /**
   * Collect DAU statistics for a release
   * @param releaseId Release identifier
   * @returns Result with DAU statistics
   */
  async collectDAUStatistics(releaseId: string): Promise<Result<DAUStats, IntegrationError>> {
    try {
      // Collect DAU data from metrics collector
      const dauResult = await this.metricsCollector.getDAUData(releaseId);
      
      if (!dauResult.success) {
        return Failure(dauResult.error);
      }
      
      return Success(dauResult.value);
    } catch (error) {
      return Failure(new IntegrationError(
        `Failed to collect DAU statistics for release ${releaseId}`,
        error as Error
      ));
    }
  }
  
  /**
   * Get rollout percentage for a release
   * @param releaseId Release identifier
   * @returns Result with rollout percentage
   */
  async getRolloutPercentage(releaseId: string): Promise<Result<number, IntegrationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      
      if (!releaseResult.success) {
        return Failure(new IntegrationError(`Release ${releaseId} not found`));
      }
      
      return Success(releaseResult.value.rolloutPercentage);
    } catch (error) {
      return Failure(new IntegrationError(
        `Failed to get rollout percentage for release ${releaseId}`,
        error as Error
      ));
    }
  }
  
  /**
   * Get ITGC status for a release
   * @param releaseId Release identifier
   * @returns Result with ITGC status
   */
  async getITGCStatus(releaseId: string): Promise<Result<ITGCStatus, IntegrationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      
      if (!releaseResult.success) {
        return Failure(new IntegrationError(`Release ${releaseId} not found`));
      }
      
      return Success(releaseResult.value.itgcStatus);
    } catch (error) {
      return Failure(new IntegrationError(
        `Failed to get ITGC status for release ${releaseId}`,
        error as Error
      ));
    }
  }
  
  /**
   * Evaluate quality metrics against thresholds
   * @param metrics Quality metrics to evaluate
   * @returns Threshold evaluation result
   */
  evaluateThresholds(metrics: QualityMetrics): ThresholdEvaluation {
    const crashRateExceeded = metrics.crashRate > metrics.thresholds.crashRateThreshold;
    const cpuExceptionRateExceeded = metrics.cpuExceptionRate > metrics.thresholds.cpuExceptionRateThreshold;
    const overallHealthy = !crashRateExceeded && !cpuExceptionRateExceeded;
    
    let details = '';
    if (crashRateExceeded) {
      details += `Crash rate (${metrics.crashRate.toFixed(2)}%) exceeds threshold (${metrics.thresholds.crashRateThreshold.toFixed(2)}%). `;
    }
    if (cpuExceptionRateExceeded) {
      details += `CPU exception rate (${metrics.cpuExceptionRate.toFixed(2)}%) exceeds threshold (${metrics.thresholds.cpuExceptionRateThreshold.toFixed(2)}%). `;
    }
    if (overallHealthy) {
      details = 'All quality metrics are within acceptable thresholds.';
    }
    
    return {
      crashRateExceeded,
      cpuExceptionRateExceeded,
      overallHealthy,
      details: details.trim()
    };
  }
  
  /**
   * Start real-time updates for a release with 60-second polling
   * @param releaseId Release identifier
   * @param onUpdate Callback function called with updated metrics
   */
  startRealTimeUpdates(
    releaseId: string,
    onUpdate: (metrics: QualityMetrics, dau: DAUStats) => void
  ): void {
    // Clear any existing timer for this release
    this.stopRealTimeUpdates(releaseId);
    
    // Create polling function
    const poll = async () => {
      try {
        // Collect quality metrics
        const metricsResult = await this.collectQualityMetrics(releaseId);
        
        // Collect DAU statistics
        const dauResult = await this.collectDAUStatistics(releaseId);
        
        // Call update callback if both succeeded
        if (metricsResult.success && dauResult.success) {
          onUpdate(metricsResult.value, dauResult.value);
        }
      } catch (error) {
        console.error(`Error polling metrics for release ${releaseId}:`, error);
      }
    };
    
    // Start polling immediately
    poll();
    
    // Set up interval for subsequent polls
    const timer = setInterval(poll, this.pollingIntervalMs);
    this.pollingTimers.set(releaseId, timer);
  }
  
  /**
   * Stop real-time updates for a release
   * @param releaseId Release identifier
   */
  stopRealTimeUpdates(releaseId: string): void {
    const timer = this.pollingTimers.get(releaseId);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(releaseId);
    }
  }
  
  /**
   * Stop all real-time updates
   */
  stopAllRealTimeUpdates(): void {
    for (const [releaseId, timer] of this.pollingTimers.entries()) {
      clearInterval(timer);
      this.pollingTimers.delete(releaseId);
    }
  }
  
  /**
   * Get the number of active polling timers
   * @returns Number of active timers
   */
  getActivePollingCount(): number {
    return this.pollingTimers.size;
  }
}
