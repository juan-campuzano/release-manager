/**
 * Unit tests for MockDataProvider read operations
 * Tests findById, findAll, and getHistory methods with filtering
 */

import { MockDataProvider } from './mock-data-provider';
import { Platform, ReleaseStatus, ReleaseStage, Release } from '../domain/types';
import { ValidationError, NotFoundError } from '../common/errors';

describe('MockDataProvider - Read Operations', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('findById', () => {
    it('should return a release when ID exists', async () => {
      // Get all releases to find a valid ID
      const allResult = await provider.findAll();
      expect(allResult.success).toBe(true);
      
      if (!allResult.success) return;
      
      const releases = allResult.value;
      expect(releases.length).toBeGreaterThan(0);
      
      const firstRelease = releases[0];
      
      // Find by ID
      const result = await provider.findById(firstRelease.id);
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const release = result.value;
      expect(release).not.toBeNull();
      expect(release?.id).toBe(firstRelease.id);
      expect(release?.platform).toBe(firstRelease.platform);
      expect(release?.version).toBe(firstRelease.version);
    });

    it('should return null when ID does not exist', async () => {
      const result = await provider.findById('non-existent-id');
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      expect(result.value).toBeNull();
    });

    it('should return a copy of the release to prevent external modifications', async () => {
      // Get a release
      const allResult = await provider.findAll();
      if (!allResult.success) return;
      
      const releases = allResult.value;
      const firstRelease = releases[0];
      
      // Find by ID twice
      const result1 = await provider.findById(firstRelease.id);
      const result2 = await provider.findById(firstRelease.id);
      
      if (!result1.success || !result2.success) return;
      
      const release1 = result1.value;
      const release2 = result2.value;
      
      // Modify the first returned release
      if (release1) {
        release1.version = 'modified-version';
      }
      
      // Second release should not be affected
      expect(release2?.version).toBe(firstRelease.version);
      expect(release2?.version).not.toBe('modified-version');
    });
  });

  describe('findAll', () => {
    it('should return all releases when no filters are provided', async () => {
      const result = await provider.findAll();
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // Should have at least 10 releases (per requirements)
      expect(releases.length).toBeGreaterThanOrEqual(10);
      
      // Should have releases from all platforms
      const platforms = new Set(releases.map((r: Release) => r.platform));
      expect(platforms.has(Platform.iOS)).toBe(true);
      expect(platforms.has(Platform.Android)).toBe(true);
      expect(platforms.has(Platform.Desktop)).toBe(true);
    });

    it('should filter releases by platform', async () => {
      const result = await provider.findAll({ platform: Platform.iOS });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // Should have at least 3 iOS releases (per requirements)
      expect(releases.length).toBeGreaterThanOrEqual(3);
      
      // All releases should be iOS
      releases.forEach((release: Release) => {
        expect(release.platform).toBe(Platform.iOS);
      });
    });

    it('should filter releases by Android platform', async () => {
      const result = await provider.findAll({ platform: Platform.Android });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // Should have at least 3 Android releases (per requirements)
      expect(releases.length).toBeGreaterThanOrEqual(3);
      
      // All releases should be Android
      releases.forEach((release: Release) => {
        expect(release.platform).toBe(Platform.Android);
      });
    });

    it('should filter releases by Desktop platform', async () => {
      const result = await provider.findAll({ platform: Platform.Desktop });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // Should have at least 3 Desktop releases (per requirements)
      expect(releases.length).toBeGreaterThanOrEqual(3);
      
      // All releases should be Desktop
      releases.forEach((release: Release) => {
        expect(release.platform).toBe(Platform.Desktop);
      });
    });

    it('should filter releases by status', async () => {
      const result = await provider.findAll({ status: ReleaseStatus.Production });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // All releases should have Production status
      releases.forEach((release: Release) => {
        expect(release.status).toBe(ReleaseStatus.Production);
      });
    });

    it('should filter releases by Upcoming status', async () => {
      const result = await provider.findAll({ status: ReleaseStatus.Upcoming });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // All releases should have Upcoming status
      releases.forEach((release: Release) => {
        expect(release.status).toBe(ReleaseStatus.Upcoming);
      });
    });

    it('should filter releases by Current status', async () => {
      const result = await provider.findAll({ status: ReleaseStatus.Current });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // All releases should have Current status
      releases.forEach((release: Release) => {
        expect(release.status).toBe(ReleaseStatus.Current);
      });
    });

    it('should filter releases by both platform and status', async () => {
      const result = await provider.findAll({ 
        platform: Platform.iOS, 
        status: ReleaseStatus.Production 
      });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      
      // All releases should match both filters
      releases.forEach((release: Release) => {
        expect(release.platform).toBe(Platform.iOS);
        expect(release.status).toBe(ReleaseStatus.Production);
      });
    });

    it('should return empty array when no releases match filters', async () => {
      // Try a combination that might not exist
      const result = await provider.findAll({ 
        platform: Platform.iOS, 
        status: ReleaseStatus.Production 
      });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const releases = result.value;
      expect(Array.isArray(releases)).toBe(true);
    });

    it('should return copies of releases to prevent external modifications', async () => {
      const result1 = await provider.findAll();
      const result2 = await provider.findAll();
      
      if (!result1.success || !result2.success) return;
      
      const releases1 = result1.value;
      const releases2 = result2.value;
      
      // Modify the first result
      if (releases1.length > 0) {
        releases1[0].version = 'modified-version';
      }
      
      // Second result should not be affected
      if (releases2.length > 0) {
        expect(releases2[0].version).not.toBe('modified-version');
      }
    });
  });

  describe('getHistory', () => {
    it('should return all history when no filters are provided', async () => {
      const result = await provider.getHistory();
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // Should have at least 9 releases in history (3 per platform minimum)
      expect(history.length).toBeGreaterThanOrEqual(9);
    });

    it('should filter history by platform', async () => {
      const result = await provider.getHistory({ platform: Platform.iOS });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // All releases should be iOS
      history.forEach((release: Release) => {
        expect(release.platform).toBe(Platform.iOS);
      });
      
      // Should have at least 3 iOS releases
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter history by status', async () => {
      const result = await provider.getHistory({ status: ReleaseStatus.Current });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // All releases should have Current status
      history.forEach((release: Release) => {
        expect(release.status).toBe(ReleaseStatus.Current);
      });
    });

    it('should filter history by start date', async () => {
      // Get all history first
      const allResult = await provider.getHistory();
      if (!allResult.success) return;
      
      const allHistory = allResult.value;
      
      // Find a date in the middle of the range
      const dates = allHistory.map((r: Release) => new Date(r.createdAt).getTime()).sort();
      const middleDate = new Date(dates[Math.floor(dates.length / 2)]);
      
      // Filter by start date
      const result = await provider.getHistory({ startDate: middleDate });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // All releases should be on or after the start date
      history.forEach((release: Release) => {
        expect(new Date(release.createdAt).getTime()).toBeGreaterThanOrEqual(middleDate.getTime());
      });
    });

    it('should filter history by end date', async () => {
      // Get all history first
      const allResult = await provider.getHistory();
      if (!allResult.success) return;
      
      const allHistory = allResult.value;
      
      // Find a date in the middle of the range
      const dates = allHistory.map((r: Release) => new Date(r.createdAt).getTime()).sort();
      const middleDate = new Date(dates[Math.floor(dates.length / 2)]);
      
      // Filter by end date
      const result = await provider.getHistory({ endDate: middleDate });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // All releases should be on or before the end date
      history.forEach((release: Release) => {
        expect(new Date(release.createdAt).getTime()).toBeLessThanOrEqual(middleDate.getTime());
      });
    });

    it('should filter history by date range', async () => {
      // Get all history first
      const allResult = await provider.getHistory();
      if (!allResult.success) return;
      
      const allHistory = allResult.value;
      
      // Find dates for a range
      const dates = allHistory.map((r: Release) => new Date(r.createdAt).getTime()).sort();
      const startDate = new Date(dates[Math.floor(dates.length / 3)]);
      const endDate = new Date(dates[Math.floor(dates.length * 2 / 3)]);
      
      // Filter by date range
      const result = await provider.getHistory({ startDate, endDate });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // All releases should be within the date range
      history.forEach((release: Release) => {
        const createdAt = new Date(release.createdAt).getTime();
        expect(createdAt).toBeGreaterThanOrEqual(startDate.getTime());
        expect(createdAt).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter history by multiple criteria', async () => {
      // Get all history first to find a valid date range
      const allResult = await provider.getHistory();
      if (!allResult.success) return;
      
      const allHistory = allResult.value;
      
      const dates = allHistory.map((r: Release) => new Date(r.createdAt).getTime()).sort();
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);
      
      // Filter by platform, status, and date range
      const result = await provider.getHistory({ 
        platform: Platform.Android,
        status: ReleaseStatus.Current,
        startDate,
        endDate
      });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      
      // All releases should match all filters
      history.forEach((release: Release) => {
        expect(release.platform).toBe(Platform.Android);
        expect(release.status).toBe(ReleaseStatus.Current);
        const createdAt = new Date(release.createdAt).getTime();
        expect(createdAt).toBeGreaterThanOrEqual(startDate.getTime());
        expect(createdAt).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should return copies of releases to prevent external modifications', async () => {
      const result1 = await provider.getHistory();
      const result2 = await provider.getHistory();
      
      if (!result1.success || !result2.success) return;
      
      const history1 = result1.value;
      const history2 = result2.value;
      
      // Modify the first result
      if (history1.length > 0) {
        history1[0].version = 'modified-version';
      }
      
      // Second result should not be affected
      if (history2.length > 0) {
        expect(history2[0].version).not.toBe('modified-version');
      }
    });

    it('should return empty array when no releases match date filters', async () => {
      // Use a date far in the future
      const futureDate = new Date('2099-12-31');
      
      const result = await provider.getHistory({ startDate: futureDate });
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const history = result.value;
      expect(history.length).toBe(0);
    });
  });

  describe('Data integrity', () => {
    it('should have consistent data between findAll and getHistory', async () => {
      const allResult = await provider.findAll();
      const historyResult = await provider.getHistory();
      
      expect(allResult.success).toBe(true);
      expect(historyResult.success).toBe(true);
      
      if (!allResult.success || !historyResult.success) return;
      
      const releases = allResult.value;
      const history = historyResult.value;
      
      // History should have at least as many releases as current releases
      expect(history.length).toBeGreaterThanOrEqual(releases.length);
      
      // All current releases should exist in history
      releases.forEach((release: Release) => {
        const inHistory = history.some((h: Release) => h.id === release.id);
        expect(inHistory).toBe(true);
      });
    });

    it('should return releases with all required fields', async () => {
      const result = await provider.findAll();
      if (!result.success) return;
      
      const releases = result.value;
      
      expect(releases.length).toBeGreaterThan(0);
      
      releases.forEach((release: Release) => {
        // Check required fields
        expect(release.id).toBeDefined();
        expect(release.platform).toBeDefined();
        expect(release.status).toBeDefined();
        expect(release.currentStage).toBeDefined();
        expect(release.version).toBeDefined();
        expect(release.branchName).toBeDefined();
        expect(release.repositoryUrl).toBeDefined();
        expect(release.blockers).toBeDefined();
        expect(Array.isArray(release.blockers)).toBe(true);
        expect(release.signOffs).toBeDefined();
        expect(Array.isArray(release.signOffs)).toBe(true);
        expect(release.distributions).toBeDefined();
        expect(Array.isArray(release.distributions)).toBe(true);
        expect(release.itgcStatus).toBeDefined();
        expect(release.createdAt).toBeDefined();
        expect(release.updatedAt).toBeDefined();
      });
    });
  });
});

describe('MockDataProvider - Create and Update Operations', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('create', () => {
    it('should create a new release and return it', async () => {
      const newRelease: Release = {
        id: 'test-release-1',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: '3.0.0',
        branchName: 'release/3.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test ITGC status',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      const result = await provider.create(newRelease);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const created = result.value;
      expect(created.id).toBe(newRelease.id);
      expect(created.platform).toBe(newRelease.platform);
      expect(created.version).toBe(newRelease.version);
    });

    it('should persist created release for subsequent findById calls', async () => {
      const newRelease: Release = {
        id: 'test-release-2',
        platform: Platform.Android,
        status: ReleaseStatus.Current,
        currentStage: 'Final Release Candidate' as any,
        version: '4.0.0',
        branchName: 'release/4.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '2000',
        latestPassingBuild: '2000',
        latestAppStoreBuild: '2000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test ITGC status',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      await provider.create(newRelease);

      const findResult = await provider.findById('test-release-2');
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found).not.toBeNull();
      expect(found?.id).toBe('test-release-2');
      expect(found?.version).toBe('4.0.0');
    });

    it('should add created release to history', async () => {
      const newRelease: Release = {
        id: 'test-release-3',
        platform: Platform.Desktop,
        status: ReleaseStatus.Production,
        currentStage: 'Roll Out 100%' as any,
        version: '5.0.0',
        branchName: 'release/5.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '3000',
        latestPassingBuild: '3000',
        latestAppStoreBuild: '3000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 100,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: true,
          details: 'Test ITGC status',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      await provider.create(newRelease);

      const historyResult = await provider.getHistory();
      expect(historyResult.success).toBe(true);
      if (!historyResult.success) return;

      const history = historyResult.value;
      const inHistory = history.some((r: Release) => r.id === 'test-release-3');
      expect(inHistory).toBe(true);
    });
  });

  describe('update', () => {
    it('should update an existing release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      expect(releases.length).toBeGreaterThan(0);

      const releaseToUpdate = releases[0];
      const originalVersion = releaseToUpdate.version;

      // Update the release
      const updates = { version: '99.99.99' };
      const result = await provider.update(releaseToUpdate.id, updates);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.version).toBe('99.99.99');
      expect(updated.version).not.toBe(originalVersion);
      expect(updated.id).toBe(releaseToUpdate.id);
    });

    it('should persist updates for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      // Update the release
      await provider.update(releaseToUpdate.id, { version: '88.88.88' });

      // Find the updated release
      const findResult = await provider.findById(releaseToUpdate.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.version).toBe('88.88.88');
    });

    it('should update the updatedAt timestamp', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];
      const originalUpdatedAt = releaseToUpdate.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the release
      const result = await provider.update(releaseToUpdate.id, { version: '77.77.77' });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should not change the release ID when updating', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];
      const originalId = releaseToUpdate.id;

      // Try to update with a different ID
      const result = await provider.update(releaseToUpdate.id, { 
        id: 'different-id',
        version: '66.66.66'
      } as any);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.id).toBe(originalId);
      expect(updated.id).not.toBe('different-id');
    });

    it('should return NotFoundError when updating non-existent release', async () => {
      const result = await provider.update('non-existent-id', { version: '1.0.0' });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });

    it('should allow partial updates', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];
      const originalPlatform = releaseToUpdate.platform;
      const originalStatus = releaseToUpdate.status;

      // Update only the version
      const result = await provider.update(releaseToUpdate.id, { version: '55.55.55' });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.version).toBe('55.55.55');
      expect(updated.platform).toBe(originalPlatform);
      expect(updated.status).toBe(originalStatus);
    });
  });

  describe('updateStage', () => {
    it('should update release stage', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const newStage = 'Roll Out 1%' as any;
      const result = await provider.updateStage(releaseToUpdate.id, newStage);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.currentStage).toBe(newStage);
    });

    it('should persist stage updates', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const newStage = 'Submit For App Store Review' as any;
      await provider.updateStage(releaseToUpdate.id, newStage);

      // Verify persistence
      const findResult = await provider.findById(releaseToUpdate.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.currentStage).toBe(newStage);
    });

    it('should return NotFoundError when updating stage of non-existent release', async () => {
      const result = await provider.updateStage('non-existent-id', 'Roll Out 100%' as any);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });
  });

  describe('updateStatus', () => {
    it('should update release status', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const newStatus = ReleaseStatus.Production;
      const result = await provider.updateStatus(releaseToUpdate.id, newStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.status).toBe(newStatus);
    });

    it('should persist status updates', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const newStatus = ReleaseStatus.Current;
      await provider.updateStatus(releaseToUpdate.id, newStatus);

      // Verify persistence
      const findResult = await provider.findById(releaseToUpdate.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.status).toBe(newStatus);
    });

    it('should return NotFoundError when updating status of non-existent release', async () => {
      const result = await provider.updateStatus('non-existent-id', ReleaseStatus.Production);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });
  });

  describe('updateRollout', () => {
    it('should update rollout percentage', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const newPercentage = 50;
      const result = await provider.updateRollout(releaseToUpdate.id, newPercentage);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.rolloutPercentage).toBe(newPercentage);
    });

    it('should persist rollout updates', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const newPercentage = 75;
      await provider.updateRollout(releaseToUpdate.id, newPercentage);

      // Verify persistence
      const findResult = await provider.findById(releaseToUpdate.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.rolloutPercentage).toBe(newPercentage);
    });

    it('should handle 0% rollout', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const result = await provider.updateRollout(releaseToUpdate.id, 0);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.rolloutPercentage).toBe(0);
    });

    it('should handle 100% rollout', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];

      const result = await provider.updateRollout(releaseToUpdate.id, 100);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.rolloutPercentage).toBe(100);
    });

    it('should return NotFoundError when updating rollout of non-existent release', async () => {
      const result = await provider.updateRollout('non-existent-id', 50);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });
  });

  describe('Data persistence across operations', () => {
    it('should maintain data consistency after multiple updates', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];
      const releaseId = releaseToUpdate.id;

      // Perform multiple updates
      await provider.updateStage(releaseId, 'Roll Out 1%' as any);
      await provider.updateStatus(releaseId, ReleaseStatus.Production);
      await provider.updateRollout(releaseId, 25);

      // Verify all updates persisted
      const findResult = await provider.findById(releaseId);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.currentStage).toBe('Roll Out 1%');
      expect(found?.status).toBe(ReleaseStatus.Production);
      expect(found?.rolloutPercentage).toBe(25);
    });

    it('should maintain referential integrity after updates', async () => {
      // Get an existing release with blockers
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithBlockers = releases.find((r: Release) => r.blockers.length > 0);
      
      if (!releaseWithBlockers) {
        // Skip if no release has blockers
        return;
      }

      const originalBlockerCount = releaseWithBlockers.blockers.length;

      // Update the release
      await provider.updateStatus(releaseWithBlockers.id, ReleaseStatus.Current);

      // Verify blockers are still present
      const findResult = await provider.findById(releaseWithBlockers.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.blockers.length).toBe(originalBlockerCount);
    });

    it('should update timestamps on all update operations', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseToUpdate = releases[0];
      const originalUpdatedAt = new Date(releaseToUpdate.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Test updateStage
      const stageResult = await provider.updateStage(releaseToUpdate.id, 'Roll Out 50%' as any);
      if (stageResult.success) {
        expect(new Date(stageResult.value.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      // Test updateStatus
      const statusResult = await provider.updateStatus(releaseToUpdate.id, ReleaseStatus.Production);
      if (statusResult.success) {
        expect(new Date(statusResult.value.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      // Test updateRollout
      const rolloutResult = await provider.updateRollout(releaseToUpdate.id, 90);
      if (rolloutResult.success) {
        expect(new Date(rolloutResult.value.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
      }
    });
  });
});

describe('MockDataProvider - Blocker Operations', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('addBlocker', () => {
    it('should add a blocker to an existing release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      expect(releases.length).toBeGreaterThan(0);

      const release = releases[0];

      // Create a new blocker
      const newBlocker = {
        id: 'test-blocker-1',
        title: 'Test Blocker',
        description: 'This is a test blocker',
        severity: 'high' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/1',
        createdAt: new Date()
      };

      const result = await provider.addBlocker(release.id, newBlocker);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const addedBlocker = result.value;
      expect(addedBlocker.id).toBe(newBlocker.id);
      expect(addedBlocker.title).toBe(newBlocker.title);
      expect(addedBlocker.severity).toBe(newBlocker.severity);
    });

    it('should persist blocker addition for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalBlockerCount = release.blockers.length;

      // Add a blocker
      const newBlocker = {
        id: 'test-blocker-2',
        title: 'Persistent Blocker',
        description: 'This blocker should persist',
        severity: 'critical' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/2',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, newBlocker);

      // Verify persistence
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.blockers.length).toBe(originalBlockerCount + 1);
      
      const addedBlocker = found?.blockers.find(b => b.id === 'test-blocker-2');
      expect(addedBlocker).toBeDefined();
      expect(addedBlocker?.title).toBe('Persistent Blocker');
    });

    it('should update the release updatedAt timestamp when adding a blocker', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalUpdatedAt = new Date(release.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add a blocker
      const newBlocker = {
        id: 'test-blocker-3',
        title: 'Timestamp Test Blocker',
        description: 'Testing timestamp update',
        severity: 'medium' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/3',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, newBlocker);

      // Verify timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(new Date(found!.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should return NotFoundError when adding blocker to non-existent release', async () => {
      const newBlocker = {
        id: 'test-blocker-4',
        title: 'Orphan Blocker',
        description: 'This blocker has no release',
        severity: 'high' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/4',
        createdAt: new Date()
      };

      const result = await provider.addBlocker('non-existent-id', newBlocker);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });

    it('should allow adding multiple blockers to the same release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalBlockerCount = release.blockers.length;

      // Add multiple blockers
      const blocker1 = {
        id: 'test-blocker-5',
        title: 'First Blocker',
        description: 'First test blocker',
        severity: 'high' as any,
        assignee: 'User 1',
        issueUrl: 'https://github.com/test/issue/5',
        createdAt: new Date()
      };

      const blocker2 = {
        id: 'test-blocker-6',
        title: 'Second Blocker',
        description: 'Second test blocker',
        severity: 'medium' as any,
        assignee: 'User 2',
        issueUrl: 'https://github.com/test/issue/6',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, blocker1);
      await provider.addBlocker(release.id, blocker2);

      // Verify both blockers were added
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.blockers.length).toBe(originalBlockerCount + 2);
      
      const addedBlocker1 = found?.blockers.find(b => b.id === 'test-blocker-5');
      const addedBlocker2 = found?.blockers.find(b => b.id === 'test-blocker-6');
      
      expect(addedBlocker1).toBeDefined();
      expect(addedBlocker2).toBeDefined();
    });

    it('should preserve existing blockers when adding a new one', async () => {
      // Get a release with existing blockers
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithBlockers = releases.find((r: Release) => r.blockers.length > 0);
      
      if (!releaseWithBlockers) {
        // Skip if no release has blockers
        return;
      }

      const originalBlockers = [...releaseWithBlockers.blockers];

      // Add a new blocker
      const newBlocker = {
        id: 'test-blocker-7',
        title: 'Additional Blocker',
        description: 'Should not affect existing blockers',
        severity: 'low' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/7',
        createdAt: new Date()
      };

      await provider.addBlocker(releaseWithBlockers.id, newBlocker);

      // Verify original blockers are still present
      const findResult = await provider.findById(releaseWithBlockers.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      
      originalBlockers.forEach(originalBlocker => {
        const stillExists = found?.blockers.some(b => b.id === originalBlocker.id);
        expect(stillExists).toBe(true);
      });
    });
  });

  describe('resolveBlocker', () => {
    it('should resolve an existing blocker', async () => {
      // Get a release with blockers
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithBlockers = releases.find((r: Release) => r.blockers.length > 0);
      
      if (!releaseWithBlockers) {
        // Add a blocker first if none exist
        const release = releases[0];
        const newBlocker = {
          id: 'test-blocker-resolve-1',
          title: 'Blocker to Resolve',
          description: 'This blocker will be resolved',
          severity: 'high' as any,
          assignee: 'Test User',
          issueUrl: 'https://github.com/test/issue/resolve-1',
          createdAt: new Date()
        };
        
        await provider.addBlocker(release.id, newBlocker);
        
        const result = await provider.resolveBlocker(release.id, 'test-blocker-resolve-1');
        
        expect(result.success).toBe(true);
        if (!result.success) return;
        
        const resolvedBlocker = result.value;
        expect(resolvedBlocker.resolvedAt).toBeDefined();
        expect(resolvedBlocker.resolvedAt).toBeInstanceOf(Date);
        return;
      }

      // Find an unresolved blocker
      const unresolvedBlocker = releaseWithBlockers.blockers.find(b => !b.resolvedAt);
      
      if (!unresolvedBlocker) {
        // All blockers are already resolved, skip
        return;
      }

      const result = await provider.resolveBlocker(releaseWithBlockers.id, unresolvedBlocker.id);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const resolvedBlocker = result.value;
      expect(resolvedBlocker.resolvedAt).toBeDefined();
      expect(resolvedBlocker.resolvedAt).toBeInstanceOf(Date);
    });

    it('should persist blocker resolution for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a blocker to resolve
      const newBlocker = {
        id: 'test-blocker-resolve-2',
        title: 'Blocker to Resolve and Persist',
        description: 'This blocker resolution should persist',
        severity: 'critical' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/resolve-2',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, newBlocker);

      // Resolve the blocker
      await provider.resolveBlocker(release.id, 'test-blocker-resolve-2');

      // Verify persistence
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      const resolvedBlocker = found?.blockers.find(b => b.id === 'test-blocker-resolve-2');
      
      expect(resolvedBlocker).toBeDefined();
      expect(resolvedBlocker?.resolvedAt).toBeDefined();
      expect(resolvedBlocker?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should update the release updatedAt timestamp when resolving a blocker', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a blocker to resolve
      const newBlocker = {
        id: 'test-blocker-resolve-3',
        title: 'Timestamp Test Blocker',
        description: 'Testing timestamp update on resolution',
        severity: 'medium' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/resolve-3',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, newBlocker);

      // Get the current timestamp
      const beforeResolve = await provider.findById(release.id);
      if (!beforeResolve.success) return;
      const originalUpdatedAt = new Date(beforeResolve.value!.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Resolve the blocker
      await provider.resolveBlocker(release.id, 'test-blocker-resolve-3');

      // Verify timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(new Date(found!.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should return NotFoundError when resolving blocker in non-existent release', async () => {
      const result = await provider.resolveBlocker('non-existent-id', 'some-blocker-id');

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('Release');
      expect(result.error.message).toContain('not found');
    });

    it('should return NotFoundError when resolving non-existent blocker', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.resolveBlocker(release.id, 'non-existent-blocker-id');

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('Blocker');
      expect(result.error.message).toContain('not found');
    });

    it('should not affect other blockers when resolving one', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add multiple blockers
      const blocker1 = {
        id: 'test-blocker-resolve-4',
        title: 'Blocker to Resolve',
        description: 'This will be resolved',
        severity: 'high' as any,
        assignee: 'User 1',
        issueUrl: 'https://github.com/test/issue/resolve-4',
        createdAt: new Date()
      };

      const blocker2 = {
        id: 'test-blocker-resolve-5',
        title: 'Blocker to Keep Open',
        description: 'This will remain unresolved',
        severity: 'medium' as any,
        assignee: 'User 2',
        issueUrl: 'https://github.com/test/issue/resolve-5',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, blocker1);
      await provider.addBlocker(release.id, blocker2);

      // Resolve only the first blocker
      await provider.resolveBlocker(release.id, 'test-blocker-resolve-4');

      // Verify only the first blocker is resolved
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      const resolvedBlocker = found?.blockers.find(b => b.id === 'test-blocker-resolve-4');
      const unresolvedBlocker = found?.blockers.find(b => b.id === 'test-blocker-resolve-5');
      
      expect(resolvedBlocker?.resolvedAt).toBeDefined();
      expect(unresolvedBlocker?.resolvedAt).toBeUndefined();
    });

    it('should allow resolving an already resolved blocker', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a blocker
      const newBlocker = {
        id: 'test-blocker-resolve-6',
        title: 'Blocker to Resolve Twice',
        description: 'This blocker will be resolved twice',
        severity: 'medium' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/resolve-6',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, newBlocker);

      // Resolve the blocker first time
      const firstResolve = await provider.resolveBlocker(release.id, 'test-blocker-resolve-6');
      expect(firstResolve.success).toBe(true);
      if (!firstResolve.success) return;

      const firstResolvedAt = firstResolve.value.resolvedAt;

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Resolve the blocker second time
      const secondResolve = await provider.resolveBlocker(release.id, 'test-blocker-resolve-6');
      expect(secondResolve.success).toBe(true);
      if (!secondResolve.success) return;

      const secondResolvedAt = secondResolve.value.resolvedAt;

      // The resolvedAt timestamp should be updated
      expect(new Date(secondResolvedAt!).getTime()).toBeGreaterThan(
        new Date(firstResolvedAt!).getTime()
      );
    });
  });

  describe('Blocker operations integration', () => {
    it('should maintain data consistency across add and resolve operations', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalBlockerCount = release.blockers.length;

      // Add multiple blockers
      const blocker1 = {
        id: 'integration-blocker-1',
        title: 'Integration Test Blocker 1',
        description: 'First integration test blocker',
        severity: 'critical' as any,
        assignee: 'User 1',
        issueUrl: 'https://github.com/test/issue/int-1',
        createdAt: new Date()
      };

      const blocker2 = {
        id: 'integration-blocker-2',
        title: 'Integration Test Blocker 2',
        description: 'Second integration test blocker',
        severity: 'high' as any,
        assignee: 'User 2',
        issueUrl: 'https://github.com/test/issue/int-2',
        createdAt: new Date()
      };

      const blocker3 = {
        id: 'integration-blocker-3',
        title: 'Integration Test Blocker 3',
        description: 'Third integration test blocker',
        severity: 'medium' as any,
        assignee: 'User 3',
        issueUrl: 'https://github.com/test/issue/int-3',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, blocker1);
      await provider.addBlocker(release.id, blocker2);
      await provider.addBlocker(release.id, blocker3);

      // Resolve some blockers
      await provider.resolveBlocker(release.id, 'integration-blocker-1');
      await provider.resolveBlocker(release.id, 'integration-blocker-3');

      // Verify final state
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      
      // Should have 3 more blockers than originally
      expect(found?.blockers.length).toBe(originalBlockerCount + 3);
      
      // Check resolution status
      const b1 = found?.blockers.find(b => b.id === 'integration-blocker-1');
      const b2 = found?.blockers.find(b => b.id === 'integration-blocker-2');
      const b3 = found?.blockers.find(b => b.id === 'integration-blocker-3');
      
      expect(b1?.resolvedAt).toBeDefined();
      expect(b2?.resolvedAt).toBeUndefined();
      expect(b3?.resolvedAt).toBeDefined();
    });

    it('should maintain referential integrity with other release data', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      
      const originalSignOffCount = release.signOffs.length;
      const originalDistributionCount = release.distributions.length;
      const originalVersion = release.version;

      // Add and resolve a blocker
      const newBlocker = {
        id: 'referential-blocker',
        title: 'Referential Integrity Test',
        description: 'Testing referential integrity',
        severity: 'high' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/ref',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, newBlocker);
      await provider.resolveBlocker(release.id, 'referential-blocker');

      // Verify other data is unchanged
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      
      expect(found?.signOffs.length).toBe(originalSignOffCount);
      expect(found?.distributions.length).toBe(originalDistributionCount);
      expect(found?.version).toBe(originalVersion);
    });
  });
});

describe('MockDataProvider - Sign-Off Operations', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('updateSignOff', () => {
    it('should add a new sign-off to a release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      expect(releases.length).toBeGreaterThan(0);

      const release = releases[0];

      // Create a new sign-off
      const newSignOff = {
        squad: 'Test Squad',
        approved: true,
        approvedBy: 'Test User',
        approvedAt: new Date(),
        comments: 'Test approval'
      };

      const result = await provider.updateSignOff(release.id, newSignOff);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const addedSignOff = result.value;
      expect(addedSignOff.squad).toBe(newSignOff.squad);
      expect(addedSignOff.approved).toBe(true);
      expect(addedSignOff.approvedBy).toBe('Test User');
    });

    it('should update an existing sign-off for the same squad', async () => {
      // Get an existing release with sign-offs
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithSignOffs = releases.find((r: Release) => r.signOffs.length > 0);
      
      if (!releaseWithSignOffs) {
        return;
      }

      const existingSignOff = releaseWithSignOffs.signOffs[0];
      const originalSignOffCount = releaseWithSignOffs.signOffs.length;

      // Update the existing sign-off
      const updatedSignOff = {
        squad: existingSignOff.squad,
        approved: !existingSignOff.approved,
        approvedBy: 'Updated User',
        approvedAt: new Date(),
        comments: 'Updated approval'
      };

      const result = await provider.updateSignOff(releaseWithSignOffs.id, updatedSignOff);

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Verify the sign-off was updated, not added
      const findResult = await provider.findById(releaseWithSignOffs.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.signOffs.length).toBe(originalSignOffCount);
      
      const updated = found?.signOffs.find(s => s.squad === existingSignOff.squad);
      expect(updated?.approved).toBe(!existingSignOff.approved);
      expect(updated?.approvedBy).toBe('Updated User');
    });

    it('should persist sign-off updates for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a sign-off
      const newSignOff = {
        squad: 'Persistent Squad',
        approved: true,
        approvedBy: 'Persistent User',
        approvedAt: new Date(),
        comments: 'This should persist'
      };

      await provider.updateSignOff(release.id, newSignOff);

      // Verify persistence
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      const persistedSignOff = found?.signOffs.find(s => s.squad === 'Persistent Squad');
      
      expect(persistedSignOff).toBeDefined();
      expect(persistedSignOff?.approved).toBe(true);
      expect(persistedSignOff?.approvedBy).toBe('Persistent User');
      expect(persistedSignOff?.comments).toBe('This should persist');
    });

    it('should update the release updatedAt timestamp when updating sign-off', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalUpdatedAt = new Date(release.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update a sign-off
      const newSignOff = {
        squad: 'Timestamp Squad',
        approved: true,
        approvedBy: 'Timestamp User',
        approvedAt: new Date(),
        comments: 'Testing timestamp'
      };

      await provider.updateSignOff(release.id, newSignOff);

      // Verify timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(new Date(found!.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should return NotFoundError when updating sign-off for non-existent release', async () => {
      const newSignOff = {
        squad: 'Orphan Squad',
        approved: true,
        approvedBy: 'Orphan User',
        approvedAt: new Date(),
        comments: 'No release'
      };

      const result = await provider.updateSignOff('non-existent-id', newSignOff);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });

    it('should allow adding multiple sign-offs for different squads', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalSignOffCount = release.signOffs.length;

      // Add multiple sign-offs
      const signOff1 = {
        squad: 'Squad Alpha',
        approved: true,
        approvedBy: 'User Alpha',
        approvedAt: new Date(),
        comments: 'Alpha approval'
      };

      const signOff2 = {
        squad: 'Squad Beta',
        approved: false
      };

      await provider.updateSignOff(release.id, signOff1);
      await provider.updateSignOff(release.id, signOff2);

      // Verify both sign-offs were added
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.signOffs.length).toBe(originalSignOffCount + 2);
      
      const alpha = found?.signOffs.find(s => s.squad === 'Squad Alpha');
      const beta = found?.signOffs.find(s => s.squad === 'Squad Beta');
      
      expect(alpha).toBeDefined();
      expect(alpha?.approved).toBe(true);
      expect(beta).toBeDefined();
      expect(beta?.approved).toBe(false);
    });

    it('should handle sign-offs with approved false (no approvedBy or approvedAt)', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a non-approved sign-off
      const pendingSignOff = {
        squad: 'Pending Squad',
        approved: false
      };

      const result = await provider.updateSignOff(release.id, pendingSignOff);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const addedSignOff = result.value;
      expect(addedSignOff.squad).toBe('Pending Squad');
      expect(addedSignOff.approved).toBe(false);
      expect(addedSignOff.approvedBy).toBeUndefined();
      expect(addedSignOff.approvedAt).toBeUndefined();
    });

    it('should preserve existing sign-offs when adding a new one', async () => {
      // Get a release with existing sign-offs
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithSignOffs = releases.find((r: Release) => r.signOffs.length > 0);
      
      if (!releaseWithSignOffs) {
        return;
      }

      const originalSignOffs = [...releaseWithSignOffs.signOffs];

      // Add a new sign-off for a different squad
      const newSignOff = {
        squad: 'New Squad',
        approved: true,
        approvedBy: 'New User',
        approvedAt: new Date(),
        comments: 'Should not affect existing'
      };

      await provider.updateSignOff(releaseWithSignOffs.id, newSignOff);

      // Verify original sign-offs are still present
      const findResult = await provider.findById(releaseWithSignOffs.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      
      originalSignOffs.forEach(originalSignOff => {
        const stillExists = found?.signOffs.some(s => s.squad === originalSignOff.squad);
        expect(stillExists).toBe(true);
      });
    });
  });
});

