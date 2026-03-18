/**
 * Tests for MetricsAggregator
 */

import { MetricsAggregator } from './metrics-aggregator';
import { MetricsCollector } from '../integration/metrics-collector';
import { ReleaseStore } from '../data/release-store';
import { Cache } from '../data/cache';
import { QualityMetrics, Platform, ReleaseStatus, ReleaseStage } from '../domain/types';
import { InMemoryDatabase } from '../data/database-config';
import { IntegrationError } from '../common/errors';

// Mock setTimeout and clearInterval for testing
// Note: We'll use real timers by default and only use fake timers where needed
// jest.useFakeTimers();

describe('MetricsAggregator', () => {
  let aggregator: MetricsAggregator;
  let metricsCollector: MetricsCollector;
  let releaseStore: ReleaseStore;
  let cache: Cache;
  
  beforeEach(() => {
    cache = new Cache();
    metricsCollector = new MetricsCollector(cache);
    const db = new InMemoryDatabase();
    releaseStore = new ReleaseStore({ connection: db });
    aggregator = new MetricsAggregator(metricsCollector, releaseStore, {
      pollingIntervalMs: 1000 // 1 second for testing
    });
  });
  
  afterEach(() => {
    aggregator.stopAllRealTimeUpdates();
    // jest.clearAllTimers();
  });
  
  describe('collectQualityMetrics', () => {
    it('should collect quality metrics successfully', async () => {
      // Create a test release
      const release = {
        id: 'release-1',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut1Percent,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github' as const,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: 'build-1',
        latestPassingBuild: 'build-1',
        latestAppStoreBuild: 'build-1',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 1,
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
      };
      
      await releaseStore.create(release);
      
      // Authenticate metrics collector
      await metricsCollector.authenticate({
        apiKey: 'test-key',
        projectId: 'test-project'
      });
      
      const result = await aggregator.collectQualityMetrics('release-1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('crashRate');
        expect(result.value).toHaveProperty('cpuExceptionRate');
        expect(result.value).toHaveProperty('thresholds');
        expect(result.value).toHaveProperty('collectedAt');
        expect(typeof result.value.crashRate).toBe('number');
        expect(typeof result.value.cpuExceptionRate).toBe('number');
      }
    });
    
    it('should fail if release not found', async () => {
      const result = await aggregator.collectQualityMetrics('non-existent');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('not found');
      }
    });
    
    it('should include thresholds in quality metrics', async () => {
      const release = {
        id: 'release-2',
        platform: Platform.Android,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut1Percent,
        version: '2.0.0',
        branchName: 'release/2.0.0',
        sourceType: 'github' as const,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: 'build-2',
        latestPassingBuild: 'build-2',
        latestAppStoreBuild: 'build-2',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 1,
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
      };
      
      await releaseStore.create(release);
      await metricsCollector.authenticate({
        apiKey: 'test-key',
        projectId: 'test-project'
      });
      
      const result = await aggregator.collectQualityMetrics('release-2');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.thresholds).toHaveProperty('crashRateThreshold');
        expect(result.value.thresholds).toHaveProperty('cpuExceptionRateThreshold');
        expect(typeof result.value.thresholds.crashRateThreshold).toBe('number');
        expect(typeof result.value.thresholds.cpuExceptionRateThreshold).toBe('number');
      }
    });
  });
  
  describe('collectDAUStatistics', () => {
    it('should collect DAU statistics successfully', async () => {
      await metricsCollector.authenticate({
        apiKey: 'test-key',
        projectId: 'test-project'
      });
      
      const result = await aggregator.collectDAUStatistics('release-1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('dailyActiveUsers');
        expect(result.value).toHaveProperty('trend');
        expect(result.value).toHaveProperty('collectedAt');
        expect(typeof result.value.dailyActiveUsers).toBe('number');
        expect(Array.isArray(result.value.trend)).toBe(true);
      }
    });
  });
  
  describe('getRolloutPercentage', () => {
    it('should get rollout percentage successfully', async () => {
      const release = {
        id: 'release-3',
        platform: Platform.Desktop,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut1Percent,
        version: '3.0.0',
        branchName: 'release/3.0.0',
        sourceType: 'github' as const,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: 'build-3',
        latestPassingBuild: 'build-3',
        latestAppStoreBuild: 'build-3',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 50,
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
      };
      
      await releaseStore.create(release);
      
      const result = await aggregator.getRolloutPercentage('release-3');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(50);
      }
    });
    
    it('should fail if release not found', async () => {
      const result = await aggregator.getRolloutPercentage('non-existent');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
      }
    });
  });
  
  describe('getITGCStatus', () => {
    it('should get ITGC status successfully', async () => {
      const release = {
        id: 'release-4',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut100Percent,
        version: '4.0.0',
        branchName: 'release/4.0.0',
        sourceType: 'azure' as const,
        repositoryUrl: 'https://dev.azure.com/test/repo',
        latestBuild: 'build-4',
        latestPassingBuild: 'build-4',
        latestAppStoreBuild: 'build-4',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 100,
        itgcStatus: {
          compliant: true,
          rolloutComplete: true,
          details: 'All checks passed',
          lastCheckedAt: new Date()
        },
        distributions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };
      
      await releaseStore.create(release);
      
      const result = await aggregator.getITGCStatus('release-4');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('compliant');
        expect(result.value).toHaveProperty('rolloutComplete');
        expect(result.value).toHaveProperty('details');
        expect(result.value).toHaveProperty('lastCheckedAt');
        expect(result.value.compliant).toBe(true);
        expect(result.value.rolloutComplete).toBe(true);
      }
    });
  });
  
  describe('evaluateThresholds', () => {
    it('should evaluate metrics within thresholds as healthy', () => {
      const metrics: QualityMetrics = {
        crashRate: 0.5,
        cpuExceptionRate: 0.3,
        thresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 0.5
        },
        collectedAt: new Date()
      };
      
      const evaluation = aggregator.evaluateThresholds(metrics);
      
      expect(evaluation.crashRateExceeded).toBe(false);
      expect(evaluation.cpuExceptionRateExceeded).toBe(false);
      expect(evaluation.overallHealthy).toBe(true);
      expect(evaluation.details).toContain('within acceptable thresholds');
    });
    
    it('should detect crash rate exceeding threshold', () => {
      const metrics: QualityMetrics = {
        crashRate: 2.0,
        cpuExceptionRate: 0.3,
        thresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 0.5
        },
        collectedAt: new Date()
      };
      
      const evaluation = aggregator.evaluateThresholds(metrics);
      
      expect(evaluation.crashRateExceeded).toBe(true);
      expect(evaluation.cpuExceptionRateExceeded).toBe(false);
      expect(evaluation.overallHealthy).toBe(false);
      expect(evaluation.details).toContain('Crash rate');
      expect(evaluation.details).toContain('exceeds threshold');
    });
    
    it('should detect CPU exception rate exceeding threshold', () => {
      const metrics: QualityMetrics = {
        crashRate: 0.5,
        cpuExceptionRate: 1.0,
        thresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 0.5
        },
        collectedAt: new Date()
      };
      
      const evaluation = aggregator.evaluateThresholds(metrics);
      
      expect(evaluation.crashRateExceeded).toBe(false);
      expect(evaluation.cpuExceptionRateExceeded).toBe(true);
      expect(evaluation.overallHealthy).toBe(false);
      expect(evaluation.details).toContain('CPU exception rate');
      expect(evaluation.details).toContain('exceeds threshold');
    });
    
    it('should detect both metrics exceeding thresholds', () => {
      const metrics: QualityMetrics = {
        crashRate: 2.0,
        cpuExceptionRate: 1.0,
        thresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 0.5
        },
        collectedAt: new Date()
      };
      
      const evaluation = aggregator.evaluateThresholds(metrics);
      
      expect(evaluation.crashRateExceeded).toBe(true);
      expect(evaluation.cpuExceptionRateExceeded).toBe(true);
      expect(evaluation.overallHealthy).toBe(false);
      expect(evaluation.details).toContain('Crash rate');
      expect(evaluation.details).toContain('CPU exception rate');
    });
  });
  
  describe('real-time updates', () => {
    it('should start real-time updates with polling', async () => {
      const release = {
        id: 'release-5',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut1Percent,
        version: '5.0.0',
        branchName: 'release/5.0.0',
        sourceType: 'github' as const,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: 'build-5',
        latestPassingBuild: 'build-5',
        latestAppStoreBuild: 'build-5',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 1,
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
      };
      
      await releaseStore.create(release);
      await metricsCollector.authenticate({
        apiKey: 'test-key',
        projectId: 'test-project'
      });
      
      const onUpdate = jest.fn();
      
      aggregator.startRealTimeUpdates('release-5', onUpdate);
      
      // Wait for initial poll to complete (needs time for async operations)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(aggregator.getActivePollingCount()).toBe(1);
      expect(onUpdate).toHaveBeenCalled();
    });
    
    it('should stop real-time updates', async () => {
      const release = {
        id: 'release-6',
        platform: Platform.Android,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut1Percent,
        version: '6.0.0',
        branchName: 'release/6.0.0',
        sourceType: 'github' as const,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: 'build-6',
        latestPassingBuild: 'build-6',
        latestAppStoreBuild: 'build-6',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 1,
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
      };
      
      await releaseStore.create(release);
      await metricsCollector.authenticate({
        apiKey: 'test-key',
        projectId: 'test-project'
      });
      
      const onUpdate = jest.fn();
      
      aggregator.startRealTimeUpdates('release-6', onUpdate);
      expect(aggregator.getActivePollingCount()).toBe(1);
      
      aggregator.stopRealTimeUpdates('release-6');
      expect(aggregator.getActivePollingCount()).toBe(0);
    });
    
    it('should stop all real-time updates', async () => {
      const release1 = {
        id: 'release-7',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.RollOut1Percent,
        version: '7.0.0',
        branchName: 'release/7.0.0',
        sourceType: 'github' as const,
        repositoryUrl: 'https://github.com/test/repo',
        latestBuild: 'build-7',
        latestPassingBuild: 'build-7',
        latestAppStoreBuild: 'build-7',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 1,
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
      };
      
      const release2 = {
        ...release1,
        id: 'release-8',
        version: '8.0.0',
        branchName: 'release/8.0.0'
      };
      
      await releaseStore.create(release1);
      await releaseStore.create(release2);
      await metricsCollector.authenticate({
        apiKey: 'test-key',
        projectId: 'test-project'
      });
      
      const onUpdate = jest.fn();
      
      aggregator.startRealTimeUpdates('release-7', onUpdate);
      aggregator.startRealTimeUpdates('release-8', onUpdate);
      expect(aggregator.getActivePollingCount()).toBe(2);
      
      aggregator.stopAllRealTimeUpdates();
      expect(aggregator.getActivePollingCount()).toBe(0);
    });
  });
});
