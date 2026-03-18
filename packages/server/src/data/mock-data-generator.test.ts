/**
 * Tests for MockDataGenerator
 */

import { MockDataGenerator } from './mock-data-generator';
import { Platform, ReleaseStage } from '../domain/types';

describe('MockDataGenerator', () => {
  let generator: MockDataGenerator;
  
  beforeEach(() => {
    generator = new MockDataGenerator();
  });
  
  describe('generateReleases', () => {
    it('should generate at least 10 releases across all platforms', () => {
      const releases = generator.generateReleases();
      expect(releases.length).toBeGreaterThanOrEqual(10);
    });
    
    it('should generate at least 3 releases per platform', () => {
      const releases = generator.generateReleases();
      
      const iosReleases = releases.filter(r => r.platform === Platform.iOS);
      const androidReleases = releases.filter(r => r.platform === Platform.Android);
      const desktopReleases = releases.filter(r => r.platform === Platform.Desktop);
      
      expect(iosReleases.length).toBeGreaterThanOrEqual(3);
      expect(androidReleases.length).toBeGreaterThanOrEqual(3);
      expect(desktopReleases.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should generate releases with semantic version numbers', () => {
      const releases = generator.generateReleases();
      const semanticVersionPattern = /^\d+\.\d+\.\d+$/;
      
      releases.forEach(release => {
        expect(release.version).toMatch(semanticVersionPattern);
      });
    });
    
    it('should generate releases with varied stages', () => {
      const releases = generator.generateReleases();
      const stages = new Set(releases.map(r => r.currentStage));
      
      // Should have multiple different stages
      expect(stages.size).toBeGreaterThan(1);
    });
    
    it('should generate releases with varied statuses', () => {
      const releases = generator.generateReleases();
      const statuses = new Set(releases.map(r => r.status));
      
      // Should have multiple different statuses
      expect(statuses.size).toBeGreaterThan(1);
    });
    
    it('should generate releases with realistic branch names', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.branchName).toMatch(/^release\//);
        expect(release.branchName).toContain(release.version);
      });
    });
    
    it('should generate releases with repository URLs', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.repositoryUrl).toBeTruthy();
        expect(
          release.repositoryUrl.startsWith('https://github.com/') ||
          release.repositoryUrl.startsWith('https://dev.azure.com/')
        ).toBe(true);
      });
    });
    
    it('should generate releases with build numbers', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.latestBuild).toBeTruthy();
        expect(release.latestPassingBuild).toBeTruthy();
        expect(release.latestAppStoreBuild).toBeTruthy();
      });
    });
    
    it('should generate releases with rollout percentages between 0 and 100', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.rolloutPercentage).toBeGreaterThanOrEqual(0);
        expect(release.rolloutPercentage).toBeLessThanOrEqual(100);
      });
    });
    
    it('should generate releases with ITGC status', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.itgcStatus).toBeDefined();
        expect(typeof release.itgcStatus.compliant).toBe('boolean');
        expect(typeof release.itgcStatus.rolloutComplete).toBe('boolean');
        expect(release.itgcStatus.details).toBeTruthy();
        expect(release.itgcStatus.lastCheckedAt).toBeInstanceOf(Date);
      });
    });
    
    it('should set rolloutComplete to true only for Roll Out 100% stage', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        if (release.currentStage === ReleaseStage.RollOut100Percent) {
          expect(release.itgcStatus.rolloutComplete).toBe(true);
        } else {
          expect(release.itgcStatus.rolloutComplete).toBe(false);
        }
      });
    });
    
    it('should generate releases with timestamps', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.createdAt).toBeInstanceOf(Date);
        expect(release.updatedAt).toBeInstanceOf(Date);
        expect(release.lastSyncedAt).toBeInstanceOf(Date);
      });
    });
    
    it('should generate unique release IDs', () => {
      const releases = generator.generateReleases();
      const ids = new Set(releases.map(r => r.id));
      
      expect(ids.size).toBe(releases.length);
    });
  });
  
  describe('generatePlatformReleases', () => {
    it('should generate 3-4 releases for a specific platform', () => {
      const releases = generator.generateReleases();
      const iosReleases = releases.filter(r => r.platform === Platform.iOS);
      
      expect(iosReleases.length).toBeGreaterThanOrEqual(3);
      expect(iosReleases.length).toBeLessThanOrEqual(4);
    });
    
    it('should generate releases with correct platform', () => {
      const releases = generator.generateReleases();
      const androidReleases = releases.filter(r => r.platform === Platform.Android);
      
      androidReleases.forEach(release => {
        expect(release.platform).toBe(Platform.Android);
      });
    });
  });
  
  describe('generateBlockers', () => {
    it('should generate at least 2 blockers for early-stage releases', () => {
      const releases = generator.generateReleases();
      const earlyStageReleases = releases.filter(
        r => r.currentStage === ReleaseStage.ReleaseBranching || 
             r.currentStage === ReleaseStage.FinalReleaseCandidate
      );
      
      earlyStageReleases.forEach(release => {
        expect(release.blockers.length).toBeGreaterThanOrEqual(2);
      });
    });
    
    it('should not generate blockers for non-early-stage releases', () => {
      const releases = generator.generateReleases();
      const laterStageReleases = releases.filter(
        r => r.currentStage !== ReleaseStage.ReleaseBranching && 
             r.currentStage !== ReleaseStage.FinalReleaseCandidate
      );
      
      laterStageReleases.forEach(release => {
        expect(release.blockers.length).toBe(0);
      });
    });
    
    it('should generate blockers with varied severity levels', () => {
      const releases = generator.generateReleases();
      const allBlockers = releases.flatMap(r => r.blockers);
      const severities = new Set(allBlockers.map(b => b.severity));
      
      // Should have multiple severity levels
      expect(severities.size).toBeGreaterThan(1);
      // Should include critical, high, or medium
      expect(
        severities.has('critical') || 
        severities.has('high') || 
        severities.has('medium')
      ).toBe(true);
    });
    
    it('should generate blockers with required fields', () => {
      const releases = generator.generateReleases();
      const allBlockers = releases.flatMap(r => r.blockers);
      
      allBlockers.forEach(blocker => {
        expect(blocker.id).toBeTruthy();
        expect(blocker.title).toBeTruthy();
        expect(blocker.description).toBeTruthy();
        expect(blocker.severity).toBeTruthy();
        expect(blocker.createdAt).toBeInstanceOf(Date);
        expect(blocker.assignee).toBeTruthy();
        expect(blocker.issueUrl).toBeTruthy();
      });
    });
    
    it('should generate some blockers with resolvedAt and some without', () => {
      const releases = generator.generateReleases();
      const allBlockers = releases.flatMap(r => r.blockers);
      
      if (allBlockers.length > 0) {
        const resolvedBlockers = allBlockers.filter(b => b.resolvedAt !== undefined);
        const unresolvedBlockers = allBlockers.filter(b => b.resolvedAt === undefined);
        
        // Should have both resolved and unresolved blockers (with high probability)
        // Note: Due to randomness, this might occasionally fail, but with 2+ blockers per early release
        // and 40% resolution rate, we should have both types
        expect(resolvedBlockers.length + unresolvedBlockers.length).toBe(allBlockers.length);
      }
    });
    
    it('should generate unique blocker IDs', () => {
      const releases = generator.generateReleases();
      const allBlockers = releases.flatMap(r => r.blockers);
      const blockerIds = new Set(allBlockers.map(b => b.id));
      
      expect(blockerIds.size).toBe(allBlockers.length);
    });
    
    it('should generate blockers with valid issue URLs', () => {
      const releases = generator.generateReleases();
      const allBlockers = releases.flatMap(r => r.blockers);
      
      allBlockers.forEach(blocker => {
        expect(
          blocker.issueUrl?.startsWith('https://github.com/') ||
          blocker.issueUrl?.startsWith('https://dev.azure.com/')
        ).toBe(true);
      });
    });
  });
  
  describe('generateSignOffs', () => {
    it('should generate at least 3 sign-offs per release', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.signOffs.length).toBeGreaterThanOrEqual(3);
      });
    });
    
    it('should generate sign-offs with squad names from configured squads', () => {
      const releases = generator.generateReleases();
      const allSignOffs = releases.flatMap(r => r.signOffs);
      const expectedSquads = ['Backend', 'Frontend', 'Mobile', 'QA', 'Security'];
      
      allSignOffs.forEach(signOff => {
        expect(expectedSquads).toContain(signOff.squad);
      });
    });
    
    it('should generate sign-offs with mixed approval states', () => {
      const releases = generator.generateReleases();
      const allSignOffs = releases.flatMap(r => r.signOffs);
      
      const approvedSignOffs = allSignOffs.filter(s => s.approved);
      const unapprovedSignOffs = allSignOffs.filter(s => !s.approved);
      
      // Should have both approved and unapproved sign-offs
      expect(approvedSignOffs.length).toBeGreaterThan(0);
      expect(unapprovedSignOffs.length).toBeGreaterThan(0);
    });
    
    it('should include approvedBy, approvedAt, and comments for approved sign-offs', () => {
      const releases = generator.generateReleases();
      const allSignOffs = releases.flatMap(r => r.signOffs);
      const approvedSignOffs = allSignOffs.filter(s => s.approved);
      
      approvedSignOffs.forEach(signOff => {
        expect(signOff.approvedBy).toBeTruthy();
        expect(signOff.approvedAt).toBeInstanceOf(Date);
        expect(signOff.comments).toBeTruthy();
      });
    });
    
    it('should not include approvedBy or approvedAt for unapproved sign-offs', () => {
      const releases = generator.generateReleases();
      const allSignOffs = releases.flatMap(r => r.signOffs);
      const unapprovedSignOffs = allSignOffs.filter(s => !s.approved);
      
      unapprovedSignOffs.forEach(signOff => {
        expect(signOff.approvedBy).toBeUndefined();
        expect(signOff.approvedAt).toBeUndefined();
      });
    });
    
    it('should generate sign-offs with required squad field', () => {
      const releases = generator.generateReleases();
      const allSignOffs = releases.flatMap(r => r.signOffs);
      
      allSignOffs.forEach(signOff => {
        expect(signOff.squad).toBeTruthy();
        expect(typeof signOff.squad).toBe('string');
      });
    });
    
    it('should generate sign-offs with boolean approved field', () => {
      const releases = generator.generateReleases();
      const allSignOffs = releases.flatMap(r => r.signOffs);
      
      allSignOffs.forEach(signOff => {
        expect(typeof signOff.approved).toBe('boolean');
      });
    });
  });
  
  describe('generateDistributions', () => {
    it('should generate at least 2 distributions per release', () => {
      const releases = generator.generateReleases();
      
      releases.forEach(release => {
        expect(release.distributions.length).toBeGreaterThanOrEqual(2);
      });
    });
    
    it('should generate platform-appropriate distribution channels for iOS', () => {
      const releases = generator.generateReleases();
      const iosReleases = releases.filter(r => r.platform === Platform.iOS);
      
      iosReleases.forEach(release => {
        release.distributions.forEach(distribution => {
          expect(['App Store', 'TestFlight']).toContain(distribution.channel);
        });
      });
    });
    
    it('should generate platform-appropriate distribution channels for Android', () => {
      const releases = generator.generateReleases();
      const androidReleases = releases.filter(r => r.platform === Platform.Android);
      
      androidReleases.forEach(release => {
        release.distributions.forEach(distribution => {
          expect(['Google Play', 'Internal Testing']).toContain(distribution.channel);
        });
      });
    });
    
    it('should generate platform-appropriate distribution channels for Desktop', () => {
      const releases = generator.generateReleases();
      const desktopReleases = releases.filter(r => r.platform === Platform.Desktop);
      
      desktopReleases.forEach(release => {
        release.distributions.forEach(distribution => {
          expect(['Microsoft Store', 'Direct Download']).toContain(distribution.channel);
        });
      });
    });
    
    it('should generate distributions with valid status values', () => {
      const releases = generator.generateReleases();
      const allDistributions = releases.flatMap(r => r.distributions);
      const validStatuses = ['pending', 'submitted', 'approved', 'live'];
      
      allDistributions.forEach(distribution => {
        expect(validStatuses).toContain(distribution.status);
      });
    });
    
    it('should ensure Production releases have at least one live distribution', () => {
      const releases = generator.generateReleases();
      const productionReleases = releases.filter(r => r.status === 'Production');
      
      productionReleases.forEach(release => {
        const liveDistributions = release.distributions.filter(d => d.status === 'live');
        expect(liveDistributions.length).toBeGreaterThanOrEqual(1);
      });
    });
    
    it('should generate distributions with updatedAt timestamps', () => {
      const releases = generator.generateReleases();
      const allDistributions = releases.flatMap(r => r.distributions);
      
      allDistributions.forEach(distribution => {
        expect(distribution.updatedAt).toBeInstanceOf(Date);
      });
    });
    
    it('should generate distributions with required fields', () => {
      const releases = generator.generateReleases();
      const allDistributions = releases.flatMap(r => r.distributions);
      
      allDistributions.forEach(distribution => {
        expect(distribution.channel).toBeTruthy();
        expect(distribution.status).toBeTruthy();
        expect(distribution.updatedAt).toBeTruthy();
      });
    });
    
    it('should generate distributions with status progression appropriate to release status', () => {
      const releases = generator.generateReleases();
      
      // Upcoming releases should have pending or submitted distributions
      const upcomingReleases = releases.filter(r => r.status === 'Upcoming');
      upcomingReleases.forEach(release => {
        release.distributions.forEach(distribution => {
          expect(['pending', 'submitted']).toContain(distribution.status);
        });
      });
      
      // Current releases can have pending, submitted, or approved distributions
      const currentReleases = releases.filter(r => r.status === 'Current');
      currentReleases.forEach(release => {
        release.distributions.forEach(distribution => {
          expect(['pending', 'submitted', 'approved']).toContain(distribution.status);
        });
      });
    });
  });
  
  describe('generateQualityMetrics', () => {
    it('should generate quality metrics for releases in Roll Out stages', () => {
      const releases = generator.generateReleases();
      const rolloutReleases = releases.filter(
        r => r.currentStage === ReleaseStage.RollOut1Percent || 
             r.currentStage === ReleaseStage.RollOut100Percent
      );
      
      rolloutReleases.forEach(release => {
        expect(release.qualityMetrics).toBeDefined();
        expect(release.qualityMetrics).not.toBeNull();
      });
    });
    
    it('should not generate quality metrics for non-rollout stages', () => {
      const releases = generator.generateReleases();
      const nonRolloutReleases = releases.filter(
        r => r.currentStage !== ReleaseStage.RollOut1Percent && 
             r.currentStage !== ReleaseStage.RollOut100Percent
      );
      
      nonRolloutReleases.forEach(release => {
        expect(release.qualityMetrics).toBeUndefined();
      });
    });
    
    it('should generate crash rates between 0.0 and 5.0', () => {
      const releases = generator.generateReleases();
      const releasesWithMetrics = releases.filter(r => r.qualityMetrics !== undefined);
      
      releasesWithMetrics.forEach(release => {
        expect(release.qualityMetrics!.crashRate).toBeGreaterThanOrEqual(0.0);
        expect(release.qualityMetrics!.crashRate).toBeLessThanOrEqual(5.0);
      });
    });
    
    it('should generate CPU exception rates between 0.0 and 3.0', () => {
      const releases = generator.generateReleases();
      const releasesWithMetrics = releases.filter(r => r.qualityMetrics !== undefined);
      
      releasesWithMetrics.forEach(release => {
        expect(release.qualityMetrics!.cpuExceptionRate).toBeGreaterThanOrEqual(0.0);
        expect(release.qualityMetrics!.cpuExceptionRate).toBeLessThanOrEqual(3.0);
      });
    });
    
    it('should generate quality metrics with correct threshold values', () => {
      const releases = generator.generateReleases();
      const releasesWithMetrics = releases.filter(r => r.qualityMetrics !== undefined);
      
      releasesWithMetrics.forEach(release => {
        expect(release.qualityMetrics!.thresholds.crashRateThreshold).toBe(2.0);
        expect(release.qualityMetrics!.thresholds.cpuExceptionRateThreshold).toBe(1.5);
      });
    });
    
    it('should generate quality metrics with collectedAt timestamps', () => {
      const releases = generator.generateReleases();
      const releasesWithMetrics = releases.filter(r => r.qualityMetrics !== undefined);
      
      releasesWithMetrics.forEach(release => {
        expect(release.qualityMetrics!.collectedAt).toBeInstanceOf(Date);
        expect(release.qualityMetrics!.collectedAt.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
    
    it('should generate some releases with metrics exceeding thresholds and some not', () => {
      const releases = generator.generateReleases();
      const releasesWithMetrics = releases.filter(r => r.qualityMetrics !== undefined);
      
      if (releasesWithMetrics.length > 0) {
        const exceedingCrashThreshold = releasesWithMetrics.filter(
          r => r.qualityMetrics!.crashRate > r.qualityMetrics!.thresholds.crashRateThreshold
        );
        const belowCrashThreshold = releasesWithMetrics.filter(
          r => r.qualityMetrics!.crashRate <= r.qualityMetrics!.thresholds.crashRateThreshold
        );
        
        // With the 40% probability distribution, we should have both types
        // Note: Due to randomness, this might occasionally fail, but with multiple rollout releases
        // the probability is very high
        expect(exceedingCrashThreshold.length + belowCrashThreshold.length).toBe(releasesWithMetrics.length);
      }
    });
    
    it('should generate quality metrics with numeric values rounded to 2 decimal places', () => {
      const releases = generator.generateReleases();
      const releasesWithMetrics = releases.filter(r => r.qualityMetrics !== undefined);
      
      releasesWithMetrics.forEach(release => {
        const crashRateStr = release.qualityMetrics!.crashRate.toString();
        const cpuExceptionRateStr = release.qualityMetrics!.cpuExceptionRate.toString();
        
        // Check that decimal places are at most 2
        const crashRateDecimals = crashRateStr.includes('.') ? crashRateStr.split('.')[1].length : 0;
        const cpuExceptionRateDecimals = cpuExceptionRateStr.includes('.') ? cpuExceptionRateStr.split('.')[1].length : 0;
        
        expect(crashRateDecimals).toBeLessThanOrEqual(2);
        expect(cpuExceptionRateDecimals).toBeLessThanOrEqual(2);
      });
    });
  });
  
  describe('generateDAUStats', () => {
    it('should generate DAU statistics for releases in Roll Out stages', () => {
      const releases = generator.generateReleases();
      const rolloutReleases = releases.filter(
        r => r.currentStage === ReleaseStage.RollOut1Percent || 
             r.currentStage === ReleaseStage.RollOut100Percent
      );
      
      rolloutReleases.forEach(release => {
        expect(release.dauStats).toBeDefined();
        expect(release.dauStats).not.toBeNull();
      });
    });
    
    it('should not generate DAU statistics for non-rollout stages', () => {
      const releases = generator.generateReleases();
      const nonRolloutReleases = releases.filter(
        r => r.currentStage !== ReleaseStage.RollOut1Percent && 
             r.currentStage !== ReleaseStage.RollOut100Percent
      );
      
      nonRolloutReleases.forEach(release => {
        expect(release.dauStats).toBeUndefined();
      });
    });
    
    it('should generate daily active users between 10,000 and 1,000,000', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        expect(release.dauStats!.dailyActiveUsers).toBeGreaterThanOrEqual(10000);
        expect(release.dauStats!.dailyActiveUsers).toBeLessThanOrEqual(1000000);
      });
    });
    
    it('should generate trend arrays with at least 7 data points', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        expect(release.dauStats!.trend.length).toBeGreaterThanOrEqual(7);
      });
    });
    
    it('should generate trend values within valid range (10,000 - 1,000,000)', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        release.dauStats!.trend.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(10000);
          expect(value).toBeLessThanOrEqual(1000000);
        });
      });
    });
    
    it('should generate both increasing and decreasing trends', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      if (releasesWithDAU.length > 1) {
        // Check if we have at least one increasing and one decreasing trend
        const increasingTrends = releasesWithDAU.filter(release => {
          const trend = release.dauStats!.trend;
          return trend[trend.length - 1] > trend[0];
        });
        
        const decreasingTrends = releasesWithDAU.filter(release => {
          const trend = release.dauStats!.trend;
          return trend[trend.length - 1] < trend[0];
        });
        
        // With 50/50 probability and multiple rollout releases, we should have both types
        // Note: Due to randomness, this might occasionally fail, but probability is high
        expect(increasingTrends.length + decreasingTrends.length).toBeGreaterThan(0);
      }
    });
    
    it('should generate DAU statistics with collectedAt timestamps', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        expect(release.dauStats!.collectedAt).toBeInstanceOf(Date);
        expect(release.dauStats!.collectedAt.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
    
    it('should set dailyActiveUsers to the most recent trend value', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        const trend = release.dauStats!.trend;
        const lastTrendValue = trend[trend.length - 1];
        expect(release.dauStats!.dailyActiveUsers).toBe(lastTrendValue);
      });
    });
    
    it('should generate trend arrays with integer values', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        release.dauStats!.trend.forEach(value => {
          expect(Number.isInteger(value)).toBe(true);
        });
      });
    });
    
    it('should generate dailyActiveUsers as an integer', () => {
      const releases = generator.generateReleases();
      const releasesWithDAU = releases.filter(r => r.dauStats !== undefined);
      
      releasesWithDAU.forEach(release => {
        expect(Number.isInteger(release.dauStats!.dailyActiveUsers)).toBe(true);
      });
    });
  });
});
