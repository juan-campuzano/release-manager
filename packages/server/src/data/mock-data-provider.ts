/**
 * Mock Data Provider - In-memory data provider for demo and testing
 * Implements the DataProvider interface with in-memory storage
 * Uses MockDataGenerator to initialize realistic release data
 */

import {
  Release,
  Platform,
  ReleaseStatus,
  ReleaseStage,
  Blocker,
  SignOff,
  Distribution,
  DistributionStatus,
  ITGCStatus,
  BlockerSeverity
} from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { NotFoundError, ApplicationError, ValidationError } from '../common/errors';
import { MockDataGenerator } from './mock-data-generator';

/**
 * Filters for querying releases
 */
export interface ReleaseFilters {
  platform?: Platform;
  status?: ReleaseStatus;
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
 * DataProvider interface that MockDataProvider implements
 * Provides all operations needed for release management
 */
export interface DataProvider {
  // Release operations
  create(release: Release): Promise<Result<Release, ApplicationError>>;
  findById(id: string): Promise<Result<Release | null, ApplicationError>>;
  findAll(filters?: ReleaseFilters): Promise<Result<Release[], ApplicationError>>;
  update(id: string, updates: Partial<Release>): Promise<Result<Release, ApplicationError>>;
  delete(id: string): Promise<Result<void, ApplicationError>>;
  
  // Blocker operations
  addBlocker(releaseId: string, blocker: Blocker): Promise<Result<Blocker, ApplicationError>>;
  resolveBlocker(releaseId: string, blockerId: string): Promise<Result<Blocker, ApplicationError>>;
  
  // Sign-off operations
  updateSignOff(releaseId: string, signOff: SignOff): Promise<Result<SignOff, ApplicationError>>;
  
  // Distribution operations
  addDistribution(releaseId: string, distribution: Distribution): Promise<Result<Distribution, ApplicationError>>;
  updateDistribution(releaseId: string, channel: string, status: DistributionStatus): Promise<Result<Distribution, ApplicationError>>;
  
  // Stage and status operations
  updateStage(releaseId: string, stage: ReleaseStage): Promise<Result<Release, ApplicationError>>;
  updateStatus(releaseId: string, status: ReleaseStatus): Promise<Result<Release, ApplicationError>>;
  updateRollout(releaseId: string, percentage: number): Promise<Result<Release, ApplicationError>>;
  
  // ITGC operations
  updateITGC(releaseId: string, itgcStatus: ITGCStatus): Promise<Result<Release, ApplicationError>>;
  
  // History operations
  getHistory(filters?: HistoryFilters): Promise<Result<Release[], ApplicationError>>;
  createSnapshot(release: Release): Promise<Result<void, ApplicationError>>;
}

/**
 * Mock Data Provider implementation
 * Stores data in-memory using Map and Array structures
 * Initializes with realistic mock data from MockDataGenerator
 */
export class MockDataProvider implements DataProvider {
  private releases: Map<string, Release>;
  private history: Release[];
  private generator: MockDataGenerator;

  constructor() {
    this.releases = new Map();
    this.history = [];
    this.generator = new MockDataGenerator();
    this.initializeData();
  }

  /**
   * Initialize in-memory storage with mock data
   * Uses MockDataGenerator to create realistic releases
   */
  private initializeData(): void {
    const mockReleases = this.generator.generateReleases();
    mockReleases.forEach(release => {
      this.releases.set(release.id, release);
      // Create a snapshot in history
      this.history.push({ ...release });
    });
  }

  /**
   * Validate semantic version format (MAJOR.MINOR.PATCH)
   */
  private isValidSemanticVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * Validate rollout percentage (0-100)
   */
  private isValidRolloutPercentage(percentage: number): boolean {
    return percentage >= 0 && percentage <= 100;
  }

  /**
   * Validate platform enum value
   */
  private isValidPlatform(platform: any): platform is Platform {
    return Object.values(Platform).includes(platform);
  }

  /**
   * Validate release status enum value
   */
  private isValidReleaseStatus(status: any): status is ReleaseStatus {
    return Object.values(ReleaseStatus).includes(status);
  }

  /**
   * Validate release stage enum value
   */
  private isValidReleaseStage(stage: any): stage is ReleaseStage {
    return Object.values(ReleaseStage).includes(stage);
  }

