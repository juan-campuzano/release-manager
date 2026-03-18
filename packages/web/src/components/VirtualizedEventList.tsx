/**
 * VirtualizedEventList component
 *
 * Renders a list of timeline events, using react-window virtualization
 * when the event count exceeds a configurable threshold (default 100).
 * For smaller lists, renders a plain semantic HTML list.
 *
 * Requirements: 14.2
 */

import React from 'react';
import { List } from 'react-window';
import type { ReleaseEvent } from '../types/releaseEvent';
import { TimelineEvent } from './TimelineEvent';

export interface VirtualizedEventListProps {
  events: ReleaseEvent[];
  expandedEvents: Set<string>;
  onToggleExpand: (eventId: string) => void;
  threshold?: number;
}

const DEFAULT_THRESHOLD = 100;
const ROW_HEIGHT = 80;
const LIST_HEIGHT = 600;

interface VirtualizedRowProps {
  events: ReleaseEvent[];
  expandedEvents: Set<string>;
  onToggleExpand: (eventId: string) => void;
}

function VirtualizedRow(props: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
} & VirtualizedRowProps) {
  const { index, style, events, expandedEvents, onToggleExpand } = props;
  const event = events[index];
  return (
    <div style={style}>
      <TimelineEvent
        event={event}
        isExpanded={expandedEvents.has(event.id)}
        onToggleExpand={onToggleExpand}
        isFirst={index === 0}
        isLast={index === events.length - 1}
      />
    </div>
  );
}

export const VirtualizedEventList = React.memo(function VirtualizedEventList({
  events,
  expandedEvents,
  onToggleExpand,
  threshold = DEFAULT_THRESHOLD,
}: VirtualizedEventListProps) {
  const useVirtualization = events.length > threshold;

  if (useVirtualization) {
    return (
      <List
        rowCount={events.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={VirtualizedRow}
        rowProps={{ events, expandedEvents, onToggleExpand }}
        style={{ height: LIST_HEIGHT, width: '100%' }}
        overscanCount={5}
      />
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((event, index) => (
        <li key={event.id}>
          <TimelineEvent
            event={event}
            isExpanded={expandedEvents.has(event.id)}
            onToggleExpand={onToggleExpand}
            isFirst={index === 0}
            isLast={index === events.length - 1}
          />
        </li>
      ))}
    </ul>
  );
});
