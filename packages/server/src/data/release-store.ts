/**
 * Release Store - Persistent storage for active release data
 * Provides CRUD operations with transaction support and optimistic locking
 */

import { Release, Platform, ReleaseStatus } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { NotFoundError, ConflictError, ApplicationError } from '../common/errors';
import { DatabaseConnection, InMemoryDatabase } from './database-config';
import { logger } from '../common/logger';

export interface ReleaseStoreConfig {
  connection: DatabaseConnection;
}

interface HistoryFilters {
  platform?: Platform;
  status?: ReleaseStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Release Store implementation with CRUD operations
 */
export class ReleaseStore {
  private db: DatabaseConnection;
  private versionMap: Map<string, number> = new Map();
  
  constructor(config: ReleaseStoreConfig) {
    this.db = config.connection;
  }
  
  /**
   * Create a new release
   */
  async create(release: Release): Promise<Result<Release, ApplicationError>> {
    try {
      await this.db.beginTransaction();
      
      // Store in in-memory database (for testing)
      if (this.db instanceof InMemoryDatabase) {
        this.db.insert('releases', release.id, { ...release });
        this.versionMap.set(release.id, 1);
        
        // Store related entities
        for (const blocker of release.blockers) {
          this.db.insert('blockers', blocker.id, { ...blocker, release_id: release.id });
        }
        
        for (const signOff of release.signOffs) {
          const id = `${release.id}_${signOff.squad}`;
          this.db.insert('sign_offs', id, { ...signOff, release_id: release.id });
        }
        
        for (const distribution of release.distributions) {
          const id = `${release.id}_${distribution.channel}`;
          this.db.insert('distributions', id, { ...distribution, release_id: release.id });
        }
      }
      
      await this.db.commit();
      return Success(release);
    } catch (error) {
      await this.db.rollback();
      return Failure(new ApplicationError('Failed to create release', error as Error));
    }
  }
  
  /**
   * Get a release by ID
   */
  async getRelease(releaseId: string): Promise<Result<Release, ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        const release = this.db.get('releases', releaseId);
        
        if (!release) {
          return Failure(new NotFoundError(`Release ${releaseId} not found`));
        }
        
        // Load related entities
        const blockers = this.db.getAll('blockers')
          .filter((b: any) => b.release_id === releaseId);
        
        const signOffs = this.db.getAll('sign_offs')
          .filter((s: any) => s.release_id === releaseId)
          .map((s: any) => {
            const { release_id, ...signOff } = s;
            return signOff;
          });
        
        const distributions = this.db.getAll('distributions')
          .filter((d: any) => d.release_id === releaseId)
          .map((d: any) => {
            const { release_id, ...distribution } = d;
            return distribution;
          });
        
        return Success({
          ...release,
          blockers,
          signOffs,
          distributions
        });
      }
      