  /**
   * Validate blocker severity enum value
   */
  private isValidBlockerSeverity(severity: any): severity is BlockerSeverity {
    return ['critical', 'high', 'medium'].includes(severity);
  }

  /**
   * Validate distribution status enum value
   */
  private isValidDistributionStatus(status: any): status is DistributionStatus {
    return ['pending', 'submitted', 'approved', 'live'].includes(status);
  }

  /**
   * Validate release data
   */
  private validateRelease(release: Release): string[] {
    const errors: string[] = [];

    // Required fields
    if (!release.id) errors.push('Release ID is required');
    if (!release.version) errors.push('Version is required');
    if (!release.branchName) errors.push('Branch name is required');
    if (!release.repositoryUrl) errors.push('Repository URL is required');

    // Enum validations
    if (!this.isValidPlatform(release.platform)) {
      errors.push(`Invalid platform: ${release.platform}. Must be one of: ${Object.values(Platform).join(', ')}`);
    }
    if (!this.isValidReleaseStatus(release.status)) {
      errors.push(`Invalid status: ${release.status}. Must be one of: ${Object.values(ReleaseStatus).join(', ')}`);
    }
    if (!this.isValidReleaseStage(release.currentStage)) {
      errors.push(`Invalid stage: ${release.currentStage}. Must be one of: ${Object.values(ReleaseStage).join(', ')}`);
    }

    // Version format validation
    if (release.version && !this.isValidSemanticVersion(release.version)) {
      errors.push(`Invalid version format: ${release.version}. Must be semantic version (e.g., 1.0.0)`);
    }

    // Rollout percentage validation
    if (release.rolloutPercentage !== undefined && !this.isValidRolloutPercentage(release.rolloutPercentage)) {
      errors.push(`Invalid rollout percentage: ${release.rolloutPercentage}. Must be between 0 and 100`);
    }

    return errors;
  }

  /**
   * Validate blocker data
   */
  private validateBlocker(blocker: Blocker): string[] {
    const errors: string[] = [];

    // Required fields
    if (!blocker.id) errors.push('Blocker ID is required');
    if (!blocker.title) errors.push('Blocker title is required');
    if (!blocker.description) errors.push('Blocker description is required');
    if (!blocker.severity) errors.push('Blocker severity is required');

    // Enum validation
    if (blocker.severity && !this.isValidBlockerSeverity(blocker.severity)) {
      errors.push(`Invalid blocker severity: ${blocker.severity}. Must be one of: critical, high, medium`);
    }

    return errors;
  }

  /**
   * Validate distribution data
   */
  private validateDistribution(distribution: Distribution): string[] {
    const errors: string[] = [];

    // Required fields
    if (!distribution.channel) errors.push('Distribution channel is required');
    if (!distribution.status) errors.push('Distribution status is required');

    // Enum validation
    if (distribution.status && !this.isValidDistributionStatus(distribution.status)) {
      errors.push(`Invalid distribution status: ${distribution.status}. Must be one of: pending, submitted, approved, live`);
    }

    return errors;
  }

  /**
   * Create a new release
   */
  async create(release: Release): Promise<Result<Release, ApplicationError>> {
    try {
      // Validate release data
      const validationErrors = this.validateRelease(release);
      if (validationErrors.length > 0) {
        return Failure(new ValidationError('Invalid release data', validationErrors));
      }

      // Store the release
      this.releases.set(release.id, { ...release });
      
      // Create a snapshot in history
      this.history.push({ ...release });
      
      return Success(release);
    } catch (error) {
      return Failure(new ApplicationError('Failed to create release', error as Error));
    }
  }

  /**
   * Find a release by ID
   */
  async findById(id: string): Promise<Result<Release | null, ApplicationError>> {
    try {
      const release = this.releases.get(id);
      
      if (!release) {
        return Success(null);
      }
      
      // Return a copy to prevent external modifications
      return Success({ ...release });
    } catch (error) {
      return Failure(new ApplicationError('Failed to find release', error as Error));
    }
  }

