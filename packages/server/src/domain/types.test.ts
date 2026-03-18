/**
 * Basic tests for domain types
 */

import {
  Platform,
  ReleaseStatus,
  ReleaseStage,
  Release,
  Blocker,
  SignOff,
  QualityMetrics,
  ReleaseConfiguration
} from './types';

describe('Domain Types', () => {
  describe('Platform enum', () => {
    it('should have iOS, Android, and Desktop values', () => {
      expect(Platform.iOS).toBe('iOS');
      expect(Platform.Android).toBe('Android');
      expect(Platform.Desktop).toBe('Desktop');
    });
  });

  describe('ReleaseStatus enum', () => {
    it('should have Upcoming, Current, and Production values', () => {
      expect(ReleaseStatus.Upcoming).toBe('Upcoming');
      expect(ReleaseStatus.Current).toBe('Current');
      expect(ReleaseStatus.Production).toBe('Production');
    });
  });

  describe('ReleaseStage enum', () => {
    it('should have all pipeline stages', () => {
      expect(ReleaseStage.ReleaseBranching).toBe('Release Branching');
      expect(ReleaseStage.FinalReleaseCandidate).toBe('Final Release Candidate');
      expect(ReleaseStage.SubmitForAppStoreReview).toBe('Submit For App Store Review');
      expect(ReleaseStage.RollOut1Percent).toBe('Roll Out 1%');
      expect(ReleaseStage.RollOut100Percent).toBe('Roll Out 100%');
    });
  });

  describe('Release interface', () => {
    it('should create a valid release object', () => {
      const release: Release = {
        id: 'release-1',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.ReleaseBranching,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github',
        repositoryUrl: 'https://github.com/org/repo',
        latestBuild: 'build-123',
        latestPassingBuild: 'build-122',
        latestAppStoreBuild: 'build-120',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        itgcStatus: {
          compliant: true,
          rolloutComplete: false,
          details: 'All checks passed',
          lastCheckedAt: new Date()
        },
        distributions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      expect(release.platform).toBe(Platform.iOS);
      expect(release.status).toBe(ReleaseStatus.Current);
      expect(release.version).toBe('1.0.0');
    });
  });

  describe('Blocker interface', () => {
    it('should create a valid blocker object', () => {
      const blocker: Blocker = {
        id: 'blocker-1',
        title: 'Critical bug in authentication',
        description: 'Users cannot log in',
        severity: 'critical',
        createdAt: new Date(),
        assignee: 'john.doe@example.com'
      };

      expect(blocker.severity).toBe('critical');
      expect(blocker.title).toBe('Critical bug in authentication');
    });
  });

  describe('SignOff interface', () => {
    it('should create a valid sign-off object', () => {
      const signOff: SignOff = {
        squad: 'Backend Team',
        approved: true,
        approvedBy: 'jane.smith@example.com',
        approvedAt: new Date(),
        comments: 'All tests passing'
      };

      expect(signOff.approved).toBe(true);
      expect(signOff.squad).toBe('Backend Team');
    });
  });

  describe('QualityMetrics interface', () => {
    it('should create a valid quality metrics object', () => {
      const metrics: QualityMetrics = {
        crashRate: 0.5,
        cpuExceptionRate: 0.3,
        thresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 0.5
        },
        collectedAt: new Date()
      };

      expect(metrics.crashRate).toBe(0.5);
      expect(metrics.cpuExceptionRate).toBe(0.3);
    });
  });

  describe('ReleaseConfiguration interface', () => {
    it('should create a valid configuration object', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.Android,
        version: '2.0.0',
        branchName: 'release/2.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Backend Team', 'Frontend Team', 'QA Team'],
        qualityThresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 0.5
        },
        rolloutStages: [1, 10, 50, 100],
        ciPipelineId: 'pipeline-123'
      };

      expect(config.platform).toBe(Platform.Android);
      expect(config.requiredSquads).toHaveLength(3);
      expect(config.rolloutStages).toEqual([1, 10, 50, 100]);
    });
  });
});
