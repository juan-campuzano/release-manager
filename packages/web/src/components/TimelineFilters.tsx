import type { EventType } from '../types/releaseEvent';
import styles from './TimelineFilters.module.css';

interface TimelineFiltersProps {
  selectedFilters: Set<EventType>;
  onFilterChange: (type: EventType) => void;
  onClearFilters: () => void;
  eventCounts: Record<EventType, number>;
  totalEvents: number;
  visibleEvents: number;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  release_created: 'Release Created',
  stage_change: 'Stage Changes',
  blocker_added: 'Blockers Added',
  blocker_resolved: 'Blockers Resolved',
  signoff_recorded: 'Sign-Offs',
  rollout_updated: 'Rollout Updates',
  distribution_updated: 'Distribution Updates',
  itgc_updated: 'ITGC Updates',
};

const FILTER_EVENT_TYPES: EventType[] = [
  'release_created',
  'stage_change',
  'blocker_added',
  'blocker_resolved',
  'signoff_recorded',
  'rollout_updated',
  'distribution_updated',
  'itgc_updated',
];

/**
 * Filter controls for the release timeline.
 * Renders toggle buttons for each event type and an "All Events" button to clear filters.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.5, 15.1, 15.5
 */
export function TimelineFilters({
  selectedFilters,
  onFilterChange,
  onClearFilters,
  eventCounts,
  totalEvents,
  visibleEvents,
}: TimelineFiltersProps): JSX.Element {
  const hasActiveFilters = selectedFilters.size > 0;

  return (
    <div className={styles.filters}>
      <div className={styles.buttonGroup} role="group" aria-label="Filter events by type">
        <button
          type="button"
          className={`${styles.filterButton} ${!hasActiveFilters ? styles.active : ''}`}
          aria-pressed={!hasActiveFilters}
          onClick={onClearFilters}
        >
          All Events
        </button>
        {FILTER_EVENT_TYPES.map((type) => {
          const isSelected = selectedFilters.has(type);
          return (
            <button
              key={type}
              type="button"
              className={`${styles.filterButton} ${isSelected ? styles.active : ''}`}
              aria-pressed={isSelected}
              aria-label={`Filter ${EVENT_TYPE_LABELS[type]} events`}
              onClick={() => onFilterChange(type)}
            >
              {EVENT_TYPE_LABELS[type]} ({eventCounts[type] ?? 0})
            </button>
          );
        })}
      </div>
      <div aria-live="polite" aria-atomic="true" className={styles.eventCount}>
        {hasActiveFilters
          ? `${visibleEvents} of ${totalEvents} events shown`
          : ''}
      </div>
    </div>
  );
}
