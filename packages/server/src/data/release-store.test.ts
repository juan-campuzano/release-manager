/**
 * Tests for Release Store
 */

import { ReleaseStore } from './release-store';
import { InMemoryDatabase } from './database-config';
import { Release, Platform, ReleaseStatus, ReleaseStage } from '../domain/types';
import { isSuccess, isFailure } from '../common/result';

describe('ReleaseStore', () => {
  let store: ReleaseStore;
  let db: InMemoryDatabase;
  
  beforeEach(() => {
    db = new InMemoryDatabase();
    store = new ReleaseStore({ connection: db });
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
  
  describe('create', () => {
    it('should create a new release', async () => {
      const release = createTestRelease('release-1');
      const result = await store.create(release);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.id).toBe('release-1');
        expect(result.value.platform).toBe(Platform.iOS);
      }
    });
    
    it('should store blockers with the release', async () => {
      const release = createTestRelease('release-2');
      release.blockers = [{
        id: 'blocker-1',
        title: 'Critical bug',
        description: 'App crashes on startup',
        severity: 'critical',
        createdAt: new Date()
      }];
      
      const result = await store.create(release);
      expect(isSuccess(result)).toBe(true);
      
      const getResult = await store.getRelease('release-2');
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult.value.blockers).toHaveLength(1);
        expect(getResult.value.blockers[0].title).toBe('Critical bug');
      }
    });
  });
  
  describe('getRelease', () => {
    it('should retrieve an existing release', async () => {
      const release = createTestRelease('release-3');
      await store.create(release);
      
      const result = await store.getRelease('release-3');
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.id).toBe('release-3');
      }
    });
    
    it('should return NotFoundError for non-existent release', async () => {
      const result = await store.getRelease('non-existent');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });
  });
  
  describe('update', () => {
    it('should update a release', async () => {
      const release = createTestRelease('release-4');
      await store.create(release);
      
      const result = await store.update('release-4', {
        version: '1.0.1',
        rolloutPercentage: 50
      });
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.version).toBe('1.0.1');
        expect(result.value.rolloutPercentage).toBe(50);
      }
    });
    
    it('should enforce optimistic locking', async () => {
      const release = createTestRelease('release-5');
      await store.create(release);
      
      // First update succeeds
      const result1 = await store.update('release-5', { version: '1.0.1' }, 1);
      expect(isSuccess(result1)).toBe(true);
      
      // Second update with old version fails
      const result2 = await store.update('release-5', { version: '1.0.2' }, 1);
      expect(isFailure(result2)).toBe(true);
      if (isFailure(result2)) {
        expect(result2.error.name).toBe('ConflictError');
      }
    });
    
    it('should return NotFoundError for non-existent release', async () => {
      const result = await store.update('non-existent', { version: '2.0.0' });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });
  });
  
  describe('delete', () => {
    it('should delete a release', async () => {
      const release = createTestRelease('release-6');
      await store.create(release);
      
      const deleteResult = await store.delete('release-6');
      expect(isSuccess(deleteResult)).toBe(true);
      
      const getResult = await store.getRelease('release-6');
      expect(isFailure(getResult)).toBe(true);
    });
    
    it('should return NotFoundError for non-existent release', async () => {
      const result = await store.delete('non-existent');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });
  });
  
  describe('getActiveReleases', () => {
    it('should return all releases when no platform filter', async () => {
      await store.create(createTestRelease('release-7', Platform.iOS));
      await store.create(createTestRelease('release-8', Platform.Android));
      
      const result = await store.getActiveReleases();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
    
    it('should filter releases by platform', async () => {
      await store.create(createTestRelease('release-9', Platform.iOS));
      await store.create(createTestRelease('release-10', Platform.Android));
      
      const result = await store.getActiveReleases(Platform.iOS);
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].platform).toBe(Platform.iOS);
      }
    });
  });
  
  describe('getReleaseHistory', () => {
    it('should filter by platform', async () => {
      await store.create(createTestRelease('release-11', Platform.iOS));
      await store.create(createTestRelease('release-12', Platform.Android));
      
      const result = await store.getReleaseHistory({ platform: Platform.iOS });
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].platform).toBe(Platform.iOS);
      }
    });
    
    it('should filter by status', async () => {
      const release1 = createTestRelease('release-13');
      release1.status = ReleaseStatus.Current;
      const release2 = createTestRelease('release-14');
      release2.status = ReleaseStatus.Production;
      
      await store.create(release1);
      await store.create(release2);
      
      const result = await store.getReleaseHistory({ status: ReleaseStatus.Production });
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].status).toBe(ReleaseStatus.Production);
      }
    });
    
    it('should filter by date range', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2024-01-01');
      
      const release1 = createTestRelease('release-15');
      release1.createdAt = oldDate;
      const release2 = createTestRelease('release-16');
      release2.createdAt = newDate;
      
      await store.create(release1);
      await store.create(release2);
      
      const result = await store.getReleaseHistory({
        startDate: new Date('2023-06-01')
      });
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe('release-16');
      }
    });
  });
});
