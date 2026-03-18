/**
 * Service initialization and dependency injection
 */

import { ReleaseManagerService } from './application';
import { MetricsAggregator } from './application';
import { StateManager } from './application';
import { JSONConfigParser } from './application';
import { ReleaseStore } from './data/release-store';
import { HistoryStore } from './data/history-store';
import { MockDataProvider } from './data/mock-data-provider';
import { Cache } from './data/cache';
import { ConfigStore } from './data/config-store';
import { EventStore } from './services/eventStore';
import { GitHubAdapter } from './integration';
import { AzureDevOpsAdapter } from './integration';
import { MetricsCollector } from './integration';
import { PollingService } from './integration';
import { createConnection, getDefaultConfig } from './data/database-config';
import { Release, Platform } from './domain/types';
import { Success, Failure } from './common/result';
import { ApplicationError } from './common/errors';
import { PipelineFetcher } from './services/pipeline-fetcher';
import { TagWatcher } from './services/tag-watcher';
import { ProcessedTagStore } from './services/processed-tag-store';
import { Logger } from './common/logger';

/**
 * Application services container
 */
export interface Services {
  releaseManager: ReleaseManagerService;
  metricsAggregator: MetricsAggregator;
  pollingService: PollingService;
  cache: Cache;
  eventStore: EventStore;
  pipelineFetcher: PipelineFetcher;
  configStore: ConfigStore;
  tagWatcher: TagWatcher;
}

/**
 * Initialize all application services with proper dependency injection
 */
export function initializeServices(): Services {
  const useMockData = process.env.USE_MOCK_DATA === 'true';
  
  console.log(`[Server] Starting in ${useMockData ? 'MOCK' : 'DATABASE'} mode`);

  // Initialize data layer
  const cache = new Cache();
  let releaseStore: ReleaseStore;
  let historyStore: HistoryStore;

  if (useMockData) {
    // Use MockDataProvider in mock mode
    const mockProvider = new MockDataProvider();
    
    // Create adapters to match ReleaseStore and HistoryStore interfaces
    releaseStore = createReleaseStoreAdapter(mockProvider);
    historyStore = createHistoryStoreAdapter(mockProvider);
  } else {
    // Use database stores in database mode
    const dbConfig = getDefaultConfig();
    const dbConnection = createConnection(dbConfig);
    releaseStore = new ReleaseStore({ connection: dbConnection });
    historyStore = new HistoryStore({ connection: dbConnection });
  }

  // Initialize application layer
  const stateManager = new StateManager();
  const configParser = new JSONConfigParser();
  const eventStore = new EventStore();

  // Initialize integration layer
  const githubAdapter = new GitHubAdapter(cache);
  const azureAdapter = new AzureDevOpsAdapter(cache);
  const metricsCollector = new MetricsCollector(cache);

  // Authenticate GitHub adapter if token is available
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    githubAdapter.authenticate({ token: githubToken }).then(result => {
      if (result.success) {
        console.log('[Server] GitHub adapter authenticated successfully');
        // Start polling after authentication succeeds
        startRepositoryPolling(releaseStore, pollingService);
      } else {
        console.error('[Server] GitHub adapter authentication failed:', result.error.message);
      }
    });
  }

  // Initialize core services
  const releaseManager = new ReleaseManagerService({
    releaseStore,
    historyStore,
    stateManager,
    configParser,
    eventStore
  });

  const metricsAggregator = new MetricsAggregator(
    metricsCollector,
    releaseStore
  );

  const pollingService = new PollingService(
    githubAdapter,
    azureAdapter,
    metricsCollector,
    {} // Empty config to use defaults
  );

  // Initialize config store and pipeline fetcher
  const configStore = new ConfigStore();
  const pipelineFetcher = new PipelineFetcher(
    releaseStore,
    configStore,
    githubAdapter,
    azureAdapter
  );

  // Initialize tag watcher for automatic version tag detection
  const processedTagStore = new ProcessedTagStore();
  const tagWatcherLogger = new Logger();
  const tagWatcher = new TagWatcher({
    releaseStore,
    releaseManager,
    stateManager,
    eventStore,
    pollingService,
    githubAdapter,
    azureAdapter,
    processedTagStore,
    logger: tagWatcherLogger
  });
  tagWatcher.start();

  return {
    releaseManager,
    metricsAggregator,
    pollingService,
    cache,
    eventStore,
    pipelineFetcher,
    configStore,
    tagWatcher
  };
}

/**
 * Create a ReleaseStore-compatible adapter for MockDataProvider
 */
function createReleaseStoreAdapter(mockProvider: MockDataProvider): any {
  return {
    async create(release: Release) {
      return mockProvider.create(release);
    },
    async getRelease(releaseId: string) {
      const result = await mockProvider.findById(releaseId);
      if (result.success && result.value === null) {
        return Failure(new ApplicationError(`Release ${releaseId} not found`));
      }
      return result;
    },
    async update(releaseId: string, updates: Partial<Release>, _expectedVersion?: number) {
      return mockProvider.update(releaseId, updates);
    },
    async delete(releaseId: string) {
      return mockProvider.delete(releaseId);
    },
    async getActiveReleases(platform?: Platform) {
      return mockProvider.findAll(platform ? { platform } : undefined);
    },
    async getReleaseHistory(filters: any) {
      return mockProvider.getHistory(filters);
    },
    getVersion(_releaseId: string): number {
      // Mock mode doesn't use optimistic locking, return 0
      return 0;
    }
  };
}

/**
 * Create a HistoryStore-compatible adapter for MockDataProvider
 */
function createHistoryStoreAdapter(mockProvider: MockDataProvider): any {
  return {
    async createSnapshot(release: Release) {
      const result = await mockProvider.createSnapshot(release);
      if (result.success) {
        // Return a HistorySnapshot-like object for compatibility
        return Success({
          id: `${release.id}_${Date.now()}`,
          releaseId: release.id,
          snapshotData: release,
          snapshotAt: new Date()
        });
      }
      return result;
    },
    async getHistoricalReleases(filters: any) {
      return mockProvider.getHistory(filters);
    }
  };
}

/**
 * Start polling for repositories associated with active releases.
 * Queries active releases and starts GitHub/Azure polling for each unique repository.
 */
async function startRepositoryPolling(
  releaseStore: ReleaseStore,
  pollingService: PollingService
): Promise<void> {
  try {
    const result = await releaseStore.getActiveReleases();
    if (!result.success) {
      console.error('[Server] Failed to fetch active releases for polling:', result.error);
      return;
    }

    const seen = new Set<string>();
    for (const release of result.value) {
      if (!release.repositoryUrl || !release.sourceType) continue;

      const key = `${release.sourceType}:${release.repositoryUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (release.sourceType === 'github') {
        // Extract "owner/repo" from the full URL
        const match = release.repositoryUrl.match(/github\.com\/(.+?)(?:\.git)?$/);
        if (match) {
          pollingService.startGitHubPolling(match[1]);
          console.log(`[Server] Started GitHub polling for ${match[1]}`);
        }
      } else if (release.sourceType === 'azure') {
        pollingService.startAzurePolling(release.repositoryUrl);
        console.log(`[Server] Started Azure polling for ${release.repositoryUrl}`);
      }
    }
  } catch (error) {
    console.error('[Server] Error starting repository polling:', error);
  }
}
