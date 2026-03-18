import type { ReleaseEvent } from '../types/releaseEvent';

/**
 * Generates a human-readable description for a release event
 * based on the event type and its associated data.
 */
export function generateEventDescription(event: ReleaseEvent): string {
  switch (event.type) {
    case 'release_created':
      return `Release ${event.data.version} created for ${event.data.platform} by ${event.data.createdBy}`;

    case 'stage_change':
      return `Stage changed from ${event.data.previousStage} to ${event.data.newStage}`;

    case 'blocker_added':
      return `${event.data.severity} blocker added: ${event.data.title} (assigned to ${event.data.assignee})`;

    case 'blocker_resolved':
      return `Blocker resolved: ${event.data.title}`;

    case 'signoff_recorded':
      return `${event.data.squad} approved by ${event.data.approverName}`;

    case 'rollout_updated':
      return `Rollout updated from ${event.data.previousPercentage}% to ${event.data.newPercentage}%`;

    case 'distribution_updated':
      return `${event.data.channel} status changed from ${event.data.previousStatus} to ${event.data.newStatus}`;

    case 'itgc_updated':
      return `ITGC status: ${event.data.compliant ? 'Compliant' : 'Non-compliant'}, Rollout: ${event.data.rolloutComplete ? 'Complete' : 'Incomplete'}`;
  }
}
