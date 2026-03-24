/**
 * ReleaseTimeline container component
 *
 * Orchestrates data fetching, filtering, and rendering of the release event timeline.
 * Uses useReleaseEvents hook for data fetching with auto-refresh, manages filter and
 * expand/collapse state, and renders sub-components conditionally.
 *
 * Requirements: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5, 10.1, 10.4, 13.1, 13.2, 13.3, 13.4, 14.1, 14.3, 15.1, 15.4
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { EventType, ReleaseEvent } from '../types/releaseEvent';
import { useReleaseEvents } from '../hooks/useReleaseEvents';
import { useServices } from '../contexts/ServicesContext';
import { TimelineFilters } from './TimelineFilters';
import { VirtualizedEventList } from './VirtualizedEventList';
import { TimelineEmptyState } from './TimelineEmptyState';
import { TimelineError } from './TimelineError';
import { LoadingSpinner } from './LoadingSpinner';
import styles from './ReleaseTimeline.module.css';

export interface ReleaseTimelineProps {
  releaseId: string;
  autoRefreshInterval?: number;
  className?: string;
}

const ALL_EVENT_TYPES: EventType[] = [
  'release_created',
  'stage_change',
  'blocker_added',
  'blocker_resolved',
  'signoff_recorded',
  'rollout_updated',
  'distribution_updated',
  'itgc_updated',
];

function computeEventCounts(events: ReleaseEvent[]): Record<EventType, number> {
  const counts = {} as Record<EventType, number>;
  for (const t of ALL_EVENT_TYPES) {
    counts[t] = 0;
  }
  for (const event of events) {
    counts[event.type]++;
  }
  return counts;
}

export const ReleaseTimeline = React.memo(function ReleaseTimeline({
  releaseId,
  className,
}: ReleaseTimelineProps) {
  const { apiClient } = useServices();
  const { events, loading, error, refresh } = useReleaseEvents(releaseId, apiClient);

  const [selectedFilters, setSelectedFilters] = useState<Set<EventType>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const filteredEvents = useMemo(() => {
    if (selectedFilters.size === 0) return events;
    return events.filter((e) => selectedFilters.has(e.type));
  }, [events, selectedFilters]);

  const eventCounts = useMemo(() => computeEventCounts(events), [events]);

  const handleFilterChange = useCallback((type: EventType) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedFilters(new Set());
  }, []);

  const handleToggleExpand = useCallback((eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const renderContent = () => {
    if (loading && events.length === 0) {
      return (
        <div className={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </div>
      );
    }

    if (error && events.length === 0) {
      return <TimelineError error={error} onRetry={refresh} />;
    }

    if (events.length === 0) {
      return <TimelineEmptyState />;
    }

    return (
      <>
        <TimelineFilters
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          eventCounts={eventCounts}
          totalEvents={events.length}
          visibleEvents={filteredEvents.length}
        />
        <VirtualizedEventList
          events={filteredEvents}
          expandedEvents={expandedEvents}
          onToggleExpand={handleToggleExpand}
        />
      </>
    );
  };

  return (
    <div
      role="feed"
      aria-label="Release event timeline"
      className={`${styles.container} ${className || ''}`}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Timeline</h2>
      </div>
      <div className={styles.content}>{renderContent()}</div>
    </div>
  );
});
