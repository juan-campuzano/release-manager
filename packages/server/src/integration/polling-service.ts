/**
 * Polling Service for real-time data updates
 * Polls external data sources at configured intervals and notifies subscribers of changes
 */

import { GitHubAdapter } from './github-adapter';
import { AzureDevOpsAdapter } from './azure-devops-adapter';
import { MetricsCollector } from './metrics-collector';
import { CircuitBreaker, CircuitState } from './circuit-breaker';
import { Result } from '../common/result';
import { IntegrationError } from '../common/errors';

/**
 * Configuration for a polling target
 */
export interface PollingTarget {
  type: 'github' | 'azure' | 'metrics';
  identifier: string; // repository name, pipeline ID, or release ID
  interval: number; // polling interval in milliseconds
}

/**
 * Data change notification
 */
export interface DataChangeNotification {
  type: 'github' | 'azure' | 'metrics';
  identifier: string;
  timestamp: Date;
  data: any;
  isStale?: boolean; // Indicates if data is from cache due to source unavailability
  lastSuccessfulSync?: Date; // Last time data was successfully fetched
}

/**
 * Subscriber callback function
 */
export type SubscriberCallback = (notification: DataChangeNotification) => void;

/**
 * Polling service configuration
 */
export interface PollingServiceConfig {
  releaseMetricsInterval?: number; // Default: 60 seconds
  githubInterval?: number; // Default: 5 minutes
  azureInterval?: number; // Default: 5 minutes
}

/**
 * Polling state for a target
 */
interface PollingState {
  target: PollingTarget;
  intervalId: NodeJS.Timeout | null;
  lastPollTime: Date | null;
  lastSuccessfulPollTime: Date | null;
  lastData: any;
  isPolling: boolean;
  circuitBreaker: CircuitBreaker;
}

/**
 * Polling service for external data sources
 */
export class PollingService {
  private githubAdapter: GitHubAdapter;
  private azureAdapter: AzureDevOpsAdapter;
  private metricsCollector: MetricsCollector;
  
  private config: Required<PollingServiceConfig>;
  private pollingStates: Map<string, PollingState> = new Map();
  private subscribers: Set<SubscriberCallback> = new Set();
  
  // Default intervals
  private static readonly DEFAULT_RELEASE_METRICS_INTERVAL = 60 * 1000; // 60 seconds
  private static readonly DEFAULT_GITHUB_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly DEFAULT_AZURE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  constructor(
    githubAdapter: GitHubAdapter,
    azureAdapter: AzureDevOpsAdapter,
    metricsCollector: MetricsCollector,
    config: PollingServiceConfig = {}
  ) {
    this.githubAdapter = githubAdapter;
    this.azureAdapter = azureAdapter;
    this.metricsCollector = metricsCollector;
    
    this.config = {
      releaseMetricsInterval: config.releaseMetricsInterval || PollingService.DEFAULT_RELEASE_METRICS_INTERVAL,
      githubInterval: config.githubInterval || PollingService.DEFAULT_GITHUB_INTERVAL,
      azureInterval: config.azureInterval || PollingService.DEFAULT_AZURE_INTERVAL
    };
  }
  
  /**
   * Start polling for a GitHub repository
   * @param repository Repository in format "owner/repo"
   */
  startGitHubPolling(repository: string): void {
    const target: PollingTarget = {
      type: 'github',
      identifier: repository,
      interval: this.config.githubInterval
    };
    
    this.startPolling(target);
  }
  
  /**
   * Start polling for an Azure DevOps pipeline
   * @param pipelineId Pipeline ID
   */
  startAzurePolling(pipelineId: string): void {
    const target: PollingTarget = {
      type: 'azure',
      identifier: pipelineId,
      interval: this.config.azureInterval
    };
    
    this.startPolling(target);
  }
  
  /**
   * Start polling for release metrics
   * @param releaseId Release ID
   */
  startMetricsPolling(releaseId: string): void {
    const target: PollingTarget = {
      type: 'metrics',
      identifier: releaseId,
      interval: this.config.releaseMetricsInterval
    };
    
    this.startPolling(target);
  }
  
