/**
 * Tests for Release Manager Service
 */

import { ReleaseManagerService } from './release-manager';
import { ReleaseStore } from '../data/release-store';
import { HistoryStore } from '../data/history-store';
import { StateManager } from './state-manager';
import { JSONConfigParser } from './config-parser';
import { InMemoryDatabase } from '../data/database-config';
import {
  Platform,
  ReleaseStatus,
  ReleaseStage,
  ReleaseConfiguration
} from '../domain/types';

describe('ReleaseManagerService', () => {
  let service: ReleaseManagerService;
  let releaseStore: ReleaseStore;
  let historyStore: HistoryStore;
  let stateManager: StateManager;
  let configParser: JSONConfigParser;
  let db: InMemoryDatabase;

  beforeEach(() => {
    // Create fresh instances for each test
    db = new InMemoryDatabase();
    releaseStore = new ReleaseStore({ connection: db });
    historyStore = new HistoryStore({ connection: db });
    stateManager = new StateManager();
    configParser = new JSONConfigParser();

    service = new ReleaseManagerService({
      releaseStore,
      historyStore,
      stateManager,
      configParser
    });
  });

  describe('createRelease', () => {
    it('should create a new release from valid configuration', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend', 'Frontend', 'QA'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const result = await service.createRelease(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.platform).toBe(Platform.iOS);
        expect(result.value.version).toBe('1.0.0');
        expect(result.value.status).toBe(ReleaseStatus.Upcoming);
        expect(result.value.currentStage).toBe(ReleaseStage.ReleaseBranching);
        expect(result.value.signOffs).toHaveLength(3);
        expect(result.value.signOffs.every(s => !s.approved)).toBe(true);
      }
    });

    it('should fail with invalid configuration', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '', // Invalid: empty version
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: [],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const result = await service.createRelease(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('ValidationError');
      }
    });
  });

  describe('updateReleaseStage', () => {
    it('should update release stage when transition is valid', async () => {
      // Create a release
      const config: ReleaseConfiguration = {
        platform: Platform.Android,
        version: '2.0.0',
        branchName: 'release/2.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      // Update to next stage
      const updateResult = await service.updateReleaseStage(
        releaseId,
        ReleaseStage.FinalReleaseCandidate
      );

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.value.currentStage).toBe(ReleaseStage.FinalReleaseCandidate);
      }
    });

    it('should fail when transition is invalid', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.Desktop,
        version: '3.0.0',
        branchName: 'release/3.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      // Try to skip stages
      const updateResult = await service.updateReleaseStage(
        releaseId,
        ReleaseStage.RollOut1Percent
      );

      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        expect(updateResult.error.name).toBe('ValidationError');
      }
    });
  });

  describe('blocker management', () => {
    it('should add a blocker to a release', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const addResult = await service.addBlocker(releaseId, {
        title: 'Critical bug in login',
        description: 'Users cannot log in',
        severity: 'critical',
        assignee: 'john@example.com'
      });

      expect(addResult.success).toBe(true);
      if (addResult.success) {
        expect(addResult.value.blockers).toHaveLength(1);
        expect(addResult.value.blockers[0].title).toBe('Critical bug in login');
        expect(addResult.value.blockers[0].resolvedAt).toBeUndefined();
      }
    });

    it('should resolve a blocker', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const addResult = await service.addBlocker(releaseId, {
        title: 'Bug',
        description: 'Test bug',
        severity: 'high'
      });

      expect(addResult.success).toBe(true);
      if (!addResult.success) return;

      const blockerId = addResult.value.blockers[0].id;

      const resolveResult = await service.resolveBlocker(releaseId, blockerId);

      expect(resolveResult.success).toBe(true);
      if (resolveResult.success) {
        expect(resolveResult.value.blockers[0].resolvedAt).toBeDefined();
      }
    });

    it('should get all blockers for a release', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      await service.addBlocker(releaseId, {
        title: 'Bug 1',
        description: 'Test',
        severity: 'high'
      });

      await service.addBlocker(releaseId, {
        title: 'Bug 2',
        description: 'Test',
        severity: 'medium'
      });

      const blockersResult = await service.getBlockers(releaseId);

      expect(blockersResult.success).toBe(true);
      if (blockersResult.success) {
        expect(blockersResult.value).toHaveLength(2);
      }
    });
  });

  describe('squad sign-off', () => {
    it('should record a squad sign-off', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend', 'Frontend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const signOffResult = await service.recordSignOff(
        releaseId,
        'Backend',
        'alice@example.com',
        'Looks good'
      );

      expect(signOffResult.success).toBe(true);
      if (signOffResult.success) {
        const backendSignOff = signOffResult.value.signOffs.find(s => s.squad === 'Backend');
        expect(backendSignOff?.approved).toBe(true);
        expect(backendSignOff?.approvedBy).toBe('alice@example.com');
        expect(backendSignOff?.comments).toBe('Looks good');
      }
    });

    it('should get sign-off status', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend', 'Frontend', 'QA'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      await service.recordSignOff(releaseId, 'Backend');
      await service.recordSignOff(releaseId, 'Frontend');

      const statusResult = await service.getSignOffStatus(releaseId);

      expect(statusResult.success).toBe(true);
      if (statusResult.success) {
        expect(statusResult.value.allApproved).toBe(false);
        expect(statusResult.value.approvedSquads).toEqual(['Backend', 'Frontend']);
        expect(statusResult.value.pendingSquads).toEqual(['QA']);
      }
    });
  });

  describe('rollout control', () => {
    it('should update rollout percentage with valid value', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const updateResult = await service.updateRolloutPercentage(releaseId, 10);

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.value.rolloutPercentage).toBe(10);
      }
    });

    it('should fail with invalid rollout percentage', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const updateResult = await service.updateRolloutPercentage(releaseId, 25);

      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        expect(updateResult.error.name).toBe('ValidationError');
      }
    });
  });

  describe('distribution tracking', () => {
    it('should add a distribution channel', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const addResult = await service.addDistributionChannel(releaseId, 'App Store', 'pending');

      expect(addResult.success).toBe(true);
      if (addResult.success) {
        expect(addResult.value.distributions).toHaveLength(1);
        expect(addResult.value.distributions[0].channel).toBe('App Store');
        expect(addResult.value.distributions[0].status).toBe('pending');
      }
    });

    it('should update distribution status', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      await service.addDistributionChannel(releaseId, 'App Store', 'pending');
      const updateResult = await service.updateDistributionStatus(releaseId, 'App Store', 'live');

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.value.distributions[0].status).toBe('live');
      }
    });

    it('should maintain independent status per channel', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      await service.addDistributionChannel(releaseId, 'App Store', 'pending');
      await service.addDistributionChannel(releaseId, 'TestFlight', 'pending');
      await service.updateDistributionStatus(releaseId, 'App Store', 'live');

      const distributionsResult = await service.getDistributions(releaseId);

      expect(distributionsResult.success).toBe(true);
      if (distributionsResult.success) {
        const appStore = distributionsResult.value.find(d => d.channel === 'App Store');
        const testFlight = distributionsResult.value.find(d => d.channel === 'TestFlight');
        
        expect(appStore?.status).toBe('live');
        expect(testFlight?.status).toBe('pending');
      }
    });
  });

  describe('ITGC status tracking', () => {
    it('should update ITGC status', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      const updateResult = await service.updateITGCStatus(
        releaseId,
        true,
        true,
        'All compliance checks passed'
      );

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.value.itgcStatus.compliant).toBe(true);
        expect(updateResult.value.itgcStatus.rolloutComplete).toBe(true);
        expect(updateResult.value.itgcStatus.details).toBe('All compliance checks passed');
      }
    });

    it('should show warning when not compliant', async () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const createResult = await service.createRelease(config);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const releaseId = createResult.value.id;

      await service.updateITGCStatus(releaseId, false, false, 'Missing documentation');

      const warningResult = await service.shouldShowITGCWarning(releaseId);

      expect(warningResult.success).toBe(true);
      if (warningResult.success) {
        expect(warningResult.value).toBe(true);
      }
    });
  });

  describe('query operations', () => {
    it('should get active releases without filter', async () => {
      const config1: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const config2: ReleaseConfiguration = {
        platform: Platform.Android,
        version: '2.0.0',
        branchName: 'release/2.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      await service.createRelease(config1);
      await service.createRelease(config2);

      const result = await service.getActiveReleases();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should filter releases by platform', async () => {
      const config1: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const config2: ReleaseConfiguration = {
        platform: Platform.Android,
        version: '2.0.0',
        branchName: 'release/2.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['Backend'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.5
        },
        rolloutStages: [1, 10, 50, 100]
      };

      await service.createRelease(config1);
      await service.createRelease(config2);

      const result = await service.getActiveReleases(Platform.iOS);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].platform).toBe(Platform.iOS);
      }
    });
  });
});
