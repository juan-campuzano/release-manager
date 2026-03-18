/**
 * Application layer exports
 * Contains business logic, state management, and service orchestration
 */

export { 
  ConfigParser, 
  JSONConfigParser, 
  ValidationResult,
  createConfigParser 
} from './config-parser';

export {
  MetricsAggregator,
  MetricsAggregatorConfig,
  ThresholdEvaluation
} from './metrics-aggregator';

export {
  StateManager,
  ValidationResult as StateValidationResult,
  HealthStatus
} from './state-manager';

export {
  ReleaseManagerService,
  ReleaseManagerConfig,
  SignOffStatus,
  HistoryFilters
} from './release-manager';
