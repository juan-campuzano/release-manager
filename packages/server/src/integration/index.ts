/**
 * Integration layer exports
 * Contains adapters for external systems (GitHub, Azure DevOps, CI/CD, Analytics)
 */

export { GitHubAdapter, GitHubCredentials } from './github-adapter';
export { AzureDevOpsAdapter, AzureCredentials } from './azure-devops-adapter';
export { MetricsCollector, AnalyticsCredentials } from './metrics-collector';
export { PollingService, PollingServiceConfig, DataChangeNotification, SubscriberCallback } from './polling-service';
export { CircuitBreaker, CircuitState } from './circuit-breaker';
