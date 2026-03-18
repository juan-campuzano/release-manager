import { formatDate, formatPercentage, formatDAUCount } from './formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format ISO 8601 date strings to display format', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      const result = formatDate(isoDate);
      
      // Result will vary based on timezone, but should contain date components
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should handle custom format options', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      const result = formatDate(isoDate, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      expect(result).toMatch(/January/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should return "Invalid Date" for invalid date strings', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate('')).toBe('Invalid Date');
      expect(formatDate('not-a-date')).toBe('Invalid Date');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with 2 decimal places', () => {
      expect(formatPercentage(12.3456)).toBe('12.35%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(100)).toBe('100.00%');
      expect(formatPercentage(50.5)).toBe('50.50%');
    });

    it('should round to 2 decimal places', () => {
      expect(formatPercentage(12.345)).toBe('12.35%');
      expect(formatPercentage(12.344)).toBe('12.34%');
      expect(formatPercentage(99.999)).toBe('100.00%');
    });

    it('should handle very small numbers', () => {
      expect(formatPercentage(0.001)).toBe('0.00%');
      expect(formatPercentage(0.005)).toBe('0.01%');
    });
  });

  describe('formatDAUCount', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatDAUCount(1234567)).toBe('1,234,567');
      expect(formatDAUCount(1000)).toBe('1,000');
      expect(formatDAUCount(999)).toBe('999');
      expect(formatDAUCount(0)).toBe('0');
    });

    it('should handle large numbers', () => {
      expect(formatDAUCount(1000000)).toBe('1,000,000');
      expect(formatDAUCount(999999999)).toBe('999,999,999');
    });

    it('should handle small numbers', () => {
      expect(formatDAUCount(1)).toBe('1');
      expect(formatDAUCount(10)).toBe('10');
      expect(formatDAUCount(100)).toBe('100');
    });
  });
});
