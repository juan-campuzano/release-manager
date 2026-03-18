/**
 * Cache layer with TTL (Time To Live) support
 * Provides in-memory caching for frequently accessed data
 */

import { Release, Branch, Build, WorkItem } from '../domain/types';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheConfig {
  defaultTTL?: number; // Default TTL in milliseconds
}

/**
 * Cache structure for the Release Manager Tool
 */
export interface CacheStructure {
  // Active releases cache (TTL: 60 seconds)
  activeReleases: {
    [platform: string]: Release[];
  };
  
  // GitHub data cache (TTL: 5 minutes)
  githubBranches: {
    [repository: string]: Branch[];
  };
  githubTags: {
    [repository: string]: any[];
  };
  
  // Azure DevOps data cache (TTL: 5 minutes)
  azureBranches: {
    [repository: string]: Branch[];
  };
  azureBuilds: {
    [pipelineId: string]: Build[];
  };
  azureWorkItems: {
    [releaseId: string]: WorkItem[];
  };
  
  // Metrics cache (TTL: 60 seconds)
  qualityMetrics: {
    [releaseId: string]: any;
  };
  dauStats: {
    [releaseId: string]: any;
  };
}

/**
 * Cache implementation with TTL support
 */
export class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;
  
  // TTL constants (in milliseconds)
  static readonly TTL_60_SECONDS = 60 * 1000;
  static readonly TTL_5_MINUTES = 5 * 60 * 1000;
  
  constructor(config: CacheConfig = {}) {
    this.defaultTTL = config.defaultTTL || Cache.TTL_60_SECONDS;
  }
  
  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.store.set(key, { value, expiresAt });
  }
  
  /**
   * Get a value from the cache
   * Returns undefined if key doesn't exist or has expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry.value as T;
  }
  
  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Invalidate (delete) a specific cache entry
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }
  
  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }
  
  /**
   * Get the number of entries in the cache
   */
  size(): number {
    // Clean up expired entries first
    this.cleanupExpired();
    return this.store.size;
  }
  
  /**
   * Remove all expired entries
   */
  cleanupExpired(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get all keys in the cache (excluding expired)
   */
  keys(): string[] {
    this.cleanupExpired();
    return Array.from(this.store.keys());
  }
  
  /**
   * Get cache statistics
   */
  stats(): { size: number; expired: number } {
    const expired = this.cleanupExpired();
    return {
      size: this.store.size,
      expired
    };
  }
  
  // Convenience methods for specific cache types
  
  /**
   * Cache active releases for a platform
   */
  setActiveReleases(platform: string, releases: Release[]): void {
    this.set(`activeReleases:${platform}`, releases, Cache.TTL_60_SECONDS);
  }
  
  /**
   * Get cached active releases for a platform
   */
  getActiveReleases(platform: string): Release[] | undefined {
    return this.get<Release[]>(`activeReleases:${platform}`);
  }
  
  /**
   * Cache GitHub branches for a repository
   */
  setGitHubBranches(repository: string, branches: Branch[]): void {
    this.set(`github:branches:${repository}`, branches, Cache.TTL_5_MINUTES);
  }
  
  /**
   * Get cached GitHub branches for a repository
   */
  getGitHubBranches(repository: string): Branch[] | undefined {
    return this.get<Branch[]>(`github:branches:${repository}`);
  }
  
  /**
   * Cache Azure branches for a repository
   */
  setAzureBranches(repository: string, branches: Branch[]): void {
    this.set(`azure:branches:${repository}`, branches, Cache.TTL_5_MINUTES);
  }
  
  /**
   * Get cached Azure branches for a repository
   */
  getAzureBranches(repository: string): Branch[] | undefined {
    return this.get<Branch[]>(`azure:branches:${repository}`);
  }
  
  /**
   * Cache Azure builds for a pipeline
   */
  setAzureBuilds(pipelineId: string, builds: Build[]): void {
    this.set(`azure:builds:${pipelineId}`, builds, Cache.TTL_5_MINUTES);
  }
  
  /**
   * Get cached Azure builds for a pipeline
   */
  getAzureBuilds(pipelineId: string): Build[] | undefined {
    return this.get<Build[]>(`azure:builds:${pipelineId}`);
  }
  
  /**
   * Cache quality metrics for a release
   */
  setQualityMetrics(releaseId: string, metrics: any): void {
    this.set(`metrics:quality:${releaseId}`, metrics, Cache.TTL_60_SECONDS);
  }
  
  /**
   * Get cached quality metrics for a release
   */
  getQualityMetrics(releaseId: string): any | undefined {
    return this.get(`metrics:quality:${releaseId}`);
  }
  
  /**
   * Cache DAU stats for a release
   */
  setDAUStats(releaseId: string, stats: any): void {
    this.set(`metrics:dau:${releaseId}`, stats, Cache.TTL_60_SECONDS);
  }
  
  /**
   * Get cached DAU stats for a release
   */
  getDAUStats(releaseId: string): any | undefined {
    return this.get(`metrics:dau:${releaseId}`);
  }
}
