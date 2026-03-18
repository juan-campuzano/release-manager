/**
 * Release Manager Service - Core application service for release lifecycle management
 * Orchestrates release operations across data, integration, and application layers
 */

import {
  Release,
  ReleaseConfiguration,
  ReleaseStage,
  ReleaseStatus,
  Blocker,
  SignOff,
  Platform,
  Distribution,
  DistributionStatus,
  ITGCStatus
} from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { ApplicationError, ValidationError, NotFoundError } from '../common/errors';
import { ReleaseStore } from '../data/release-store';
import { HistoryStore } from '../data/history-store';
import { EventStore } from '../services/eventStore';
import { StateManager } from './state-manager';
import { ConfigParser } from './config-parser';
import { logger } from '../common/logger';

/**
 * Sign-off status for a release
 */
export interface SignOffStatus {
  allApproved: boolean;
  requiredSquads: string[];
  approvedSquads: string[];
  pendingSquads: string[];
}

/**
 * Filters for querying release history
 */
export interface HistoryFilters {
  platform?: Platform;
  status?: ReleaseStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Configuration for Release Manager Service
 */
export interface ReleaseManagerConfig {
  releaseStore: ReleaseStore;
  historyStore: HistoryStore;
  stateManager: StateManager;
  configParser: ConfigParser;
  eventStore?: EventStore;
}

/**
 * Release Manager Service - Main application service for release management
 */
export class ReleaseManagerService {
  private releaseStore: ReleaseStore;
  private historyStore: HistoryStore;
  private stateManager: StateManager;
  private configParser: ConfigParser;
  private eventStore?: EventStore;

  constructor(config: ReleaseManagerConfig) {
    this.releaseStore = config.releaseStore;
    this.historyStore = config.historyStore;
    this.stateManager = config.stateManager;
    this.configParser = config.configParser;
    this.eventStore = config.eventStore;
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `evt-${timestamp}-${random}`;
  }

  /**
   * Create a new release from configuration
   */
  async createRelease(config: ReleaseConfiguration): Promise<Result<Release, ApplicationError>> {
    try {
      logger.info('Creating new release', { 
        platform: config.platform, 
        version: config.version 
      });
      
      // Validate configuration
      const validation = this.configParser.validate(config);
      if (!validation.valid) {
        logger.error('Release configuration validation failed', undefined, {
          errors: validation.errors
        });
        return Failure(
          new ValidationError('Invalid release configuration', validation.errors)
        );
      }

      // Create initial sign-offs for required squads
      const signOffs: SignOff[] = config.requiredSquads.map(squad => ({
        squad,
        approved: false
      }));

      // Create the release object
      const release: Release = {
        id: this.generateReleaseId(config.platform, config.version),
        platform: config.platform,
        status: ReleaseStatus.Upcoming,
        currentStage: ReleaseStage.ReleaseBranching,
        version: config.version,
        branchName: config.branchName,
        sourceType: config.sourceType,
        repositoryUrl: config.repositoryUrl,
        latestBuild: '',
        latestPassingBuild: '',
        latestAppStoreBuild: '',
        blockers: [],
        signOffs,
        rolloutPercentage: 0,
        itgcStatus: {
          compliant: false,
          rolloutComplete: false,
          details: 'Pending initial compliance check',
          lastCheckedAt: new Date()
        },
        distributions: [],
        ...(config.repositoryConfigId ? { repositoryConfigId: config.repositoryConfigId } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      // Store the release
      const result = await this.releaseStore.create(release);
      if (!result.success) {
        logger.error('Failed to store release', result.error, { releaseId: release.id });
        return result;
      }

      // Create initial history snapshot
      await this.historyStore.createSnapshot(release);

      // Record release created event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId: release.id,
        type: 'release_created',
        timestamp: new Date().toISOString(),
        data: {
          platform: release.platform,
          version: release.version,
          createdBy: 'system'
        }
      });

      logger.info('Release created successfully', { 
        releaseId: release.id,
        platform: release.platform,
        version: release.version
      });
      return Success(release);
    } catch (error) {
      logger.error('Unexpected error creating release', error as Error);
      return Failure(
        new ApplicationError('Failed to create release', error as Error)
      );
    }
  }

