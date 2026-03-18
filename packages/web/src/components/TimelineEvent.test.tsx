import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineEvent } from './TimelineEvent';
import type { ReleaseEvent, BlockerAddedEvent, SignOffRecordedEvent, ITGCUpdatedEvent } from '../types/releaseEvent';

const baseEvent: ReleaseEvent = {
  id: 'evt-1',
  releaseId: 'rel-1',
  type: 'stage_change',
  timestamp: new Date().toISOString(),
  userName: 'Jane Doe',
  data: {
    previousStage: 'Release Branching',
    newStage: 'Final Release Candidate',
  },
};

const defaultProps = {
  event: baseEvent,
  isExpanded: false,
  onToggleExpand: jest.fn(),
  isFirst: false,
  isLast: false,
};

describe('TimelineEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders icon, timestamp, and description', () => {
    render(<TimelineEvent {...defaultProps} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText(/Stage changed from/)).toBeInTheDocument();
    const timeEl = document.querySelector('time');
    expect(timeEl).toBeInTheDocument();
  });

  it('uses article element with aria-labelledby', () => {
    render(<TimelineEvent {...defaultProps} />);
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-labelledby', `event-title-${baseEvent.id}`);
  });

  it('renders expand/collapse button with correct aria attributes', () => {
    render(<TimelineEvent {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', `event-details-${baseEvent.id}`);
    expect(button).toHaveAttribute('aria-label', 'Expand event details');
  });

  it('calls onToggleExpand when button is clicked', () => {
    const onToggle = jest.fn();
    render(<TimelineEvent {...defaultProps} onToggleExpand={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(baseEvent.id);
  });

  it('activates on Enter key', () => {
    const onToggle = jest.fn();
    render(<TimelineEvent {...defaultProps} onToggleExpand={onToggle} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith(baseEvent.id);
  });

  it('activates on Space key', () => {
    const onToggle = jest.fn();
    render(<TimelineEvent {...defaultProps} onToggleExpand={onToggle} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onToggle).toHaveBeenCalledWith(baseEvent.id);
  });

  it('shows metadata in expanded view', () => {
    render(<TimelineEvent {...defaultProps} isExpanded={true} />);
    expect(screen.getByText(baseEvent.id)).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('hides details when collapsed', () => {
    render(<TimelineEvent {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText(baseEvent.id)).not.toBeInTheDocument();
  });

  it('shows connector line when not last event', () => {
    const { container } = render(<TimelineEvent {...defaultProps} isLast={false} />);
    const connector = container.querySelector('[aria-hidden="true"]');
    expect(connector).toBeInTheDocument();
  });

  it('hides connector line for last event', () => {
    const { container } = render(<TimelineEvent {...defaultProps} isLast={true} />);
    // The connector div should have the hidden class
    const connectors = container.querySelectorAll('[aria-hidden="true"]');
    const connectorDiv = Array.from(connectors).find(el => el.className.includes('connector'));
    expect(connectorDiv?.className).toContain('connectorHidden');
  });

  it('does not show user name when not available', () => {
    const eventNoUser: ReleaseEvent = { ...baseEvent, userName: undefined };
    render(<TimelineEvent {...defaultProps} event={eventNoUser} isExpanded={true} />);
    expect(screen.queryByText('User:')).not.toBeInTheDocument();
  });

  it('shows blocker description and issue URL when expanded', () => {
    const blockerEvent: BlockerAddedEvent = {
      id: 'evt-b1',
      releaseId: 'rel-1',
      type: 'blocker_added',
      timestamp: new Date().toISOString(),
      data: {
        blockerId: 'blk-1',
        title: 'Crash on launch',
        severity: 'critical',
        assignee: 'dev@example.com',
        description: 'App crashes on cold start',
        issueUrl: 'https://github.com/issues/123',
      },
    };
    render(<TimelineEvent {...defaultProps} event={blockerEvent} isExpanded={true} />);
    expect(screen.getByText('App crashes on cold start')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/issues/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows sign-off comments when expanded', () => {
    const signoffEvent: SignOffRecordedEvent = {
      id: 'evt-s1',
      releaseId: 'rel-1',
      type: 'signoff_recorded',
      timestamp: new Date().toISOString(),
      data: {
        signOffId: 'so-1',
        squad: 'Platform',
        approverName: 'Alice',
        comments: 'Looks good to ship',
      },
    };
    render(<TimelineEvent {...defaultProps} event={signoffEvent} isExpanded={true} />);
    expect(screen.getByText('Looks good to ship')).toBeInTheDocument();
  });

  it('shows ITGC details when expanded', () => {
    const itgcEvent: ITGCUpdatedEvent = {
      id: 'evt-i1',
      releaseId: 'rel-1',
      type: 'itgc_updated',
      timestamp: new Date().toISOString(),
      data: {
        compliant: true,
        rolloutComplete: false,
        details: 'Pending final audit',
      },
    };
    render(<TimelineEvent {...defaultProps} event={itgcEvent} isExpanded={true} />);
    expect(screen.getByText('Pending final audit')).toBeInTheDocument();
  });

  it('does not show optional fields when absent', () => {
    const blockerNoOptionals: BlockerAddedEvent = {
      id: 'evt-b2',
      releaseId: 'rel-1',
      type: 'blocker_added',
      timestamp: new Date().toISOString(),
      data: {
        blockerId: 'blk-2',
        title: 'Minor issue',
        severity: 'medium',
        assignee: 'dev@example.com',
      },
    };
    render(<TimelineEvent {...defaultProps} event={blockerNoOptionals} isExpanded={true} />);
    expect(screen.queryByText('Description:')).not.toBeInTheDocument();
    expect(screen.queryByText('Issue:')).not.toBeInTheDocument();
  });

  it('applies creation event styling for release_created', () => {
    const creationEvent: ReleaseEvent = {
      id: 'evt-c1',
      releaseId: 'rel-1',
      type: 'release_created',
      timestamp: new Date().toISOString(),
      data: {
        platform: 'iOS',
        version: '1.0.0',
        createdBy: 'admin',
      },
    };
    render(<TimelineEvent {...defaultProps} event={creationEvent} />);
    const article = screen.getByRole('article');
    expect(article.className).toContain('creationEvent');
  });

  it('announces expansion state via ARIA live region', () => {
    const { container } = render(<TimelineEvent {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion?.textContent).toBe('Event details expanded');
  });

  it('uses time element with datetime attribute', () => {
    render(<TimelineEvent {...defaultProps} />);
    const timeEl = document.querySelector('time');
    expect(timeEl).toHaveAttribute('datetime', baseEvent.timestamp);
  });

  it('shows aria-label as Collapse when expanded', () => {
    render(<TimelineEvent {...defaultProps} isExpanded={true} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Collapse event details');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
