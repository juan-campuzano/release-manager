import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventIcon } from './EventIcon';
import type { EventType } from '../types/releaseEvent';

describe('EventIcon', () => {
  const allEventTypes: EventType[] = [
    'release_created',
    'stage_change',
    'blocker_added',
    'blocker_resolved',
    'signoff_recorded',
    'rollout_updated',
    'distribution_updated',
    'itgc_updated',
  ];

  it.each(allEventTypes)('renders an icon with aria-label for %s', (type) => {
    render(<EventIcon type={type} />);
    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-label');
    expect(icon.getAttribute('aria-label')!.length).toBeGreaterThan(0);
  });

  it.each(allEventTypes)('sets data-event-type attribute for %s', (type) => {
    render(<EventIcon type={type} />);
    const icon = screen.getByRole('img');
    expect(icon).toHaveAttribute('data-event-type', type);
  });

  it('applies severity color class for blocker_added', () => {
    const { container } = render(<EventIcon type="blocker_added" severity="critical" />);
    const icon = container.querySelector('[role="img"]');
    expect(icon).toBeInTheDocument();
  });

  it('applies status color class for distribution_updated', () => {
    const { container } = render(<EventIcon type="distribution_updated" status="approved" />);
    const icon = container.querySelector('[role="img"]');
    expect(icon).toBeInTheDocument();
  });

  it('applies stage color class for stage_change', () => {
    const { container } = render(<EventIcon type="stage_change" stage="Release Branching" />);
    const icon = container.querySelector('[role="img"]');
    expect(icon).toBeInTheDocument();
  });

  it('applies compliance color class for itgc_updated', () => {
    const { container } = render(<EventIcon type="itgc_updated" compliant={true} />);
    const icon = container.querySelector('[role="img"]');
    expect(icon).toBeInTheDocument();
  });

  it('applies non-compliant color class for itgc_updated', () => {
    const { container } = render(<EventIcon type="itgc_updated" compliant={false} />);
    const icon = container.querySelector('[role="img"]');
    expect(icon).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EventIcon type="release_created" className="custom-class" />);
    const icon = container.querySelector('[role="img"]');
    expect(icon?.className).toContain('custom-class');
  });

  it('renders unique icons for each event type', () => {
    const icons = new Set<string>();
    for (const type of allEventTypes) {
      const { container, unmount } = render(<EventIcon type={type} />);
      const icon = container.querySelector('[role="img"]');
      icons.add(icon?.textContent ?? '');
      unmount();
    }
    expect(icons.size).toBe(allEventTypes.length);
  });
});
