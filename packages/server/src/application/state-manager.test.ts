/**
 * Tests for State Manager
 */

import { StateManager } from './state-manager';
import {
  Release,
  ReleaseStage,
  ReleaseStatus,
  Platform,
  Blocker,
  QualityMetrics,
  ITGCStatus
} from '../domain/types';
import { ValidationError } from '../common/errors';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  // Helper function to create a basic release
  const createRelease = (overrides: Partial<Release> = {}): Release => ({
    id: 'test-release-1',
    platform: Platform.iOS,
    status: ReleaseStatus.Current,
    currentStage: ReleaseStage.ReleaseBranching,
    version: '1.0.0',
    branchName: 'release/1.0.0',
    sourceType: 'github',
    repositoryUrl: 'https://github.com/test/repo',
    latestBuild: 'build-123',
    latestPassingBuild: 'build-123',
    latestAppStoreBuild: '',
    blockers: [],
    signOffs: [],
    rolloutPercentage: 0,
    itgcStatus: {
      compliant: true,
      rolloutComplete: false,
      details: 'All checks passing',
      lastCheckedAt: new Date()
    },
    distributions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
    ...overrides
  });

  describe('canTransitionTo', () => {
    it('should allow transition to next stage', () => {
      const release = createRelease({
        currentStage: ReleaseStage.ReleaseBranching
      });

      expect(stateManager.canTransitionTo(release, ReleaseStage.FinalReleaseCandidate)).toBe(true);
    });

    it('should not allow skipping stages', () => {
      const release = createRelease({
        currentStage: ReleaseStage.ReleaseBranching
      });

      expect(stateManager.canTransitionTo(release, ReleaseStage.SubmitForAppStoreReview)).toBe(false);
    });

    it('should not allow moving backwards', () => {
      const release = createRelease({
        currentStage: ReleaseStage.FinalReleaseCandidate
      });

      expect(stateManager.canTransitionTo(release, ReleaseStage.ReleaseBranching)).toBe(false);
    });

    it('should allow staying in the same stage', () => {
      const release = createRelease({
        currentStage: ReleaseStage.ReleaseBranching
      });

      expect(stateManager.canTransitionTo(release, ReleaseStage.ReleaseBranching)).toBe(true);
    });
  });

  describe('validateStateTransition', () => {
    it('should validate transition to FinalReleaseCandidate requires branch name', () => {
      const release = createRelease({
        currentStage: ReleaseStage.ReleaseBranching,
        branchName: ''
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.FinalReleaseCandidate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Branch name is required before moving to Final Release Candidate');
    });

    it('should validate transition to SubmitForAppStoreReview requires passing build', () => {
      const release = createRelease({
        currentStage: ReleaseStage.FinalReleaseCandidate,
        latestPassingBuild: '',
        signOffs: [{ squad: 'team1', approved: true }]
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.SubmitForAppStoreReview);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A passing build is required before submitting for App Store review');
    });

    it('should validate transition to SubmitForAppStoreReview requires all sign-offs', () => {
      const release = createRelease({
        currentStage: ReleaseStage.FinalReleaseCandidate,
        latestPassingBuild: 'build-123',
        signOffs: [
          { squad: 'team1', approved: true },
          { squad: 'team2', approved: false }
        ]
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.SubmitForAppStoreReview);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All required squads must sign off before submitting for App Store review');
    });

    it('should validate transition to SubmitForAppStoreReview requires no active blockers', () => {
      const blocker: Blocker = {
        id: 'blocker-1',
        title: 'Critical bug',
        description: 'Something is broken',
        severity: 'critical',
        createdAt: new Date()
      };

      const release = createRelease({
        currentStage: ReleaseStage.FinalReleaseCandidate,
        latestPassingBuild: 'build-123',
        signOffs: [{ squad: 'team1', approved: true }],
        blockers: [blocker]
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.SubmitForAppStoreReview);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot submit with 1 active blocker(s)');
    });

    it('should validate transition to RollOut1Percent requires app store build', () => {
      const release = createRelease({
        currentStage: ReleaseStage.SubmitForAppStoreReview,
        latestAppStoreBuild: ''
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.RollOut1Percent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('App Store build is required before starting rollout');
    });

    it('should validate transition to RollOut1Percent requires quality metrics', () => {
      const release = createRelease({
        currentStage: ReleaseStage.SubmitForAppStoreReview,
        latestAppStoreBuild: 'build-456',
        qualityMetrics: undefined
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.RollOut1Percent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quality metrics must be available before starting rollout');
    });

    it('should validate transition to RollOut100Percent requires quality metrics within thresholds', () => {
      const qualityMetrics: QualityMetrics = {
        crashRate: 5.0,
        cpuExceptionRate: 3.0,
        thresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 2.0
        },
        collectedAt: new Date()
      };

      const release = createRelease({
        currentStage: ReleaseStage.RollOut1Percent,
        qualityMetrics
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.RollOut100Percent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quality metrics exceed thresholds. Cannot proceed to full rollout');
    });

    it('should validate transition to RollOut100Percent requires no critical blockers', () => {
      const criticalBlocker: Blocker = {
        id: 'blocker-1',
        title: 'Critical production issue',
        description: 'Major bug found',
        severity: 'critical',
        createdAt: new Date()
      };

      const qualityMetrics: QualityMetrics = {
        crashRate: 1.0,
        cpuExceptionRate: 1.0,
        thresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 2.0
        },
        collectedAt: new Date()
      };

      const release = createRelease({
        currentStage: ReleaseStage.RollOut1Percent,
        qualityMetrics,
        blockers: [criticalBlocker]
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.RollOut100Percent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot rollout to 100% with 1 critical blocker(s)');
    });

    it('should allow valid transition with all requirements met', () => {
      const release = createRelease({
        currentStage: ReleaseStage.FinalReleaseCandidate,
        latestPassingBuild: 'build-123',
        signOffs: [
          { squad: 'team1', approved: true },
          { squad: 'team2', approved: true }
        ],
        blockers: []
      });

      const result = stateManager.validateStateTransition(release, ReleaseStage.SubmitForAppStoreReview);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('applyStateTransition', () => {
    it('should apply valid state transition', () => {
      const release = createRelease({
        currentStage: ReleaseStage.ReleaseBranching
      });

      const updated = stateManager.applyStateTransition(release, ReleaseStage.FinalReleaseCandidate);

      expect(updated.currentStage).toBe(ReleaseStage.FinalReleaseCandidate);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(release.updatedAt.getTime());
    });

    it('should throw ValidationError for invalid transition', () => {
      const release = createRelease({
        currentStage: ReleaseStage.ReleaseBranching
      });

      expect(() => {
        stateManager.applyStateTransition(release, ReleaseStage.SubmitForAppStoreReview);
      }).toThrow(ValidationError);
    });

    it('should set rollout percentage to 1 when transitioning to RollOut1Percent', () => {
      const qualityMetrics: QualityMetrics = {
        crashRate: 1.0,
        cpuExceptionRate: 1.0,
        thresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 2.0
        },
        collectedAt: new Date()
      };

      const release = createRelease({
        currentStage: ReleaseStage.SubmitForAppStoreReview,
        latestAppStoreBuild: 'build-456',
        qualityMetrics
      });

      const updated = stateManager.applyStateTransition(release, ReleaseStage.RollOut1Percent);

      expect(updated.rolloutPercentage).toBe(1);
    });

    it('should set rollout percentage to 100 and status to Production when transitioning to RollOut100Percent', () => {
      const qualityMetrics: QualityMetrics = {
        crashRate: 1.0,
        cpuExceptionRate: 1.0,
        thresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 2.0
        },
        collectedAt: new Date()
      };

      const release = createRelease({
        currentStage: ReleaseStage.RollOut1Percent,
        status: ReleaseStatus.Current,
        qualityMetrics
      });

      const updated = stateManager.applyStateTransition(release, ReleaseStage.RollOut100Percent);

      expect(updated.rolloutPercentage).toBe(100);
      expect(updated.status).toBe(ReleaseStatus.Production);
    });
  });

  describe('evaluateReleaseHealth', () => {
    it('should return healthy status when no issues', () => {
      const release = createRelease({
        blockers: [],
        qualityMetrics: {
          crashRate: 1.0,
          cpuExceptionRate: 1.0,
          thresholds: {
            crashRateThreshold: 2.0,
            cpuExceptionRateThreshold: 2.0
          },
          collectedAt: new Date()
        }
      });

      const health = stateManager.evaluateReleaseHealth(release);

      expect(health.overall).toBe('healthy');
      expect(health.blockerCount).toBe(0);
      expect(health.qualityIssues).toBe(false);
      expect(health.itgcIssues).toBe(false);
      expect(health.reasons).toContain('All checks passing');
    });

    it('should return blocked status with critical blockers', () => {
      const criticalBlocker: Blocker = {
        id: 'blocker-1',
        title: 'Critical bug',
        description: 'Something is broken',
        severity: 'critical',
        createdAt: new Date()
      };

      const release = createRelease({
        blockers: [criticalBlocker]
      });

      const health = stateManager.evaluateReleaseHealth(release);

      expect(health.overall).toBe('blocked');
      expect(health.blockerCount).toBe(1);
      expect(health.reasons).toContain('1 critical blocker(s)');
    });

    it('should return warning status with high severity blockers', () => {
      const highBlocker: Blocker = {
        id: 'blocker-1',
        title: 'High priority bug',
        description: 'Important issue',
        severity: 'high',
        createdAt: new Date()
      };

      const release = createRelease({
        blockers: [highBlocker]
      });

      const health = stateManager.evaluateReleaseHealth(release);

      expect(health.overall).toBe('warning');
      expect(health.blockerCount).toBe(1);
      expect(health.reasons).toContain('1 high severity blocker(s)');
    });

    it('should return warning status when quality metrics exceed thresholds', () => {
      const qualityMetrics: QualityMetrics = {
        crashRate: 5.0,
        cpuExceptionRate: 1.0,
        thresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 2.0
        },
        collectedAt: new Date()
      };

      const release = createRelease({
        qualityMetrics
      });

      const health = stateManager.evaluateReleaseHealth(release);

      expect(health.overall).toBe('warning');
      expect(health.qualityIssues).toBe(true);
      expect(health.reasons.some(r => r.includes('Crash rate'))).toBe(true);
    });

    it('should return warning status when ITGC is not compliant', () => {
      const itgcStatus: ITGCStatus = {
        compliant: false,
        rolloutComplete: false,
        details: 'Missing compliance checks',
        lastCheckedAt: new Date()
      };

      const release = createRelease({
        itgcStatus
      });

      const health = stateManager.evaluateReleaseHealth(release);

      expect(health.overall).toBe('warning');
      expect(health.itgcIssues).toBe(true);
      expect(health.reasons).toContain('ITGC compliance requirements not met');
    });

    it('should not count resolved blockers', () => {
      const resolvedBlocker: Blocker = {
        id: 'blocker-1',
        title: 'Fixed bug',
        description: 'Was broken, now fixed',
        severity: 'critical',
        createdAt: new Date(),
        resolvedAt: new Date()
      };

      const release = createRelease({
        blockers: [resolvedBlocker]
      });

      const health = stateManager.evaluateReleaseHealth(release);

      expect(health.overall).toBe('healthy');
      expect(health.blockerCount).toBe(0);
    });
  });

  describe('validateRolloutPercentage', () => {
    it('should accept valid rollout percentages', () => {
      const validPercentages = [0, 1, 10, 50, 100];

      validPercentages.forEach(percentage => {
        const result = stateManager.validateRolloutPercentage(percentage);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid rollout percentages', () => {
      const invalidPercentages = [5, 25, 75, 99, 101, -1];

      invalidPercentages.forEach(percentage => {
        const result = stateManager.validateRolloutPercentage(percentage);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});
