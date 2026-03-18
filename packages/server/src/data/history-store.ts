/**
 * History Store - Append-only storage for historical release data
 * Archives release snapshots for historical tracking (90+ days)
 */

import { Release, Platform, ReleaseStatus } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { ApplicationError } from '../common/errors';
import { DatabaseConnection, InMemoryDatabase } from './database-config';

export interface HistoryStoreConfig {
  connection: DatabaseConnection;
}

export interface HistorySnapshot {
  id: string;
  releaseId: string;
  snapshotData: Release;
  snapshotAt: Date;
}

export interface HistoryFilters {
  platform?: Platform;
  status?: ReleaseStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * History Store implementation with append-only storage
 */
export class HistoryStore {
  private db: DatabaseConnection;
  
  constructor(config: HistoryStoreConfig) {
    this.db = config.connection;
  }
  
  /**
   * Create a snapshot of a release
   * Snapshots are append-only and never modified
   */
  async createSnapshot(release: Release): Promise<Result<HistorySnapshot, ApplicationError>> {
    try {
      const snapshot: HistorySnapshot = {
        id: `${release.id}_${Date.now()}`,
        releaseId: release.id,
        snapshotData: { ...release },
        snapshotAt: new Date()
      };
      
      if (this.db instanceof InMemoryDatabase) {
        this.db.insert('release_history', snapshot.id, snapshot);
        return Success(snapshot);
      }
      
      return Failure(new ApplicationError('Database operation not supported'));
    } catch (error) {
      return Failure(new ApplicationError('Failed to create snapshot', error as Error));
    }
  }
  
  /**
   * Get a specific snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<Result<HistorySnapshot, ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        const snapshot = this.db.get('release_history', snapshotId);
        
        if (!snapshot) {
          return Failure(new ApplicationError(`Snapshot ${snapshotId} not found`));
        }
        
        return Success(snapshot);
      }
      
      return Failure(new ApplicationError('Database operation not supported'));
    } catch (error) {
      return Failure(new ApplicationError('Failed to get snapshot', error as Error));
    }
  }
  
  /**
   * Get all snapshots for a specific release
   */
  async getSnapshotsForRelease(releaseId: string): Promise<Result<HistorySnapshot[], ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        const snapshots = this.db.getAll('release_history')
          .filter((s: HistorySnapshot) => s.releaseId === releaseId)
          .sort((a: HistorySnapshot, b: HistorySnapshot) => 
            b.snapshotAt.getTime() - a.snapshotAt.getTime()
          );
        
        return Success(snapshots);
      }
      
      return Success([]);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get snapshots', error as Error));
    }
  }
  
  /**
   * Get historical releases with filters
   */
  async getHistoricalReleases(filters: HistoryFilters): Promise<Result<Release[], ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        let snapshots = this.db.getAll('release_history') as HistorySnapshot[];
        
        // Get the latest snapshot for each release
        const latestSnapshots = new Map<string, HistorySnapshot>();
        for (const snapshot of snapshots) {
          const existing = latestSnapshots.get(snapshot.releaseId);
          if (!existing || snapshot.snapshotAt > existing.snapshotAt) {
            latestSnapshots.set(snapshot.releaseId, snapshot);
          }
        }
        
        let releases = Array.from(latestSnapshots.values()).map(s => s.snapshotData);
        
        // Apply filters
        if (filters.platform) {
          releases = releases.filter(r => r.platform === filters.platform);
        }
        
        if (filters.status) {
          releases = releases.filter(r => r.status === filters.status);
        }
        
        if (filters.startDate) {
          releases = releases.filter(r => 
            new Date(r.createdAt) >= filters.startDate!
          );
        }
        
        if (filters.endDate) {
          releases = releases.filter(r => 
            new Date(r.createdAt) <= filters.endDate!
          );
        }
        
        return Success(releases);
      }
      
      return Success([]);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get historical releases', error as Error));
    }
  }
  
  /**
   * Get snapshots within a date range
   */
  async getSnapshotsByDateRange(startDate: Date, endDate: Date): Promise<Result<HistorySnapshot[], ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        const snapshots = this.db.getAll('release_history')
          .filter((s: HistorySnapshot) => {
            const snapshotDate = new Date(s.snapshotAt);
            return snapshotDate >= startDate && snapshotDate <= endDate;
          })
          .sort((a: HistorySnapshot, b: HistorySnapshot) => 
            b.snapshotAt.getTime() - a.snapshotAt.getTime()
          );
        
        return Success(snapshots);
      }
      
      return Success([]);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get snapshots by date range', error as Error));
    }
  }
  
  /**
   * Delete old snapshots (for cleanup, typically older than 90 days)
   */
  async deleteOldSnapshots(beforeDate: Date): Promise<Result<number, ApplicationError>> {
    try {
      if (this.db instanceof InMemoryDatabase) {
        const snapshots = this.db.getAll('release_history') as HistorySnapshot[];
        let deletedCount = 0;
        
        for (const snapshot of snapshots) {
          if (new Date(snapshot.snapshotAt) < beforeDate) {
            this.db.delete('release_history', snapshot.id);
            deletedCount++;
          }
        }
        
        return Success(deletedCount);
      }
      
      return Success(0);
    } catch (error) {
      return Failure(new ApplicationError('Failed to delete old snapshots', error as Error));
    }
  }
}