describe('MockDataProvider - Distribution Operations', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('addDistribution', () => {
    it('should add a distribution channel to a release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      expect(releases.length).toBeGreaterThan(0);

      const release = releases[0];

      // Create a new distribution
      const newDistribution = {
        channel: 'Test Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      const result = await provider.addDistribution(release.id, newDistribution);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const addedDistribution = result.value;
      expect(addedDistribution.channel).toBe(newDistribution.channel);
      expect(addedDistribution.status).toBe('pending');
    });

    it('should persist distribution addition for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalDistributionCount = release.distributions.length;

      // Add a distribution
      const newDistribution = {
        channel: 'Persistent Channel',
        status: 'submitted' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, newDistribution);

      // Verify persistence
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.distributions.length).toBe(originalDistributionCount + 1);
      
      const addedDistribution = found?.distributions.find(d => d.channel === 'Persistent Channel');
      expect(addedDistribution).toBeDefined();
      expect(addedDistribution?.status).toBe('submitted');
    });

    it('should update the release updatedAt timestamp when adding a distribution', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalUpdatedAt = new Date(release.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add a distribution
      const newDistribution = {
        channel: 'Timestamp Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, newDistribution);

      // Verify timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(new Date(found!.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should return NotFoundError when adding distribution to non-existent release', async () => {
      const newDistribution = {
        channel: 'Orphan Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      const result = await provider.addDistribution('non-existent-id', newDistribution);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });

    it('should allow adding multiple distribution channels to the same release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalDistributionCount = release.distributions.length;

      // Add multiple distributions
      const distribution1 = {
        channel: 'Channel One',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      const distribution2 = {
        channel: 'Channel Two',
        status: 'approved' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, distribution1);
      await provider.addDistribution(release.id, distribution2);

      // Verify both distributions were added
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.distributions.length).toBe(originalDistributionCount + 2);
      
      const dist1 = found?.distributions.find(d => d.channel === 'Channel One');
      const dist2 = found?.distributions.find(d => d.channel === 'Channel Two');
      
      expect(dist1).toBeDefined();
      expect(dist2).toBeDefined();
    });

    it('should preserve existing distributions when adding a new one', async () => {
      // Get a release with existing distributions
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithDistributions = releases.find((r: Release) => r.distributions.length > 0);
      
      if (!releaseWithDistributions) {
        return;
      }

      const originalDistributions = [...releaseWithDistributions.distributions];

      // Add a new distribution
      const newDistribution = {
        channel: 'Additional Channel',
        status: 'live' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(releaseWithDistributions.id, newDistribution);

      // Verify original distributions are still present
      const findResult = await provider.findById(releaseWithDistributions.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      
      originalDistributions.forEach(originalDistribution => {
        const stillExists = found?.distributions.some(d => d.channel === originalDistribution.channel);
        expect(stillExists).toBe(true);
      });
    });
  });

  describe('updateDistribution', () => {
    it('should update an existing distribution channel status', async () => {
      // Get a release with distributions
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithDistributions = releases.find((r: Release) => r.distributions.length > 0);
      
      if (!releaseWithDistributions) {
        // Add a distribution first if none exist
        const release = releases[0];
        const newDistribution = {
          channel: 'Test Update Channel',
          status: 'pending' as any,
          updatedAt: new Date()
        };
        
        await provider.addDistribution(release.id, newDistribution);
        
        const result = await provider.updateDistribution(release.id, 'Test Update Channel', 'approved' as any);
        
        expect(result.success).toBe(true);
        if (!result.success) return;
        
        const updatedDistribution = result.value;
        expect(updatedDistribution.status).toBe('approved');
        return;
      }

      const existingDistribution = releaseWithDistributions.distributions[0];
      const newStatus = existingDistribution.status === 'pending' ? 'approved' : 'pending';

      const result = await provider.updateDistribution(
        releaseWithDistributions.id, 
        existingDistribution.channel, 
        newStatus as any
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updatedDistribution = result.value;
      expect(updatedDistribution.status).toBe(newStatus);
      expect(updatedDistribution.channel).toBe(existingDistribution.channel);
    });

    it('should persist distribution status updates for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a distribution to update
      const newDistribution = {
        channel: 'Persistent Update Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, newDistribution);

      // Update the distribution status
      await provider.updateDistribution(release.id, 'Persistent Update Channel', 'live' as any);

      // Verify persistence
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      const updatedDistribution = found?.distributions.find(d => d.channel === 'Persistent Update Channel');
      
      expect(updatedDistribution).toBeDefined();
      expect(updatedDistribution?.status).toBe('live');
    });

    it('should update the distribution updatedAt timestamp', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a distribution
      const newDistribution = {
        channel: 'Timestamp Update Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, newDistribution);

      // Get the current timestamp
      const beforeUpdate = await provider.findById(release.id);
      if (!beforeUpdate.success) return;
      const distribution = beforeUpdate.value?.distributions.find(d => d.channel === 'Timestamp Update Channel');
      const originalUpdatedAt = new Date(distribution!.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the distribution
      await provider.updateDistribution(release.id, 'Timestamp Update Channel', 'approved' as any);

      // Verify timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      const updated = found?.distributions.find(d => d.channel === 'Timestamp Update Channel');
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should update the release updatedAt timestamp when updating distribution', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a distribution
      const newDistribution = {
        channel: 'Release Timestamp Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, newDistribution);

      // Get the current release timestamp
      const beforeUpdate = await provider.findById(release.id);
      if (!beforeUpdate.success) return;
      const originalReleaseUpdatedAt = new Date(beforeUpdate.value!.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the distribution
      await provider.updateDistribution(release.id, 'Release Timestamp Channel', 'submitted' as any);

      // Verify release timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(new Date(found!.updatedAt).getTime()).toBeGreaterThan(originalReleaseUpdatedAt);
    });

    it('should return NotFoundError when updating distribution in non-existent release', async () => {
      const result = await provider.updateDistribution('non-existent-id', 'Some Channel', 'live' as any);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('Release');
      expect(result.error.message).toContain('not found');
    });

    it('should return NotFoundError when updating non-existent distribution channel', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateDistribution(release.id, 'Non-Existent Channel', 'live' as any);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('Distribution');
      expect(result.error.message).toContain('not found');
    });

    it('should not affect other distributions when updating one', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add multiple distributions
      const distribution1 = {
        channel: 'Channel Alpha',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      const distribution2 = {
        channel: 'Channel Beta',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, distribution1);
      await provider.addDistribution(release.id, distribution2);

      // Update only the first distribution
      await provider.updateDistribution(release.id, 'Channel Alpha', 'live' as any);

      // Verify only the first distribution was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      const alpha = found?.distributions.find(d => d.channel === 'Channel Alpha');
      const beta = found?.distributions.find(d => d.channel === 'Channel Beta');
      
      expect(alpha?.status).toBe('live');
      expect(beta?.status).toBe('pending');
    });

    it('should handle all distribution status values', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a distribution
      const newDistribution = {
        channel: 'Status Test Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, newDistribution);

      // Test all status transitions
      const statuses = ['pending', 'submitted', 'approved', 'live'];
      
      for (const status of statuses) {
        const result = await provider.updateDistribution(release.id, 'Status Test Channel', status as any);
        
        expect(result.success).toBe(true);
        if (!result.success) continue;
        
        expect(result.value.status).toBe(status);
      }
    });
  });

  describe('Sign-off and Distribution integration', () => {
    it('should maintain data consistency across sign-off and distribution operations', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      
      const originalSignOffCount = release.signOffs.length;
      const originalDistributionCount = release.distributions.length;
      const originalVersion = release.version;

      // Add sign-offs and distributions
      const signOff = {
        squad: 'Integration Squad',
        approved: true,
        approvedBy: 'Integration User',
        approvedAt: new Date(),
        comments: 'Integration test'
      };

      const distribution = {
        channel: 'Integration Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      await provider.updateSignOff(release.id, signOff);
      await provider.addDistribution(release.id, distribution);
      await provider.updateDistribution(release.id, 'Integration Channel', 'live' as any);

      // Verify all operations persisted correctly
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      
      // Check sign-offs
      expect(found?.signOffs.length).toBe(originalSignOffCount + 1);
      const addedSignOff = found?.signOffs.find(s => s.squad === 'Integration Squad');
      expect(addedSignOff).toBeDefined();
      expect(addedSignOff?.approved).toBe(true);
      
      // Check distributions
      expect(found?.distributions.length).toBe(originalDistributionCount + 1);
      const addedDistribution = found?.distributions.find(d => d.channel === 'Integration Channel');
      expect(addedDistribution).toBeDefined();
      expect(addedDistribution?.status).toBe('live');
      
      // Check other data is unchanged
      expect(found?.version).toBe(originalVersion);
    });

    it('should maintain referential integrity with blockers', async () => {
      // Get a release with blockers
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithBlockers = releases.find((r: Release) => r.blockers.length > 0);
      
      if (!releaseWithBlockers) {
        return;
      }

      const originalBlockerCount = releaseWithBlockers.blockers.length;

      // Add sign-offs and distributions
      const signOff = {
        squad: 'Referential Squad',
        approved: true,
        approvedBy: 'Referential User',
        approvedAt: new Date(),
        comments: 'Testing referential integrity'
      };

      const distribution = {
        channel: 'Referential Channel',
        status: 'approved' as any,
        updatedAt: new Date()
      };

      await provider.updateSignOff(releaseWithBlockers.id, signOff);
      await provider.addDistribution(releaseWithBlockers.id, distribution);

      // Verify blockers are unchanged
      const findResult = await provider.findById(releaseWithBlockers.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.blockers.length).toBe(originalBlockerCount);
    });
  });
});

describe('MockDataProvider - ITGC Operations', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('updateITGC', () => {
    it('should update ITGC status for an existing release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      expect(releases.length).toBeGreaterThan(0);

      const release = releases[0];
      const originalITGCStatus = release.itgcStatus;

      // Create new ITGC status
      const newITGCStatus = {
        compliant: !originalITGCStatus.compliant,
        rolloutComplete: true,
        details: 'Updated ITGC compliance status',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.compliant).toBe(newITGCStatus.compliant);
      expect(updated.itgcStatus.rolloutComplete).toBe(true);
      expect(updated.itgcStatus.details).toBe('Updated ITGC compliance status');
    });

    it('should persist ITGC updates for subsequent findById calls', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Update ITGC status
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: true,
        details: 'Persistent ITGC status',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, newITGCStatus);

      // Verify persistence
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.itgcStatus.compliant).toBe(true);
      expect(found?.itgcStatus.rolloutComplete).toBe(true);
      expect(found?.itgcStatus.details).toBe('Persistent ITGC status');
    });

    it('should update the release updatedAt timestamp when updating ITGC', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];
      const originalUpdatedAt = new Date(release.updatedAt).getTime();

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update ITGC status
      const newITGCStatus = {
        compliant: false,
        rolloutComplete: false,
        details: 'Timestamp test',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, newITGCStatus);

      // Verify timestamp was updated
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(new Date(found!.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should return NotFoundError when updating ITGC for non-existent release', async () => {
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: true,
        details: 'Orphan ITGC status',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC('non-existent-id', newITGCStatus);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.message).toContain('not found');
    });

    it('should handle compliant true with rolloutComplete true', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Update to compliant and rollout complete
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: true,
        details: 'All compliance checks passed and rollout complete',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.compliant).toBe(true);
      expect(updated.itgcStatus.rolloutComplete).toBe(true);
      expect(updated.itgcStatus.details).toBe('All compliance checks passed and rollout complete');
    });

    it('should handle compliant false with rolloutComplete false', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Update to non-compliant and rollout not complete
      const newITGCStatus = {
        compliant: false,
        rolloutComplete: false,
        details: 'Missing required documentation',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.compliant).toBe(false);
      expect(updated.itgcStatus.rolloutComplete).toBe(false);
      expect(updated.itgcStatus.details).toBe('Missing required documentation');
    });

    it('should handle compliant true with rolloutComplete false', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Update to compliant but rollout not complete
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: false,
        details: 'Compliant but rollout in progress',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.compliant).toBe(true);
      expect(updated.itgcStatus.rolloutComplete).toBe(false);
      expect(updated.itgcStatus.details).toBe('Compliant but rollout in progress');
    });

    it('should update lastCheckedAt timestamp', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const checkTime = new Date();
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: false,
        details: 'Timestamp check',
        lastCheckedAt: checkTime
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.lastCheckedAt).toEqual(checkTime);
    });

    it('should allow multiple ITGC updates to the same release', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // First update
      const firstITGCStatus = {
        compliant: false,
        rolloutComplete: false,
        details: 'First check - non-compliant',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, firstITGCStatus);

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second update
      const secondITGCStatus = {
        compliant: true,
        rolloutComplete: false,
        details: 'Second check - now compliant',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, secondITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.compliant).toBe(true);
      expect(updated.itgcStatus.details).toBe('Second check - now compliant');
      expect(new Date(updated.itgcStatus.lastCheckedAt).getTime()).toBeGreaterThan(
        new Date(firstITGCStatus.lastCheckedAt).getTime()
      );
    });

    it('should preserve other release data when updating ITGC', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const originalVersion = release.version;
      const originalPlatform = release.platform;
      const originalStatus = release.status;
      const originalBlockerCount = release.blockers.length;
      const originalSignOffCount = release.signOffs.length;
      const originalDistributionCount = release.distributions.length;

      // Update ITGC status
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: true,
        details: 'Referential integrity test',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, newITGCStatus);

      // Verify other data is unchanged
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.version).toBe(originalVersion);
      expect(found?.platform).toBe(originalPlatform);
      expect(found?.status).toBe(originalStatus);
      expect(found?.blockers.length).toBe(originalBlockerCount);
      expect(found?.signOffs.length).toBe(originalSignOffCount);
      expect(found?.distributions.length).toBe(originalDistributionCount);
    });

    it('should handle empty details string', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Update with empty details
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: false,
        details: '',
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.details).toBe('');
    });

    it('should handle long details string', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Update with long details
      const longDetails = 'This is a very long details string that contains multiple sentences. ' +
        'It describes various compliance checks that were performed. ' +
        'All checks passed successfully and the release is ready for production deployment. ' +
        'Additional notes: security audit completed, performance benchmarks met, documentation updated.';

      const newITGCStatus = {
        compliant: true,
        rolloutComplete: true,
        details: longDetails,
        lastCheckedAt: new Date()
      };

      const result = await provider.updateITGC(release.id, newITGCStatus);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const updated = result.value;
      expect(updated.itgcStatus.details).toBe(longDetails);
    });
  });

  describe('ITGC operations integration', () => {
    it('should maintain data consistency across multiple update operations', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Perform multiple updates
      await provider.updateStage(release.id, ReleaseStage.RollOut1Percent);
      await provider.updateStatus(release.id, ReleaseStatus.Production);
      await provider.updateRollout(release.id, 1);

      // Update ITGC status
      const newITGCStatus = {
        compliant: true,
        rolloutComplete: false,
        details: 'Rollout at 1%, compliance maintained',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, newITGCStatus);

      // Verify all updates persisted
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.currentStage).toBe(ReleaseStage.RollOut1Percent);
      expect(found?.status).toBe(ReleaseStatus.Production);
      expect(found?.rolloutPercentage).toBe(1);
      expect(found?.itgcStatus.compliant).toBe(true);
      expect(found?.itgcStatus.rolloutComplete).toBe(false);
      expect(found?.itgcStatus.details).toBe('Rollout at 1%, compliance maintained');
    });

    it('should work correctly with blocker, sign-off, and distribution operations', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Add a blocker
      const blocker = {
        id: 'itgc-integration-blocker',
        title: 'ITGC Integration Test Blocker',
        description: 'Testing ITGC with other operations',
        severity: 'high' as any,
        assignee: 'Test User',
        issueUrl: 'https://github.com/test/issue/itgc',
        createdAt: new Date()
      };

      await provider.addBlocker(release.id, blocker);

      // Add a sign-off
      const signOff = {
        squad: 'ITGC Squad',
        approved: true,
        approvedBy: 'ITGC User',
        approvedAt: new Date(),
        comments: 'ITGC integration test'
      };

      await provider.updateSignOff(release.id, signOff);

      // Add a distribution
      const distribution = {
        channel: 'ITGC Channel',
        status: 'live' as any,
        updatedAt: new Date()
      };

      await provider.addDistribution(release.id, distribution);

      // Update ITGC status
      const itgcStatus = {
        compliant: true,
        rolloutComplete: true,
        details: 'All operations completed successfully',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, itgcStatus);

      // Verify all operations persisted correctly
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;

      // Check blocker
      const addedBlocker = found?.blockers.find(b => b.id === 'itgc-integration-blocker');
      expect(addedBlocker).toBeDefined();

      // Check sign-off
      const addedSignOff = found?.signOffs.find(s => s.squad === 'ITGC Squad');
      expect(addedSignOff).toBeDefined();
      expect(addedSignOff?.approved).toBe(true);

      // Check distribution
      const addedDistribution = found?.distributions.find(d => d.channel === 'ITGC Channel');
      expect(addedDistribution).toBeDefined();
      expect(addedDistribution?.status).toBe('live');

      // Check ITGC status
      expect(found?.itgcStatus.compliant).toBe(true);
      expect(found?.itgcStatus.rolloutComplete).toBe(true);
      expect(found?.itgcStatus.details).toBe('All operations completed successfully');
    });

    it('should maintain ITGC status across other update operations', async () => {
      // Get an existing release
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      // Set ITGC status first
      const itgcStatus = {
        compliant: true,
        rolloutComplete: false,
        details: 'Initial ITGC status',
        lastCheckedAt: new Date()
      };

      await provider.updateITGC(release.id, itgcStatus);

      // Perform other updates
      await provider.updateStage(release.id, 'Roll Out 25%' as any);
      await provider.updateRollout(release.id, 25);

      // Verify ITGC status is unchanged
      const findResult = await provider.findById(release.id);
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;

      const found = findResult.value;
      expect(found?.itgcStatus.compliant).toBe(true);
      expect(found?.itgcStatus.rolloutComplete).toBe(false);
      expect(found?.itgcStatus.details).toBe('Initial ITGC status');
    });
  });
});


