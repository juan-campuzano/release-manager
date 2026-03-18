/**
 * Azure DevOps integration adapter
 * Provides methods to interact with Azure DevOps API for repository, pipeline, and work item data
 */

import * as azdev from 'azure-devops-node-api';
import { Branch, Tag, Build, WorkItem, BuildStatus, CIExecution } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { IntegrationError, AuthenticationError } from '../common/errors';
import { Cache } from '../data/cache';
import { logger } from '../common/logger';
import { CircuitBreaker } from './circuit-breaker';

/**
 * Map Azure DevOps build status/result to CIExecution status
 */
export function mapAzureBuildStatus(
  status: string | undefined,
  result: string | undefined
): CIExecution['status'] {
  if (status === 'notStarted') return 'pending';
  if (status === 'inProgress') return 'running';
  if (status === 'completed') {
    if (result === 'succeeded') return 'passed';
    return 'failed';
  }
  // Default for any unknown status
  return 'failed';
}

/**
 * Azure DevOps authentication credentials
 */
export interface AzureCredentials {
  token: string;
  organizationUrl: string; // e.g., https://dev.azure.com/myorg
}

/**
 * Configuration for retry logic
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
}

/**
 * Azure DevOps adapter for repository, pipeline, and work item operations
 */
export class AzureDevOpsAdapter {
  private connection: azdev.WebApi | null = null;
  private cache: Cache;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000
  };
  
  constructor(cache: Cache, _circuitBreaker?: CircuitBreaker) {
    this.cache = cache;
  }
  
  /**
   * Authenticate with Azure DevOps using credentials
   * @param credentials Azure DevOps authentication credentials
   * @returns Result indicating success or failure
   */
  async authenticate(credentials: AzureCredentials): Promise<Result<void, AuthenticationError>> {
    try {
      logger.info('Attempting Azure DevOps authentication', { 
        organizationUrl: credentials.organizationUrl 
      });
      
      // Create authentication handler
      const authHandler = azdev.getPersonalAccessTokenHandler(credentials.token);
      
      // Create connection to Azure DevOps
      this.connection = new azdev.WebApi(credentials.organizationUrl, authHandler);
      
      // Verify authentication by fetching connection data
      const coreApi = await this.connection.getCoreApi();
      await coreApi.getProjects();
      
      logger.info('Azure DevOps authentication successful');
      return Success(undefined);
    } catch (error) {
      const authError = new AuthenticationError(
        'Azure DevOps authentication failed. Please check your credentials.',
        error as Error
      );
      
      // Log the failure with details
      logger.error('Azure DevOps authentication failed', error as Error, {
        organizationUrl: credentials.organizationUrl
      });
      
      return Failure(authError);
    }
  }
  
  /**
   * Get branches for a repository
   * @param repository Repository in format "project/repo"
   * @returns Result with array of branches
   */
  async getBranches(repository: string): Promise<Result<Branch[], IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cached = this.cache.getAzureBranches(repository);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const [project, repo] = this.parseRepository(repository);
        
        const gitApi = await this.connection!.getGitApi();
        const refs = await gitApi.getRefs(repo, project, 'heads/');
        
        const branches: Branch[] = refs.map(ref => ({
          name: ref.name?.replace('refs/heads/', '') || '',
          commit: ref.objectId || '',
          protected: false, // Azure DevOps doesn't provide this in basic ref info
          createdAt: new Date() // Azure DevOps doesn't provide creation date in basic ref info
        }));
        
        // Cache the result
        this.cache.setAzureBranches(repository, branches);
        
        return Success(branches);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve branches for ${repository}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Get tags for a repository
   * @param repository Repository in format "project/repo"
   * @returns Result with array of tags
   */
  async getTags(repository: string): Promise<Result<Tag[], IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `azure:tags:${repository}`;
    const cached = this.cache.get<Tag[]>(cacheKey);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const [project, repo] = this.parseRepository(repository);
        
        const gitApi = await this.connection!.getGitApi();
        const refs = await gitApi.getRefs(repo, project, 'tags/');
        
        const tags: Tag[] = refs.map(ref => ({
          name: ref.name?.replace('refs/tags/', '') || '',
          commit: ref.objectId || '',
          message: '', // Basic ref info doesn't include message
          createdAt: new Date() // Azure DevOps doesn't provide creation date in basic ref info
        }));
        
        // Cache the result
        this.cache.set(cacheKey, tags, Cache.TTL_5_MINUTES);
        
        return Success(tags);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve tags for ${repository}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Get build status for a specific pipeline
   * @param pipelineId Pipeline ID
   * @returns Result with build status
   */
  async getBuildStatus(pipelineId: string): Promise<Result<BuildStatus, IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const buildApi = await this.connection!.getBuildApi();
        
        // Get the latest build for this pipeline
        const builds = await buildApi.getBuilds(
          '', // project - empty string for all projects
          [parseInt(pipelineId)],
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1 // top: get only the latest build
        );
        
        if (builds.length === 0) {
          return Success('pending' as BuildStatus);
        }
        
        const latestBuild = builds[0];
        const status = this.mapAzureBuildStatus(latestBuild.status, latestBuild.result);
        
        return Success(status);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve build status for pipeline ${pipelineId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Get builds for a pipeline and branch
   * @param pipelineId Pipeline ID
   * @param branch Branch name
   * @returns Result with array of builds
   */
  async getBuilds(pipelineId: string, branch: string): Promise<Result<Build[], IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `azure:builds:${pipelineId}:${branch}`;
    const cached = this.cache.get<Build[]>(cacheKey);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const buildApi = await this.connection!.getBuildApi();
        
        const azureBuilds = await buildApi.getBuilds(
          '', // project - empty string for all projects
          [parseInt(pipelineId)],
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          100, // top: get up to 100 builds
          undefined,
          undefined,
          undefined,
          undefined,
          branch
        );
        
        const builds: Build[] = azureBuilds.map(build => ({
          id: build.id?.toString() || '',
          number: build.buildNumber || '',
          status: this.mapAzureBuildStatus(build.status, build.result),
          branch: build.sourceBranch?.replace('refs/heads/', '') || branch,
          commit: build.sourceVersion || '',
          startedAt: build.startTime ? new Date(build.startTime) : new Date(),
          completedAt: build.finishTime ? new Date(build.finishTime) : undefined
        }));
        
        // Cache the result
        this.cache.set(cacheKey, builds, Cache.TTL_5_MINUTES);
        
        return Success(builds);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve builds for pipeline ${pipelineId} and branch ${branch}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Get pipeline builds across all branches for a pipeline ID
   * Returns CIExecution records for display in the pipeline executions panel
   * @param pipelineId Pipeline definition ID
   * @returns Result with array of CI executions
   */
  async getPipelineBuilds(pipelineId: string): Promise<Result<CIExecution[], IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `azure:pipelineBuilds:${pipelineId}`;
    const cached = this.cache.get<CIExecution[]>(cacheKey);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const buildApi = await this.connection!.getBuildApi();
        
        const azureBuilds = await buildApi.getBuilds(
          '', // project - empty string for all projects
          [parseInt(pipelineId)],
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          100 // top: get up to 100 builds
        );
        
        const executions: CIExecution[] = azureBuilds.map(build => ({
          id: build.id?.toString() || '',
          runNumber: build.buildNumber || '',
          status: mapAzureBuildStatus(
            build.status === 1 ? 'inProgress' :
            build.status === 2 ? 'completed' :
            build.status === 32 ? 'notStarted' : String(build.status ?? ''),
            build.result === 2 ? 'succeeded' :
            build.result === 4 ? 'partiallySucceeded' :
            build.result === 8 ? 'failed' :
            build.result === 32 ? 'canceled' : String(build.result ?? '')
          ),
          branch: build.sourceBranch?.replace('refs/heads/', '') || '',
          commitSha: build.sourceVersion || '',
          startedAt: build.startTime ? new Date(build.startTime).toISOString() : new Date().toISOString(),
          ...(build.finishTime ? { completedAt: new Date(build.finishTime).toISOString() } : {})
        }));
        
        // Cache the result
        this.cache.set(cacheKey, executions, Cache.TTL_5_MINUTES);
        
        return Success(executions);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve pipeline builds for pipeline ${pipelineId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Get work items associated with a release
   * @param releaseId Release ID
   * @returns Result with array of work items
   */
  async getWorkItems(releaseId: string): Promise<Result<WorkItem[], IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `azure:workitems:${releaseId}`;
    const cached = this.cache.get<WorkItem[]>(cacheKey);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const workItemApi = await this.connection!.getWorkItemTrackingApi();
        
        // Get work items by release ID
        // Note: This is a simplified implementation
        // In production, you'd query work items linked to the release
        const workItemIds = await this.getWorkItemIdsForRelease(releaseId);
        
        if (workItemIds.length === 0) {
          return Success([]);
        }
        
        const workItems = await workItemApi.getWorkItems(
          workItemIds,
          undefined,
          undefined,
          undefined,
          undefined
        );
        
        const mappedWorkItems: WorkItem[] = workItems.map(wi => ({
          id: wi.id?.toString() || '',
          title: wi.fields?.['System.Title'] || '',
          type: this.mapWorkItemType(wi.fields?.['System.WorkItemType']),
          state: wi.fields?.['System.State'] || '',
          assignedTo: wi.fields?.['System.AssignedTo']?.displayName,
          url: wi.url || ''
        }));
        
        // Cache the result
        this.cache.set(cacheKey, mappedWorkItems, Cache.TTL_5_MINUTES);
        
        return Success(mappedWorkItems);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve work items for release ${releaseId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Detect new builds since a specific date
   * @param pipelineId Pipeline ID
   * @param since Date to check from
   * @returns Result with array of new builds
   */
  async detectNewBuilds(pipelineId: string, since: Date): Promise<Result<Build[], IntegrationError>> {
    if (!this.connection) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const buildApi = await this.connection!.getBuildApi();
        
        const azureBuilds = await buildApi.getBuilds(
          '', // project - empty string for all projects
          [parseInt(pipelineId)],
          undefined,
          undefined,
          since, // minTime
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          100 // top
        );
        
        const builds: Build[] = azureBuilds.map(build => ({
          id: build.id?.toString() || '',
          number: build.buildNumber || '',
          status: this.mapAzureBuildStatus(build.status, build.result),
          branch: build.sourceBranch?.replace('refs/heads/', '') || '',
          commit: build.sourceVersion || '',
          startedAt: build.startTime ? new Date(build.startTime) : new Date(),
          completedAt: build.finishTime ? new Date(build.finishTime) : undefined
        }));
        
        return Success(builds);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to detect new builds for pipeline ${pipelineId}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Parse repository string into project and repo
   * @param repository Repository in format "project/repo"
   * @returns Tuple of [project, repo]
   */
  private parseRepository(repository: string): [string, string] {
    const parts = repository.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repository format: ${repository}. Expected "project/repo"`);
    }
    return [parts[0], parts[1]];
  }
  
  /**
   * Map Azure DevOps build status to our BuildStatus type
   * @param status Azure build status
   * @param result Azure build result
   * @returns Mapped build status
   */
  private mapAzureBuildStatus(
    status: any,
    result: any
  ): BuildStatus {
    // Azure DevOps BuildStatus enum:
    // None = 0, InProgress = 1, Completed = 2, Cancelling = 4, Postponed = 8, NotStarted = 32, All = 47
    
    // Azure DevOps BuildResult enum:
    // None = 0, Succeeded = 2, PartiallySucceeded = 4, Failed = 8, Canceled = 32
    
    // If build is not completed, check status
    if (status === 1) { // InProgress
      return 'running';
    }
    if (status === 0 || status === 32) { // None or NotStarted
      return 'pending';
    }
    
    // If completed, check result
    if (result === 2 || result === 4) { // Succeeded or PartiallySucceeded
      return 'passed';
    }
    if (result === 8 || result === 32) { // Failed or Canceled
      return 'failed';
    }
    
    return 'pending';
  }
  
  /**
   * Map Azure DevOps work item type to our WorkItemType
   * @param type Azure work item type
   * @returns Mapped work item type
   */
  private mapWorkItemType(type: string): 'Bug' | 'Feature' | 'Task' | 'User Story' {
    const normalized = type?.toLowerCase() || '';
    
    if (normalized.includes('bug')) return 'Bug';
    if (normalized.includes('feature')) return 'Feature';
    if (normalized.includes('task')) return 'Task';
    if (normalized.includes('user story') || normalized.includes('story')) return 'User Story';
    
    return 'Task'; // Default
  }
  
  /**
   * Get work item IDs associated with a release
   * This is a placeholder implementation
   * @param _releaseId Release ID (unused in placeholder)
   * @returns Array of work item IDs
   */
  private async getWorkItemIdsForRelease(_releaseId: string): Promise<number[]> {
    // In a real implementation, this would query the Azure DevOps API
    // to find work items linked to the release
    // For now, return empty array
    return [];
  }
  
  /**
   * Retry an operation with exponential backoff
   * @param operation Operation to retry
   * @returns Result of the operation
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<Result<T, IntegrationError>>
  ): Promise<Result<T, IntegrationError>> {
    let lastError: IntegrationError | null = null;
    
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      const result = await operation();
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Check if error is retryable
      if (!this.isRetryableError(result.error)) {
        return result;
      }
      
      // Don't sleep on the last attempt
      if (attempt < this.retryConfig.maxRetries - 1) {
        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await this.sleep(delay);
      }
    }
    
    return Failure(lastError || new IntegrationError('Max retries exceeded'));
  }
  
  /**
   * Check if an error is retryable
   * @param error Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: IntegrationError): boolean {
    // Retry on network errors, timeouts, and rate limiting
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('503')
    );
  }
  
  /**
   * Sleep for a specified duration
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
