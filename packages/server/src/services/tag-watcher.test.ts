/**
 * Unit tests for TagWatcher service.
 * Covers subscriber wiring (start/stop) and notification handling.
 */

import { TagWatcher } from './tag-watcher';
import { ProcessedTagStore } from './processed-tag-store';
import { DataChangeNotification } from '../integration/polling-service';
import { Tag, Release, ReleaseStatus, ReleaseStage, Platform } from '../domain/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
    getRecentLogs: jest.fn().mockReturnValue([]),
    getLogsByLevel: jest.fn().mockReturnValue([]),
    clearLogs: jest.fn(),
  } as any;
}

interface MockPollingService {
  subscribe: jest.Mock;
  isPolling: jest.Mock;
  startGitHubPolling: jest.Mock;
  startAzurePolling: jest.Mock;
  _notify(notification: DataChangeNotification): void;
  _subscriberCount(): number;
}

function createMockPollingService(): MockPollingService {
  const subscribers = new Set<(n: DataChangeNotification) => void>();
  return {
    subscribe: jest.fn((cb: (n: DataChangeNotification) => void) => {
      subscribers.add(cb);
      return () => { subscribers.delete(cb); };
    }),
    isPolling: jest.fn().mockReturnValue(false),
    startGitHubPolling: jest.fn(),
    startAzurePolling: jest.fn(),
    _notify(notification: DataChangeNotification) {
      for (const cb of subscribers) cb(notification);
    },
    _subscriberCount() { return subscribers.size; },
  };
}

function createMockConfig(overrides: Record<string, any> = {}) {
  return {
    releaseStore: {} as any,
    releaseManager: {} as any,
    stateManager: {} as any,
    eventStore: {} as any,
    pollingService: createMockPollingService(),
    githubAdapter: {} as any,
    azureAdapter: { getTags: jest.fn() } as any,
    processedTagStore: new ProcessedTagStore(),
    logger: createMockLogger(),
    ...overrides,
  };
}