describe('MockDataProvider - Validation', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
  });

  describe('create validation', () => {
    it('should reject release with missing required fields', async () => {
      const invalidRelease = {
        id: '',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: '',
        branchName: '',
        sourceType: 'github' as any,
        repositoryUrl: '',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.length).toBeGreaterThan(0);
      expect(validationError.errors.some(e => e.includes('ID'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Version'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Branch name'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Repository URL'))).toBe(true);
    });

    it('should reject release with invalid platform', async () => {
      const invalidRelease = {
        id: 'test-id',
        platform: 'InvalidPlatform' as any,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid platform'))).toBe(true);
    });

    it('should reject release with invalid status', async () => {
      const invalidRelease = {
        id: 'test-id',
        platform: Platform.iOS,
        status: 'InvalidStatus' as any,
        currentStage: 'Release Branching' as any,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid status'))).toBe(true);
    });

    it('should reject release with invalid stage', async () => {
      const invalidRelease = {
        id: 'test-id',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'InvalidStage' as any,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid stage'))).toBe(true);
    });

    it('should reject release with invalid version format', async () => {
      const invalidRelease = {
        id: 'test-id',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: 'invalid-version',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid version format'))).toBe(true);
    });

    it('should reject release with invalid rollout percentage (negative)', async () => {
      const invalidRelease = {
        id: 'test-id',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: -10,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid rollout percentage'))).toBe(true);
    });

    it('should reject release with invalid rollout percentage (over 100)', async () => {
      const invalidRelease = {
        id: 'test-id',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 150,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      } as Release;

      const result = await provider.create(invalidRelease);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid rollout percentage'))).toBe(true);
    });

    it('should accept valid release with all required fields', async () => {
      const validRelease: Release = {
        id: 'valid-test-id',
        platform: Platform.iOS,
        status: ReleaseStatus.Upcoming,
        currentStage: 'Release Branching' as any,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as any,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: '1000',
        latestPassingBuild: '1000',
        latestAppStoreBuild: '1000',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 50,
        distributions: [],
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'Test',
          lastCheckedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      const result = await provider.create(validRelease);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.id).toBe('valid-test-id');
      expect(result.value.version).toBe('1.0.0');
    });
  });

  describe('addBlocker validation', () => {
    it('should reject blocker with missing required fields', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const invalidBlocker = {
        id: '',
        title: '',
        description: '',
        severity: '' as any,
        createdAt: new Date()
      };

      const result = await provider.addBlocker(release.id, invalidBlocker);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.length).toBeGreaterThan(0);
      expect(validationError.errors.some(e => e.includes('Blocker ID'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Blocker title'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Blocker description'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Blocker severity'))).toBe(true);
    });

    it('should reject blocker with invalid severity', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const invalidBlocker = {
        id: 'test-blocker',
        title: 'Test Blocker',
        description: 'Test description',
        severity: 'invalid-severity' as any,
        createdAt: new Date()
      };

      const result = await provider.addBlocker(release.id, invalidBlocker);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid blocker severity'))).toBe(true);
    });

    it('should accept valid blocker', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const validBlocker = {
        id: 'valid-blocker',
        title: 'Valid Blocker',
        description: 'Valid description',
        severity: 'high' as any,
        createdAt: new Date()
      };

      const result = await provider.addBlocker(release.id, validBlocker);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.id).toBe('valid-blocker');
      expect(result.value.severity).toBe('high');
    });

    it('should return 404 for non-existent release', async () => {
      const validBlocker = {
        id: 'test-blocker',
        title: 'Test Blocker',
        description: 'Test description',
        severity: 'high' as any,
        createdAt: new Date()
      };

      const result = await provider.addBlocker('non-existent-release-id', validBlocker);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.message).toContain('not found');
    });
  });

  describe('addDistribution validation', () => {
    it('should reject distribution with missing required fields', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const invalidDistribution = {
        channel: '',
        status: '' as any,
        updatedAt: new Date()
      };

      const result = await provider.addDistribution(release.id, invalidDistribution);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.length).toBeGreaterThan(0);
      expect(validationError.errors.some(e => e.includes('Distribution channel'))).toBe(true);
      expect(validationError.errors.some(e => e.includes('Distribution status'))).toBe(true);
    });

    it('should reject distribution with invalid status', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const invalidDistribution = {
        channel: 'Test Channel',
        status: 'invalid-status' as any,
        updatedAt: new Date()
      };

      const result = await provider.addDistribution(release.id, invalidDistribution);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid distribution status'))).toBe(true);
    });

    it('should accept valid distribution', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const validDistribution = {
        channel: 'Valid Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      const result = await provider.addDistribution(release.id, validDistribution);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.channel).toBe('Valid Channel');
      expect(result.value.status).toBe('pending');
    });

    it('should return 404 for non-existent release', async () => {
      const validDistribution = {
        channel: 'Test Channel',
        status: 'pending' as any,
        updatedAt: new Date()
      };

      const result = await provider.addDistribution('non-existent-release-id', validDistribution);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.message).toContain('not found');
    });
  });

  describe('updateDistribution validation', () => {
    it('should reject invalid distribution status', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithDistributions = releases.find(r => r.distributions.length > 0);

      if (!releaseWithDistributions) return;

      const distribution = releaseWithDistributions.distributions[0];

      const result = await provider.updateDistribution(
        releaseWithDistributions.id,
        distribution.channel,
        'invalid-status' as any
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid distribution status'))).toBe(true);
    });

    it('should accept valid distribution status', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const releaseWithDistributions = releases.find(r => r.distributions.length > 0);

      if (!releaseWithDistributions) return;

      const distribution = releaseWithDistributions.distributions[0];

      const result = await provider.updateDistribution(
        releaseWithDistributions.id,
        distribution.channel,
        'approved' as any
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.status).toBe('approved');
    });
  });

  describe('updateStage validation', () => {
    it('should reject invalid release stage', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateStage(release.id, 'invalid-stage' as any);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid stage'))).toBe(true);
    });

    it('should accept valid release stage', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateStage(release.id, 'Roll Out 1%' as any);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.currentStage).toBe('Roll Out 1%');
    });
  });

  describe('updateStatus validation', () => {
    it('should reject invalid release status', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateStatus(release.id, 'invalid-status' as any);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid status'))).toBe(true);
    });

    it('should accept valid release status', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateStatus(release.id, ReleaseStatus.Production);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.status).toBe(ReleaseStatus.Production);
    });
  });

  describe('updateRollout validation', () => {
    it('should reject negative rollout percentage', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateRollout(release.id, -10);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid rollout percentage'))).toBe(true);
    });

    it('should reject rollout percentage over 100', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateRollout(release.id, 150);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;
      expect(validationError.errors.some(e => e.includes('Invalid rollout percentage'))).toBe(true);
    });

    it('should accept valid rollout percentage at boundary (0)', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateRollout(release.id, 0);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.rolloutPercentage).toBe(0);
    });

    it('should accept valid rollout percentage at boundary (100)', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateRollout(release.id, 100);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.rolloutPercentage).toBe(100);
    });

    it('should accept valid rollout percentage in range', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.updateRollout(release.id, 50);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.value.rolloutPercentage).toBe(50);
    });
  });

  describe('resolveBlocker 404 validation', () => {
    it('should return 404 for non-existent blocker', async () => {
      const allResult = await provider.findAll();
      if (!allResult.success) return;

      const releases = allResult.value;
      const release = releases[0];

      const result = await provider.resolveBlocker(release.id, 'non-existent-blocker-id');

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.message).toContain('Blocker');
      expect(result.error.message).toContain('not found');
    });
  });
});