  /**
   * Stop polling for a specific target
   * @param type Target type
   * @param identifier Target identifier
   */
  stopPolling(type: 'github' | 'azure' | 'metrics', identifier: string): void {
    const key = this.getPollingKey(type, identifier);
    const state = this.pollingStates.get(key);
    
    if (state && state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
      state.isPolling = false;
      
      console.log(`Stopped polling for ${type}:${identifier}`);
    }
  }
  
  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const [, state] of this.pollingStates.entries()) {
      if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
        state.isPolling = false;
      }
    }
    
    console.log('Stopped all polling');
  }
  
  /**
   * Subscribe to data change notifications
   * @param callback Callback function to invoke on data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  /**
   * Get the last poll time for a target
   * @param type Target type
   * @param identifier Target identifier
   * @returns Last poll time or null if never polled
   */
  getLastPollTime(type: 'github' | 'azure' | 'metrics', identifier: string): Date | null {
    const key = this.getPollingKey(type, identifier);
    const state = this.pollingStates.get(key);
    return state?.lastPollTime || null;
  }
  
  /**
   * Get the last successful poll time for a target
   * @param type Target type
   * @param identifier Target identifier
   * @returns Last successful poll time or null if never successfully polled
   */
  getLastSuccessfulPollTime(type: 'github' | 'azure' | 'metrics', identifier: string): Date | null {
    const key = this.getPollingKey(type, identifier);
    const state = this.pollingStates.get(key);
    return state?.lastSuccessfulPollTime || null;
  }
  
  /**
   * Get the circuit breaker state for a target
   * @param type Target type
   * @param identifier Target identifier
   * @returns Circuit breaker state or null if not polling
   */
  getCircuitState(type: 'github' | 'azure' | 'metrics', identifier: string): CircuitState | null {
    const key = this.getPollingKey(type, identifier);
    const state = this.pollingStates.get(key);
    return state?.circuitBreaker.getState() || null;
  }
  
  /**
   * Check if a target is currently being polled
   * @param type Target type
   * @param identifier Target identifier
   * @returns True if polling is active
   */
  isPolling(type: 'github' | 'azure' | 'metrics', identifier: string): boolean {
    const key = this.getPollingKey(type, identifier);
    const state = this.pollingStates.get(key);
    return state?.isPolling || false;
  }
  
  /**
   * Start polling for a target
   * @param target Polling target configuration
   */
  private startPolling(target: PollingTarget): void {
    const key = this.getPollingKey(target.type, target.identifier);
    
    // Check if already polling
    const existingState = this.pollingStates.get(key);
    if (existingState?.isPolling) {
      console.log(`Already polling ${target.type}:${target.identifier}`);
      return;
    }
    
    // Create polling state
    const state: PollingState = {
      target,
      intervalId: null,
      lastPollTime: null,
      lastSuccessfulPollTime: null,
      lastData: null,
      isPolling: true,
      circuitBreaker: new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000 // 60 seconds
      })
    };
    
    // Start polling immediately
    this.poll(state);
    
    // Set up interval for subsequent polls
    state.intervalId = setInterval(() => {
      this.poll(state);
    }, target.interval);
    
    this.pollingStates.set(key, state);
    
    console.log(`Started polling ${target.type}:${target.identifier} every ${target.interval}ms`);
  }
  
  /**
   * Perform a single poll operation
   * @param state Polling state
   */
  private async poll(state: PollingState): Promise<void> {
    try {
      // Use circuit breaker to execute the poll with fallback to cached data
      const result = await state.circuitBreaker.execute(
        async () => {
          let pollResult: Result<any, IntegrationError>;
          
          switch (state.target.type) {
            case 'github':
              pollResult = await this.pollGitHub(state.target.identifier);
              break;
            case 'azure':
              pollResult = await this.pollAzure(state.target.identifier);
              break;
            case 'metrics':
              pollResult = await this.pollMetrics(state.target.identifier);
              break;
            default:
              throw new Error(`Unknown polling target type: ${state.target.type}`);
          }
          
          if (!pollResult.success) {
            throw new Error(pollResult.error.message);
          }
          
          return pollResult.value;
        },
        () => {
          // Fallback: return cached data
          console.warn(`Using cached data for ${state.target.type}:${state.target.identifier}`);
          return state.lastData;
        }
      );
      
      state.lastPollTime = new Date();
      
      // Check if we got fresh data (not from fallback)
      const isFreshData = state.circuitBreaker.getState() !== CircuitState.OPEN;
      
      if (isFreshData) {
        state.lastSuccessfulPollTime = state.lastPollTime;
      }
      
      // Check for changes
      if (this.hasDataChanged(state.lastData, result)) {
        state.lastData = result;
        
        // Notify subscribers
        this.notifySubscribers({
          type: state.target.type,
          identifier: state.target.identifier,
          timestamp: state.lastPollTime,
          data: result,
          isStale: !isFreshData,
          lastSuccessfulSync: state.lastSuccessfulPollTime || undefined
        });
      } else if (!isFreshData && state.lastData) {
        // Data hasn't changed but we're using stale data - notify with warning
        this.notifySubscribers({
          type: state.target.type,
          identifier: state.target.identifier,
          timestamp: state.lastPollTime,
          data: result,
          isStale: true,
          lastSuccessfulSync: state.lastSuccessfulPollTime || undefined
        });
      }
    } catch (error) {
      console.error(`Unexpected error during polling for ${state.target.type}:${state.target.identifier}:`, error);
    }
  }
  
  /**
   * Poll GitHub for repository data
   * @param repository Repository identifier
   * @returns Result with repository data
   */
  private async pollGitHub(repository: string): Promise<Result<any, IntegrationError>> {
    // Fetch branches and tags
    const branchesResult = await this.githubAdapter.getBranches(repository);
    if (!branchesResult.success) {
      return branchesResult;
    }
    
    const tagsResult = await this.githubAdapter.getTags(repository);
    if (!tagsResult.success) {
      return tagsResult;
    }
    
    return {
      success: true,
      value: {
        branches: branchesResult.value,
        tags: tagsResult.value
      }
    };
  }
  
  /**
   * Poll Azure DevOps for pipeline data
   * @param pipelineId Pipeline identifier
   * @returns Result with pipeline data
   */
  private async pollAzure(pipelineId: string): Promise<Result<any, IntegrationError>> {
    // Fetch build status
    const buildStatusResult = await this.azureAdapter.getBuildStatus(pipelineId);
    if (!buildStatusResult.success) {
      return buildStatusResult;
    }
    
    // Detect new builds since last poll
    const since = new Date(Date.now() - this.config.azureInterval);
    const newBuildsResult = await this.azureAdapter.detectNewBuilds(pipelineId, since);
    if (!newBuildsResult.success) {
      return newBuildsResult;
    }
    
    return {
      success: true,
      value: {
        buildStatus: buildStatusResult.value,
        newBuilds: newBuildsResult.value
      }
    };
  }
  
  /**
   * Poll metrics for release data
   * @param releaseId Release identifier
   * @returns Result with metrics data
   */
  private async pollMetrics(releaseId: string): Promise<Result<any, IntegrationError>> {
    // Fetch crash rate
    const crashRateResult = await this.metricsCollector.getCrashRate(releaseId);
    if (!crashRateResult.success) {
      return crashRateResult;
    }
    
    // Fetch CPU exception rate
    const cpuExceptionRateResult = await this.metricsCollector.getCPUExceptionRate(releaseId);
    if (!cpuExceptionRateResult.success) {
      return cpuExceptionRateResult;
    }
    
    // Fetch DAU data
    const dauResult = await this.metricsCollector.getDAUData(releaseId);
    if (!dauResult.success) {
      return dauResult;
    }
    
    return {
      success: true,
      value: {
        crashRate: crashRateResult.value,
        cpuExceptionRate: cpuExceptionRateResult.value,
        dau: dauResult.value
      }
    };
  }
  
  /**
   * Check if data has changed
   * @param oldData Previous data
   * @param newData New data
   * @returns True if data has changed
   */
  private hasDataChanged(oldData: any, newData: any): boolean {
    // If no old data, consider it changed
    if (!oldData) {
      return true;
    }
    
    // Deep comparison using JSON serialization
    // This is a simple approach; for production, consider a more sophisticated comparison
    try {
      return JSON.stringify(oldData) !== JSON.stringify(newData);
    } catch (error) {
      // If serialization fails, assume data changed
      console.warn('Failed to compare data:', error);
      return true;
    }
  }
  
  /**
   * Notify all subscribers of a data change
   * @param notification Data change notification
   */
  private notifySubscribers(notification: DataChangeNotification): void {
    for (const callback of this.subscribers) {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    }
  }
  
  /**
   * Generate a unique key for a polling target
   * @param type Target type
   * @param identifier Target identifier
   * @returns Unique key
   */
  private getPollingKey(type: string, identifier: string): string {
    return `${type}:${identifier}`;
  }
}
