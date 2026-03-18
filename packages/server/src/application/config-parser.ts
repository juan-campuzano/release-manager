/**
 * Configuration Parser for Release Manager Tool
 * Handles parsing, formatting, and validation of ReleaseConfiguration objects
 */

import { Result, Success, Failure } from '../common/result';
import { ParseError } from '../common/errors';
import { ReleaseConfiguration, Platform, RepositoryConfig } from '../domain/types';
import { logger } from '../common/logger';

/**
 * Validation result containing validation status and error messages
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Config Parser interface for parsing, formatting, and validating release configurations
 */
export interface ConfigParser {
  parse(configFile: string): Result<ReleaseConfiguration, ParseError>;
  format(config: ReleaseConfiguration): string;
  validate(config: ReleaseConfiguration): ValidationResult;
  validateRepositoryConfig(config: Partial<RepositoryConfig>): ValidationResult;
  parseRepositoryConfig(json: string): Result<RepositoryConfig, ParseError>;
  formatRepositoryConfig(config: RepositoryConfig): string;
}

/**
 * JSON-based implementation of ConfigParser
 */
export class JSONConfigParser implements ConfigParser {
  /**
   * Parse a configuration file string into a ReleaseConfiguration object
   * @param configFile - JSON string containing release configuration
   * @returns Result containing ReleaseConfiguration or ParseError
   */
  parse(configFile: string): Result<ReleaseConfiguration, ParseError> {
    try {
      logger.info('Parsing release configuration');
      
      // Parse JSON
      const parsed = JSON.parse(configFile);
      
      // Convert to ReleaseConfiguration
      const config: ReleaseConfiguration = {
        platform: parsed.platform,
        version: parsed.version,
        branchName: parsed.branchName,
        repositoryUrl: parsed.repositoryUrl,
        sourceType: parsed.sourceType,
        requiredSquads: parsed.requiredSquads || [],
        qualityThresholds: {
          crashRateThreshold: parsed.qualityThresholds?.crashRateThreshold,
          cpuExceptionRateThreshold: parsed.qualityThresholds?.cpuExceptionRateThreshold
        },
        rolloutStages: parsed.rolloutStages || [],
        ciPipelineId: parsed.ciPipelineId,
        analyticsProjectId: parsed.analyticsProjectId
      };
      
      // Validate the parsed configuration
      const validationResult = this.validate(config);
      if (!validationResult.valid) {
        logger.error('Configuration validation failed', undefined, {
          errors: validationResult.errors
        });
        return Failure(
          new ParseError(
            `Invalid configuration: ${validationResult.errors.join(', ')}`
          )
        );
      }
      
      logger.info('Configuration parsed successfully', {
        platform: config.platform,
        version: config.version
      });
      return Success(config);
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error('JSON syntax error in configuration', error);
        return Failure(
          new ParseError(
            `Failed to parse configuration file: ${error.message}`
          )
        );
      }
      logger.error('Unexpected error parsing configuration', error as Error);
      return Failure(
        new ParseError(
          `Unexpected error parsing configuration: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Format a ReleaseConfiguration object into a JSON string
   * @param config - ReleaseConfiguration object to format
   * @returns JSON string representation of the configuration
   */
  format(config: ReleaseConfiguration): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * Validate a ReleaseConfiguration object
   * @param config - ReleaseConfiguration object to validate
   * @returns ValidationResult with validation status and error messages
   */
  validate(config: ReleaseConfiguration): ValidationResult {
    const errors: string[] = [];
    
    // Validate platform
    if (!config.platform) {
      errors.push('Platform is required');
    } else if (!Object.values(Platform).includes(config.platform)) {
      errors.push(`Invalid platform: must be one of ${Object.values(Platform).join(', ')}`);
    }
    
    // Validate version
    if (!config.version) {
      errors.push('Version is required');
    } else if (typeof config.version !== 'string' || config.version.trim() === '') {
      errors.push('Version must be a non-empty string');
    } else if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('Version must follow semantic versioning format (e.g., 1.2.3)');
    }
    
    // Validate branchName
    if (!config.branchName) {
      errors.push('Branch name is required');
    } else if (typeof config.branchName !== 'string' || config.branchName.trim() === '') {
      errors.push('Branch name must be a non-empty string');
    }
    
    // Validate repositoryUrl
    if (!config.repositoryUrl) {
      errors.push('Repository URL is required');
    } else if (typeof config.repositoryUrl !== 'string' || config.repositoryUrl.trim() === '') {
      errors.push('Repository URL must be a non-empty string');
    }
    
    // Validate sourceType
    if (!config.sourceType) {
      errors.push('Source type is required');
    } else if (config.sourceType !== 'github' && config.sourceType !== 'azure') {
      errors.push('Source type must be either "github" or "azure"');
    }
    
    // Validate requiredSquads
    if (!config.requiredSquads) {
      errors.push('Required squads is required');
    } else if (!Array.isArray(config.requiredSquads)) {
      errors.push('Required squads must be an array');
    } else if (config.requiredSquads.length === 0) {
      errors.push('At least one required squad must be specified');
    } else {
      // Check each squad is a non-empty string
      config.requiredSquads.forEach((squad, index) => {
        if (typeof squad !== 'string' || squad.trim() === '') {
          errors.push(`Required squad at index ${index} must be a non-empty string`);
        }
      });
    }
    
    // Validate qualityThresholds
    if (!config.qualityThresholds) {
      errors.push('Quality thresholds is required');
    } else {
      if (config.qualityThresholds.crashRateThreshold === undefined || 
          config.qualityThresholds.crashRateThreshold === null) {
        errors.push('Crash rate threshold is required');
      } else if (typeof config.qualityThresholds.crashRateThreshold !== 'number') {
        errors.push('Crash rate threshold must be a number');
      } else if (config.qualityThresholds.crashRateThreshold < 0 || 
                 config.qualityThresholds.crashRateThreshold > 100) {
        errors.push('Crash rate threshold must be between 0 and 100');
      }
      
      if (config.qualityThresholds.cpuExceptionRateThreshold === undefined || 
          config.qualityThresholds.cpuExceptionRateThreshold === null) {
        errors.push('CPU exception rate threshold is required');
      } else if (typeof config.qualityThresholds.cpuExceptionRateThreshold !== 'number') {
        errors.push('CPU exception rate threshold must be a number');
      } else if (config.qualityThresholds.cpuExceptionRateThreshold < 0 || 
                 config.qualityThresholds.cpuExceptionRateThreshold > 100) {
        errors.push('CPU exception rate threshold must be between 0 and 100');
      }
    }
    
    // Validate rolloutStages
    if (!config.rolloutStages) {
      errors.push('Rollout stages is required');
    } else if (!Array.isArray(config.rolloutStages)) {
      errors.push('Rollout stages must be an array');
    } else if (config.rolloutStages.length === 0) {
      errors.push('At least one rollout stage must be specified');
    } else {
      // Check each stage is a valid percentage
      config.rolloutStages.forEach((stage, index) => {
        if (typeof stage !== 'number') {
          errors.push(`Rollout stage at index ${index} must be a number`);
        } else if (stage < 0 || stage > 100) {
          errors.push(`Rollout stage at index ${index} must be between 0 and 100`);
        }
      });
    }
    
    // Optional fields validation (if provided)
    if (config.ciPipelineId !== undefined && config.ciPipelineId !== null) {
      if (typeof config.ciPipelineId !== 'string' || config.ciPipelineId.trim() === '') {
        errors.push('CI pipeline ID must be a non-empty string if provided');
      }
    }
    
    if (config.analyticsProjectId !== undefined && config.analyticsProjectId !== null) {
      if (typeof config.analyticsProjectId !== 'string' || config.analyticsProjectId.trim() === '') {
        errors.push('Analytics project ID must be a non-empty string if provided');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a partial RepositoryConfig object
   * @param config - Partial RepositoryConfig object to validate
   * @returns ValidationResult with validation status and error messages
   */
  validateRepositoryConfig(config: Partial<RepositoryConfig>): ValidationResult {
    const errors: string[] = [];

    // Validate name
    if (config.name === undefined || config.name === null) {
      errors.push('Name is required');
    } else if (typeof config.name !== 'string' || config.name.trim() === '') {
      errors.push('Name must be a non-empty string');
    } else if (config.name.length > 100) {
      errors.push('Name must be at most 100 characters');
    }

    // Validate repositoryUrl (well-formed URL)
    if (config.repositoryUrl === undefined || config.repositoryUrl === null) {
      errors.push('Repository URL is required');
    } else if (typeof config.repositoryUrl !== 'string' || config.repositoryUrl.trim() === '') {
      errors.push('Repository URL must be a non-empty string');
    } else {
      try {
        new URL(config.repositoryUrl);
      } catch {
        errors.push('Repository URL must be a well-formed URL');
      }
    }

    // Validate sourceType
    if (config.sourceType === undefined || config.sourceType === null) {
      errors.push('Source type is required');
    } else if (config.sourceType !== 'github' && config.sourceType !== 'azure') {
      errors.push('Source type must be either "github" or "azure"');
    }

    // Validate requiredSquads
    if (config.requiredSquads === undefined || config.requiredSquads === null) {
      errors.push('Required squads is required');
    } else if (!Array.isArray(config.requiredSquads)) {
      errors.push('Required squads must be an array');
    } else if (config.requiredSquads.length === 0) {
      errors.push('At least one required squad must be specified');
    } else {
      config.requiredSquads.forEach((squad, index) => {
        if (typeof squad !== 'string' || squad.trim() === '') {
          errors.push(`Required squad at index ${index} must be a non-empty string`);
        }
      });
    }

    // Validate qualityThresholds
    if (config.qualityThresholds === undefined || config.qualityThresholds === null) {
      errors.push('Quality thresholds is required');
    } else {
      if (config.qualityThresholds.crashRateThreshold === undefined ||
          config.qualityThresholds.crashRateThreshold === null) {
        errors.push('Crash rate threshold is required');
      } else if (typeof config.qualityThresholds.crashRateThreshold !== 'number') {
        errors.push('Crash rate threshold must be a number');
      } else if (config.qualityThresholds.crashRateThreshold < 0 ||
                 config.qualityThresholds.crashRateThreshold > 100) {
        errors.push('Crash rate threshold must be between 0 and 100');
      }

      if (config.qualityThresholds.cpuExceptionRateThreshold === undefined ||
          config.qualityThresholds.cpuExceptionRateThreshold === null) {
        errors.push('CPU exception rate threshold is required');
      } else if (typeof config.qualityThresholds.cpuExceptionRateThreshold !== 'number') {
        errors.push('CPU exception rate threshold must be a number');
      } else if (config.qualityThresholds.cpuExceptionRateThreshold < 0 ||
                 config.qualityThresholds.cpuExceptionRateThreshold > 100) {
        errors.push('CPU exception rate threshold must be between 0 and 100');
      }
    }

    // Validate rolloutStages
    if (config.rolloutStages === undefined || config.rolloutStages === null) {
      errors.push('Rollout stages is required');
    } else if (!Array.isArray(config.rolloutStages)) {
      errors.push('Rollout stages must be an array');
    } else if (config.rolloutStages.length === 0) {
      errors.push('At least one rollout stage must be specified');
    } else {
      config.rolloutStages.forEach((stage, index) => {
        if (typeof stage !== 'number') {
          errors.push(`Rollout stage at index ${index} must be a number`);
        } else if (stage < 0 || stage > 100) {
          errors.push(`Rollout stage at index ${index} must be between 0 and 100`);
        }
      });
    }

    // Optional fields validation (if provided)
    if (config.ciPipelineId !== undefined && config.ciPipelineId !== null) {
      if (typeof config.ciPipelineId !== 'string' || config.ciPipelineId.trim() === '') {
        errors.push('CI pipeline ID must be a non-empty string if provided');
      }
    }

    if (config.analyticsProjectId !== undefined && config.analyticsProjectId !== null) {
      if (typeof config.analyticsProjectId !== 'string' || config.analyticsProjectId.trim() === '') {
        errors.push('Analytics project ID must be a non-empty string if provided');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse a JSON string into a RepositoryConfig object
   * @param json - JSON string containing repository configuration
   * @returns Result containing RepositoryConfig or ParseError
   */
  parseRepositoryConfig(json: string): Result<RepositoryConfig, ParseError> {
    try {
      logger.info('Parsing repository configuration');

      const parsed = JSON.parse(json);

      const config: Partial<RepositoryConfig> = {
        id: parsed.id,
        name: parsed.name,
        repositoryUrl: parsed.repositoryUrl,
        sourceType: parsed.sourceType,
        requiredSquads: parsed.requiredSquads,
        qualityThresholds: parsed.qualityThresholds,
        rolloutStages: parsed.rolloutStages,
        ciPipelineId: parsed.ciPipelineId,
        analyticsProjectId: parsed.analyticsProjectId,
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined,
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : undefined,
      };

      const validationResult = this.validateRepositoryConfig(config);
      if (!validationResult.valid) {
        logger.error('Repository configuration validation failed', undefined, {
          errors: validationResult.errors
        });
        return Failure(
          new ParseError(
            `Invalid repository configuration: ${validationResult.errors.join(', ')}`
          )
        );
      }

      logger.info('Repository configuration parsed successfully', {
        name: config.name
      });
      return Success(config as RepositoryConfig);
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error('JSON syntax error in repository configuration', error);
        return Failure(
          new ParseError(
            `Failed to parse repository configuration: ${error.message}`
          )
        );
      }
      logger.error('Unexpected error parsing repository configuration', error as Error);
      return Failure(
        new ParseError(
          `Unexpected error parsing repository configuration: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Format a RepositoryConfig object into a JSON string
   * @param config - RepositoryConfig object to format
   * @returns JSON string representation with 2-space indentation
   */
  formatRepositoryConfig(config: RepositoryConfig): string {
    return JSON.stringify(config, null, 2);
  }
}

/**
 * Create a new instance of the JSON config parser
 */
export function createConfigParser(): ConfigParser {
  return new JSONConfigParser();
}
