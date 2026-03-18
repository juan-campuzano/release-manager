/**
 * Integration tests for API endpoints in mock mode
 * Tests all GET and POST/PATCH endpoints with MockDataProvider
 */

// Mock external dependencies
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getBranch: jest.fn(),
        listTags: jest.fn(),
        getCommit: jest.fn()
      }
    }
  }))
}));

jest.mock('azure-devops-node-api', () => ({
  WebApi: jest.fn().mockImplementation(() => ({
    getGitApi: jest.fn()
  }))
}));

jest.mock('../data/database-config', () => ({
  createConnection: jest.fn().mockReturnValue({}),
  getDefaultConfig: jest.fn().mockReturnValue({})
}));

jest.mock('../integration/metrics-collector', () => {
  return {
    MetricsCollector: jest.fn().mockImplementation(() => ({
      authenticate: jest.fn().mockResolvedValue({ success: true }),
      getCrashRate: jest.fn().mockResolvedValue({ success: true, value: 0.5 }),
      getCPUExceptionRate: jest.fn().mockResolvedValue({ success: true, value: 0.3 }),
      getDAUData: jest.fn().mockResolvedValue({
        success: true,
        value: {
          dailyActiveUsers: 50000,
          trend: [48000, 49000, 49500, 50000, 50500, 51000, 50000],
          collectedAt: new Date()
        }
      })
    }))
  };
});

import { initializeServices, Services } from '../services';
import { Platform, ReleaseStage, ReleaseStatus } from '../domain/types';

