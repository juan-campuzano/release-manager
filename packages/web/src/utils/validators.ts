/**
 * Validation utilities for the Release Web Application
 */

/**
 * Validates semantic version format (e.g., "1.2.3")
 * @param version - The version string to validate
 * @returns true if the version follows semantic versioning format
 */
export function isValidSemanticVersion(version: string): boolean {
  const semanticVersionRegex = /^\d+\.\d+\.\d+$/;
  return semanticVersionRegex.test(version);
}

/**
 * Validates quality threshold value (must be between 0 and 100)
 * @param threshold - The threshold value to validate
 * @returns true if the threshold is between 0 and 100 (inclusive)
 */
export function isValidQualityThreshold(threshold: number): boolean {
  return typeof threshold === 'number' && threshold >= 0 && threshold <= 100;
}

/**
 * Validates rollout percentage value (must be between 0 and 100)
 * @param percentage - The percentage value to validate
 * @returns true if the percentage is between 0 and 100 (inclusive)
 */
export function isValidRolloutPercentage(percentage: number): boolean {
  return typeof percentage === 'number' && percentage >= 0 && percentage <= 100;
}
