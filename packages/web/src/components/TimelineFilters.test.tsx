import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineFilters } from './TimelineFilters';
import type { EventType } from '../types/releaseEvent';

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

function makeEventCounts(override: Partial<Record<EventType, number>> = {}): Record<EventType, number> {
  const base: Record<EventType, number> = {
    release_created: 1,
    stage_change: 3,
    blocker_added: 2,
    blocker_resolved: 1,
    signoff_recorded: 4,
    rollout_updated: 2,
    distribution_updated: 1,
    itgc_updated: 1,
  };
  return { ...base, ...override };
}

const defaultProps = {
  selectedFilters: new Set<EventType>(),
  onFilterChange: jest.fn(),
  onClearFilters: jest.fn(),
  eventCounts: makeEventCounts(),
  totalEvents: 15,
  visibleEvents: 15,
};

describe('TimelineFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an "All Events" button and a button for each event type', () => {
    render(<TimelineFilters {...defaultProps} />);

    expect(screen.getByRole('button', { name: /all events/i })).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(ALL_EVENT_TYPES.length + 1);
  });

  it('shows event counts in each filter button', () => {
    render(<TimelineFilters {...defaultProps} />);

    expect(screen.getByText(/Stage Changes \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Blockers Added \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Sign-Offs \(4\)/)).toBeInTheDocument();
  });

  it('marks "All Events" as pressed when no filters are active', () => {
    render(<TimelineFilters {...defaultProps} />);

    const allBtn = screen.getByRole('button', { name: /all events/i });
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks selected filter buttons as pressed', () => {
    const selected = new Set<EventType>(['stage_change', 'blocker_added']);
    render(<TimelineFilters {...defaultProps} selectedFilters={selected} />);

    const stageBtn = screen.getByRole('button', { name: /filter stage changes events/i });
    expect(stageBtn).toHaveAttribute('aria-pressed', 'true');

    const blockerBtn = screen.getByRole('button', { name: /filter blockers added events/i });
    expect(blockerBtn).toHaveAttribute('aria-pressed', 'true');

    const signoffBtn = screen.getByRole('button', { name: /filter sign-offs events/i });
    expect(signoffBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onFilterChange when a filter button is clicked', () => {
    const onFilterChange = jest.fn();
    render(<TimelineFilters {...defaultProps} onFilterChange={onFilterChange} />);

    const btn = screen.getByRole('button', { name: /filter stage changes events/i });
    fireEvent.click(btn);

    expect(onFilterChange).toHaveBeenCalledWith('stage_change');
  });

  it('calls onClearFilters when "All Events" is clicked', () => {
    const onClearFilters = jest.fn();
    const selected = new Set<EventType>(['stage_change']);
    render(
      <TimelineFilters
        {...defaultProps}
        selectedFilters={selected}
        onClearFilters={onClearFilters}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /all events/i }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('displays visible/total count when filters are active', () => {
    const selected = new Set<EventType>(['stage_change']);
    render(
      <TimelineFilters
        {...defaultProps}
        selectedFilters={selected}
        visibleEvents={3}
        totalEvents={15}
      />,
    );

    expect(screen.getByText('3 of 15 events shown')).toBeInTheDocument();
  });

  it('does not display count text when no filters are active', () => {
    render(<TimelineFilters {...defaultProps} />);

    expect(screen.queryByText(/events shown/)).not.toBeInTheDocument();
  });

  it('has an ARIA live region for the event count', () => {
    const selected = new Set<EventType>(['stage_change']);
    const { container } = render(
      <TimelineFilters {...defaultProps} selectedFilters={selected} visibleEvents={3} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('wraps filter buttons in a group with accessible label', () => {
    render(<TimelineFilters {...defaultProps} />);

    expect(screen.getByRole('group', { name: /filter events by type/i })).toBeInTheDocument();
  });
});