  /**
   * Find all releases with optional filters
   */
  async findAll(filters?: ReleaseFilters): Promise<Result<Release[], ApplicationError>> {
    try {
      let releases = Array.from(this.releases.values());
      
      // Apply filters
      if (filters?.platform) {
        releases = releases.filter(r => r.platform === filters.platform);
      }
      
      if (filters?.status) {
        releases = releases.filter(r => r.status === filters.status);
      }
      
      // Return copies to prevent external modifications
      return Success(releases.map(r => ({ ...r })));
    } catch (error) {
      return Failure(new ApplicationError('Failed to find releases', error as Error));
    }
  }

  /**
   * Update a release
   */
  async update(id: string, updates: Partial<Release>): Promise<Result<Release, ApplicationError>> {
    try {
      const existing = this.releases.get(id);
      
      if (!existing) {
        return Failure(new NotFoundError(`Release ${id} not found`));
      }
      
      // Apply updates
      const updated: Release = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date()
      };
      
      this.releases.set(id, updated);
      
      return Success({ ...updated });
    } catch (error) {
      return Failure(new ApplicationError('Failed to update release', error as Error));
    }
  }

  /**
   * Delete a release
   */
  async delete(id: string): Promise<Result<void, ApplicationError>> {
    try {
      const existing = this.releases.get(id);
      
      if (!existing) {
        return Failure(new NotFoundError(`Release ${id} not found`));
      }
      
      this.releases.delete(id);
      
      return Success(undefined);
    } catch (error) {
      return Failure(new ApplicationError('Failed to delete release', error as Error));
    }
  }

