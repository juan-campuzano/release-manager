/**
 * Core domain types for the Release Manager Tool
 */

/**
 * Supported deployment platforms
 */
export enum Platform {
  iOS = 'iOS',
  Android = 'Android',
  Desktop = 'Desktop'
}

/**
 * Release classification status
 */
export enum ReleaseStatus {
  Upcoming = 'Upcoming',
  Current = 'Current',
  Production = 'Production'
}

/**
 * Release pipeline stages
 */
export enum ReleaseStage {
  ReleaseBranching = 'Release Branching',
  FinalReleaseCandidate = 'Final Release Candidate',
  SubmitForAppStoreReview = 'Submit For App Store Review',
  RollOut1Percent = 'Roll Out 1%',
  RollOut100Percent = 'Roll Out 100%'
}

/**
 * Blocker severity levels
 */
export type BlockerSeverity = 'critical' | 'high' | 'medium';

/**
 * Source control system type
 */
export type SourceType = 'github' | 'azure';

/**
 * Build status
 */
export type BuildStatus = 'pending' | 'running' | 'passed' | 'failed';

/**
 * Distribution channel status
 */
export type DistributionStatus = 'pending' | 'submitted' | 'approved' | 'live';

/**
 * Work item types in Azure DevOps
 */
export type WorkItemType = 'Bug' | 'Feature' | 'Task' | 'User Story';

/**
 * Issue or blocker preventing release progress
 */
export interface Blocker {
  id: string;
  title: string;
  description: string;
  severity: BlockerSeverity;
  createdAt: Date;
  resolvedAt?: Date;
  assignee?: string;
  issueUrl?: string;
}

/**
 * Squad sign-off approval for a release
 */
export interface SignOff {
  squad: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
}

/**
 * Quality metrics for a release
 */
export interface QualityMetrics {
  crashRate: number;
  cpuExceptionRate: number;
  thresholds: {
    crashRateThreshold: number;
    cpuExceptionRateThreshold: number;
  };
  collectedAt: Date;
}

/**
 * Daily Active Users statistics
 */
export interface DAUStats {
  dailyActiveUsers: number;
  trend: number[];
  collectedAt: Date;
}

/**
 * IT General Controls compliance status
 */
export interface ITGCStatus {
  compliant: boolean;
  rolloutComplete: boolean;
  details: string;
  lastCheckedAt: Date;
}

/**
 * Distribution channel information
 */
export interface Distribution {
  channel: string;
  status: DistributionStatus;
  updatedAt: Date;
}

/**
 * Complete release information
 */
export interface Release {
  id: string;
  platform: Platform;
  status: ReleaseStatus;
  currentStage: ReleaseStage;
  
  // Version information
  version: string;
  branchName: string;
  sourceType: SourceType;
  repositoryUrl: string;
  
  // Build information
  latestBuild: string;
  latestPassingBuild: string;
  latestAppStoreBuild: string;
  
  // Tracking
  blockers: Blocker[];
  signOffs: SignOff[];
  rolloutPercentage: number;
  
  // Metrics
  qualityMetrics?: QualityMetrics;
  dauStats?: DAUStats;
  itgcStatus: ITGCStatus;
  
  // Distribution
  distributions: Distribution[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
}

/**
 * Configuration for creating a new release
 */
export interface ReleaseConfiguration {
  platform: Platform;
  version: string;
  branchName: string;
  repositoryUrl: string;
  sourceType: SourceType;
  
  // Required squads for sign-off
  requiredSquads: string[];
  
  // Quality thresholds
  qualityThresholds: {
    crashRateThreshold: number;
    cpuExceptionRateThreshold: number;
  };
  
  // Rollout configuration
  rolloutStages: number[];
  
