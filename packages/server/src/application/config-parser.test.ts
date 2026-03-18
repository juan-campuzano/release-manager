/**
 * Unit tests for Config Parser
 */

import { JSONConfigParser } from './config-parser';
import { Platform, ReleaseConfiguration, RepositoryConfig } from '../domain/types';
import { isSuccess, isFailure } from '../common/result';

describe('JSONConfigParser', () => {
  let parser: JSONConfigParser;

  beforeEach(() => {
    parser = new JSONConfigParser();
  });

  describe('parse', () => {
    it('should parse a valid configuration file', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.2.3',
        branchName: 'release/1.2.3',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A', 'Squad B'],
        qualityThresholds: {
          crashRateThreshold: 2.5,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 10, 50, 100],
        ciPipelineId: 'pipeline-123',
        analyticsProjectId: 'analytics-456'
      });

      const result = parser.parse(configString);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.platform).toBe('iOS');
        expect(result.value.version).toBe('1.2.3');
        expect(result.value.branchName).toBe('release/1.2.3');
        expect(result.value.repositoryUrl).toBe('https://github.com/org/repo');
        expect(result.value.sourceType).toBe('github');
        expect(result.value.requiredSquads).toEqual(['Squad A', 'Squad B']);
        expect(result.value.qualityThresholds.crashRateThreshold).toBe(2.5);
        expect(result.value.qualityThresholds.cpuExceptionRateThreshold).toBe(1.0);
        expect(result.value.rolloutStages).toEqual([1, 10, 50, 100]);
        expect(result.value.ciPipelineId).toBe('pipeline-123');
        expect(result.value.analyticsProjectId).toBe('analytics-456');
      }
    });

    it('should parse a valid configuration without optional fields', () => {
      const configString = JSON.stringify({
        platform: 'Android',
        version: '2.0.0',
        branchName: 'release/2.0.0',
        repositoryUrl: 'https://dev.azure.com/org/project/_git/repo',
        sourceType: 'azure',
        requiredSquads: ['Mobile Team'],
        qualityThresholds: {
          crashRateThreshold: 3.0,
          cpuExceptionRateThreshold: 2.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.platform).toBe('Android');
        expect(result.value.ciPipelineId).toBeUndefined();
        expect(result.value.analyticsProjectId).toBeUndefined();
      }
    });

    it('should return error for invalid JSON syntax', () => {
      const invalidJson = '{ invalid json }';

      const result = parser.parse(invalidJson);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to parse configuration file');
      }
    });

    it('should return error for missing platform', () => {
      const configString = JSON.stringify({
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Platform is required');
      }
    });

    it('should return error for invalid platform', () => {
      const configString = JSON.stringify({
        platform: 'InvalidPlatform',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Invalid platform');
      }
    });

    it('should return error for missing version', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Version is required');
      }
    });

    it('should return error for invalid version format', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: 'invalid-version',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('semantic versioning');
      }
    });

    it('should return error for missing branchName', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Branch name is required');
      }
    });

    it('should return error for missing repositoryUrl', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Repository URL is required');
      }
    });

    it('should return error for missing sourceType', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Source type is required');
      }
    });

    it('should return error for invalid sourceType', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'invalid',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Source type must be either "github" or "azure"');
      }
    });

    it('should return error for empty requiredSquads', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: [],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('At least one required squad must be specified');
      }
    });

    it('should return error for missing quality thresholds', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Crash rate threshold is required');
        expect(result.error.message).toContain('CPU exception rate threshold is required');
      }
    });

    it('should return error for invalid crash rate threshold', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 150,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Crash rate threshold must be between 0 and 100');
      }
    });

    it('should return error for empty rolloutStages', () => {
      const configString = JSON.stringify({
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: []
      });

      const result = parser.parse(configString);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('At least one rollout stage must be specified');
      }
    });
  });

  describe('format', () => {
    it('should format a ReleaseConfiguration to JSON string', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.2.3',
        branchName: 'release/1.2.3',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A', 'Squad B'],
        qualityThresholds: {
          crashRateThreshold: 2.5,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 10, 50, 100],
        ciPipelineId: 'pipeline-123',
        analyticsProjectId: 'analytics-456'
      };

      const formatted = parser.format(config);
      const parsed = JSON.parse(formatted);

      expect(parsed.platform).toBe('iOS');
      expect(parsed.version).toBe('1.2.3');
      expect(parsed.branchName).toBe('release/1.2.3');
      expect(parsed.repositoryUrl).toBe('https://github.com/org/repo');
      expect(parsed.sourceType).toBe('github');
      expect(parsed.requiredSquads).toEqual(['Squad A', 'Squad B']);
      expect(parsed.qualityThresholds.crashRateThreshold).toBe(2.5);
      expect(parsed.qualityThresholds.cpuExceptionRateThreshold).toBe(1.0);
      expect(parsed.rolloutStages).toEqual([1, 10, 50, 100]);
      expect(parsed.ciPipelineId).toBe('pipeline-123');
      expect(parsed.analyticsProjectId).toBe('analytics-456');
    });

    it('should format a ReleaseConfiguration without optional fields', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.Android,
        version: '2.0.0',
        branchName: 'release/2.0.0',
        repositoryUrl: 'https://dev.azure.com/org/project/_git/repo',
        sourceType: 'azure',
        requiredSquads: ['Mobile Team'],
        qualityThresholds: {
          crashRateThreshold: 3.0,
          cpuExceptionRateThreshold: 2.0
        },
        rolloutStages: [1, 100]
      };

      const formatted = parser.format(config);
      const parsed = JSON.parse(formatted);

      expect(parsed.platform).toBe('Android');
      expect(parsed.version).toBe('2.0.0');
      expect(parsed.ciPipelineId).toBeUndefined();
      expect(parsed.analyticsProjectId).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should validate a valid configuration', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.2.3',
        branchName: 'release/1.2.3',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.5,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 10, 50, 100]
      };

      const result = parser.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for missing required fields', () => {
      const config = {
        platform: undefined,
        version: undefined,
        branchName: undefined,
        repositoryUrl: undefined,
        sourceType: undefined,
        requiredSquads: undefined,
        qualityThresholds: undefined,
        rolloutStages: undefined
      } as any;

      const result = parser.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Platform is required');
      expect(result.errors).toContain('Version is required');
      expect(result.errors).toContain('Branch name is required');
      expect(result.errors).toContain('Repository URL is required');
      expect(result.errors).toContain('Source type is required');
      expect(result.errors).toContain('Required squads is required');
      expect(result.errors).toContain('Quality thresholds is required');
      expect(result.errors).toContain('Rollout stages is required');
    });

    it('should return error for invalid version format', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: 'invalid',
        branchName: 'release/1.2.3',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.5,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      };

      const result = parser.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Version must follow semantic versioning format (e.g., 1.2.3)');
    });

    it('should return error for empty string fields', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '  ',
        branchName: '  ',
        repositoryUrl: '  ',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.5,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [1, 100]
      };

      const result = parser.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for threshold values out of range', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: -1,
          cpuExceptionRateThreshold: 150
        },
        rolloutStages: [1, 100]
      };

      const result = parser.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Crash rate threshold must be between 0 and 100');
      expect(result.errors).toContain('CPU exception rate threshold must be between 0 and 100');
    });

    it('should return error for invalid rollout stage values', () => {
      const config: ReleaseConfiguration = {
        platform: Platform.iOS,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/org/repo',
        sourceType: 'github',
        requiredSquads: ['Squad A'],
        qualityThresholds: {
          crashRateThreshold: 2.0,
          cpuExceptionRateThreshold: 1.0
        },
        rolloutStages: [-1, 150]
      };

      const result = parser.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Rollout stage'))).toBe(true);
    });
  });

  describe('validateRepositoryConfig', () => {
    const validRepoConfig: Partial<RepositoryConfig> = {
      name: 'My Config',
      repositoryUrl: 'https://github.com/org/repo',
      sourceType: 'github',
      requiredSquads: ['Squad A'],
      qualityThresholds: {
        crashRateThreshold: 2.5,
        cpuExceptionRateThreshold: 1.0
      },
      rolloutStages: [1, 50, 100]
    };

    it('should accept a valid repository config', () => {
      const result = parser.validateRepositoryConfig(validRepoConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept a valid config with optional fields', () => {
      const result = parser.validateRepositoryConfig({
        ...validRepoConfig,
        ciPipelineId: 'pipeline-123',
        analyticsProjectId: 'analytics-456'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail when name is missing', () => {
      const { name, ...configWithoutName } = validRepoConfig;
      const result = parser.validateRepositoryConfig(configWithoutName);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should fail when name is empty string', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('name'))).toBe(true);
    });

    it('should fail when name exceeds 100 characters', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, name: 'a'.repeat(101) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name must be at most 100 characters');
    });

    it('should accept name with exactly 100 characters', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, name: 'a'.repeat(100) });
      expect(result.valid).toBe(true);
    });

    it('should fail when repositoryUrl is not a valid URL', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, repositoryUrl: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository URL must be a well-formed URL');
    });

    it('should fail when sourceType is invalid', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, sourceType: 'gitlab' as any });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Source type must be either "github" or "azure"');
    });

    it('should accept sourceType "azure"', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, sourceType: 'azure' });
      expect(result.valid).toBe(true);
    });

    it('should fail when requiredSquads is empty', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, requiredSquads: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one required squad must be specified');
    });

    it('should fail when crashRateThreshold is out of range', () => {
      const result = parser.validateRepositoryConfig({
        ...validRepoConfig,
        qualityThresholds: { crashRateThreshold: 101, cpuExceptionRateThreshold: 1.0 }
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Crash rate threshold must be between 0 and 100');
    });

    it('should fail when cpuExceptionRateThreshold is negative', () => {
      const result = parser.validateRepositoryConfig({
        ...validRepoConfig,
        qualityThresholds: { crashRateThreshold: 2.0, cpuExceptionRateThreshold: -1 }
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CPU exception rate threshold must be between 0 and 100');
    });

    it('should fail when rolloutStages is empty', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, rolloutStages: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one rollout stage must be specified');
    });

    it('should fail when a rollout stage is out of range', () => {
      const result = parser.validateRepositoryConfig({ ...validRepoConfig, rolloutStages: [10, 150] });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Rollout stage') && e.includes('between 0 and 100'))).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('should maintain data integrity through parse-format-parse cycle', () => {
      const originalConfig: ReleaseConfiguration = {
        platform: Platform.Desktop,
        version: '3.1.4',
        branchName: 'release/3.1.4',
        repositoryUrl: 'https://github.com/org/desktop-app',
        sourceType: 'github',
        requiredSquads: ['Desktop Team', 'QA Team', 'Security Team'],
        qualityThresholds: {
          crashRateThreshold: 1.5,
          cpuExceptionRateThreshold: 0.8
        },
        rolloutStages: [1, 5, 10, 25, 50, 100],
        ciPipelineId: 'desktop-pipeline',
        analyticsProjectId: 'desktop-analytics'
      };

      // Format to string
      const formatted = parser.format(originalConfig);
      
      // Parse back
      const parseResult = parser.parse(formatted);
      expect(isSuccess(parseResult)).toBe(true);
      
      if (isSuccess(parseResult)) {
        // Format again
        const reformatted = parser.format(parseResult.value);
        
        // Parse again
        const reparseResult = parser.parse(reformatted);
        expect(isSuccess(reparseResult)).toBe(true);
        
        if (isSuccess(reparseResult)) {
          // Should be equivalent to original
          expect(reparseResult.value).toEqual(originalConfig);
        }
      }
    });
  });
});
