/**
 * Timestamp formatting utilities for release timeline events.
 *
 * - Events < 7 days old use relative format ("just now", "X minutes ago", etc.)
 * - Events >= 7 days old use absolute format ("Jan 15, 2024 at 2:30 PM")
 */

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_THRESHOLD = 7;

/**
 * Formats a timestamp as a relative time string for recent events (< 7 days).
 * Returns "just now", "X minute(s) ago", "X hour(s) ago", or "X day(s) ago".
 * Falls back to absolute format for events >= 7 days old.
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);

  if (seconds < SECONDS_PER_MINUTE) return 'just now';
  if (minutes < MINUTES_PER_HOUR)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < HOURS_PER_DAY)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < DAYS_THRESHOLD)
    return `${days} day${days !== 1 ? 's' : ''} ago`;

  return formatAbsoluteTime(timestamp);
}

/**
 * Formats a timestamp as an absolute date/time string.
 * Output format: "Jan 15, 2024 at 2:30 PM"
 */
export function formatAbsoluteTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats an event timestamp using relative time for recent events (< 7 days)
 * and absolute time for older events (>= 7 days).
 */
export function formatEventTimestamp(timestamp: string): string {
  try {
    const now = new Date();
    const eventTime = new Date(timestamp);
    if (isNaN(eventTime.getTime())) {
      return 'Invalid date';
    }

    const diffMs = now.getTime() - eventTime.getTime();
    const days = Math.floor(diffMs / (1000 * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY));

    if (days < DAYS_THRESHOLD) {
      return formatRelativeTime(timestamp);
    }
    return formatAbsoluteTime(timestamp);
  } catch {
    return 'Invalid date';
  }
}