  // Integration settings
  ciPipelineId?: string;
  analyticsProjectId?: string;
}

/**
 * Named repository-level default configuration that can be reused when creating releases
 */
export interface RepositoryConfig {
  id: string;
  name: string;
  repositoryUrl: string;
  sourceType: SourceType;
  requiredSquads: string[];
  qualityThresholds: {
    crashRateThreshold: number;
    cpuExceptionRateThreshold: number;
  };
  rolloutStages: number[];
  ciPipelineId?: string;
  analyticsProjectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Git branch information
 */
export interface Branch {
  name: string;
  commit: string;
  protected: boolean;
  createdAt: Date;
}

/**
 * Git tag information
 */
export interface Tag {
  name: string;
  commit: string;
  message: string;
  createdAt: Date;
}

/**
 * Build information from CI/CD system
 */
export interface Build {
  id: string;
  number: string;
  status: BuildStatus;
  branch: string;
  commit: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Azure DevOps work item
 */
export interface WorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  state: string;
  assignedTo?: string;
  url: string;
}

/**
 * Git commit information
 */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}


// ─── Release Event Types ────────────────────────────────────────────────────

/**
 * Types of events that can occur during a release lifecycle
 */
export type EventType =
  | 'release_created'
  | 'stage_change'
  | 'blocker_added'
  | 'blocker_resolved'
  | 'signoff_recorded'
  | 'rollout_updated'
  | 'distribution_updated'
  | 'itgc_updated';

/**
 * Base interface for all release events
 */
export interface BaseReleaseEvent {
  id: string;
  releaseId: string;
  type: EventType;
  timestamp: string; // ISO 8601
  userId?: string;
  userName?: string;
}

/**
 * Event recorded when a release is created
 */
export interface ReleaseCreatedEvent extends BaseReleaseEvent {
  type: 'release_created';
  data: {
    platform: Platform;
    version: string;
    createdBy: string;
  };
}

/**
 * Event recorded when a release stage changes
 */
export interface StageChangeEvent extends BaseReleaseEvent {
  type: 'stage_change';
  data: {
    previousStage: ReleaseStage;
    newStage: ReleaseStage;
  };
}

/**
 * Event recorded when a blocker is added to a release
 */
export interface BlockerAddedEvent extends BaseReleaseEvent {
  type: 'blocker_added';
  data: {
    blockerId: string;
    title: string;
    severity: BlockerSeverity;
    assignee: string;
    issueUrl?: string;
    description?: string;
  };
}

/**
 * Event recorded when a blocker is resolved
 */
export interface BlockerResolvedEvent extends BaseReleaseEvent {
  type: 'blocker_resolved';
  data: {
    blockerId: string;
    title: string;
    severity: BlockerSeverity;
  };
}

/**
 * Event recorded when a squad sign-off is recorded
 */
export interface SignOffRecordedEvent extends BaseReleaseEvent {
  type: 'signoff_recorded';
  data: {
    signOffId: string;
    squad: string;
    approverName: string;
    comments?: string;
  };
}

/**
 * Event recorded when rollout percentage is updated
 */
export interface RolloutUpdatedEvent extends BaseReleaseEvent {
  type: 'rollout_updated';
  data: {
    previousPercentage: number;
    newPercentage: number;
  };
}

/**
 * Event recorded when a distribution channel status changes
 */
export interface DistributionUpdatedEvent extends BaseReleaseEvent {
  type: 'distribution_updated';
  data: {
    channel: string;
    previousStatus: DistributionStatus;
    newStatus: DistributionStatus;
  };
}

/**
 * Event recorded when ITGC status is updated
 */
export interface ITGCUpdatedEvent extends BaseReleaseEvent {
  type: 'itgc_updated';
  data: {
    compliant: boolean;
    rolloutComplete: boolean;
    details?: string;
  };
}

/**
 * Discriminated union of all release event types
 */
export type ReleaseEvent =
  | ReleaseCreatedEvent
  | StageChangeEvent
  | BlockerAddedEvent
  | BlockerResolvedEvent
  | SignOffRecordedEvent
  | RolloutUpdatedEvent
  | DistributionUpdatedEvent
  | ITGCUpdatedEvent;

/**
 * Response shape for the GET /api/releases/:id/events endpoint
 */
export interface GetEventsResponse {
  events: ReleaseEvent[];
}