  /**
   * Add a blocker to a release
   */
  async addBlocker(releaseId: string, blocker: Blocker): Promise<Result<Blocker, ApplicationError>> {
    try {
      // Validate blocker data
      const validationErrors = this.validateBlocker(blocker);
      if (validationErrors.length > 0) {
        return Failure(new ValidationError('Invalid blocker data', validationErrors));
      }

      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      // Add the blocker
      release.blockers.push({ ...blocker });
      release.updatedAt = new Date();
      
      return Success(blocker);
    } catch (error) {
      return Failure(new ApplicationError('Failed to add blocker', error as Error));
    }
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(releaseId: string, blockerId: string): Promise<Result<Blocker, ApplicationError>> {
    try {
      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      const blocker = release.blockers.find(b => b.id === blockerId);
      
      if (!blocker) {
        return Failure(new NotFoundError(`Blocker ${blockerId} not found`));
      }
      
      // Mark as resolved
      blocker.resolvedAt = new Date();
      release.updatedAt = new Date();
      
      return Success({ ...blocker });
    } catch (error) {
      return Failure(new ApplicationError('Failed to resolve blocker', error as Error));
    }
  }

  /**
   * Update a sign-off
   */
  async updateSignOff(releaseId: string, signOff: SignOff): Promise<Result<SignOff, ApplicationError>> {
    try {
      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      // Find existing sign-off for the squad
      const existingIndex = release.signOffs.findIndex(s => s.squad === signOff.squad);
      
      if (existingIndex >= 0) {
        // Update existing sign-off
        release.signOffs[existingIndex] = { ...signOff };
      } else {
        // Add new sign-off
        release.signOffs.push({ ...signOff });
      }
      
      release.updatedAt = new Date();
      
      return Success(signOff);
    } catch (error) {
      return Failure(new ApplicationError('Failed to update sign-off', error as Error));
    }
  }

  /**
   * Add a distribution channel to a release
   */
  async addDistribution(releaseId: string, distribution: Distribution): Promise<Result<Distribution, ApplicationError>> {
    try {
      // Validate distribution data
      const validationErrors = this.validateDistribution(distribution);
      if (validationErrors.length > 0) {
        return Failure(new ValidationError('Invalid distribution data', validationErrors));
      }

      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      // Add the distribution
      release.distributions.push({ ...distribution });
      release.updatedAt = new Date();
      
      return Success(distribution);
    } catch (error) {
      return Failure(new ApplicationError('Failed to add distribution', error as Error));
    }
  }

  /**
   * Update a distribution channel status
   */
  async updateDistribution(releaseId: string, channel: string, status: DistributionStatus): Promise<Result<Distribution, ApplicationError>> {
    try {
      // Validate distribution status
      if (!this.isValidDistributionStatus(status)) {
        return Failure(new ValidationError('Invalid distribution status', [
          `Invalid distribution status: ${status}. Must be one of: pending, submitted, approved, live`
        ]));
      }

      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      const distribution = release.distributions.find(d => d.channel === channel);
      
      if (!distribution) {
        return Failure(new NotFoundError(`Distribution channel ${channel} not found`));
      }
      
      // Update the status
      distribution.status = status;
      distribution.updatedAt = new Date();
      release.updatedAt = new Date();
      
      return Success({ ...distribution });
    } catch (error) {
      return Failure(new ApplicationError('Failed to update distribution', error as Error));
    }
  }

  /**
   * Update release stage
   */
  async updateStage(releaseId: string, stage: ReleaseStage): Promise<Result<Release, ApplicationError>> {
    try {
      // Validate release stage
      if (!this.isValidReleaseStage(stage)) {
        return Failure(new ValidationError('Invalid release stage', [
          `Invalid stage: ${stage}. Must be one of: ${Object.values(ReleaseStage).join(', ')}`
        ]));
      }

      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      release.currentStage = stage;
      release.updatedAt = new Date();
      
      return Success({ ...release });
    } catch (error) {
      return Failure(new ApplicationError('Failed to update stage', error as Error));
    }
  }

  /**
   * Update release status
   */
  async updateStatus(releaseId: string, status: ReleaseStatus): Promise<Result<Release, ApplicationError>> {
    try {
      // Validate release status
      if (!this.isValidReleaseStatus(status)) {
        return Failure(new ValidationError('Invalid release status', [
          `Invalid status: ${status}. Must be one of: ${Object.values(ReleaseStatus).join(', ')}`
        ]));
      }

      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      release.status = status;
      release.updatedAt = new Date();
      
      return Success({ ...release });
    } catch (error) {
      return Failure(new ApplicationError('Failed to update status', error as Error));
    }
  }

  /**
   * Update release rollout percentage
   */
  async updateRollout(releaseId: string, percentage: number): Promise<Result<Release, ApplicationError>> {
    try {
      // Validate rollout percentage
      if (!this.isValidRolloutPercentage(percentage)) {
        return Failure(new ValidationError('Invalid rollout percentage', [
          `Invalid rollout percentage: ${percentage}. Must be between 0 and 100`
        ]));
      }

      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      release.rolloutPercentage = percentage;
      release.updatedAt = new Date();
      
      return Success({ ...release });
    } catch (error) {
      return Failure(new ApplicationError('Failed to update rollout', error as Error));
    }
  }

  /**
   * Update ITGC status
   */
  async updateITGC(releaseId: string, itgcStatus: ITGCStatus): Promise<Result<Release, ApplicationError>> {
    try {
      const release = this.releases.get(releaseId);
      
      if (!release) {
        return Failure(new NotFoundError(`Release ${releaseId} not found`));
      }
      
      release.itgcStatus = { ...itgcStatus };
      release.updatedAt = new Date();
      
      return Success({ ...release });
    } catch (error) {
      return Failure(new ApplicationError('Failed to update ITGC status', error as Error));
    }
  }

  /**
   * Get release history with optional filters
   */
  async getHistory(filters?: HistoryFilters): Promise<Result<Release[], ApplicationError>> {
    try {
      let releases = [...this.history];
      
      // Apply filters
      if (filters?.platform) {
        releases = releases.filter(r => r.platform === filters.platform);
      }
      
      if (filters?.status) {
        releases = releases.filter(r => r.status === filters.status);
      }
      
      if (filters?.startDate) {
        releases = releases.filter(r => 
          new Date(r.createdAt) >= filters.startDate!
        );
      }
      
      if (filters?.endDate) {
        releases = releases.filter(r => 
          new Date(r.createdAt) <= filters.endDate!
        );
      }
      
      // Return copies to prevent external modifications
      return Success(releases.map(r => ({ ...r })));
    } catch (error) {
      return Failure(new ApplicationError('Failed to get history', error as Error));
    }
  }

  /**
   * Create a snapshot of a release in history
   */
  async createSnapshot(release: Release): Promise<Result<void, ApplicationError>> {
    try {
      // Add a copy to history
      this.history.push({ ...release });
      
      return Success(undefined);
    } catch (error) {
      return Failure(new ApplicationError('Failed to create snapshot', error as Error));
    }
  }
}