  /**
   * Update the stage of a release
   */
  async updateReleaseStage(
    releaseId: string,
    stage: ReleaseStage
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Validate state transition
      const validation = this.stateManager.validateStateTransition(currentRelease, stage);
      if (!validation.valid) {
        return Failure(
          new ValidationError(
            `Cannot transition from ${currentRelease.currentStage} to ${stage}`,
            validation.errors
          )
        );
      }

      const previousStage = currentRelease.currentStage;

      // Apply state transition
      const updatedRelease = this.stateManager.applyStateTransition(currentRelease, stage);

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record stage change event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'stage_change',
        timestamp: new Date().toISOString(),
        data: {
          previousStage,
          newStage: stage
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to update release stage', error as Error)
      );
    }
  }

  /**
   * Update the status of a release
   */
  async updateReleaseStatus(
    releaseId: string,
    status: ReleaseStatus
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Update status
      const updatedRelease: Release = {
        ...currentRelease,
        status,
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to update release status', error as Error)
      );
    }
  }
  /**
   * Update build information for a release
   */
  async updateBuildInfo(
    releaseId: string,
    buildInfo: { latestBuild?: string; latestPassingBuild?: string; latestAppStoreBuild?: string }
  ): Promise<Result<Release, ApplicationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      const updatedRelease: Release = {
        ...currentRelease,
        latestBuild: buildInfo.latestBuild ?? currentRelease.latestBuild,
        latestPassingBuild: buildInfo.latestPassingBuild ?? currentRelease.latestPassingBuild,
        latestAppStoreBuild: buildInfo.latestAppStoreBuild ?? currentRelease.latestAppStoreBuild,
        updatedAt: new Date()
      };

      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(releaseId, updatedRelease, version);

      if (!updateResult.success) {
        return updateResult;
      }

      await this.historyStore.createSnapshot(updateResult.value);
      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to update build info', error as Error)
      );
    }
  }


  /**
   * Get a single release by ID
   */
  async getRelease(releaseId: string): Promise<Result<Release, ApplicationError>> {
    return this.releaseStore.getRelease(releaseId);
  }

  /**
   * Get active releases, optionally filtered by platform
   */
  async getActiveReleases(platform?: Platform): Promise<Result<Release[], ApplicationError>> {
    return this.releaseStore.getActiveReleases(platform);
  }

  /**
   * Add a distribution channel to a release
   */
  async addDistributionChannel(
    releaseId: string,
    channel: string,
    status: DistributionStatus = 'pending'
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Check if channel already exists
      const existingChannel = currentRelease.distributions.find(d => d.channel === channel);
      if (existingChannel) {
        return Failure(
          new ValidationError(`Distribution channel ${channel} already exists for release ${releaseId}`)
        );
      }

      // Add new distribution channel
      const newDistribution: Distribution = {
        channel,
        status,
        updatedAt: new Date()
      };

      const updatedRelease: Release = {
        ...currentRelease,
        distributions: [...currentRelease.distributions, newDistribution],
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to add distribution channel', error as Error)
      );
    }
  }

  /**
   * Update distribution channel status
   */
  async updateDistributionStatus(
    releaseId: string,
    channel: string,
    status: DistributionStatus
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Find the distribution channel
      const channelIndex = currentRelease.distributions.findIndex(d => d.channel === channel);
      if (channelIndex === -1) {
        return Failure(
          new NotFoundError(`Distribution channel ${channel} not found in release ${releaseId}`)
        );
      }

      const previousStatus = currentRelease.distributions[channelIndex].status;

      // Update the distribution status
      const updatedDistributions = [...currentRelease.distributions];
      updatedDistributions[channelIndex] = {
        ...updatedDistributions[channelIndex],
        status,
        updatedAt: new Date()
      };

      const updatedRelease: Release = {
        ...currentRelease,
        distributions: updatedDistributions,
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record distribution updated event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'distribution_updated',
        timestamp: new Date().toISOString(),
        data: {
          channel,
          previousStatus,
          newStatus: status
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to update distribution status', error as Error)
      );
    }
  }

  /**
   * Update ITGC status for a release
   */
  async updateITGCStatus(
    releaseId: string,
    compliant: boolean,
    rolloutComplete: boolean,
    details: string
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Update ITGC status
      const updatedRelease: Release = {
        ...currentRelease,
        itgcStatus: {
          compliant,
          rolloutComplete,
          details,
          lastCheckedAt: new Date()
        },
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record ITGC updated event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'itgc_updated',
        timestamp: new Date().toISOString(),
        data: {
          compliant,
          rolloutComplete,
          details
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to update ITGC status', error as Error)
      );
    }
  }

  /**
   * Get ITGC status for a release
   */
  async getITGCStatus(releaseId: string): Promise<Result<ITGCStatus, ApplicationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return Failure(releaseResult.error);
      }

      return Success(releaseResult.value.itgcStatus);
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to get ITGC status', error as Error)
      );
    }
  }

  /**
   * Check if ITGC warning should be displayed
   */
  async shouldShowITGCWarning(releaseId: string): Promise<Result<boolean, ApplicationError>> {
    try {
      const itgcResult = await this.getITGCStatus(releaseId);
      if (!itgcResult.success) {
        return itgcResult as Result<boolean, ApplicationError>;
      }

      // Show warning if not compliant
      return Success(!itgcResult.value.compliant);
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to check ITGC warning status', error as Error)
      );
    }
  }

  /**
   * Get all distribution channels for a release
   */
  async getDistributions(releaseId: string): Promise<Result<Distribution[], ApplicationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return Failure(releaseResult.error);
      }

      return Success(releaseResult.value.distributions);
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to get distributions', error as Error)
      );
    }
  }

  /**
   * Get release history with filters
   */
  async getReleaseHistory(filters: HistoryFilters): Promise<Result<Release[], ApplicationError>> {
    return this.releaseStore.getReleaseHistory(filters);
  }

  /**
   * Add a blocker to a release
   */
  async addBlocker(
    releaseId: string,
    blocker: Omit<Blocker, 'id' | 'createdAt'>
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Create new blocker with ID and timestamp
      const newBlocker: Blocker = {
        ...blocker,
        id: this.generateBlockerId(releaseId),
        createdAt: new Date()
      };

      // Add blocker to release
      const updatedRelease: Release = {
        ...currentRelease,
        blockers: [...currentRelease.blockers, newBlocker],
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record blocker added event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'blocker_added',
        timestamp: new Date().toISOString(),
        data: {
          blockerId: newBlocker.id,
          title: newBlocker.title,
          severity: newBlocker.severity,
          assignee: newBlocker.assignee ?? 'unassigned',
          issueUrl: newBlocker.issueUrl,
          description: newBlocker.description
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to add blocker', error as Error)
      );
    }
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(
    releaseId: string,
    blockerId: string
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Find the blocker
      const blockerIndex = currentRelease.blockers.findIndex(b => b.id === blockerId);
      if (blockerIndex === -1) {
        return Failure(
          new NotFoundError(`Blocker ${blockerId} not found in release ${releaseId}`)
        );
      }

      const blocker = currentRelease.blockers[blockerIndex];

      // Mark blocker as resolved
      const updatedBlockers = [...currentRelease.blockers];
      updatedBlockers[blockerIndex] = {
        ...updatedBlockers[blockerIndex],
        resolvedAt: new Date()
      };

      const updatedRelease: Release = {
        ...currentRelease,
        blockers: updatedBlockers,
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record blocker resolved event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'blocker_resolved',
        timestamp: new Date().toISOString(),
        data: {
          blockerId: blocker.id,
          title: blocker.title,
          severity: blocker.severity
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to resolve blocker', error as Error)
      );
    }
  }

  /**
   * Get all blockers for a release
   */
  async getBlockers(releaseId: string): Promise<Result<Blocker[], ApplicationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return Failure(releaseResult.error);
      }

      return Success(releaseResult.value.blockers);
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to get blockers', error as Error)
      );
    }
  }

  /**
   * Generate a unique release ID
   */
  private generateReleaseId(platform: Platform, version: string): string {
    const timestamp = Date.now();
    return `${platform.toLowerCase()}-${version}-${timestamp}`;
  }

  /**
   * Record a squad sign-off for a release
   */
  async recordSignOff(
    releaseId: string,
    squad: string,
    approvedBy?: string,
    comments?: string
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;

      // Find the sign-off for this squad
      const signOffIndex = currentRelease.signOffs.findIndex(s => s.squad === squad);
      if (signOffIndex === -1) {
        return Failure(
          new NotFoundError(`Squad ${squad} is not a required sign-off for release ${releaseId}`)
        );
      }

      // Update the sign-off
      const updatedSignOffs = [...currentRelease.signOffs];
      updatedSignOffs[signOffIndex] = {
        ...updatedSignOffs[signOffIndex],
        approved: true,
        approvedBy,
        approvedAt: new Date(),
        comments
      };

      const updatedRelease: Release = {
        ...currentRelease,
        signOffs: updatedSignOffs,
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record sign-off event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'signoff_recorded',
        timestamp: new Date().toISOString(),
        data: {
          signOffId: `signoff-${releaseId}-${squad}`,
          squad,
          approverName: approvedBy ?? 'unknown',
          comments
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to record sign-off', error as Error)
      );
    }
  }

  /**
   * Update rollout percentage for a release
   */
  async updateRolloutPercentage(
    releaseId: string,
    percentage: number
  ): Promise<Result<Release, ApplicationError>> {
    try {
      // Validate rollout percentage
      const validation = this.stateManager.validateRolloutPercentage(percentage);
      if (!validation.valid) {
        return Failure(
          new ValidationError('Invalid rollout percentage', validation.errors)
        );
      }

      // Get current release
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return releaseResult;
      }

      const currentRelease = releaseResult.value;
      const previousPercentage = currentRelease.rolloutPercentage;

      // Update rollout percentage
      const updatedRelease: Release = {
        ...currentRelease,
        rolloutPercentage: percentage,
        updatedAt: new Date()
      };

      // Update in store
      const version = this.releaseStore.getVersion(releaseId);
      const updateResult = await this.releaseStore.update(
        releaseId,
        updatedRelease,
        version
      );

      if (!updateResult.success) {
        return updateResult;
      }

      // Create history snapshot
      await this.historyStore.createSnapshot(updateResult.value);

      // Record rollout updated event
      this.eventStore?.recordEvent({
        id: this.generateEventId(),
        releaseId,
        type: 'rollout_updated',
        timestamp: new Date().toISOString(),
        data: {
          previousPercentage,
          newPercentage: percentage
        }
      });

      return updateResult;
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to update rollout percentage', error as Error)
      );
    }
  }

  /**
   * Get sign-off status for a release
   */
  async getSignOffStatus(releaseId: string): Promise<Result<SignOffStatus, ApplicationError>> {
    try {
      const releaseResult = await this.releaseStore.getRelease(releaseId);
      if (!releaseResult.success) {
        return Failure(releaseResult.error);
      }

      const release = releaseResult.value;
      const requiredSquads = release.signOffs.map(s => s.squad);
      const approvedSquads = release.signOffs
        .filter(s => s.approved)
        .map(s => s.squad);
      const pendingSquads = release.signOffs
        .filter(s => !s.approved)
        .map(s => s.squad);

      const status: SignOffStatus = {
        allApproved: pendingSquads.length === 0,
        requiredSquads,
        approvedSquads,
        pendingSquads
      };

      return Success(status);
    } catch (error) {
      return Failure(
        new ApplicationError('Failed to get sign-off status', error as Error)
      );
    }
  }

  /**
   * Generate a unique blocker ID
   */
  private generateBlockerId(releaseId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `blocker-${releaseId}-${timestamp}-${random}`;
  }
}
