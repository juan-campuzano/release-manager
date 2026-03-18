/**
 * State Manager for release state transitions and validation
 * Handles release stage progression and health evaluation
 */

import {
  Release,
  ReleaseStage,
  ReleaseStatus,
  Blocker,
  QualityMetrics
} from '../domain/types';
import { ValidationError } from '../common/errors';

/**
 * Validation result for state transitions
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Health status assessment for a release
 */
export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'blocked';
  reasons: string[];
  blockerCount: number;
  qualityIssues: boolean;
  itgcIssues: boolean;
}

/**
 * State Manager class for managing release state transitions
 */
export class StateManager {
  /**
   * Define the valid stage progression order
   */
  private readonly stageOrder: ReleaseStage[] = [
    ReleaseStage.ReleaseBranching,
    ReleaseStage.FinalReleaseCandidate,
    ReleaseStage.SubmitForAppStoreReview,
    ReleaseStage.RollOut1Percent,
    ReleaseStage.RollOut100Percent
  ];

  /**
   * Valid rollout percentages
   */
  private readonly validRolloutPercentages = [0, 1, 10, 50, 100];

  /**
   * Check if a release can transition to a new stage
   */
  canTransitionTo(release: Release, newStage: ReleaseStage): boolean {
    const validation = this.validateStateTransition(release, newStage);
    return validation.valid;
  }

  /**
   * Validate a state transition and return detailed validation result
   */
  validateStateTransition(release: Release, newStage: ReleaseStage): ValidationResult {
    const errors: string[] = [];

    // Check if the new stage is in the valid progression order
    const currentIndex = this.stageOrder.indexOf(release.currentStage);
    const newIndex = this.stageOrder.indexOf(newStage);

    if (currentIndex === -1) {
      errors.push(`Invalid current stage: ${release.currentStage}`);
    }

    if (newIndex === -1) {
      errors.push(`Invalid target stage: ${newStage}`);
    }

    // Can only move forward or stay in the same stage
    if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex) {
      errors.push(`Cannot move backwards from ${release.currentStage} to ${newStage}`);
    }

    // Cannot skip stages
    if (currentIndex !== -1 && newIndex !== -1 && newIndex > currentIndex + 1) {
      errors.push(`Cannot skip stages. Must progress through: ${this.stageOrder[currentIndex + 1]}`);
    }

