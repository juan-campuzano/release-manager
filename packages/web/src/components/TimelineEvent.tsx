/**
 * TimelineEvent component
 *
 * Renders a single event in the release timeline with icon, timestamp,
 * description, and expandable details section.
 *
 * Requirements: 1.3, 1.4, 3.2, 3.3, 4.2, 4.5, 5.2, 5.3, 6.2, 6.3,
 *   7.2, 8.2, 8.3, 9.2, 9.4, 11.1, 11.2, 11.3, 11.4, 11.5,
 *   15.1, 15.2, 15.4, 15.5
 */

import React, { useCallback, useState } from 'react';
import type { ReleaseEvent } from '../types/releaseEvent';
import { EventIcon } from './EventIcon';
import { formatEventTimestamp, formatAbsoluteTime } from '../utils/formatEventTimestamp';
import { generateEventDescription } from '../utils/eventDescriptions';
import styles from './TimelineEvent.module.css';

export interface TimelineEventProps {
  event: ReleaseEvent;
  isExpanded: boolean;
  onToggleExpand: (eventId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

/** Extract EventIcon props from a ReleaseEvent */
function getIconProps(event: ReleaseEvent) {
  const base = { type: event.type } as React.ComponentProps<typeof EventIcon>;
  switch (event.type) {
    case 'stage_change':
      return { ...base, stage: event.data.newStage };
    case 'blocker_added':
      return { ...base, severity: event.data.severity };
    case 'distribution_updated':
      return { ...base, status: event.data.newStatus };
    case 'itgc_updated':
      return { ...base, compliant: event.data.compliant };
    default:
      return base;
  }
}

/** Render expanded details specific to each event type */
function renderEventTypeDetails(event: ReleaseEvent): React.ReactNode {
  switch (event.type) {
    case 'blocker_added':
      return (
        <>
          {event.data.description && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Description:</span>
              <span className={styles.detailValue}>{event.data.description}</span>
            </div>
          )}
          {event.data.issueUrl && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Issue:</span>
              <a
                href={event.data.issueUrl}
                className={styles.detailLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {event.data.issueUrl}
              </a>
            </div>
          )}
        </>
      );
    case 'signoff_recorded':
      return event.data.comments ? (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Comments:</span>
          <span className={styles.detailValue}>{event.data.comments}</span>
        </div>
      ) : null;
    case 'itgc_updated':
      return event.data.details ? (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Details:</span>
          <span className={styles.detailValue}>{event.data.details}</span>
        </div>
      ) : null;
    default:
      return null;
  }
}

export const TimelineEvent = React.memo(function TimelineEvent({
  event,
  isExpanded,
  onToggleExpand,
  isFirst,
  isLast,
}: TimelineEventProps) {
  const [liveMessage, setLiveMessage] = useState('');

  const titleId = `event-title-${event.id}`;
  const detailsId = `event-details-${event.id}`;
  const description = generateEventDescription(event);
  const relativeTimestamp = formatEventTimestamp(event.timestamp);
  const absoluteTimestamp = formatAbsoluteTime(event.timestamp);
  const iconProps = getIconProps(event);
  const isCreationEvent = event.type === 'release_created';

  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded;
    setLiveMessage(newExpanded ? 'Event details expanded' : 'Event details collapsed');
    onToggleExpand(event.id);
  }, [isExpanded, onToggleExpand, event.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  const typeSpecificDetails = renderEventTypeDetails(event);

  const eventClasses = [
    styles.event,
    isCreationEvent ? styles.creationEvent : '',
  ]
    .filter(Boolean)
    .join(' ');

  const connectorClasses = [
    styles.connector,
    isLast ? styles.connectorHidden : '',
  ]
    .filter(Boolean)
    .join(' ');

  const expandClasses = [
    styles.expandIndicator,
    isExpanded ? styles.expandIndicatorOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={eventClasses}
      aria-labelledby={titleId}
      aria-expanded={isExpanded}
    >
      {/* Vertical connector line */}
      <div className={connectorClasses} aria-hidden="true" />

      {/* Icon column */}
      <div className={styles.iconColumn}>
        <EventIcon {...iconProps} />
      </div>

      {/* Content column */}
      <div className={styles.content}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} event details`}
          >
            <div className={styles.headerText}>
              <time className={styles.timestamp} dateTime={event.timestamp}>
                {relativeTimestamp}
              </time>
              <div className={styles.description} id={titleId}>
                {description}
              </div>
            </div>
            <span className={expandClasses} aria-hidden="true">
              ▸
            </span>
          </button>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div id={detailsId} className={styles.details} role="region" aria-label="Event details">
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Event ID:</span>
              <span className={styles.detailValue}>{event.id}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Timestamp:</span>
              <time className={styles.detailValue} dateTime={event.timestamp}>
                {absoluteTimestamp}
              </time>
            </div>
            {event.userName && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>User:</span>
                <span className={styles.detailValue}>{event.userName}</span>
              </div>
            )}
            {typeSpecificDetails}
          </div>
        )}
      </div>

      {/* ARIA live region for expansion state announcements */}
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </article>
  );
});