function makeTags(...names: string[]): Tag[] {
  return names.map((name) => ({
    name,
    commit: 'abc123',
    message: '',
    createdAt: new Date(),
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TagWatcher', () => {
  describe('start / stop subscriber wiring', () => {
    it('should subscribe to PollingService on start()', () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      watcher.start();

      expect(config.pollingService.subscribe).toHaveBeenCalledTimes(1);
      expect(config.pollingService.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not subscribe twice if start() is called again', () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      watcher.start();
      watcher.start();

      expect(config.pollingService.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe from PollingService on stop()', () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      watcher.start();
      expect(config.pollingService._subscriberCount()).toBe(1);

      watcher.stop();
      expect(config.pollingService._subscriberCount()).toBe(0);
    });

    it('should be safe to call stop() without start()', () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      expect(() => watcher.stop()).not.toThrow();
    });

    it('should allow re-subscribing after stop()', () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      watcher.start();
      watcher.stop();
      watcher.start();

      expect(config.pollingService.subscribe).toHaveBeenCalledTimes(2);
      expect(config.pollingService._subscriberCount()).toBe(1);
    });
  });

  describe('handlePollingNotification — GitHub', () => {
    it('should extract tags from GitHub notification data.tags', async () => {
      const config = createMockConfig({
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: [] }),
        },
      });
      const watcher = new TagWatcher(config as any);
      const tags = makeTags('v1.0.0', 'v2.0.0');

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: 'owner/repo',
        timestamp: new Date(),
        data: { branches: [], tags },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.info).toHaveBeenCalledWith(
        'TagWatcher received tags',
        expect.objectContaining({ type: 'github', tagCount: 2 }),
      );
    });

    it('should handle GitHub notification with missing tags gracefully', async () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: 'owner/repo',
        timestamp: new Date(),
        data: { branches: [] },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.warn).toHaveBeenCalledWith(
        'GitHub notification missing tags data',
        expect.objectContaining({ identifier: 'owner/repo' }),
      );
      expect(config.logger.info).toHaveBeenCalledWith(
        'TagWatcher received tags',
        expect.objectContaining({ tagCount: 0 }),
      );
    });

    it('should handle GitHub notification with null data', async () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: 'owner/repo',
        timestamp: new Date(),
        data: null,
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.warn).toHaveBeenCalled();
    });
  });

  describe('handlePollingNotification — Azure', () => {
    it('should call azureAdapter.getTags for Azure notifications', async () => {
      const tags = makeTags('v3.0.0');
      const config = createMockConfig({
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: [] }),
        },
      });
      (config.azureAdapter.getTags as jest.Mock).mockResolvedValue({
        success: true,
        value: tags,
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'azure',
        identifier: 'project/repo',
        timestamp: new Date(),
        data: { buildStatus: {}, newBuilds: [] },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.azureAdapter.getTags).toHaveBeenCalledWith('project/repo');
      expect(config.logger.info).toHaveBeenCalledWith(
        'TagWatcher received tags',
        expect.objectContaining({ type: 'azure', tagCount: 1 }),
      );
    });

    it('should log error and return when Azure getTags fails', async () => {
      const config = createMockConfig();
      (config.azureAdapter.getTags as jest.Mock).mockResolvedValue({
        success: false,
        error: { message: 'Network error' },
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'azure',
        identifier: 'project/repo',
        timestamp: new Date(),
        data: {},
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.error).toHaveBeenCalledWith(
        'Failed to fetch Azure DevOps tags',
        undefined,
        expect.objectContaining({ identifier: 'project/repo' }),
      );
      // Should NOT log the "received tags" message since we returned early
      expect(config.logger.info).not.toHaveBeenCalledWith(
        'TagWatcher received tags',
        expect.anything(),
      );
    });
  });

  describe('handlePollingNotification — metrics (ignored)', () => {
    it('should ignore metrics notifications', async () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'metrics',
        identifier: 'release-1',
        timestamp: new Date(),
        data: {},
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.info).not.toHaveBeenCalled();
      expect(config.azureAdapter.getTags).toBeUndefined; // not called
    });
  });

  describe('subscriber integration', () => {
    it('should invoke handlePollingNotification when PollingService notifies', async () => {
      const tags = makeTags('v1.0.0');
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      watcher.start();

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: 'owner/repo',
        timestamp: new Date(),
        data: { branches: [], tags },
      };

      // Notify through the mock polling service
      config.pollingService._notify(notification);

      // Give the async handler a tick to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(config.logger.info).toHaveBeenCalledWith(
        'TagWatcher received tags',
        expect.objectContaining({ type: 'github', tagCount: 1 }),
      );
    });

    it('should not receive notifications after stop()', async () => {
      const config = createMockConfig();
      const watcher = new TagWatcher(config as any);

      watcher.start();
      watcher.stop();

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: 'owner/repo',
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v1.0.0') },
      };

      config.pollingService._notify(notification);
      await new Promise((r) => setTimeout(r, 10));

      // The "received tags" info log should NOT have been called
      expect(config.logger.info).not.toHaveBeenCalledWith(
        'TagWatcher received tags',
        expect.anything(),
      );
    });
  });

  describe('matchTagToRelease', () => {
    function makeRelease(overrides: Partial<Release> = {}): Release {
      return {
        id: 'release-1',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.ReleaseBranching,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github',
        repositoryUrl: 'https://github.com/org/repo',
        latestBuild: 'build-1',
        latestPassingBuild: 'build-1',
        latestAppStoreBuild: '',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        itgcStatus: { compliant: true, rolloutComplete: false, details: '', lastCheckedAt: new Date() },
        distributions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
        ...overrides,
      };
    }

    function createMatchingConfig(releases: Release[], overrides: Record<string, any> = {}) {
      return createMockConfig({
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: releases }),
        },
        ...overrides,
      });
    }

    it('should return TagMatchResult when exactly one active release matches', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0', status: ReleaseStatus.Current });
      const config = createMatchingConfig([release]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('2.0.0', 'https://github.com/org/repo');

      expect(result).toEqual({
        releaseId: 'r1',
        tagName: '2.0.0',
        targetStage: ReleaseStage.FinalReleaseCandidate,
        repositoryUrl: 'https://github.com/org/repo',
      });
    });

    it('should return null and log info when no releases match the version', async () => {
      const release = makeRelease({ version: '1.0.0' });
      const config = createMatchingConfig([release]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('9.9.9', 'https://github.com/org/repo');

      expect(result).toBeNull();
      expect(config.logger.info).toHaveBeenCalledWith(
        'No active release matched version tag',
        expect.objectContaining({ version: '9.9.9' }),
      );
    });

    it('should return null and log warning when multiple releases match', async () => {
      const r1 = makeRelease({ id: 'r1', version: '1.0.0', status: ReleaseStatus.Current });
      const r2 = makeRelease({ id: 'r2', version: '1.0.0', status: ReleaseStatus.Upcoming });
      const config = createMatchingConfig([r1, r2]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('1.0.0', 'https://github.com/org/repo');

      expect(result).toBeNull();
      expect(config.logger.warn).toHaveBeenCalledWith(
        'Multiple active releases matched version tag',
        expect.objectContaining({ releaseIds: ['r1', 'r2'] }),
      );
    });

    it('should filter out releases with Production status', async () => {
      const release = makeRelease({ version: '1.0.0', status: ReleaseStatus.Production });
      const config = createMatchingConfig([release]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('1.0.0', 'https://github.com/org/repo');

      expect(result).toBeNull();
      expect(config.logger.info).toHaveBeenCalledWith(
        'No active release matched version tag',
        expect.anything(),
      );
    });

    it('should match releases with Upcoming status', async () => {
      const release = makeRelease({ id: 'r-up', version: '3.0.0', status: ReleaseStatus.Upcoming });
      const config = createMatchingConfig([release]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('3.0.0', 'https://github.com/org/repo');

      expect(result).not.toBeNull();
      expect(result!.releaseId).toBe('r-up');
    });

    it('should not match when repositoryUrl differs', async () => {
      const release = makeRelease({ version: '1.0.0', repositoryUrl: 'https://github.com/org/other-repo' });
      const config = createMatchingConfig([release]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('1.0.0', 'https://github.com/org/repo');

      expect(result).toBeNull();
    });

    it('should return match with null targetStage when matched release is at final stage', async () => {
      const release = makeRelease({
        version: '1.0.0',
        currentStage: ReleaseStage.RollOut100Percent,
        status: ReleaseStatus.Current,
      });
      const config = createMatchingConfig([release]);
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('1.0.0', 'https://github.com/org/repo');

      expect(result).toEqual({
        releaseId: 'release-1',
        tagName: '1.0.0',
        targetStage: null,
        repositoryUrl: 'https://github.com/org/repo',
      });
    });

    it('should return null when releaseStore fails', async () => {
      const config = createMockConfig({
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({
            success: false,
            error: new Error('DB error'),
          }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const result = await watcher.matchTagToRelease('1.0.0', 'https://github.com/org/repo');

      expect(result).toBeNull();
      expect(config.logger.error).toHaveBeenCalledWith(
        'Failed to fetch releases for tag matching',
        expect.any(Error),
        expect.objectContaining({ version: '1.0.0' }),
      );
    });
  });

  describe('stage transition logic', () => {
    const repoUrl = 'https://github.com/org/repo';

    function makeRelease(overrides: Partial<Release> = {}): Release {
      return {
        id: 'release-1',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.ReleaseBranching,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github',
        repositoryUrl: repoUrl,
        latestBuild: 'build-1',
        latestPassingBuild: 'build-1',
        latestAppStoreBuild: '',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        itgcStatus: { compliant: true, rolloutComplete: false, details: '', lastCheckedAt: new Date() },
        distributions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
        ...overrides,
      };
    }

    function createTransitionConfig(release: Release, overrides: Record<string, any> = {}) {
      const processedTagStore = new ProcessedTagStore();
      return {
        config: createMockConfig({
          releaseStore: {
            getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: [release] }),
            getRelease: jest.fn().mockResolvedValue({ success: true, value: release }),
          },
          stateManager: {
            validateStateTransition: jest.fn().mockReturnValue({ valid: true, errors: [] }),
          },
          releaseManager: {
            updateReleaseStage: jest.fn().mockResolvedValue({ success: true, value: { ...release, currentStage: ReleaseStage.FinalReleaseCandidate } }),
          },
          processedTagStore,
          ...overrides,
        }),
        processedTagStore,
      };
    }

    it('should advance release stage on successful tag match and transition', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0' });
      const { config } = createTransitionConfig(release);
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.stateManager.validateStateTransition).toHaveBeenCalledWith(
        release,
        ReleaseStage.FinalReleaseCandidate,
      );
      expect(config.releaseManager.updateReleaseStage).toHaveBeenCalledWith(
        'r1',
        ReleaseStage.FinalReleaseCandidate,
      );
      expect(config.processedTagStore.isProcessed('v2.0.0', repoUrl)).toBe(true);
      expect(config.logger.info).toHaveBeenCalledWith(
        'Successfully advanced release stage via tag detection',
        expect.objectContaining({ releaseId: 'r1', targetStage: ReleaseStage.FinalReleaseCandidate }),
      );
    });

    it('should skip tags already in ProcessedTagStore', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0' });
      const { config, processedTagStore } = createTransitionConfig(release);
      processedTagStore.markProcessed({
        tagName: 'v2.0.0',
        repositoryUrl: repoUrl,
        processedAt: new Date().toISOString(),
        releaseId: 'r1',
        appliedStage: ReleaseStage.FinalReleaseCandidate,
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.releaseManager.updateReleaseStage).not.toHaveBeenCalled();
      expect(config.logger.info).toHaveBeenCalledWith(
        'Skipping already processed tag',
        expect.objectContaining({ tagName: 'v2.0.0' }),
      );
    });

    it('should skip non-version tags', async () => {
      const release = makeRelease({ version: '1.0.0' });
      const { config } = createTransitionConfig(release);
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('feature/abc', 'latest') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.releaseStore.getActiveReleases).not.toHaveBeenCalled();
      expect(config.releaseManager.updateReleaseStage).not.toHaveBeenCalled();
    });

    it('should log warning and mark as processed when StateManager rejects transition', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0' });
      const { config } = createTransitionConfig(release, {
        stateManager: {
          validateStateTransition: jest.fn().mockReturnValue({
            valid: false,
            errors: ['Branch name is required before moving to Final Release Candidate'],
          }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.warn).toHaveBeenCalledWith(
        'StateManager rejected stage transition',
        expect.objectContaining({
          releaseId: 'r1',
          errors: ['Branch name is required before moving to Final Release Candidate'],
        }),
      );
      expect(config.releaseManager.updateReleaseStage).not.toHaveBeenCalled();
      // Tag should still be marked as processed to avoid retrying invalid transitions
      expect(config.processedTagStore.isProcessed('v2.0.0', repoUrl)).toBe(true);
    });

    it('should NOT mark tag as processed when updateReleaseStage fails', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0' });
      const { config } = createTransitionConfig(release, {
        releaseManager: {
          updateReleaseStage: jest.fn().mockResolvedValue({
            success: false,
            error: new Error('Store update failed'),
          }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.error).toHaveBeenCalledWith(
        'Failed to update release stage',
        expect.any(Error),
        expect.objectContaining({ releaseId: 'r1' }),
      );
      // Tag should NOT be marked as processed so it retries next cycle
      expect(config.processedTagStore.isProcessed('v2.0.0', repoUrl)).toBe(false);
    });

    it('should skip releases already at RollOut100Percent (final stage)', async () => {
      const release = makeRelease({
        id: 'r1',
        version: '2.0.0',
        currentStage: ReleaseStage.RollOut100Percent,
      });
      const { config } = createTransitionConfig(release);
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.releaseManager.updateReleaseStage).not.toHaveBeenCalled();
      expect(config.logger.info).toHaveBeenCalledWith(
        'Matched release is already at final stage',
        expect.objectContaining({ releaseId: 'r1' }),
      );
    });

    it('should handle multiple tags in a single notification', async () => {
      const r1 = makeRelease({ id: 'r1', version: '2.0.0' });
      const r2 = makeRelease({ id: 'r2', version: '3.0.0' });
      const config = createMockConfig({
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: [r1, r2] }),
          getRelease: jest.fn()
            .mockResolvedValueOnce({ success: true, value: r1 })
            .mockResolvedValueOnce({ success: true, value: r2 }),
        },
        stateManager: {
          validateStateTransition: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        },
        releaseManager: {
          updateReleaseStage: jest.fn().mockResolvedValue({ success: true, value: {} }),
        },
        processedTagStore: new ProcessedTagStore(),
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0', 'v3.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.releaseManager.updateReleaseStage).toHaveBeenCalledTimes(2);
      expect(config.processedTagStore.isProcessed('v2.0.0', repoUrl)).toBe(true);
      expect(config.processedTagStore.isProcessed('v3.0.0', repoUrl)).toBe(true);
    });

    it('should handle getRelease failure during transition validation', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0' });
      const { config } = createTransitionConfig(release, {
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: [release] }),
          getRelease: jest.fn().mockResolvedValue({
            success: false,
            error: new Error('Release not found'),
          }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };

      await watcher.handlePollingNotification(notification);

      expect(config.logger.error).toHaveBeenCalledWith(
        'Failed to fetch release for transition validation',
        expect.any(Error),
        expect.objectContaining({ releaseId: 'r1' }),
      );
      expect(config.releaseManager.updateReleaseStage).not.toHaveBeenCalled();
    });
  });

  describe('getTagStatus', () => {
    const repoUrl = 'https://github.com/org/repo';

    function makeRelease(overrides: Partial<Release> = {}): Release {
      return {
        id: 'release-1',
        platform: Platform.iOS,
        status: ReleaseStatus.Current,
        currentStage: ReleaseStage.ReleaseBranching,
        version: '1.0.0',
        branchName: 'release/1.0.0',
        sourceType: 'github',
        repositoryUrl: repoUrl,
        latestBuild: 'build-1',
        latestPassingBuild: 'build-1',
        latestAppStoreBuild: '',
        blockers: [],
        signOffs: [],
        rolloutPercentage: 0,
        itgcStatus: { compliant: true, rolloutComplete: false, details: '', lastCheckedAt: new Date() },
        distributions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
        ...overrides,
      };
    }

    it('should return active: true for a release with repositoryUrl and valid sourceType (github)', async () => {
      const release = makeRelease({ id: 'r1', sourceType: 'github', repositoryUrl: repoUrl });
      const config = createMockConfig({
        releaseStore: {
          getRelease: jest.fn().mockResolvedValue({ success: true, value: release }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const status = await watcher.getTagStatus('r1');

      expect(status).toEqual({
        active: true,
        lastDetectedTag: null,
        lastCheckAt: null,
      });
    });

    it('should return active: true for a release with azure sourceType', async () => {
      const release = makeRelease({ id: 'r1', sourceType: 'azure', repositoryUrl: 'https://dev.azure.com/org/project' });
      const config = createMockConfig({
        releaseStore: {
          getRelease: jest.fn().mockResolvedValue({ success: true, value: release }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const status = await watcher.getTagStatus('r1');

      expect(status).toEqual({
        active: true,
        lastDetectedTag: null,
        lastCheckAt: null,
      });
    });

    it('should return lastDetectedTag and lastCheckAt after a tag is processed', async () => {
      const release = makeRelease({ id: 'r1', version: '2.0.0', sourceType: 'github', repositoryUrl: repoUrl });
      const config = createMockConfig({
        releaseStore: {
          getActiveReleases: jest.fn().mockResolvedValue({ success: true, value: [release] }),
          getRelease: jest.fn().mockResolvedValue({ success: true, value: release }),
        },
        stateManager: {
          validateStateTransition: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        },
        releaseManager: {
          updateReleaseStage: jest.fn().mockResolvedValue({ success: true, value: { ...release, currentStage: ReleaseStage.FinalReleaseCandidate } }),
        },
        processedTagStore: new ProcessedTagStore(),
      });
      const watcher = new TagWatcher(config as any);

      // Process a tag notification to populate tracking state
      const notification: DataChangeNotification = {
        type: 'github',
        identifier: repoUrl,
        timestamp: new Date(),
        data: { branches: [], tags: makeTags('v2.0.0') },
      };
      await watcher.handlePollingNotification(notification);

      const status = await watcher.getTagStatus('r1');

      expect(status.active).toBe(true);
      expect(status.lastDetectedTag).toBe('v2.0.0');
      expect(status.lastCheckAt).not.toBeNull();
      // Verify lastCheckAt is a valid ISO 8601 string
      expect(new Date(status.lastCheckAt!).toISOString()).toBe(status.lastCheckAt);
    });

    it('should return active: false when release has no repositoryUrl', async () => {
      const release = makeRelease({ id: 'r1', repositoryUrl: '', sourceType: 'github' });
      const config = createMockConfig({
        releaseStore: {
          getRelease: jest.fn().mockResolvedValue({ success: true, value: release }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const status = await watcher.getTagStatus('r1');

      expect(status).toEqual({
        active: false,
        lastDetectedTag: null,
        lastCheckAt: null,
      });
    });

    it('should return active: false when release has no sourceType', async () => {
      const release = makeRelease({ id: 'r1', sourceType: '' as any, repositoryUrl: repoUrl });
      const config = createMockConfig({
        releaseStore: {
          getRelease: jest.fn().mockResolvedValue({ success: true, value: release }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const status = await watcher.getTagStatus('r1');

      expect(status).toEqual({
        active: false,
        lastDetectedTag: null,
        lastCheckAt: null,
      });
    });

    it('should return active: false when release is not found', async () => {
      const config = createMockConfig({
        releaseStore: {
          getRelease: jest.fn().mockResolvedValue({ success: false, error: new Error('Not found') }),
        },
      });
      const watcher = new TagWatcher(config as any);

      const status = await watcher.getTagStatus('nonexistent');

      expect(status).toEqual({
        active: false,
        lastDetectedTag: null,
        lastCheckAt: null,
      });
    });
  });
});