    // Stage-specific validation rules
    switch (newStage) {
      case ReleaseStage.FinalReleaseCandidate:
        // Must have a branch created
        if (!release.branchName) {
          errors.push('Branch name is required before moving to Final Release Candidate');
        }
        break;

      case ReleaseStage.SubmitForAppStoreReview:
        // Must have a passing build
        if (!release.latestPassingBuild) {
          errors.push('A passing build is required before submitting for App Store review');
        }
        // Must have all squad sign-offs
        const allApproved = release.signOffs.every(signOff => signOff.approved);
        if (!allApproved) {
          errors.push('All required squads must sign off before submitting for App Store review');
        }
        // Must have no active blockers
        const activeBlockers = this.getActiveBlockers(release.blockers);
        if (activeBlockers.length > 0) {
          errors.push(`Cannot submit with ${activeBlockers.length} active blocker(s)`);
        }
        break;

      case ReleaseStage.RollOut1Percent:
        // Must have app store build
        if (!release.latestAppStoreBuild) {
          errors.push('App Store build is required before starting rollout');
        }
        // Must have quality metrics
        if (!release.qualityMetrics) {
          errors.push('Quality metrics must be available before starting rollout');
        }
        break;

      case ReleaseStage.RollOut100Percent:
        // Must have been at 1% rollout first
        if (release.currentStage !== ReleaseStage.RollOut1Percent) {
          errors.push('Must complete 1% rollout before moving to 100%');
        }
        // Quality metrics must be within thresholds
        if (release.qualityMetrics) {
          const metricsValid = this.validateQualityMetrics(release.qualityMetrics);
          if (!metricsValid) {
            errors.push('Quality metrics exceed thresholds. Cannot proceed to full rollout');
          }
        }
        // Must have no critical blockers
        const criticalBlockers = this.getActiveBlockers(release.blockers)
          .filter(b => b.severity === 'critical');
        if (criticalBlockers.length > 0) {
          errors.push(`Cannot rollout to 100% with ${criticalBlockers.length} critical blocker(s)`);
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply a state transition to a release
   * Returns a new release object with the updated stage
   */
  applyStateTransition(release: Release, newStage: ReleaseStage): Release {
    // Validate the transition first
    const validation = this.validateStateTransition(release, newStage);
    if (!validation.valid) {
      throw new ValidationError(
        `Invalid state transition from ${release.currentStage} to ${newStage}`,
        validation.errors
      );
    }

    // Create updated release with new stage
    const updatedRelease: Release = {
      ...release,
      currentStage: newStage,
      updatedAt: new Date()
    };

    // Update rollout percentage based on stage
    if (newStage === ReleaseStage.RollOut1Percent) {
      updatedRelease.rolloutPercentage = 1;
    } else if (newStage === ReleaseStage.RollOut100Percent) {
      updatedRelease.rolloutPercentage = 100;
      // Transition to Production status when fully deployed
      updatedRelease.status = ReleaseStatus.Production;
    }

    return updatedRelease;
  }

  /**
   * Evaluate the overall health status of a release
   */
  evaluateReleaseHealth(release: Release): HealthStatus {
    const reasons: string[] = [];
    let overall: 'healthy' | 'warning' | 'blocked' = 'healthy';

    // Check for active blockers
    const activeBlockers = this.getActiveBlockers(release.blockers);
    const criticalBlockers = activeBlockers.filter(b => b.severity === 'critical');
    const highBlockers = activeBlockers.filter(b => b.severity === 'high');

    if (criticalBlockers.length > 0) {
      overall = 'blocked';
      reasons.push(`${criticalBlockers.length} critical blocker(s)`);
    } else if (highBlockers.length > 0) {
      overall = 'warning';
      reasons.push(`${highBlockers.length} high severity blocker(s)`);
    } else if (activeBlockers.length > 0) {
      overall = 'warning';
      reasons.push(`${activeBlockers.length} medium severity blocker(s)`);
    }

    // Check quality metrics
    let qualityIssues = false;
    if (release.qualityMetrics) {
      const metricsValid = this.validateQualityMetrics(release.qualityMetrics);
      if (!metricsValid) {
        qualityIssues = true;
        if (overall === 'healthy') overall = 'warning';
        
        const { crashRate, cpuExceptionRate, thresholds } = release.qualityMetrics;
        if (crashRate > thresholds.crashRateThreshold) {
          reasons.push(`Crash rate (${crashRate.toFixed(2)}%) exceeds threshold (${thresholds.crashRateThreshold}%)`);
        }
        if (cpuExceptionRate > thresholds.cpuExceptionRateThreshold) {
          reasons.push(`CPU exception rate (${cpuExceptionRate.toFixed(2)}%) exceeds threshold (${thresholds.cpuExceptionRateThreshold}%)`);
        }
      }
    }

    // Check ITGC compliance
    let itgcIssues = false;
    if (!release.itgcStatus.compliant) {
      itgcIssues = true;
      if (overall === 'healthy') overall = 'warning';
      reasons.push('ITGC compliance requirements not met');
    }

    // If no issues found, add positive message
    if (reasons.length === 0) {
      reasons.push('All checks passing');
    }

    return {
      overall,
      reasons,
      blockerCount: activeBlockers.length,
      qualityIssues,
      itgcIssues
    };
  }

  /**
   * Validate rollout percentage value
   */
  validateRolloutPercentage(percentage: number): ValidationResult {
    const errors: string[] = [];

    if (!this.validRolloutPercentages.includes(percentage)) {
      errors.push(
        `Invalid rollout percentage: ${percentage}. Must be one of: ${this.validRolloutPercentages.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get active (unresolved) blockers
   */
  private getActiveBlockers(blockers: Blocker[]): Blocker[] {
    return blockers.filter(blocker => !blocker.resolvedAt);
  }

  /**
   * Validate quality metrics against thresholds
   */
  private validateQualityMetrics(metrics: QualityMetrics): boolean {
    return (
      metrics.crashRate <= metrics.thresholds.crashRateThreshold &&
      metrics.cpuExceptionRate <= metrics.thresholds.cpuExceptionRateThreshold
    );
  }
}
