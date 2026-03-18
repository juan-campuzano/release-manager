/**
 * EventIcon component
 *
 * Displays a visual icon indicator for each release event type
 * with color coding based on event type, severity, and status.
 *
 * Requirements: 3.1, 3.4, 4.1, 4.3, 4.4, 5.1, 5.4, 6.1, 7.1, 7.3, 8.1, 8.4, 9.3, 15.3, 15.6
 */

import type { EventType } from '../types/releaseEvent';
import type { BlockerSeverity, DistributionStatus, ReleaseStage } from '../types';
import styles from './EventIcon.module.css';

export interface EventIconProps {
  type: EventType;
  severity?: BlockerSeverity;
  status?: DistributionStatus;
  stage?: ReleaseStage;
  compliant?: boolean;
  className?: string;
}

/** Map event types to their SVG icon and default aria-label */
const iconConfig: Record<EventType, { icon: string; label: string }> = {
  release_created: { icon: '🚀', label: 'Release created' },
  stage_change: { icon: '→', label: 'Stage change' },
  blocker_added: { icon: '⚠', label: 'Blocker added' },
  blocker_resolved: { icon: '✓', label: 'Blocker resolved' },
  signoff_recorded: { icon: '✔', label: 'Sign-off recorded' },
  rollout_updated: { icon: '%', label: 'Rollout updated' },
  distribution_updated: { icon: '🏪', label: 'Distribution updated' },
  itgc_updated: { icon: '🛡', label: 'ITGC updated' },
};

/** Map event type to its base CSS class */
const typeClassMap: Record<EventType, string> = {
  release_created: styles.releaseCreated,
  stage_change: styles.stageChange,
  blocker_added: styles.blockerAdded,
  blocker_resolved: styles.blockerResolved,
  signoff_recorded: styles.signoffRecorded,
  rollout_updated: styles.rolloutUpdated,
  distribution_updated: styles.distributionUpdated,
  itgc_updated: styles.itgcUpdated,
};

/** Get stage-specific color class */
function getStageClass(stage?: ReleaseStage): string | undefined {
  if (!stage) return undefined;
  switch (stage) {
    case 'Release Branching':
      return styles.stageBranching;
    case 'Final Release Candidate':
      return styles.stageCandidate;
    case 'Submit For App Store Review':
      return styles.stageReview;
    case 'Roll Out 1%':
    case 'Roll Out 100%':
      return styles.stageRollout;
    default:
      return undefined;
  }
}

/** Get severity-specific color class */
function getSeverityClass(severity?: BlockerSeverity): string | undefined {
  if (!severity) return undefined;
  switch (severity) {
    case 'critical':
      return styles.severityCritical;
    case 'high':
      return styles.severityHigh;
    case 'medium':
      return styles.severityMedium;
    default:
      return undefined;
  }
}

/** Get distribution status color class */
function getStatusClass(status?: DistributionStatus): string | undefined {
  if (!status) return undefined;
  switch (status) {
    case 'pending':
      return styles.statusPending;
    case 'submitted':
      return styles.statusSubmitted;
    case 'approved':
      return styles.statusApproved;
    case 'live':
      return styles.statusLive;
    default:
      return undefined;
  }
}

/** Get compliance color class */
function getComplianceClass(compliant?: boolean): string | undefined {
  if (compliant === undefined) return undefined;
  return compliant ? styles.compliant : styles.nonCompliant;
}

export function EventIcon({ type, severity, status, stage, compliant, className }: EventIconProps): JSX.Element {
  const config = iconConfig[type];

  // Determine the color class: use contextual override when available, else base type color
  let colorClass = typeClassMap[type];
  if (type === 'stage_change' && stage) {
    colorClass = getStageClass(stage) ?? colorClass;
  } else if (type === 'blocker_added' && severity) {
    colorClass = getSeverityClass(severity) ?? colorClass;
  } else if (type === 'distribution_updated' && status) {
    colorClass = getStatusClass(status) ?? colorClass;
  } else if (type === 'itgc_updated' && compliant !== undefined) {
    colorClass = getComplianceClass(compliant) ?? colorClass;
  }

  const classes = [styles.icon, colorClass, className].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      role="img"
      aria-label={config.label}
      data-event-type={type}
    >
      {config.icon}
    </span>
  );
}
