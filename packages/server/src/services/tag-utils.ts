/**
 * Tag utility functions for version tag pattern matching and stage progression.
 * Extracts semantic version strings from git tag names, validates tag formats,
 * and determines the next release pipeline stage.
 */

import { ReleaseStage } from '../domain/types';

// Matches optional path prefix (e.g., "release/"), optional "v" prefix, semver X.Y.Z,
// and optional pre-release suffix (e.g., "-rc.1", "-beta.2", "-alpha.3")
const VERSION_TAG_PATTERN = /^(?:.*\/)?v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)$/;

/**
 * Extract the semantic version string from a tag name.
 * Strips path prefixes (e.g., "release/") and optional "v" prefix.
 *
 * @example extractVersion("v1.2.3")          → "1.2.3"
 * @example extractVersion("release/v1.2.3")  → "1.2.3"
 * @example extractVersion("1.2.3")           → "1.2.3"
 * @example extractVersion("1.0.0-rc.1")      → "1.0.0-rc.1"
 * @example extractVersion("feature/abc")     → null
 */
export function extractVersion(tagName: string): string | null {
  const match = tagName.match(VERSION_TAG_PATTERN);
  return match ? match[1] : null;
}

/**
 * Check if a tag name matches the version tag pattern.
 *
 * @example isVersionTag("v1.2.3")        → true
 * @example isVersionTag("release/1.2.3") → true
 * @example isVersionTag("feature/abc")   → false
 */
export function isVersionTag(tagName: string): boolean {
  return VERSION_TAG_PATTERN.test(tagName);
}
/**
 * Extract the base semver (X.Y.Z) from a version string, stripping any pre-release suffix.
 *
 * @example extractBaseVersion("1.0.0-rc.1")  → "1.0.0"
 * @example extractBaseVersion("1.2.3")       → "1.2.3"
 */
export function extractBaseVersion(version: string): string {
  const idx = version.indexOf('-');
  return idx === -1 ? version : version.substring(0, idx);
}

/**
 * Ordered pipeline stages from first to last.
 */
const STAGE_ORDER: ReleaseStage[] = [
  ReleaseStage.ReleaseBranching,
  ReleaseStage.FinalReleaseCandidate,
  ReleaseStage.SubmitForAppStoreReview,
  ReleaseStage.RollOut1Percent,
  ReleaseStage.RollOut100Percent,
];

/**
 * Get the next release stage in the pipeline order.
 * Returns `null` if the current stage is the final stage (RollOut100Percent)
 * or if the stage is not recognized.
 *
 * @example getNextStage(ReleaseStage.ReleaseBranching)       → ReleaseStage.FinalReleaseCandidate
 * @example getNextStage(ReleaseStage.RollOut100Percent)      → null
 */
export function getNextStage(current: ReleaseStage): ReleaseStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