      return Failure(new NotFoundError(`Release ${releaseId} not found`));
    } catch (error) {
      return Failure(new ApplicationError('Failed to get release', error as Error));
    }
  }
  
  /**
   * Update a release with optimistic locking
   */
  async update(releaseId: string, updates: Partial<Release>, expectedVersion?: number): Promise<Result<Release, ApplicationError>> {
    try {
      logger.info('Updating release', { releaseId, expectedVersion });
      await this.db.beginTransaction();
      
      if (this.db instanceof InMemoryDatabase) {
        const current = this.db.get('releases', releaseId);
        
        if (!current) {
          await this.db.rollback();
          logger.warn('Release not found for update', { releaseId });
          return Failure(new NotFoundError(`Release ${releaseId} not found`));
        }
        
        // Check optimistic lock
        const currentVersion = this.versionMap.get(releaseId) || 1;
        if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
          await this.db.rollback();
          logger.warn('Optimistic lock conflict detected', { 
            releaseId, 
            expectedVersion, 
            currentVersion 
          });
          return Failure(new ConflictError('Release was modified by another user'));
        }
        
        // Apply updates
        const updated = {
          ...current,
          ...updates,
          id: releaseId, // Ensure ID doesn't change
          updatedAt: new Date()
        };
        
        this.db.insert('releases', releaseId, updated);
        this.versionMap.set(releaseId, currentVersion + 1);
        
        // Update related entities if provided
        if (updates.blockers) {
          // Clear existing blockers
          const existingBlockers = this.db.getAll('blockers')
            .filter((b: any) => b.release_id === releaseId);
          for (const blocker of existingBlockers) {
            this.db.delete('blockers', blocker.id);
          }
          
          // Insert new blockers
          for (const blocker of updates.blockers) {
            this.db.insert('blockers', blocker.id, { ...blocker, release_id: releaseId });
          }
        }
        
        if (updates.signOffs) {
          // Clear existing sign-offs
          const existingSignOffs = this.db.getAll('sign_offs')
            .filter((s: any) => s.release_id === releaseId);
          for (const signOff of existingSignOffs) {
            this.db.delete('sign_offs', signOff.id);
          }
          
          // Insert new sign-offs
          for (const signOff of updates.signOffs) {
            const id = `${releaseId}_${signOff.squad}`;
            this.db.insert('sign_offs', id, { ...signOff, release_id: releaseId });
          }
        }
        
        if (updates.distributions) {
          // Clear existing distributions
          const existingDistributions = this.db.getAll('distributions')
            .filter((d: any) => d.release_id === releaseId);
          for (const distribution of existingDistributions) {
            this.db.delete('distributions', distribution.id);
          }
          
          // Insert new distributions
          for (const distribution of updates.distributions) {
            const id = `${releaseId}_${distribution.channel}`;
            this.db.insert('distributions', id, { ...distribution, release_id: releaseId });
          }
        }
        
        await this.db.commit();
        
        // Return the updated release
        return this.getRelease(releaseId);
      }
      
      await this.db.rollback();
      return Failure(new ApplicationError('Database operation not supported'));
    } catch (error) {
      await this.db.rollback();
      return Failure(new ApplicationError('Failed to update release', error as Error));
    }
  }
  
  /**
   * Delete a release
   */
  async delete(releaseId: string): Promise<Result<void, ApplicationError>> {
    try {
      await this.db.beginTransaction();
      
      if (this.db instanceof InMemoryDatabase) {
        const release = this.db.get('releases', releaseId);
        
        if (!release) {
          await this.db.rollback();
          return Failure(new NotFoundError(`Release ${releaseId} not found`));
        }
        
        // Delete related entities
        const blockers = this.db.getAll('blockers')
          .filter((b: any) => b.release_id === releaseId);
        for (const blocker of blockers) {
          this.db.delete('blockers', blocker.id);
        }
        
        const signOffs = this.db.getAll('sign_offs')
          .filter((s: any) => s.release_id === releaseId);
        for (const signOff of signOffs) {
          this.db.delete('sign_offs', signOff.id);
        }
        
        const distributions = this.db.getAll('distributions')
          .filter((d: any) => d.release_id === releaseId);
        for (const distribution of distributions) {
          this.db.delete('distributions', distribution.id);
        }
        
        // Delete the release
        this.db.delete('releases', releaseId);
        this.versionMap.delete(releaseId);
        
        await this.db.commit();
        return Success(undefined);
      }
      
      await this.db.rollback();
      return Failure(new ApplicationError('Database operation not supported'));
    } catch (error) {
      await this.db.rollback();
      return Failure(new ApplicationError('Failed to delete release', error as Error));
    }
  }
  
  /**
   * Get active releases, optionally filtered by platform
   */
  async getActiveReleases(platform?: Platform): Promise<Result<Release[], ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        let releases = this.db.getAll('releases');
        
        if (platform) {
          releases = releases.filter((r: Release) => r.platform === platform);
        }
        
        // Load related entities for each release
        const fullReleases: Release[] = [];
        for (const release of releases) {
          const result = await this.getRelease(release.id);
          if (result.success) {
            fullReleases.push(result.value);
          }
        }
        
        return Success(fullReleases);
      }
      
      return Success([]);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get active releases', error as Error));
    }
  }
  
  /**
   * Get release history with filters
   */
  async getReleaseHistory(filters: HistoryFilters): Promise<Result<Release[], ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        let releases = this.db.getAll('releases');
        
        // Apply filters
        if (filters.platform) {
          releases = releases.filter((r: Release) => r.platform === filters.platform);
        }
        
        if (filters.status) {
          releases = releases.filter((r: Release) => r.status === filters.status);
        }
        
        if (filters.startDate) {
          releases = releases.filter((r: Release) => 
            new Date(r.createdAt) >= filters.startDate!
          );
        }
        
        if (filters.endDate) {
          releases = releases.filter((r: Release) => 
            new Date(r.createdAt) <= filters.endDate!
          );
        }
        
        // Load related entities for each release
        const fullReleases: Release[] = [];
        for (const release of releases) {
          const result = await this.getRelease(release.id);
          if (result.success) {
            fullReleases.push(result.value);
          }
        }
        
        return Success(fullReleases);
      }
      
      return Success([]);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get release history', error as Error));
    }
  }
  
  /**
   * Get the current version number for optimistic locking
   */
  getVersion(releaseId: string): number {
    return this.versionMap.get(releaseId) || 1;
  }
}
