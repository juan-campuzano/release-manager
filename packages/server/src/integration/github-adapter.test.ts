/**
 * Tests for GitHub adapter
 */

import { GitHubAdapter, GitHubCredentials } from './github-adapter';
import { Cache } from '../data/cache';
import { AuthenticationError, IntegrationError } from '../common/errors';

// Create mock functions
const mockGetAuthenticated = jest.fn();
const mockListBranches = jest.fn();
const mockListTags = jest.fn();
const mockListCommits = jest.fn();
const mockGetCommit = jest.fn();

// Mock Octokit
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      users: {
        getAuthenticated: mockGetAuthenticated
      },
      repos: {
        listBranches: mockListBranches,
        listTags: mockListTags,
        listCommits: mockListCommits,
        getCommit: mockGetCommit
      }
    }))
  };
});

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let cache: Cache;
  
  beforeEach(() => {
    cache = new Cache();
    adapter = new GitHubAdapter(cache);
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const credentials: GitHubCredentials = {
        token: 'valid-token'
      };
      
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      
      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(true);
    });
    
    it('should fail authentication with invalid credentials', async () => {
      const credentials: GitHubCredentials = {
        token: 'invalid-token'
      };
      
      mockGetAuthenticated.mockRejectedValue(
        new Error('Bad credentials')
      );
      
      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('GitHub authentication failed');
      }
    });
    
    it('should support custom base URL for GitHub Enterprise', async () => {
      const credentials: GitHubCredentials = {
        token: 'valid-token',
        baseUrl: 'https://github.enterprise.com/api/v3'
      };
      
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      
      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('getBranches', () => {
    beforeEach(async () => {
      // Authenticate first
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      await adapter.authenticate({ token: 'valid-token' });
    });
    
    it('should retrieve branches successfully', async () => {
      const mockBranches = [
        {
          name: 'main',
          commit: { sha: 'abc123' },
          protected: true
        },
        {
          name: 'develop',
          commit: { sha: 'def456' },
          protected: false
        }
      ];
      
      mockListBranches.mockResolvedValue({
        data: mockBranches
      });
      
      const result = await adapter.getBranches('owner/repo');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe('main');
        expect(result.value[0].commit).toBe('abc123');
        expect(result.value[0].protected).toBe(true);
        expect(result.value[1].name).toBe('develop');
      }
    });
    
    it('should return cached branches on subsequent calls', async () => {
      const mockBranches = [
        {
          name: 'main',
          commit: { sha: 'abc123' },
          protected: true
        }
      ];
      
      mockListBranches.mockResolvedValue({
        data: mockBranches
      });
      
      // First call
      await adapter.getBranches('owner/repo');
      
      // Second call should use cache
      const result = await adapter.getBranches('owner/repo');
      
      expect(result.success).toBe(true);
      expect(mockListBranches).toHaveBeenCalledTimes(1);
    });
    
    it('should fail if not authenticated', async () => {
      const unauthenticatedAdapter = new GitHubAdapter(cache);
      
      const result = await unauthenticatedAdapter.getBranches('owner/repo');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Not authenticated');
      }
    });
    
    it('should handle API errors gracefully', async () => {
      mockListBranches.mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      
      const result = await adapter.getBranches('owner/repo');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Failed to retrieve branches');
      }
    });
  });
  
  describe('getTags', () => {
    beforeEach(async () => {
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      await adapter.authenticate({ token: 'valid-token' });
    });
    
    it('should retrieve tags successfully', async () => {
      const mockTags = [
        {
          name: 'v1.0.0',
          commit: { sha: 'abc123' }
        },
        {
          name: 'v1.1.0',
          commit: { sha: 'def456' }
        }
      ];
      
      mockListTags.mockResolvedValue({
        data: mockTags
      });
      
      const result = await adapter.getTags('owner/repo');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe('v1.0.0');
        expect(result.value[0].commit).toBe('abc123');
        expect(result.value[1].name).toBe('v1.1.0');
      }
    });
    
    it('should return cached tags on subsequent calls', async () => {
      const mockTags = [
        {
          name: 'v1.0.0',
          commit: { sha: 'abc123' }
        }
      ];
      
      mockListTags.mockResolvedValue({
        data: mockTags
      });
      
      // First call
      await adapter.getTags('owner/repo');
      
      // Second call should use cache
      const result = await adapter.getTags('owner/repo');
      
      expect(result.success).toBe(true);
      expect(mockListTags).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getCommits', () => {
    beforeEach(async () => {
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      await adapter.authenticate({ token: 'valid-token' });
    });
    
    it('should retrieve commits successfully', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'Initial commit',
            author: {
              name: 'John Doe',
              date: '2024-01-01T00:00:00Z'
            }
          }
        },
        {
          sha: 'def456',
          commit: {
            message: 'Add feature',
            author: {
              name: 'Jane Smith',
              date: '2024-01-02T00:00:00Z'
            }
          }
        }
      ];
      
      mockListCommits.mockResolvedValue({
        data: mockCommits
      });
      
      const result = await adapter.getCommits('owner/repo', 'main');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].sha).toBe('abc123');
        expect(result.value[0].message).toBe('Initial commit');
        expect(result.value[0].author).toBe('John Doe');
        expect(result.value[1].sha).toBe('def456');
      }
    });
    
    it('should return cached commits on subsequent calls', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'Initial commit',
            author: {
              name: 'John Doe',
              date: '2024-01-01T00:00:00Z'
            }
          }
        }
      ];
      
      mockListCommits.mockResolvedValue({
        data: mockCommits
      });
      
      // First call
      await adapter.getCommits('owner/repo', 'main');
      
      // Second call should use cache
      const result = await adapter.getCommits('owner/repo', 'main');
      
      expect(result.success).toBe(true);
      expect(mockListCommits).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('detectNewBranches', () => {
    beforeEach(async () => {
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      await adapter.authenticate({ token: 'valid-token' });
    });
    
    it('should detect branches with recent commits', async () => {
      const recentDate = new Date('2024-01-15T00:00:00Z');
      
      const mockBranches = [
        {
          name: 'feature-new',
          commit: { sha: 'abc123' },
          protected: false
        },
        {
          name: 'feature-old',
          commit: { sha: 'def456' },
          protected: false
        }
      ];
      
      mockListBranches.mockResolvedValue({
        data: mockBranches
      });
      
      // Mock commits for feature-new (recent)
      mockListCommits
        .mockResolvedValueOnce({
          data: [{
            sha: 'abc123',
            commit: {
              message: 'New feature',
              author: {
                name: 'John Doe',
                date: '2024-01-20T00:00:00Z'
              }
            }
          }]
        })
        // Mock commits for feature-old (old)
        .mockResolvedValueOnce({
          data: [{
            sha: 'def456',
            commit: {
              message: 'Old feature',
              author: {
                name: 'Jane Smith',
                date: '2024-01-05T00:00:00Z'
              }
            }
          }]
        });
      
      const result = await adapter.detectNewBranches('owner/repo', recentDate);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('feature-new');
      }
    });
  });
  
  describe('detectNewTags', () => {
    beforeEach(async () => {
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      await adapter.authenticate({ token: 'valid-token' });
    });
    
    it('should detect tags with recent commits', async () => {
      const recentDate = new Date('2024-01-15T00:00:00Z');
      
      const mockTags = [
        {
          name: 'v2.0.0',
          commit: { sha: 'abc123' }
        },
        {
          name: 'v1.0.0',
          commit: { sha: 'def456' }
        }
      ];
      
      mockListTags.mockResolvedValue({
        data: mockTags
      });
      
      // Mock commit details for v2.0.0 (recent)
      mockGetCommit
        .mockResolvedValueOnce({
          data: {
            sha: 'abc123',
            commit: {
              message: 'Release v2.0.0',
              author: {
                name: 'John Doe',
                date: '2024-01-20T00:00:00Z'
              }
            }
          }
        })
        // Mock commit details for v1.0.0 (old)
        .mockResolvedValueOnce({
          data: {
            sha: 'def456',
            commit: {
              message: 'Release v1.0.0',
              author: {
                name: 'Jane Smith',
                date: '2024-01-05T00:00:00Z'
              }
            }
          }
        });
      
      const result = await adapter.detectNewTags('owner/repo', recentDate);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('v2.0.0');
      }
    });
  });
  
  describe('error handling and retry logic', () => {
    beforeEach(() => {
      // Clear all mocks before each test in this suite
      mockGetAuthenticated.mockClear();
      mockListBranches.mockClear();
      mockListTags.mockClear();
      mockListCommits.mockClear();
      mockGetCommit.mockClear();
    });
    
    it('should not retry on authentication errors', async () => {
      // Create fresh adapter and cache for this test
      const freshCache = new Cache();
      const freshAdapter = new GitHubAdapter(freshCache);
      
      mockGetAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
      await freshAdapter.authenticate({ token: 'valid-token' });
      
      // Clear the mock from authentication
      mockListBranches.mockClear();
      
      mockListBranches.mockRejectedValue(
        new Error('401 Unauthorized')
      );
      
      const result = await freshAdapter.getBranches('owner/auth-error-repo');
      
      expect(result.success).toBe(false);
      expect(mockListBranches).toHaveBeenCalledTimes(1);
    });
  });
});
