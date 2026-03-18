/**
 * Mock data generator for Release Manager Tool
 * Generates realistic release management data for demo and testing purposes
 */

import { 
  Platform, 
  Release, 
  ReleaseStage, 
  ReleaseStatus,
  SourceType,
  ITGCStatus,
  Blocker,
  BlockerSeverity,
  SignOff,
  Distribution,
  DistributionStatus,
  QualityMetrics,
  DAUStats
} from '../domain/types';
import { randomUUID } from 'crypto';

/**
 * Configuration for mock data generation
 */
export interface MockDataConfig {
  releaseCount: number;
  minBlockersPerRelease: number;
  signOffSquads: string[];
  platforms: Platform[];
}

/**
 * Generates mock release management data
 */
export class MockDataGenerator {
  private config: MockDataConfig;

  constructor(config?: Partial<MockDataConfig>) {
    this.config = {
      releaseCount: 10,
      minBlockersPerRelease: 2,
      signOffSquads: ['Backend', 'Frontend', 'Mobile', 'QA', 'Security'],
      platforms: [Platform.iOS, Platform.Android, Platform.Desktop],
      ...config
    };
  }

  /**
   * Generates an array of mock releases
   * @returns Array of Release objects
   */
  generateReleases(): Release[] {
    const releases: Release[] = [];
    
    // Generate releases for each platform
    for (const platform of this.config.platforms) {
      releases.push(...this.generatePlatformReleases(platform));
    }
    
    return releases;
  }

  /**
   * Generates 3-4 releases for a specific platform with varied stages and statuses
   * @param platform - The platform to generate releases for
   * @returns Array of Release objects for the platform
   */
  private generatePlatformReleases(platform: Platform): Release[] {
    const releases: Release[] = [];
    // Generate 3-4 releases per platform, ensuring at least 10 total across all platforms
    // With 3 platforms: 3+3+4=10 (minimum), 4+4+4=12 (maximum)
    const releaseCount = platform === Platform.Desktop ? 4 : 3 + Math.floor(Math.random() * 2);
    
    // Define stage and status combinations for variety
    const stageStatusCombos: Array<{ stage: ReleaseStage; status: ReleaseStatus; rollout: number }> = [
      { stage: ReleaseStage.ReleaseBranching, status: ReleaseStatus.Upcoming, rollout: 0 },
      { stage: ReleaseStage.FinalReleaseCandidate, status: ReleaseStatus.Current, rollout: 0 },
      { stage: ReleaseStage.SubmitForAppStoreReview, status: ReleaseStatus.Current, rollout: 0 },
      { stage: ReleaseStage.RollOut1Percent, status: ReleaseStatus.Production, rollout: 1 },
      { stage: ReleaseStage.RollOut100Percent, status: ReleaseStatus.Production, rollout: 100 },
    ];
    
    for (let i = 0; i < releaseCount; i++) {
      const combo = stageStatusCombos[i % stageStatusCombos.length];
      const versionMajor = 2;
      const versionMinor = 5 + i;
      const versionPatch = 0;
      const version = `${versionMajor}.${versionMinor}.${versionPatch}`;
      const branchName = `release/${version}`;
      
      // Determine repository URL based on platform
      const repoName = platform === Platform.iOS ? 'mobile-ios' : 
                       platform === Platform.Android ? 'mobile-android' : 
                       'desktop-app';
      const sourceType: SourceType = Math.random() > 0.5 ? 'github' : 'azure';
      const repositoryUrl = sourceType === 'github' 
        ? `https://github.com/company/${repoName}`
        : `https://dev.azure.com/company/project/_git/${repoName}`;
      
      // Generate build numbers
      const buildNumber = 1000 + i * 10;
      const latestBuild = `${buildNumber}`;
      const latestPassingBuild = `${buildNumber - 1}`;
      const latestAppStoreBuild = `${buildNumber - 2}`;
      
      // Generate timestamps
      const createdAt = new Date(Date.now() - (releaseCount - i) * 7 * 24 * 60 * 60 * 1000); // Stagger by weeks
      const updatedAt = new Date(Date.now() - (releaseCount - i) * 24 * 60 * 60 * 1000); // More recent updates
      const lastSyncedAt = new Date(Date.now() - Math.random() * 60 * 60 * 1000); // Within last hour
      
      const release: Release = {
        id: randomUUID(),
        platform,
        status: combo.status,
        currentStage: combo.stage,
        version,
        branchName,
        sourceType,
        repositoryUrl,
        latestBuild,
        latestPassingBuild,
        latestAppStoreBuild,
        blockers: this.generateBlockers(combo.stage),
        signOffs: this.generateSignOffs(),
        rolloutPercentage: combo.rollout,
        qualityMetrics: this.generateQualityMetrics(combo.stage),
        dauStats: this.generateDAUStats(combo.stage),
        distributions: this.generateDistributions(platform, combo.status),
        itgcStatus: this.generateITGCStatus(combo.stage),
        createdAt,
        updatedAt,
        lastSyncedAt
      };
      
      releases.push(release);
    }
    
    return releases;
  }

