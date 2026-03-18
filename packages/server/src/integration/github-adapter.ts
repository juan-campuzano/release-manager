/**
 * GitHub integration adapter
 * Provides methods to interact with GitHub API for repository data
 */

import { Octokit } from '@octokit/rest';
import { Branch, Tag, Commit } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { IntegrationError, AuthenticationError } from '../common/errors';
import { Cache } from '../data/cache';
import { logger } from '../common/logger';
import { CircuitBreaker } from './circuit-breaker';

/**
 * GitHub authentication credentials
 */
export interface GitHubCredentials {
  token: string;
  baseUrl?: string; // Optional for GitHub Enterprise
}

/**
 * Configuration for retry logic
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
}

/**
 * GitHub adapter for repository operations
 */
export class GitHubAdapter {
  private octokit: Octokit | null = null;
  private cache: Cache;
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000
  };
  
  constructor(cache: Cache, circuitBreaker?: CircuitBreaker) {
    this.cache = cache;
    this.circuitBreaker = circuitBreaker || new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    });
  }
  
  /**
   * Authenticate with GitHub using credentials
   * @param credentials GitHub authentication credentials
   * @returns Result indicating success or failure
   */
  async authenticate(credentials: GitHubCredentials): Promise<Result<void, AuthenticationError>> {
    try {
      logger.info('Attempting GitHub authentication');
      
      // Create Octokit instance with credentials
      this.octokit = new Octokit({
        auth: credentials.token,
        baseUrl: credentials.baseUrl || 'https://api.github.com'
      });
      
      // Verify authentication by fetching user info
      await this.octokit.users.getAuthenticated();
      
      logger.info('GitHub authentication successful');
      return Success(undefined);
    } catch (error) {
      const authError = new AuthenticationError(
        'GitHub authentication failed. Please check your credentials.',
        error as Error
      );
      
      // Log the failure with details
      logger.error('GitHub authentication failed', error as Error, {
        baseUrl: credentials.baseUrl || 'https://api.github.com'
      });
      
      return Failure(authError);
    }
  }
  
  /**
   * Get branches for a repository
   * @param repository Repository in format "owner/repo"
   * @returns Result with array of branches
   */
  async getBranches(repository: string): Promise<Result<Branch[], IntegrationError>> {
    if (!this.octokit) {
      const error = new IntegrationError('Not authenticated. Call authenticate() first.');
      logger.error('GitHub getBranches called without authentication', undefined, { repository });
      return Failure(error);
    }
    
    // Check cache first
    const cached = this.cache.getGitHubBranches(repository);
    if (cached) {
      logger.info('Returning cached GitHub branches', { repository, count: cached.length });
      return Success(cached);
    }
    
    return this.circuitBreaker.execute(
      async () => this.retryWithBackoff(async () => {
        try {
          logger.info('Fetching GitHub branches', { repository });
          const [owner, repo] = this.parseRepository(repository);
          
          const response = await this.octokit!.repos.listBranches({
            owner,
            repo,
            per_page: 100
          });
          
          const branches: Branch[] = response.data.map(branch => ({
            name: branch.name,
            commit: branch.commit.sha,
            protected: branch.protected,
            createdAt: new Date() // GitHub API doesn't provide creation date for branches
          }));
          
          // Cache the result
          this.cache.setGitHubBranches(repository, branches);
          
          logger.info('Successfully fetched GitHub branches', { repository, count: branches.length });
          return Success(branches);
        } catch (error) {
          logger.error('Failed to fetch GitHub branches', error as Error, { repository });
          return Failure(new IntegrationError(
            `Failed to retrieve branches for ${repository}`,
            error as Error
          ));
        }
      }),
      () => {
        logger.warn('Circuit breaker open, returning cached GitHub branches', { repository });
        return Success(cached || []);
      }
    );
  }
  
  /**
   * Get tags for a repository
   * @param repository Repository in format "owner/repo"
   * @returns Result with array of tags
   */
  async getTags(repository: string): Promise<Result<Tag[], IntegrationError>> {
    if (!this.octokit) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `github:tags:${repository}`;
    const cached = this.cache.get<Tag[]>(cacheKey);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const [owner, repo] = this.parseRepository(repository);
        
        const response = await this.octokit!.repos.listTags({
          owner,
          repo,
          per_page: 100
        });
        
        const tags: Tag[] = response.data.map(tag => ({
          name: tag.name,
          commit: tag.commit.sha,
          message: '', // Basic tag info doesn't include message
          createdAt: new Date() // GitHub API doesn't provide creation date in list
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
   * Get commits for a repository branch
   * @param repository Repository in format "owner/repo"
   * @param branch Branch name
   * @returns Result with array of commits
   */
  async getCommits(repository: string, branch: string): Promise<Result<Commit[], IntegrationError>> {
    if (!this.octokit) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    // Check cache first
    const cacheKey = `github:commits:${repository}:${branch}`;
    const cached = this.cache.get<Commit[]>(cacheKey);
    if (cached) {
      return Success(cached);
    }
    
    return this.retryWithBackoff(async () => {
      try {
        const [owner, repo] = this.parseRepository(repository);
        
        const response = await this.octokit!.repos.listCommits({
          owner,
          repo,
          sha: branch,
          per_page: 100
        });
        
        const commits: Commit[] = response.data.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author?.name || 'Unknown',
          date: new Date(commit.commit.author?.date || Date.now())
        }));
        
        // Cache the result
        this.cache.set(cacheKey, commits, Cache.TTL_5_MINUTES);
        
        return Success(commits);
      } catch (error) {
        return Failure(new IntegrationError(
          `Failed to retrieve commits for ${repository}/${branch}`,
          error as Error
        ));
      }
    });
  }
  
  /**
   * Detect new branches created since a specific date
   * @param repository Repository in format "owner/repo"
   * @param since Date to check from
   * @returns Result with array of new branches
   */
  async detectNewBranches(repository: string, since: Date): Promise<Result<Branch[], IntegrationError>> {
    // Get all branches
    const branchesResult = await this.getBranches(repository);
    
    if (!branchesResult.success) {
      return branchesResult;
    }
    
    // Filter branches created after the 'since' date
    // Note: GitHub API doesn't provide branch creation dates directly
    // This is a simplified implementation that compares commit dates
    const newBranches: Branch[] = [];
    
    for (const branch of branchesResult.value) {
      const commitsResult = await this.getCommits(repository, branch.name);
      
      if (commitsResult.success && commitsResult.value.length > 0) {
        const latestCommit = commitsResult.value[0];
        if (latestCommit.date >= since) {
          newBranches.push(branch);
        }
      }
    }
    
    return Success(newBranches);
  }
  
  /**
   * Detect new tags created since a specific date
   * @param repository Repository in format "owner/repo"
   * @param since Date to check from
   * @returns Result with array of new tags
   */
  async detectNewTags(repository: string, since: Date): Promise<Result<Tag[], IntegrationError>> {
    // Get all tags
    const tagsResult = await this.getTags(repository);
    
    if (!tagsResult.success) {
      return tagsResult;
    }
    
    // Filter tags created after the 'since' date
    // Note: This is a simplified implementation
    // In production, you'd want to fetch tag details to get accurate creation dates
    const newTags: Tag[] = [];
    
    for (const tag of tagsResult.value) {
      // Get commit details for the tag
      const commitResult = await this.getCommitDetails(repository, tag.commit);
      
      if (commitResult.success) {
        const commit = commitResult.value;
        if (commit.date >= since) {
          newTags.push({
            ...tag,
            createdAt: commit.date
          });
        }
      }
    }
    
    return Success(newTags);
  }
  
  /**
   * Get detailed information about a specific commit
   * @param repository Repository in format "owner/repo"
   * @param sha Commit SHA
   * @returns Result with commit details
   */
  private async getCommitDetails(repository: string, sha: string): Promise<Result<Commit, IntegrationError>> {
    if (!this.octokit) {
      return Failure(new IntegrationError('Not authenticated. Call authenticate() first.'));
    }
    
    try {
      const [owner, repo] = this.parseRepository(repository);
      
      const response = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: sha
      });
      
      const commit: Commit = {
        sha: response.data.sha,
        message: response.data.commit.message,
        author: response.data.commit.author?.name || 'Unknown',
        date: new Date(response.data.commit.author?.date || Date.now())
      };
      
      return Success(commit);
    } catch (error) {
      return Failure(new IntegrationError(
        `Failed to retrieve commit details for ${sha}`,
        error as Error
      ));
    }
  }
  
  /**
   * Parse repository string into owner and repo
   * @param repository Repository in format "owner/repo"
   * @returns Tuple of [owner, repo]
   */
  private parseRepository(repository: string): [string, string] {
    const parts = repository.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repository format: ${repository}. Expected "owner/repo"`);
    }
    return [parts[0], parts[1]];
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
        if (attempt > 0) {
          logger.info('Operation succeeded after retry', { attempt: attempt + 1 });
        }
        return result;
      }
      
      lastError = result.error;
      
      // Check if error is retryable
      if (!this.isRetryableError(result.error)) {
        logger.warn('Non-retryable error encountered', { error: result.error.message });
        return result;
      }
      
      // Don't sleep on the last attempt
      if (attempt < this.retryConfig.maxRetries - 1) {
        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
        logger.info('Retrying operation with exponential backoff', { 
          attempt: attempt + 1, 
          delay,
          error: result.error.message 
        });
        await this.sleep(delay);
      }
    }
    
    logger.error('Max retries exceeded', lastError || undefined, { 
      maxRetries: this.retryConfig.maxRetries 
    });
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
