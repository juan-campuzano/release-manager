// TypeScript type definitions for Release Web Application

// ============================================================================
// Platform and Release Types
// ============================================================================

export type Platform = 'iOS' | 'Android' | 'Desktop';

export type ReleaseStage = 
  | 'Release Branching'
  | 'Final Release Candidate'
  | 'Submit For App Store Review'
  | 'Roll Out 1%'
  | 'Roll Out 100%';

export type ReleaseStatus = 'Upcoming' | 'Current' | 'Production';

export interface QualityThresholds {
  crashRateThreshold: number; // percentage
  cpuExceptionRateThreshold: number; // percentage
}

export interface Release {
  id: string;
  platform: Platform;
  version: string;
  branchName: string;
  repositoryUrl: string;
  sourceType: 'github' | 'azure';
  
  // Build information
  latestBuild: string | null;
  latestPassingBuild: string | null;
  latestAppStoreBuild: string | null;
  
  // State
  currentStage: ReleaseStage;
  status: ReleaseStatus;
  rolloutPercentage: number;
  
  // Configuration
  requiredSquads: string[];
  qualityThresholds: QualityThresholds;
  rolloutStages: number[];
  
  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastSyncedAt: string | null; // ISO 8601
}

export interface ReleaseConfig {
  platform: Platform;
  version: string;
  branchName: string;
  repositoryUrl: string;
  sourceType: 'github' | 'azure';
  requiredSquads: string[];
  qualityThresholds: QualityThresholds;
  rolloutStages: number[];
}

// ============================================================================
// Repository Configuration Types
// ============================================================================

export interface RepositoryConfig {
  id: string;
  name: string;
  repositoryUrl: string;
  sourceType: 'github' | 'azure';
  requiredSquads: string[];
  qualityThresholds: QualityThresholds;
  rolloutStages: number[];
  ciPipelineId?: string;
  analyticsProjectId?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ============================================================================
// Blocker Types
// ============================================================================

export type BlockerSeverity = 'critical' | 'high' | 'medium';

export interface Blocker {
  id: string;
  releaseId: string;
  title: string;
  description: string;
  severity: BlockerSeverity;
  assignee: string;
  issueUrl: string;
  resolved: boolean;
  createdAt: string; // ISO 8601
  resolvedAt: string | null; // ISO 8601
}

export interface BlockerInput {
  title: string;
  description: string;
  severity: BlockerSeverity;
  assignee: string;
  issueUrl: string;
}

// ============================================================================
// Sign-Off Types
// ============================================================================

export interface SignOff {
  id: string;
  releaseId: string;
  squad: string;
  approved: boolean;
  approverName: string | null;
  comments: string | null;
  approvedAt: string | null; // ISO 8601
}

export interface SignOffInput {
  squad: string;
  approverName: string;
  comments: string;
}

// ============================================================================
// Distribution Types
// ============================================================================

export type DistributionStatus = 'pending' | 'submitted' | 'approved' | 'live';

export interface Distribution {
  id: string;
  releaseId: string;
  channel: string;
  status: DistributionStatus;
  updatedAt: string; // ISO 8601
}

export interface DistributionInput {
  channel: string;
  status: DistributionStatus;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface QualityMetrics {
  releaseId: string;
  crashRate: number; // percentage
  cpuExceptionRate: number; // percentage
  collectedAt: string; // ISO 8601
}

export interface DAUDataPoint {
  date: string; // ISO 8601
  count: number;
}

export interface DAUStats {
  releaseId: string;
  currentDAU: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  history: DAUDataPoint[];
  collectedAt: string; // ISO 8601
}

// ============================================================================
// ITGC Types
// ============================================================================

export interface ITGCStatus {
  releaseId: string;
  compliant: boolean;
  rolloutComplete: boolean;
  details: string;
  checkedAt: string; // ISO 8601
}

export interface ITGCStatusInput {
  compliant: boolean;
  rolloutComplete: boolean;
  details: string;
}

// ============================================================================
// Health Types
// ============================================================================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string; // ISO 8601
}

export interface DetailedHealthInfo extends HealthStatus {
  uptime: number; // seconds
  memoryUsage: {
    used: number; // bytes
    total: number; // bytes
  };
  version: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number | null; // null for persistent
}

export interface LoadingState {
  [key: string]: boolean; // key is operation identifier
}

export interface HistoryFilters {
  platform?: Platform;
  status?: ReleaseStatus;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}
