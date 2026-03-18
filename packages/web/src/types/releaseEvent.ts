/**
 * Release event types for the web package.
 * Mirrors the server domain event types for frontend use.
 */
import type { Platform, ReleaseStage, BlockerSeverity, DistributionStatus } from './index';

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