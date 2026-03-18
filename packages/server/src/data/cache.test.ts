/**
 * Tests for Cache
 */

import { Cache } from './cache';
import { Release, Platform, ReleaseStatus, ReleaseStage, Branch } from '../domain/types';

describe('Cache', () => {
  let cache: Cache;
  
  beforeEach(() => {
    cache = new Cache();
  });
  
  afterEach(() => {
    cache.clear();
  });
  
  const createTestRelease = (id: string): Release => ({
    id,
    platform: Platform.iOS,
    status: ReleaseStatus.Current,
    currentStage: ReleaseStage.ReleaseBranching,
    version: '1.0.0',
    branchName: 'release/1.0.0',
    sourceType: 'github',
    repositoryUrl: 'https://github.com/test/repo',
    latestBuild: 'build-123',
    latestPassingBuild: 'build-122',
    latestAppStoreBuild: 'build-120',
    blockers: [],
    signOffs: [],
    rolloutPercentage: 0,
    itgcStatus: {
      compliant: true,
      rolloutComplete: false,
      details: 'In progress',
      lastCheckedAt: new Date()
    },
    distributions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date()
  });
  
  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });
    
    it('should return undefined for non-existent key', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });
    
    it('should store complex objects', () => {
      const release = createTestRelease('release-1');
      cache.set('release', release);
      
      const retrieved = cache.get<Release>('release');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('release-1');
    });
  });
  
  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(cache.get('key1')).toBeUndefined();
    });
    
    it('should use default TTL when not specified', async () => {
      const shortCache = new Cache({ defaultTTL: 50 });
      shortCache.set('key1', 'value1');
      
      expect(shortCache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(shortCache.get('key1')).toBeUndefined();
    });
    
    it('should not expire before TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(cache.get('key1')).toBe('value1');
    });
  });
  
  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });
    
    it('should return false for non-existent key', () => {
      expect(cache.has('non-existent')).toBe(false);
    });
    
    it('should return false for expired key', async () => {
      cache.set('key1', 'value1', 50);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(cache.has('key1')).toBe(false);
    });
  });
  
  describe('invalidate', () => {
    it('should remove a specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      expect(cache.invalidate('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
    
    it('should return false for non-existent key', () => {
      expect(cache.invalidate('non-existent')).toBe(false);
    });
  });
  
  describe('invalidatePattern', () => {
    it('should remove all keys matching a pattern', () => {
      cache.set('user:1', 'data1');
      cache.set('user:2', 'data2');
      cache.set('post:1', 'data3');
      
      const count = cache.invalidatePattern(/^user:/);
      
      expect(count).toBe(2);
      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('user:2')).toBeUndefined();
      expect(cache.get('post:1')).toBe('data3');
    });
    
    it('should handle string patterns', () => {
      cache.set('test:1', 'data1');
      cache.set('test:2', 'data2');
      cache.set('other:1', 'data3');
      
      const count = cache.invalidatePattern('^test:');
      
      expect(count).toBe(2);
      expect(cache.get('other:1')).toBe('data3');
    });
  });
  
  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });
  
  describe('size', () => {
    it('should return the number of entries', () => {
      expect(cache.size()).toBe(0);
      
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
    
    it('should not count expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 1000);
      
      expect(cache.size()).toBe(2);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(cache.size()).toBe(1);
    });
  });
  
  describe('cleanupExpired', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const removed = cache.cleanupExpired();
      
      expect(removed).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });
  
  describe('keys', () => {
    it('should return all non-expired keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const keys = cache.keys();
      
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
    
    it('should not include expired keys', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const keys = cache.keys();
      
      expect(keys).toHaveLength(1);
      expect(keys).toContain('key2');
    });
  });
  
  describe('stats', () => {
    it('should return cache statistics', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const stats = cache.stats();
      
      expect(stats.size).toBe(1);
      expect(stats.expired).toBe(1);
    });
  });
  
  describe('convenience methods', () => {
    it('should cache and retrieve active releases', () => {
      const releases = [createTestRelease('release-1')];
      
      cache.setActiveReleases('iOS', releases);
      const retrieved = cache.getActiveReleases('iOS');
      
      expect(retrieved).toBeDefined();
      expect(retrieved).toHaveLength(1);
      expect(retrieved![0].id).toBe('release-1');
    });
    
    it('should cache and retrieve GitHub branches', () => {
      const branches: Branch[] = [{
        name: 'main',
        commit: 'abc123',
        protected: true,
        createdAt: new Date()
      }];
      
      cache.setGitHubBranches('test/repo', branches);
      const retrieved = cache.getGitHubBranches('test/repo');
      
      expect(retrieved).toBeDefined();
      expect(retrieved).toHaveLength(1);
      expect(retrieved![0].name).toBe('main');
    });
    
    it('should cache and retrieve quality metrics', () => {
      const metrics = {
        crashRate: 0.5,
        cpuExceptionRate: 0.3
      };
      
      cache.setQualityMetrics('release-1', metrics);
      const retrieved = cache.getQualityMetrics('release-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved.crashRate).toBe(0.5);
    });
    
    it('should use correct TTL for different cache types', async () => {
      // Active releases: 60 seconds
      cache.setActiveReleases('iOS', [createTestRelease('r1')]);
      
      // GitHub branches: 5 minutes
      const branches: Branch[] = [{
        name: 'main',
        commit: 'abc',
        protected: true,
        createdAt: new Date()
      }];
      cache.setGitHubBranches('repo', branches);
      
      // Both should exist initially
      expect(cache.getActiveReleases('iOS')).toBeDefined();
      expect(cache.getGitHubBranches('repo')).toBeDefined();
    });
  });
});