describe('Mock Mode API Integration Tests', () => {
  let services: Services;
  let originalEnv: string | undefined;

  beforeAll(() => {
    // Save original environment variable
    originalEnv = process.env.USE_MOCK_DATA;
    // Enable mock mode
    process.env.USE_MOCK_DATA = 'true';
    // Initialize services in mock mode
    services = initializeServices();
  });

  afterAll(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.USE_MOCK_DATA = originalEnv;
    } else {
      delete process.env.USE_MOCK_DATA;
    }
  });

  describe('Task 12.1: GET Endpoints', () => {
    let testReleaseId: string;

    beforeAll(async () => {
      // Get a release ID from the mock data for testing
      const result = await services.releaseManager.getActiveReleases();
      if (result.success && result.value.length > 0) {
        testReleaseId = result.value[0].id;
      }
    });

    test('GET /api/releases returns mock data', async () => {
      const result = await services.releaseManager.getActiveReleases();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        expect(result.value.length).toBeGreaterThan(0);
        // Verify it contains releases from different platforms
        const platforms = new Set(result.value.map(r => r.platform));
        expect(platforms.size).toBeGreaterThan(1);
      }
    });

    test('GET /api/releases with platform filter returns filtered mock data', async () => {
      const result = await services.releaseManager.getActiveReleases(Platform.iOS);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        // All releases should be iOS
        result.value.forEach(release => {
          expect(release.platform).toBe(Platform.iOS);
        });
      }
    });

    test('GET /api/releases/:id returns mock release details', async () => {
      const result = await services.releaseManager.getRelease(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBe(testReleaseId);
        expect(result.value).toHaveProperty('platform');
        expect(result.value).toHaveProperty('version');
        expect(result.value).toHaveProperty('status');
        expect(result.value).toHaveProperty('currentStage');
      }
    });

    test('GET /api/releases/:id/blockers returns mock blockers', async () => {
      const result = await services.releaseManager.getBlockers(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        // Verify blocker structure if any exist
        if (result.value.length > 0) {
          const blocker = result.value[0];
          expect(blocker).toHaveProperty('id');
          expect(blocker).toHaveProperty('title');
          expect(blocker).toHaveProperty('severity');
        }
      }
    });

    test('GET /api/releases/:id/signoffs returns mock sign-offs', async () => {
      const result = await services.releaseManager.getSignOffStatus(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('allApproved');
        expect(result.value).toHaveProperty('requiredSquads');
        expect(result.value).toHaveProperty('approvedSquads');
        expect(result.value).toHaveProperty('pendingSquads');
        expect(result.value.requiredSquads).toBeInstanceOf(Array);
      }
      
      // Also verify we can get the release with its sign-offs
      const releaseResult = await services.releaseManager.getRelease(testReleaseId);
      expect(releaseResult.success).toBe(true);
      if (releaseResult.success) {
        expect(releaseResult.value.signOffs).toBeInstanceOf(Array);
        if (releaseResult.value.signOffs.length > 0) {
          const signOff = releaseResult.value.signOffs[0];
          expect(signOff).toHaveProperty('squad');
          expect(signOff).toHaveProperty('approved');
        }
      }
    });

    test('GET /api/releases/:id/distributions returns mock distributions', async () => {
      const result = await services.releaseManager.getDistributions(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        // Verify distribution structure if any exist
        if (result.value.length > 0) {
          const distribution = result.value[0];
          expect(distribution).toHaveProperty('channel');
          expect(distribution).toHaveProperty('status');
        }
      }
    });

    test('GET /api/metrics/:releaseId/quality returns mock quality metrics', async () => {
      const result = await services.metricsAggregator.collectQualityMetrics(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success && result.value) {
        expect(result.value).toHaveProperty('crashRate');
        expect(result.value).toHaveProperty('cpuExceptionRate');
        expect(result.value).toHaveProperty('collectedAt');
      }
    });

    test('GET /api/metrics/:releaseId/dau returns mock DAU statistics', async () => {
      const result = await services.metricsAggregator.collectDAUStatistics(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success && result.value) {
        expect(result.value).toHaveProperty('dailyActiveUsers');
        expect(result.value).toHaveProperty('trend');
        expect(result.value.trend).toBeInstanceOf(Array);
      }
    });

    test('GET /api/metrics/:releaseId/rollout returns mock rollout percentage', async () => {
      const result = await services.metricsAggregator.getRolloutPercentage(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('number');
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
      }
    });

    test('GET /api/releases/:id/itgc returns mock ITGC status', async () => {
      const result = await services.releaseManager.getITGCStatus(testReleaseId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('compliant');
        expect(result.value).toHaveProperty('rolloutComplete');
        expect(result.value).toHaveProperty('details');
        expect(result.value).toHaveProperty('lastCheckedAt');
      }
    });

    test('GET /api/releases/history returns mock history', async () => {
      const result = await services.releaseManager.getReleaseHistory({});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    test('GET /api/releases/history with status filter returns filtered history', async () => {
      const result = await services.releaseManager.getReleaseHistory({
        status: ReleaseStatus.Production
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        // All releases should have Production status
        result.value.forEach(release => {
          expect(release.status).toBe(ReleaseStatus.Production);
        });
      }
    });
  });

  describe('Task 12.2: POST/PATCH Endpoints', () => {
    let createdReleaseId: string;

    test('POST /api/releases creates mock release', async () => {
      const newRelease = {
        platform: Platform.iOS,
        version: '99.0.0',
        branchName: 'release/99.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github' as const,
        requiredSquads: ['mobile', 'qa'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const result = await services.releaseManager.createRelease(newRelease);
      
      expect(result.success).toBe(true);
      if (result.success) {
        createdReleaseId = result.value.id;
        expect(result.value.platform).toBe(Platform.iOS);
        expect(result.value.version).toBe('99.0.0');
        expect(result.value.branchName).toBe('release/99.0.0');
        
        // Verify persistence - should be retrievable
        const getResult = await services.releaseManager.getRelease(createdReleaseId);
        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.value.id).toBe(createdReleaseId);
        }
      }
    });

    test('POST /api/releases/:id/blockers adds blocker', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const blocker = {
        title: 'Test blocker',
        description: 'Test blocker description',
        severity: 'high' as const,
        assignee: 'test@example.com'
      };

      const result = await services.releaseManager.addBlocker(releaseId, blocker);
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the blocker was added
        const blockersResult = await services.releaseManager.getBlockers(releaseId);
        expect(blockersResult.success).toBe(true);
        if (blockersResult.success) {
          const addedBlocker = blockersResult.value.find(b => b.title === 'Test blocker');
          expect(addedBlocker).toBeDefined();
          expect(addedBlocker?.description).toBe('Test blocker description');
        }
      }
    });

    test('PATCH /api/releases/:id/blockers/:blockerId/resolve resolves blocker', async () => {
      // Get an existing release with blockers
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const blockersResult = await services.releaseManager.getBlockers(releaseId);
      expect(blockersResult.success).toBe(true);
      if (!blockersResult.success || blockersResult.value.length === 0) return;
      
      const blockerId = blockersResult.value[0].id;
      const result = await services.releaseManager.resolveBlocker(releaseId, blockerId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the blocker was resolved
        const updatedBlockersResult = await services.releaseManager.getBlockers(releaseId);
        expect(updatedBlockersResult.success).toBe(true);
        if (updatedBlockersResult.success) {
          const resolvedBlocker = updatedBlockersResult.value.find(b => b.id === blockerId);
          expect(resolvedBlocker?.resolvedAt).toBeDefined();
        }
      }
    });

    test('POST /api/releases/:id/signoffs updates sign-off', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      
      // Get the release to find an existing squad
      const releaseResult = await services.releaseManager.getRelease(releaseId);
      expect(releaseResult.success).toBe(true);
      if (!releaseResult.success || releaseResult.value.signOffs.length === 0) return;
      
      // Use an existing squad from the release
      const existingSquad = releaseResult.value.signOffs[0].squad;
      
      const result = await services.releaseManager.recordSignOff(
        releaseId,
        existingSquad,
        'test@example.com',
        'Approved for testing'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the sign-off was updated
        const updatedReleaseResult = await services.releaseManager.getRelease(releaseId);
        expect(updatedReleaseResult.success).toBe(true);
        if (updatedReleaseResult.success) {
          const signOff = updatedReleaseResult.value.signOffs.find(s => s.squad === existingSquad);
          expect(signOff).toBeDefined();
          expect(signOff?.approved).toBe(true);
          expect(signOff?.approvedBy).toBe('test@example.com');
        }
      }
    });

    test('PATCH /api/releases/:id/stage updates mock data', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const newStage = ReleaseStage.FinalReleaseCandidate;
      
      const result = await services.releaseManager.updateReleaseStage(releaseId, newStage);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.currentStage).toBe(newStage);
        
        // Verify persistence
        const getResult = await services.releaseManager.getRelease(releaseId);
        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.value.currentStage).toBe(newStage);
        }
      }
    });

    test('PATCH /api/releases/:id/status updates mock data', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const newStatus = ReleaseStatus.Current;
      
      const result = await services.releaseManager.updateReleaseStatus(releaseId, newStatus);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status).toBe(newStatus);
        
        // Verify persistence
        const getResult = await services.releaseManager.getRelease(releaseId);
        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.value.status).toBe(newStatus);
        }
      }
    });

    test('PATCH /api/releases/:id/rollout updates mock data', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const newPercentage = 50; // Use a valid rollout percentage (0, 1, 10, 50, or 100)
      
      const result = await services.releaseManager.updateRolloutPercentage(releaseId, newPercentage);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.rolloutPercentage).toBe(newPercentage);
        
        // Verify persistence
        const getResult = await services.releaseManager.getRelease(releaseId);
        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.value.rolloutPercentage).toBe(newPercentage);
        }
      }
    });

    test('POST /api/releases/:id/distributions adds distribution', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const result = await services.releaseManager.addDistributionChannel(
        releaseId,
        'Test Channel',
        'pending'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the distribution was added
        const distResult = await services.releaseManager.getDistributions(releaseId);
        expect(distResult.success).toBe(true);
        if (distResult.success) {
          const distribution = distResult.value.find(d => d.channel === 'Test Channel');
          expect(distribution).toBeDefined();
          expect(distribution?.status).toBe('pending');
        }
      }
    });

    test('PATCH /api/releases/:id/distributions/:channel updates distribution', async () => {
      // Get an existing release with distributions
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const distResult = await services.releaseManager.getDistributions(releaseId);
      expect(distResult.success).toBe(true);
      if (!distResult.success || distResult.value.length === 0) return;
      
      const channel = distResult.value[0].channel;
      const newStatus = 'approved';
      
      const result = await services.releaseManager.updateDistributionStatus(
        releaseId,
        channel,
        newStatus
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the distribution was updated
        const updatedDistResult = await services.releaseManager.getDistributions(releaseId);
        expect(updatedDistResult.success).toBe(true);
        if (updatedDistResult.success) {
          const distribution = updatedDistResult.value.find(d => d.channel === channel);
          expect(distribution?.status).toBe(newStatus);
        }
      }
    });

    test('PATCH /api/releases/:id/itgc updates ITGC status', async () => {
      // Get an existing release
      const releasesResult = await services.releaseManager.getActiveReleases();
      expect(releasesResult.success).toBe(true);
      if (!releasesResult.success || releasesResult.value.length === 0) return;
      
      const releaseId = releasesResult.value[0].id;
      const result = await services.releaseManager.updateITGCStatus(
        releaseId,
        true,
        false,
        'Test ITGC update'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the ITGC status was updated
        const itgcResult = await services.releaseManager.getITGCStatus(releaseId);
        expect(itgcResult.success).toBe(true);
        if (itgcResult.success) {
          expect(itgcResult.value.compliant).toBe(true);
          expect(itgcResult.value.rolloutComplete).toBe(false);
          expect(itgcResult.value.details).toBe('Test ITGC update');
        }
      }
    });
  });
});
