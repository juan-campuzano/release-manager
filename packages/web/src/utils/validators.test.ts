import {
  isValidSemanticVersion,
  isValidQualityThreshold,
  isValidRolloutPercentage,
} from './validators';

describe('validators', () => {
  describe('isValidSemanticVersion', () => {
    it('should return true for valid semantic versions', () => {
      expect(isValidSemanticVersion('1.0.0')).toBe(true);
      expect(isValidSemanticVersion('0.0.1')).toBe(true);
      expect(isValidSemanticVersion('10.20.30')).toBe(true);
      expect(isValidSemanticVersion('999.999.999')).toBe(true);
    });

    it('should return false for invalid semantic versions', () => {
      expect(isValidSemanticVersion('1.0')).toBe(false);
      expect(isValidSemanticVersion('1')).toBe(false);
      expect(isValidSemanticVersion('1.0.0.0')).toBe(false);
      expect(isValidSemanticVersion('v1.0.0')).toBe(false);
      expect(isValidSemanticVersion('1.0.0-beta')).toBe(false);
      expect(isValidSemanticVersion('a.b.c')).toBe(false);
      expect(isValidSemanticVersion('')).toBe(false);
    });
  });

  describe('isValidQualityThreshold', () => {
    it('should return true for valid thresholds (0-100)', () => {
      expect(isValidQualityThreshold(0)).toBe(true);
      expect(isValidQualityThreshold(50)).toBe(true);
      expect(isValidQualityThreshold(100)).toBe(true);
      expect(isValidQualityThreshold(0.5)).toBe(true);
      expect(isValidQualityThreshold(99.99)).toBe(true);
    });

    it('should return false for invalid thresholds', () => {
      expect(isValidQualityThreshold(-1)).toBe(false);
      expect(isValidQualityThreshold(101)).toBe(false);
      expect(isValidQualityThreshold(-0.1)).toBe(false);
      expect(isValidQualityThreshold(100.1)).toBe(false);
      expect(isValidQualityThreshold(NaN)).toBe(false);
      expect(isValidQualityThreshold(Infinity)).toBe(false);
    });

    it('should return false for non-number types', () => {
      expect(isValidQualityThreshold('50' as any)).toBe(false);
      expect(isValidQualityThreshold(null as any)).toBe(false);
      expect(isValidQualityThreshold(undefined as any)).toBe(false);
    });
  });

  describe('isValidRolloutPercentage', () => {
    it('should return true for valid percentages (0-100)', () => {
      expect(isValidRolloutPercentage(0)).toBe(true);
      expect(isValidRolloutPercentage(1)).toBe(true);
      expect(isValidRolloutPercentage(50)).toBe(true);
      expect(isValidRolloutPercentage(100)).toBe(true);
      expect(isValidRolloutPercentage(25.5)).toBe(true);
    });

    it('should return false for invalid percentages', () => {
      expect(isValidRolloutPercentage(-1)).toBe(false);
      expect(isValidRolloutPercentage(101)).toBe(false);
      expect(isValidRolloutPercentage(-0.1)).toBe(false);
      expect(isValidRolloutPercentage(100.1)).toBe(false);
      expect(isValidRolloutPercentage(NaN)).toBe(false);
      expect(isValidRolloutPercentage(Infinity)).toBe(false);
    });

    it('should return false for non-number types', () => {
      expect(isValidRolloutPercentage('50' as any)).toBe(false);
      expect(isValidRolloutPercentage(null as any)).toBe(false);
      expect(isValidRolloutPercentage(undefined as any)).toBe(false);
    });
  });
});