  /**
   * Generates blockers for a release based on its stage
   * Early-stage releases (Release Branching, Final Release Candidate) get 2+ blockers
   * @param stage - The current stage of the release
   * @returns Array of Blocker objects
   */
  private generateBlockers(stage: ReleaseStage): Blocker[] {
    // Only generate blockers for early-stage releases
    const earlyStages = [
      ReleaseStage.ReleaseBranching,
      ReleaseStage.FinalReleaseCandidate
    ];

    if (!earlyStages.includes(stage)) {
      return [];
    }

    const blockers: Blocker[] = [];
    const blockerCount = 2 + Math.floor(Math.random() * 2); // 2-3 blockers

    // Blocker templates with varied severity levels
    const blockerTemplates = [
      {
        title: 'Critical crash on app startup',
        description: 'Application crashes immediately after launch on iOS 16.0 devices. Stack trace indicates memory access violation in initialization code.',
        severity: 'critical' as BlockerSeverity,
        assignee: 'Sarah Chen',
        issueUrl: 'https://github.com/company/mobile-ios/issues/1234'
      },
      {
        title: 'High memory usage causing performance degradation',
        description: 'Memory consumption increases by 40% compared to previous release, causing slowdowns on devices with less than 4GB RAM.',
        severity: 'high' as BlockerSeverity,
        assignee: 'Michael Rodriguez',
        issueUrl: 'https://dev.azure.com/company/project/_workitems/edit/5678'
      },
      {
        title: 'API authentication fails intermittently',
        description: 'Users report intermittent authentication failures when accessing backend services. Appears to be related to token refresh logic.',
        severity: 'critical' as BlockerSeverity,
        assignee: 'Emily Watson',
        issueUrl: 'https://github.com/company/backend/issues/9012'
      },
      {
        title: 'UI rendering issue on tablet devices',
        description: 'Layout breaks on tablet screen sizes, causing overlapping elements in the dashboard view.',
        severity: 'medium' as BlockerSeverity,
        assignee: 'David Kim',
        issueUrl: 'https://github.com/company/mobile-android/issues/3456'
      },
      {
        title: 'Database migration fails on upgrade',
        description: 'Schema migration from v2.4 to v2.5 fails for users with large datasets, causing app to become unusable.',
        severity: 'critical' as BlockerSeverity,
        assignee: 'Jessica Martinez',
        issueUrl: 'https://dev.azure.com/company/project/_workitems/edit/7890'
      },
      {
        title: 'Localization strings missing for new features',
        description: 'Several new UI elements are not translated for German and French locales, showing English fallback text.',
        severity: 'medium' as BlockerSeverity,
        assignee: 'Thomas Mueller',
        issueUrl: 'https://github.com/company/mobile-ios/issues/2345'
      },
      {
        title: 'Network timeout on slow connections',
        description: 'API requests timeout after 5 seconds on 3G connections, preventing users from accessing core functionality.',
        severity: 'high' as BlockerSeverity,
        assignee: 'Aisha Patel',
        issueUrl: 'https://github.com/company/backend/issues/6789'
      }
    ];

    // Generate blockers with varied characteristics
    for (let i = 0; i < blockerCount; i++) {
      const template = blockerTemplates[i % blockerTemplates.length];
      const createdAt = new Date(Date.now() - (blockerCount - i) * 3 * 24 * 60 * 60 * 1000); // Stagger by 3 days

      // Some blockers are resolved (about 40% chance)
      const isResolved = Math.random() < 0.4;
      const resolvedAt = isResolved
        ? new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) // Resolved within 5 days
        : undefined;

      const blocker: Blocker = {
        id: randomUUID(),
        title: template.title,
        description: template.description,
        severity: template.severity,
        createdAt,
        resolvedAt,
        assignee: template.assignee,
        issueUrl: template.issueUrl
      };

      blockers.push(blocker);
    }

