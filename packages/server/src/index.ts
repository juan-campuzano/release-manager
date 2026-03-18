/**
 * Release Manager Tool
 * Main entry point for the application
 */

// Export domain types
export * from './domain';

// Export data layer
export { Cache } from './data/cache';
export { DatabaseConfig, DatabaseConnection, InMemoryDatabase, createConnection, getDefaultConfig } from './data/database-config';
export { HistoryStore } from './data/history-store';
export { ReleaseStore } from './data/release-store';

// Export integration layer
export * from './integration';

// Export application layer
export { ReleaseManagerService } from './application/release-manager';
export { MetricsAggregator } from './application/metrics-aggregator';
export { StateManager } from './application/state-manager';
export { ConfigParser, JSONConfigParser, ValidationResult } from './application/config-parser';
