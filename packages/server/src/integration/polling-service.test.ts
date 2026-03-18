/**
 * Tests for Polling Service
 */

import { PollingService, DataChangeNotification } from './polling-service';
import { GitHubAdapter } from './github-adapter';
import { AzureDevOpsAdapter } from './azure-devops-adapter';
import { MetricsCollector } from './metrics-collector';
import { Cache } from '../data/cache';
import { Success, Failure } from '../common/result';
import { IntegrationError } from '../common/errors';

// Mock the adapters
jest.mock('./github-adapter');
jest.mock('./azure-devops-adapter');
jest.mock('./metrics-collector');

describe('PollingService', () => {
  let cache: Cache;
  let githubAdapter: jest.Mocked<GitHubAdapter>;
  let azureAdapter: jest.Mocked<AzureDevOpsAdapter>;
  let metricsCollector: jest.Mocked<MetricsCollector>;
  let pollingService: PollingService;
  
  beforeEach(() => {
    cache = new Cache();
    githubAdapter = new GitHubAdapter(cache) as jest.Mocked<GitHubAdapter>;
    azureAdapter = new AzureDevOpsAdapter(cache) as jest.Mocked<AzureDevOpsAdapter>;
    metricsCollector = new MetricsCollector(cache) as jest.Mocked<MetricsCollector>;
    
    // Use short intervals for testing
    pollingService = new PollingService(
      githubAdapter,
      azureAdapter,
      metricsCollector,
      {
        releaseMetricsInterval: 100, // 100ms for testing
        githubInterval: 200, // 200ms for testing
        azureInterval: 200 // 200ms for testing
      }
    );
  });
  
  afterEach(() => {
    // Clean up all polling
    pollingService.stopAllPolling();
  });
  
  describe('GitHub polling', () => {
    it('should start polling for GitHub repository', () => {
      const repository = 'owner/repo';
      
      pollingService.startGitHubPolling(repository);
      
      expect(pollingService.isPolling('github', repository)).toBe(true);
    });
    
    it('should stop polling for GitHub repository', () => {
      const repository = 'owner/repo';
      
      pollingService.startGitHubPolling(repository);
      expect(pollingService.isPolling('github', repository)).toBe(true);
      
      pollingService.stopPolling('github', repository);
      expect(pollingService.isPolling('github', repository)).toBe(false);
    });
    
    it('should update last poll time after polling', async () => {
      const repository = 'owner/repo';
      
      // Mock GitHub adapter methods
      githubAdapter.getBranches = jest.fn().mockResolvedValue(Success([]));
      githubAdapter.getTags = jest.fn().mockResolvedValue(Success([]));
      
      pollingService.startGitHubPolling(repository);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const lastPollTime = pollingService.getLastPollTime('github', repository);
      expect(lastPollTime).not.toBeNull();
      expect(lastPollTime).toBeInstanceOf(Date);
    });
    
    it('should notify subscribers on data change', async () => {
      const repository = 'owner/repo';
      const mockBranches = [
        { name: 'main', commit: 'abc123', protected: false, createdAt: new Date() }
      ];
      
      // Mock GitHub adapter methods
      githubAdapter.getBranches = jest.fn().mockResolvedValue(Success(mockBranches));
      githubAdapter.getTags = jest.fn().mockResolvedValue(Success([]));
      
      const notifications: DataChangeNotification[] = [];
      pollingService.subscribe((notification) => {
        notifications.push(notification);
      });
      
      pollingService.startGitHubPolling(repository);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('github');
      expect(notifications[0].identifier).toBe(repository);
      expect(notifications[0].data).toEqual({
        branches: mockBranches,
        tags: []
      });
    });
    
    it('should not notify subscribers if data has not changed', async () => {
      const repository = 'owner/repo';
      const mockBranches = [
        { name: 'main', commit: 'abc123', protected: false, createdAt: new Date() }
      ];
      
      // Mock GitHub adapter methods to return same data
      githubAdapter.getBranches = jest.fn().mockResolvedValue(Success(mockBranches));
      githubAdapter.getTags = jest.fn().mockResolvedValue(Success([]));
      
      const notifications: DataChangeNotification[] = [];
      pollingService.subscribe((notification) => {
        notifications.push(notification);
      });
      
      pollingService.startGitHubPolling(repository);
      
      // Wait for multiple polls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should only get one notification (initial data)
      expect(notifications.length).toBe(1);
    });
  });
  
  describe('Azure polling', () => {
    it('should start polling for Azure pipeline', () => {
      const pipelineId = '123';
      
      pollingService.startAzurePolling(pipelineId);
      
      expect(pollingService.isPolling('azure', pipelineId)).toBe(true);
    });
    
    it('should stop polling for Azure pipeline', () => {
      const pipelineId = '123';
      
      pollingService.startAzurePolling(pipelineId);
      expect(pollingService.isPolling('azure', pipelineId)).toBe(true);
      
      pollingService.stopPolling('azure', pipelineId);
      expect(pollingService.isPolling('azure', pipelineId)).toBe(false);
    });
    
    it('should notify subscribers on Azure data change', async () => {
      const pipelineId = '123';
      const mockBuildStatus = 'passed';
      const mockBuilds = [
        {
          id: '1',
          number: '1.0',
          status: 'passed' as const,
          branch: 'main',
          commit: 'abc123',
          startedAt: new Date(),
          completedAt: new Date()
        }
      ];
      
      // Mock Azure adapter methods
      azureAdapter.getBuildStatus = jest.fn().mockResolvedValue(Success(mockBuildStatus));
      azureAdapter.detectNewBuilds = jest.fn().mockResolvedValue(Success(mockBuilds));
      
      const notifications: DataChangeNotification[] = [];
      pollingService.subscribe((notification) => {
        notifications.push(notification);
      });
      
      pollingService.startAzurePolling(pipelineId);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 250));
      
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('azure');
      expect(notifications[0].identifier).toBe(pipelineId);
      expect(notifications[0].data).toEqual({
        buildStatus: mockBuildStatus,
        newBuilds: mockBuilds
      });
    });
  });
  
  describe('Metrics polling', () => {
    it('should start polling for release metrics', () => {
      const releaseId = 'release-123';
      
      pollingService.startMetricsPolling(releaseId);
      
      expect(pollingService.isPolling('metrics', releaseId)).toBe(true);
    });
    
    it('should stop polling for release metrics', () => {
      const releaseId = 'release-123';
      
      pollingService.startMetricsPolling(releaseId);
      expect(pollingService.isPolling('metrics', releaseId)).toBe(true);
      
      pollingService.stopPolling('metrics', releaseId);
      expect(pollingService.isPolling('metrics', releaseId)).toBe(false);
    });
    
    it('should notify subscribers on metrics data change', async () => {
      const releaseId = 'release-123';
      const mockCrashRate = 0.5;
      const mockCPURate = 0.3;
      const mockDAU = {
        dailyActiveUsers: 50000,
        trend: [48000, 49000, 50000],
        collectedAt: new Date()
      };
      
      // Mock metrics collector methods
      metricsCollector.getCrashRate = jest.fn().mockResolvedValue(Success(mockCrashRate));
      metricsCollector.getCPUExceptionRate = jest.fn().mockResolvedValue(Success(mockCPURate));
      metricsCollector.getDAUData = jest.fn().mockResolvedValue(Success(mockDAU));
      
      const notifications: DataChangeNotification[] = [];
      pollingService.subscribe((notification) => {
        notifications.push(notification);
      });
      
      pollingService.startMetricsPolling(releaseId);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('metrics');
      expect(notifications[0].identifier).toBe(releaseId);
      expect(notifications[0].data).toEqual({
        crashRate: mockCrashRate,
        cpuExceptionRate: mockCPURate,
        dau: mockDAU
      });
    });
  });
  
  describe('Subscription management', () => {
    it('should allow subscribing to notifications', () => {
      const callback = jest.fn();
      
      const unsubscribe = pollingService.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });
    
    it('should allow unsubscribing from notifications', async () => {
      const repository = 'owner/repo';
      
      // Mock GitHub adapter methods
      githubAdapter.getBranches = jest.fn().mockResolvedValue(Success([]));
      githubAdapter.getTags = jest.fn().mockResolvedValue(Success([]));
      
      const callback = jest.fn();
      const unsubscribe = pollingService.subscribe(callback);
      
      pollingService.startGitHubPolling(repository);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const callCountBefore = callback.mock.calls.length;
      
      // Unsubscribe
      unsubscribe();
      
      // Wait for another poll
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Callback should not have been called again
      expect(callback.mock.calls.length).toBe(callCountBefore);
    });
    
    it('should support multiple subscribers', async () => {
      const repository = 'owner/repo';
      
      // Mock GitHub adapter methods
      githubAdapter.getBranches = jest.fn().mockResolvedValue(Success([]));
      githubAdapter.getTags = jest.fn().mockResolvedValue(Success([]));
      
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      pollingService.subscribe(callback1);
      pollingService.subscribe(callback2);
      
      pollingService.startGitHubPolling(repository);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });
  
  describe('Error handling', () => {
    it('should handle GitHub polling errors gracefully', async () => {
      const repository = 'owner/repo';
      
      // Mock GitHub adapter to return error
      githubAdapter.getBranches = jest.fn().mockResolvedValue(
        Failure(new IntegrationError('GitHub API error'))
      );
      
      const callback = jest.fn();
      pollingService.subscribe(callback);
      
      pollingService.startGitHubPolling(repository);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not notify subscribers on error
      expect(callback).not.toHaveBeenCalled();
      
      // Should still be polling
      expect(pollingService.isPolling('github', repository)).toBe(true);
    });
    
    it('should handle Azure polling errors gracefully', async () => {
      const pipelineId = '123';
      
      // Mock Azure adapter to return error
      azureAdapter.getBuildStatus = jest.fn().mockResolvedValue(
        Failure(new IntegrationError('Azure API error'))
      );
      
      const callback = jest.fn();
      pollingService.subscribe(callback);
      
      pollingService.startAzurePolling(pipelineId);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Should not notify subscribers on error
      expect(callback).not.toHaveBeenCalled();
      
      // Should still be polling
      expect(pollingService.isPolling('azure', pipelineId)).toBe(true);
    });
    
    it('should handle metrics polling errors gracefully', async () => {
      const releaseId = 'release-123';
      
      // Mock metrics collector to return error
      metricsCollector.getCrashRate = jest.fn().mockResolvedValue(
        Failure(new IntegrationError('Metrics API error'))
      );
      
      const callback = jest.fn();
      pollingService.subscribe(callback);
      
      pollingService.startMetricsPolling(releaseId);
      
      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not notify subscribers on error
      expect(callback).not.toHaveBeenCalled();
      
      // Should still be polling
      expect(pollingService.isPolling('metrics', releaseId)).toBe(true);
    });
  });
  
  describe('Stop all polling', () => {
    it('should stop all active polling', () => {
      pollingService.startGitHubPolling('owner/repo');
      pollingService.startAzurePolling('123');
      pollingService.startMetricsPolling('release-123');
      
      expect(pollingService.isPolling('github', 'owner/repo')).toBe(true);
      expect(pollingService.isPolling('azure', '123')).toBe(true);
      expect(pollingService.isPolling('metrics', 'release-123')).toBe(true);
      
      pollingService.stopAllPolling();
      
      expect(pollingService.isPolling('github', 'owner/repo')).toBe(false);
      expect(pollingService.isPolling('azure', '123')).toBe(false);
      expect(pollingService.isPolling('metrics', 'release-123')).toBe(false);
    });
  });
  
  describe('Duplicate polling prevention', () => {
    it('should not start duplicate polling for same target', () => {
      const repository = 'owner/repo';
      
      pollingService.startGitHubPolling(repository);
      pollingService.startGitHubPolling(repository); // Try to start again
      
      // Should still be polling (not crashed)
      expect(pollingService.isPolling('github', repository)).toBe(true);
    });
  });
});
