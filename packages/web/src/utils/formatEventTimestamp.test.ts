import {
  formatRelativeTime,
  formatAbsoluteTime,
  formatEventTimestamp,
} from './formatEventTimestamp';

describe('formatEventTimestamp', () => {
  // Helper to create ISO timestamps relative to "now"
  function minutesAgo(n: number): string {
    return new Date(Date.now() - n * 60 * 1000).toISOString();
  }
  function hoursAgo(n: number): string {
    return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
  }
  function daysAgo(n: number): string {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
  }

  describe('formatRelativeTime', () => {
    it('returns "just now" for events less than 60 seconds old', () => {
      const ts = new Date(Date.now() - 30 * 1000).toISOString();
      expect(formatRelativeTime(ts)).toBe('just now');
    });

    it('returns singular "1 minute ago"', () => {
      expect(formatRelativeTime(minutesAgo(1))).toBe('1 minute ago');
    });

    it('returns plural minutes ago', () => {
      expect(formatRelativeTime(minutesAgo(45))).toBe('45 minutes ago');
    });

    it('returns singular "1 hour ago"', () => {
      expect(formatRelativeTime(hoursAgo(1))).toBe('1 hour ago');
    });

    it('returns plural hours ago', () => {
      expect(formatRelativeTime(hoursAgo(5))).toBe('5 hours ago');
    });

    it('returns singular "1 day ago"', () => {
      expect(formatRelativeTime(daysAgo(1))).toBe('1 day ago');
    });

    it('returns plural days ago for < 7 days', () => {
      expect(formatRelativeTime(daysAgo(6))).toBe('6 days ago');
    });

    it('falls back to absolute format for events >= 7 days old', () => {
      const result = formatRelativeTime(daysAgo(10));
      // Should be absolute format, not relative
      expect(result).not.toMatch(/ago/);
      expect(result).toMatch(/\d{4}/); // contains year
    });
  });

  describe('formatAbsoluteTime', () => {
    it('formats a known date correctly', () => {
      // Use a UTC timestamp so the test is deterministic in any timezone
      const result = formatAbsoluteTime('2024-01-15T14:30:00Z');
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('returns "Invalid date" for garbage input', () => {
      expect(formatAbsoluteTime('not-a-date')).toBe('Invalid date');
    });

    it('returns "Invalid date" for empty string', () => {
      expect(formatAbsoluteTime('')).toBe('Invalid date');
    });
  });

  describe('formatEventTimestamp (delegator)', () => {
    it('uses relative format for events < 7 days old', () => {
      expect(formatEventTimestamp(hoursAgo(3))).toBe('3 hours ago');
    });

    it('uses absolute format for events >= 7 days old', () => {
      const result = formatEventTimestamp(daysAgo(14));
      expect(result).not.toMatch(/ago/);
      expect(result).toMatch(/\d{4}/);
    });

    it('returns "Invalid date" for invalid input', () => {
      expect(formatEventTimestamp('bad')).toBe('Invalid date');
    });

    it('returns "just now" for a very recent event', () => {
      expect(formatEventTimestamp(new Date().toISOString())).toBe('just now');
    });
  });
});
