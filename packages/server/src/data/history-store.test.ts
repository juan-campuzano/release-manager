/**
 * Tests for History Store
 */

import { HistoryStore } from './history-store';
import { InMemoryDatabase } from './database-config';
import { Release, Platform, ReleaseStatus, ReleaseStage } from '../domain/types';
import { isSuccess, isFailure } from '../common/result';

describe('HistoryStore', () => {
  let store: HistoryStore;
  let db: InMemoryDatabase;
  
  beforeEach(() => {
    db = new InMemoryDatabase();
    store = new HistoryStore({ connection: db });
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  const createTestRelease = (id: string, platform: Platform = Platform.iOS): Release => ({
    id,
    platform,
    status: ReleaseStatus.Current,
    currentStage: ReleaseStage.ReleaseBranching,
    version: '1.0.0',
    branchName: 'release/1.0.0',
    sourceType: 'github',
    repositoryUrl: 'https://github.com/test/repo',
    latestBuild: 'build-123',
    latestPassingBuild: 'build-122',
    latestAppStoreBuild: 'build-120',
    blockers: [],
    signOffs: [],
    rolloutPercentage: 0,
    itgcStatus: {
      compliant: true,
      rolloutComplete: false,
      details: 'In progress',
      lastCheckedAt: new Date()
    },
    distributions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date()
  });
  
  describe('createSnapshot', () => {
    it('should create a snapshot of a release', async () => {
      const release = createTestRelease('release-1');
      const result = await store.createSnapshot(release);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.releaseId).toBe('release-1');
        expect(result.value.snapshotData.id).toBe('release-1');
      }
    });
    
    it('should create multiple snapshots for the same release', async () => {
      const release = createTestRelease('release-2');
      
      const result1 = await store.createSnapshot(release);
      expect(isSuccess(result1)).toBe(true);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result2 = await store.createSnapshot(release);
      expect(isSuccess(result2)).toBe(true);
      
      if (isSuccess(result1) && isSuccess(result2)) {
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });
  });
  
  describe('getSnapshot', () => {
    it('should retrieve a snapshot by ID', async () => {
      const release = createTestRelease('release-3');
      const createResult = await store.createSnapshot(release);
      
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const getResult = await store.getSnapshot(createResult.value.id);
        expect(isSuccess(getResult)).toBe(true);
        if (isSuccess(getResult)) {
          expect(getResult.value.id).toBe(createResult.value.id);
        }
      }
    });
    
    it('should return error for non-existent snapshot', async () => {
      const result = await store.getSnapshot('non-existent');
      expect(isFailure(result)).toBe(true);
    });
  });
  
  describe('getSnapshotsForRelease', () => {
    it('should return all snapshots for a release', async () => {
      const release = createTestRelease('release-4');
      
      await store.createSnapshot(release);
      await new Promise(resolve => setTimeout(resolve, 10));
      await store.createSnapshot(release);
      
      const result = await store.getSnapshotsForRelease('release-4');
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].releaseId).toBe('release-4');
      }
    });
    
    it('should return snapshots in descending order by date', async () => {
      const release = createTestRelease('release-5');
      
      const result1 = await store.createSnapshot(release);
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await store.createSnapshot(release);
      
      const getResult = await store.getSnapshotsForRelease('release-5');
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult) && isSuccess(result1) && isSuccess(result2)) {
        expect(getResult.value[0].id).toBe(result2.value.id);
        expect(getResult.value[1].id).toBe(result1.value.id);
      }
    });
    
    it('should return empty array for release with no snapshots', async () => {
      const result = await store.getSnapshotsForRelease('non-existent');
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
  
  describe('getHistoricalReleases', () => {
    it('should return latest snapshot for each release', async () => {
      const release1 = createTestRelease('release-6', Platform.iOS);
      const release2 = createTestRelease('release-7', Platform.Android);
      
      await store.createSnapshot(release1);
      await store.createSnapshot(release2);
      
      const result = await store.getHistoricalReleases({});
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
    
    it('should filter by platform', async () => {
      const release1 = createTestRelease('release-8', Platform.iOS);
      const release2 = createTestRelease('release-9', Platform.Android);
      
      await store.createSnapshot(release1);
      await store.createSnapshot(release2);
      
      const result = await store.getHistoricalReleases({ platform: Platform.iOS });
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].platform).toBe(Platform.iOS);
      }
    });
    
    it('should filter by status', async () => {
      const release1 = createTestRelease('release-10');
      release1.status = ReleaseStatus.Current;
      const release2 = createTestRelease('release-11');
      release2.status = ReleaseStatus.Production;
      
      await store.createSnapshot(release1);
      await store.createSnapshot(release2);
      
      const result = await store.getHistoricalReleases({ status: ReleaseStatus.Production });
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].status).toBe(ReleaseStatus.Production);
      }
    });
    
    it('should filter by date range', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2024-01-01');
      
      const release1 = createTestRelease('release-12');
      release1.createdAt = oldDate;
      const release2 = createTestRelease('release-13');
      release2.createdAt = newDate;
      
      await store.createSnapshot(release1);
      await store.createSnapshot(release2);
      
      const result = await store.getHistoricalReleases({
        startDate: new Date('2023-06-01')
      });
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe('release-13');
      }
    });
  });
  
  describe('getSnapshotsByDateRange', () => {
    it('should return snapshots within date range', async () => {
      const release = createTestRelease('release-14');
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      await store.createSnapshot(release);
      
      const result = await store.getSnapshotsByDateRange(yesterday, tomorrow);
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
    
    it('should exclude snapshots outside date range', async () => {
      const release = createTestRelease('release-15');
      await store.createSnapshot(release);
      
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      const result = await store.getSnapshotsByDateRange(futureStart, futureEnd);
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
  
  describe('deleteOldSnapshots', () => {
    it('should delete snapshots older than specified date', async () => {
      const release = createTestRelease('release-16');
      
      // Create a snapshot
      const createResult = await store.createSnapshot(release);
      expect(isSuccess(createResult)).toBe(true);
      
      // Delete snapshots older than tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const deleteResult = await store.deleteOldSnapshots(tomorrow);
      
      expect(isSuccess(deleteResult)).toBe(true);
      if (isSuccess(deleteResult)) {
        expect(deleteResult.value).toBe(1);
      }
      
      // Verify snapshot was deleted
      if (isSuccess(createResult)) {
        const getResult = await store.getSnapshot(createResult.value.id);
        expect(isFailure(getResult)).toBe(true);
      }
    });
    
    it('should not delete recent snapshots', async () => {
      const release = createTestRelease('release-17');
      
      const createResult = await store.createSnapshot(release);
      expect(isSuccess(createResult)).toBe(true);
      
      // Delete snapshots older than yesterday
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deleteResult = await store.deleteOldSnapshots(yesterday);
      
      expect(isSuccess(deleteResult)).toBe(true);
      if (isSuccess(deleteResult)) {
        expect(deleteResult.value).toBe(0);
      }
      
      // Verify snapshot still exists
      if (isSuccess(createResult)) {
        const getResult = await store.getSnapshot(createResult.value.id);
        expect(isSuccess(getResult)).toBe(true);
      }
    });
  });
});