    return blockers;
  }

  /**
   * Generates sign-offs for a release with mixed approval states
   * Generates 3+ sign-offs from different squads (Backend, Frontend, Mobile, QA, Security)
   * Approved sign-offs include approvedBy, approvedAt, and comments
   * @returns Array of SignOff objects
   */
  private generateSignOffs(): SignOff[] {
    const signOffs: SignOff[] = [];
    
    // Use at least 3 squads, up to all configured squads
    const squadCount = Math.max(3, Math.floor(Math.random() * this.config.signOffSquads.length) + 3);
    const selectedSquads = this.config.signOffSquads.slice(0, Math.min(squadCount, this.config.signOffSquads.length));
    
    // Approver names for variety
    const approvers = [
      'Alex Johnson',
      'Maria Garcia',
      'James Wilson',
      'Priya Sharma',
      'Robert Taylor',
      'Lisa Anderson',
      'Mohammed Ali',
      'Sophie Martin'
    ];
    
    // Comment templates for approved sign-offs
    const commentTemplates = [
      'All tests passing, code review completed. Approved for release.',
      'Security audit completed successfully. No vulnerabilities found.',
      'Performance benchmarks meet requirements. Ready to proceed.',
      'QA testing completed with no critical issues. Minor bugs documented for next release.',
      'Backend services are stable and ready for production deployment.',
      'Frontend changes reviewed and tested across all supported browsers.',
      'Mobile build tested on all target devices. No issues found.',
      'Integration tests passing. API contracts validated.',
      'Load testing completed successfully. System handles expected traffic.',
      'Accessibility requirements verified. WCAG 2.1 AA compliance confirmed.'
    ];
    
    for (let i = 0; i < selectedSquads.length; i++) {
      const squad = selectedSquads[i];
      
      // Mix of approved and not approved (about 60% approved)
      const approved = Math.random() < 0.6;
      
      const signOff: SignOff = {
        squad,
        approved
      };
      
      // If approved, add approvedBy, approvedAt, and comments
      if (approved) {
        const approver = approvers[i % approvers.length];
        const comment = commentTemplates[i % commentTemplates.length];
        const approvedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last week
        
        signOff.approvedBy = approver;
        signOff.approvedAt = approvedAt;
        signOff.comments = comment;
      }
      
      signOffs.push(signOff);
    }
    
    return signOffs;
  }


    /**
     * Generates distribution channels for a release based on platform and status
     * Generates 2+ platform-appropriate channels with status progression
     * Production releases have at least one live distribution
     * @param platform - The platform of the release
     * @param status - The status of the release
     * @returns Array of Distribution objects
     */
    private generateDistributions(platform: Platform, status: ReleaseStatus): Distribution[] {
      const distributions: Distribution[] = [];

      // Define platform-specific distribution channels
      const channelsByPlatform: Record<Platform, string[]> = {
        [Platform.iOS]: ['App Store', 'TestFlight'],
        [Platform.Android]: ['Google Play', 'Internal Testing'],
        [Platform.Desktop]: ['Microsoft Store', 'Direct Download']
      };

      const channels = channelsByPlatform[platform];

      // Generate 2+ distributions per release
      const distributionCount = Math.min(channels.length, 2 + Math.floor(Math.random() * 2)); // 2-3 distributions

      // Status progression: pending → submitted → approved → live
      const statusProgression: DistributionStatus[] = ['pending', 'submitted', 'approved', 'live'];

      for (let i = 0; i < distributionCount; i++) {
        const channel = channels[i];

        // Determine status based on release status and progression
        let distributionStatus: DistributionStatus;

        if (status === ReleaseStatus.Production) {
          // Production releases should have at least one live distribution
          // First distribution is always live, others can be in various states
          if (i === 0) {
            distributionStatus = 'live';
          } else {
            // Other distributions can be in any state, with bias towards live/approved
            const rand = Math.random();
            if (rand < 0.5) {
              distributionStatus = 'live';
            } else if (rand < 0.75) {
              distributionStatus = 'approved';
            } else if (rand < 0.9) {
              distributionStatus = 'submitted';
            } else {
              distributionStatus = 'pending';
            }
          }
        } else if (status === ReleaseStatus.Current) {
          // Current releases are typically in submitted or approved state
          const rand = Math.random();
          if (rand < 0.4) {
            distributionStatus = 'approved';
          } else if (rand < 0.7) {
            distributionStatus = 'submitted';
          } else {
            distributionStatus = 'pending';
          }
        } else {
          // Upcoming releases are typically in pending or submitted state
          const rand = Math.random();
          if (rand < 0.6) {
            distributionStatus = 'pending';
          } else {
            distributionStatus = 'submitted';
          }
        }

        // Generate realistic updatedAt timestamp
        // More recent for later stages in progression
        const statusIndex = statusProgression.indexOf(distributionStatus);
        const daysAgo = Math.max(1, 7 - statusIndex * 2); // More recent for later stages
        const updatedAt = new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);

        const distribution: Distribution = {
          channel,
          status: distributionStatus,
          updatedAt
        };

        distributions.push(distribution);
      }

      return distributions;
    }
    /**
     * Generates quality metrics for releases in rollout stages
     * Only generates metrics for Roll Out stages (Roll Out 1%, Roll Out 100%, etc.)
     * @param stage - The current stage of the release
     * @returns QualityMetrics object or undefined if not a rollout stage
     */
    private generateQualityMetrics(stage: ReleaseStage): QualityMetrics | undefined {
      // Only generate quality metrics for rollout stages
      const rolloutStages = [
        ReleaseStage.RollOut1Percent,
        ReleaseStage.RollOut100Percent
      ];

      if (!rolloutStages.includes(stage)) {
        return undefined;
      }

      // Generate crash rate between 0.0 and 5.0
      // Use a distribution that creates some releases above threshold (2.0) and some below
      // About 40% of releases will exceed the threshold
      const crashRate = Math.random() < 0.4
        ? 2.0 + Math.random() * 3.0  // Above threshold: 2.0-5.0
        : Math.random() * 2.0;        // Below threshold: 0.0-2.0

      // Generate CPU exception rate between 0.0 and 3.0
      // About 40% of releases will exceed the threshold (1.5)
      const cpuExceptionRate = Math.random() < 0.4
        ? 1.5 + Math.random() * 1.5  // Above threshold: 1.5-3.0
        : Math.random() * 1.5;        // Below threshold: 0.0-1.5

      // Fixed thresholds as per requirements
      const thresholds = {
        crashRateThreshold: 2.0,
        cpuExceptionRateThreshold: 1.5
      };

      // Generate realistic collectedAt timestamp (within last 24 hours)
      const collectedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

      return {
        crashRate: parseFloat(crashRate.toFixed(2)),  // Round to 2 decimal places
        cpuExceptionRate: parseFloat(cpuExceptionRate.toFixed(2)),  // Round to 2 decimal places
        thresholds,
        collectedAt
      };
    }
    /**
     * Generates DAU (Daily Active Users) statistics for releases in rollout stages
     * Only generates DAU stats for Roll Out stages (Roll Out 1%, Roll Out 100%, etc.)
     * @param stage - The current stage of the release
     * @returns DAUStats object or undefined if not a rollout stage
     */
    private generateDAUStats(stage: ReleaseStage): DAUStats | undefined {
      // Only generate DAU statistics for rollout stages
      const rolloutStages = [
        ReleaseStage.RollOut1Percent,
        ReleaseStage.RollOut100Percent
      ];

      if (!rolloutStages.includes(stage)) {
        return undefined;
      }

      // Generate trend array with at least 7 data points
      const trendLength = 7 + Math.floor(Math.random() * 4); // 7-10 data points
      const trend: number[] = [];

      // Determine if this will be an increasing or decreasing trend (50/50 chance)
      const isIncreasing = Math.random() < 0.5;

      // Generate trend data points
      // Start with a base value and apply incremental changes
      const baseValue = Math.floor(10000 + Math.random() * 990000);

      for (let i = 0; i < trendLength; i++) {
        let value: number;

        if (isIncreasing) {
          // Increasing trend: each day has more users than the previous
          // Apply a growth factor between 1.05 and 1.15 (5-15% growth per day)
          const growthFactor = 1.05 + Math.random() * 0.10;
          value = Math.floor(baseValue * Math.pow(growthFactor, i));
        } else {
          // Decreasing trend: each day has fewer users than the previous
          // Apply a decline factor between 0.85 and 0.95 (5-15% decline per day)
          const declineFactor = 0.85 + Math.random() * 0.10;
          value = Math.floor(baseValue * Math.pow(declineFactor, i));
        }

        // Ensure value stays within valid range (10,000 - 1,000,000)
        value = Math.max(10000, Math.min(1000000, value));

        trend.push(value);
      }

      // The current dailyActiveUsers should be the most recent value in the trend
      const currentDAU = trend[trend.length - 1];

      // Generate realistic collectedAt timestamp (within last 24 hours)
      const collectedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

      return {
        dailyActiveUsers: currentDAU,
        trend,
        collectedAt
      };
    }

  /**
   * Generates ITGC (IT General Controls) status for a release
   * Generates mixed compliant states with rolloutComplete true only for Roll Out 100%
   * @param stage - The current stage of the release
   * @returns ITGCStatus object
   */
  private generateITGCStatus(stage: ReleaseStage): ITGCStatus {
    // Generate mixed compliant states (about 70% compliant)
    const compliant = Math.random() < 0.7;

    // rolloutComplete is true only for Roll Out 100% stage
    const rolloutComplete = stage === ReleaseStage.RollOut100Percent;

    // Generate descriptive details text based on stage and compliance
    let details: string;

    if (rolloutComplete) {
      if (compliant) {
        details = 'Release fully rolled out and compliant with ITGC requirements. All security controls verified and documented.';
      } else {
        details = 'Release fully rolled out but non-compliant with ITGC requirements. Post-deployment audit required.';
      }
    } else {
      // For non-100% rollout stages
      if (compliant) {
        const stageDescriptions: Record<string, string> = {
          [ReleaseStage.ReleaseBranching]: 'Release branching completed. Initial ITGC compliance checks passed.',
          [ReleaseStage.FinalReleaseCandidate]: 'Final release candidate ready. Pre-deployment ITGC audit completed successfully.',
          [ReleaseStage.SubmitForAppStoreReview]: 'Submitted for app store review. ITGC compliance documentation prepared.',
          [ReleaseStage.RollOut1Percent]: 'Limited rollout in progress (1%). ITGC monitoring active, compliance checks ongoing.'
        };
        details = stageDescriptions[stage] || 'Release in progress, compliance checks ongoing.';
      } else {
        const nonCompliantDescriptions: Record<string, string> = {
          [ReleaseStage.ReleaseBranching]: 'Release branching in progress. ITGC compliance issues identified, remediation required.',
          [ReleaseStage.FinalReleaseCandidate]: 'Final release candidate pending. ITGC audit findings must be addressed before deployment.',
          [ReleaseStage.SubmitForAppStoreReview]: 'App store submission pending ITGC compliance resolution.',
          [ReleaseStage.RollOut1Percent]: 'Limited rollout paused. ITGC compliance violations detected, investigation underway.'
        };
        details = nonCompliantDescriptions[stage] || 'Release in progress, ITGC compliance issues under review.';
      }
    }

    // Generate realistic lastCheckedAt timestamp (within last 24 hours)
    const lastCheckedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

    return {
      compliant,
      rolloutComplete,
      details,
      lastCheckedAt
    };
  }

}
