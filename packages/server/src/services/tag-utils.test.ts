/**
 * Tests for tag utility functions: extractVersion and isVersionTag
 */

import { extractVersion, extractBaseVersion, isVersionTag, getNextStage } from './tag-utils';
import { ReleaseStage } from '../domain/types';

describe('extractVersion', () => {
  it('should extract version from tag with v prefix', () => {
    expect(extractVersion('v1.2.3')).toBe('1.2.3');
  });

  it('should extract version from bare semver tag', () => {
    expect(extractVersion('1.2.3')).toBe('1.2.3');
  });

  it('should extract version from tag with path prefix', () => {
    expect(extractVersion('release/1.2.3')).toBe('1.2.3');
  });

  it('should extract version from tag with path prefix and v prefix', () => {
    expect(extractVersion('release/v1.2.3')).toBe('1.2.3');
  });

  it('should return null for non-version tags', () => {
    expect(extractVersion('feature/abc')).toBeNull();
    expect(extractVersion('latest')).toBeNull();
  });

  it('should return null for incomplete semver', () => {
    expect(extractVersion('v1.2')).toBeNull();
    expect(extractVersion('1.2')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractVersion('')).toBeNull();
  });

  it('should handle zero-based versions', () => {
    expect(extractVersion('v0.0.0')).toBe('0.0.0');
    expect(extractVersion('0.0.1')).toBe('0.0.1');
  });

  it('should handle large version numbers', () => {
    expect(extractVersion('v100.200.300')).toBe('100.200.300');
  });

  it('should extract version with pre-release suffix', () => {
    expect(extractVersion('1.0.0-rc.1')).toBe('1.0.0-rc.1');
    expect(extractVersion('v1.0.0-rc.1')).toBe('1.0.0-rc.1');
    expect(extractVersion('release/v1.0.0-beta.2')).toBe('1.0.0-beta.2');
    expect(extractVersion('v2.3.4-alpha.1')).toBe('2.3.4-alpha.1');
    expect(extractVersion('1.0.0-rc1')).toBe('1.0.0-rc1');
  });
});

describe('isVersionTag', () => {
  it('should return true for valid version tags', () => {
    expect(isVersionTag('v1.2.3')).toBe(true);
    expect(isVersionTag('1.2.3')).toBe(true);
    expect(isVersionTag('release/1.2.3')).toBe(true);
    expect(isVersionTag('release/v1.2.3')).toBe(true);
    expect(isVersionTag('v1.0.0-rc.1')).toBe(true);
    expect(isVersionTag('1.0.0-beta.2')).toBe(true);
  });

  it('should return false for non-version tags', () => {
    expect(isVersionTag('feature/abc')).toBe(false);
    expect(isVersionTag('latest')).toBe(false);
    expect(isVersionTag('v1.2')).toBe(false);
    expect(isVersionTag('')).toBe(false);
  });

  it('should be consistent with extractVersion', () => {
    const tags = ['v1.2.3', '1.2.3', 'release/v1.2.3', 'feature/abc', 'latest', 'v1.2', '', 'v1.0.0-rc.1', '1.0.0-beta.2'];
    for (const tag of tags) {
      expect(isVersionTag(tag)).toBe(extractVersion(tag) !== null);
    }
  });
});

describe('extractBaseVersion', () => {
  it('should return the base version without pre-release suffix', () => {
    expect(extractBaseVersion('1.0.0-rc.1')).toBe('1.0.0');
    expect(extractBaseVersion('2.3.4-beta.2')).toBe('2.3.4');
    expect(extractBaseVersion('1.0.0-alpha.1')).toBe('1.0.0');
  });

  it('should return the version as-is when no pre-release suffix', () => {
    expect(extractBaseVersion('1.2.3')).toBe('1.2.3');
    expect(extractBaseVersion('0.0.1')).toBe('0.0.1');
  });
});

describe('getNextStage', () => {
  it('should return FinalReleaseCandidate after ReleaseBranching', () => {
    expect(getNextStage(ReleaseStage.ReleaseBranching)).toBe(ReleaseStage.FinalReleaseCandidate);
  });

  it('should return SubmitForAppStoreReview after FinalReleaseCandidate', () => {
    expect(getNextStage(ReleaseStage.FinalReleaseCandidate)).toBe(ReleaseStage.SubmitForAppStoreReview);
  });

  it('should return RollOut1Percent after SubmitForAppStoreReview', () => {
    expect(getNextStage(ReleaseStage.SubmitForAppStoreReview)).toBe(ReleaseStage.RollOut1Percent);
  });

  it('should return RollOut100Percent after RollOut1Percent', () => {
    expect(getNextStage(ReleaseStage.RollOut1Percent)).toBe(ReleaseStage.RollOut100Percent);
  });

  it('should return null for RollOut100Percent (final stage)', () => {
    expect(getNextStage(ReleaseStage.RollOut100Percent)).toBeNull();
  });

  it('should return null for an unrecognized stage value', () => {
    expect(getNextStage('Unknown Stage' as ReleaseStage)).toBeNull();
  });
});
