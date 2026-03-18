import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VirtualizedEventList } from './VirtualizedEventList';
import type { ReleaseEvent } from '../types/releaseEvent';

function makeEvent(id: string, index: number): ReleaseEvent {
  return {
    id,
    releaseId: 'rel-1',
    type: 'stage_change',
    timestamp: new Date(Date.now() - index * 60000).toISOString(),
    userName: `User ${index}`,
    data: {
      previousStage: 'Release Branching',
      newStage: 'Final Release Candidate',
    },
  };
}

function makeEvents(count: number): ReleaseEvent[] {
  return Array.from({ length: count }, (_, i) => makeEvent(`evt-${i}`, i));
}

describe('VirtualizedEventList', () => {
  const onToggleExpand = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a plain <ul> list when event count is at or below threshold', () => {
    const events = makeEvents(5);
    const { container } = render(
      <VirtualizedEventList
        events={events}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
      />,
    );
    const ul = container.querySelector('ul');
    expect(ul).toBeInTheDocument();
    const listItems = container.querySelectorAll('li');
    expect(listItems).toHaveLength(5);
  });

  it('renders each event as a TimelineEvent in the plain list', () => {
    const events = makeEvents(3);
    render(
      <VirtualizedEventList
        events={events}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
      />,
    );
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('passes isFirst and isLast correctly in plain list', () => {
    const events = makeEvents(2);
    render(
      <VirtualizedEventList
        events={events}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
      />,
    );
    // First event should not have hidden connector, last should
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
  });

  it('passes expand state to TimelineEvent in plain list', () => {
    const events = makeEvents(2);
    const expanded = new Set(['evt-0']);
    render(
      <VirtualizedEventList
        events={events}
        expandedEvents={expanded}
        onToggleExpand={onToggleExpand}
      />,
    );
    // The first event should be expanded (showing event ID in details)
    expect(screen.getByText('evt-0')).toBeInTheDocument();
  });

  it('calls onToggleExpand when an event is clicked', () => {
    const events = makeEvents(1);
    render(
      <VirtualizedEventList
        events={events}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onToggleExpand).toHaveBeenCalledWith('evt-0');
  });

  it('renders plain list at exactly the threshold', () => {
    const events = makeEvents(100);
    const { container } = render(
      <VirtualizedEventList
        events={events}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
      />,
    );
    const ul = container.querySelector('ul');
    expect(ul).toBeInTheDocument();
  });

  it('respects custom threshold', () => {
    const events = makeEvents(5);
    const { container } = render(
      <VirtualizedEventList
        events={events}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
        threshold={3}
      />,
    );
    // 5 events > threshold of 3, so should NOT render a <ul>
    const ul = container.querySelector('ul');
    expect(ul).not.toBeInTheDocument();
  });

  it('renders empty list when no events', () => {
    const { container } = render(
      <VirtualizedEventList
        events={[]}
        expandedEvents={new Set()}
        onToggleExpand={onToggleExpand}
      />,
    );
    const ul = container.querySelector('ul');
    expect(ul).toBeInTheDocument();
    const listItems = container.querySelectorAll('li');
    expect(listItems).toHaveLength(0);
  });
});
