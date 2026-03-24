/**
 * TagWatcher service that detects new version tags from GitHub and Azure DevOps
 * repositories via PollingService notifications, matches them to active releases,
 * and advances releases to their next pipeline stage.
 */

import { ReleaseStore } from '../data/release-store';
import { ReleaseManagerService } from '../application/release-manager';
import { StateManager } from '../application/state-manager';
import { EventStore } from './eventStore';
import { PollingService, DataChangeNotification } from '../integration/polling-service';
import { GitHubAdapter } from '../integration/github-adapter';
import { AzureDevOpsAdapter } from '../integration/azure-devops-adapter';
import { Logger } from '../common/logger';
import { ReleaseStage, ReleaseStatus, Tag } from '../domain/types';
import { getNextStage, extractVersion, extractBaseVersion, isVersionTag } from './tag-utils';
import { ProcessedTagStore } from './processed-tag-store';

export interface TagWatcherConfig {
  releaseStore: ReleaseStore;
  releaseManager: ReleaseManagerService;
  stateManager: StateManager;
  eventStore: EventStore;
  pollingService: PollingService;
  githubAdapter: GitHubAdapter;
  azureAdapter: AzureDevOpsAdapter;
  processedTagStore: ProcessedTagStore;
  logger: Logger;
}

export interface TagMatchResult {
  releaseId: string;
  tagName: string;
  targetStage: ReleaseStage | null;
  repositoryUrl: string;
}

export interface DetectedTag {
  tagName: string;
  processedAt: string; // ISO 8601
  appliedStage: string;
}

export interface TagDetectionInfo {
  active: boolean;
  lastDetectedTag: string | null;
  lastCheckAt: string | null; // ISO 8601
  detectedTags: DetectedTag[];
}

export class TagWatcher {
  private config: TagWatcherConfig;
  private unsubscribe: (() => void) | null = null;
  private tagTrackingState: Map<string, { lastDetectedTag: string; lastCheckAt: string }> = new Map();

  constructor(config: TagWatcherConfig) {
    this.config = config;
  }

  /**
   * Start listening to PollingService notifications for tag changes.
   */
  start(): void {
    if (this.unsubscribe) {
      return; // Already started
    }
    this.unsubscribe = this.config.pollingService.subscribe(
      (notification: DataChangeNotification) => {
        this.handlePollingNotification(notification).catch((err) => {
          this.config.logger.error('Unhandled error in tag watcher notification handler', err as Error, {
            type: notification.type,
            identifier: notification.identifier,
          });
        });
      }
    );
    this.config.logger.info('TagWatcher started');
  }

  /**
   * Stop listening to PollingService notifications.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.config.logger.info('TagWatcher stopped');
    }
  }

  /**
   * Get tag detection status for a release.
   * Returns active: true when the release has a non-empty repositoryUrl and valid sourceType.
   * Returns active: false with null fields when tag watching is not configured.
   */
  async getTagStatus(releaseId: string): Promise<TagDetectionInfo> {
      const result = await this.config.releaseStore.getRelease(releaseId);

      if (!result.success) {
        return { active: false, lastDetectedTag: null, lastCheckAt: null, detectedTags: [] };
      }

      const release = result.value;
      const hasRepositoryUrl = typeof release.repositoryUrl === 'string' && release.repositoryUrl.length > 0;
      const hasValidSourceType = release.sourceType === 'github' || release.sourceType === 'azure';

      if (!hasRepositoryUrl || !hasValidSourceType) {
        return { active: false, lastDetectedTag: null, lastCheckAt: null, detectedTags: [] };
      }

      // Ensure polling is running for this repository
      this.ensurePolling(release.sourceType, release.repositoryUrl);

      // Find the latest processed tag for this release by picking the highest semver
      const allProcessed = this.config.processedTagStore.getProcessedTags(release.repositoryUrl)
        .filter(r => r.releaseId === releaseId);

      if (allProcessed.length === 0) {
        return { active: true, lastDetectedTag: null, lastCheckAt: null, detectedTags: [] };
      }

      // Sort by semver descending: a clean release (1.0.0) is higher than a pre-release (1.0.0-rc.1)
      allProcessed.sort((a, b) => {
        const vA = extractVersion(a.tagName) ?? '';
        const vB = extractVersion(b.tagName) ?? '';
        const baseA = extractBaseVersion(vA);
        const baseB = extractBaseVersion(vB);
        if (baseA !== baseB) return baseA > baseB ? -1 : 1;
        // Same base version: clean release wins over pre-release
        const aIsPreRelease = vA.includes('-');
        const bIsPreRelease = vB.includes('-');
        if (aIsPreRelease !== bIsPreRelease) return aIsPreRelease ? 1 : -1;
        // Both pre-release or both clean: use processedAt as tiebreaker
        return b.processedAt.localeCompare(a.processedAt);
      });

      const latest = allProcessed[0];
      return {
        active: true,
        lastDetectedTag: latest.tagName,
        lastCheckAt: latest.processedAt,
        detectedTags: allProcessed.map(r => ({
          tagName: r.tagName,
          processedAt: r.processedAt,
          appliedStage: r.appliedStage,
        })),
      };
    }
  /**
   * Ensure polling is running for a given repository.
   * Extracts the identifier from the URL and starts polling if not already active.
   */
  private ensurePolling(sourceType: string, repositoryUrl: string): void {
    if (sourceType === 'github') {
      const match = repositoryUrl.match(/github\.com\/(.+?)(?:\.git)?$/);
      if (match) {
        const identifier = match[1];
        if (!this.config.pollingService.isPolling('github', identifier)) {
          this.config.pollingService.startGitHubPolling(identifier);
          this.config.logger.info('Started GitHub polling for tag watching', { identifier });
        }
      }
    } else if (sourceType === 'azure') {
      if (!this.config.pollingService.isPolling('azure', repositoryUrl)) {
        this.config.pollingService.startAzurePolling(repositoryUrl);
        this.config.logger.info('Started Azure polling for tag watching', { identifier: repositoryUrl });
      }
    }
  }

  /**
   * Process tags from a polling notification.
   * For GitHub notifications, tags are extracted from `data.tags`.
   * For Azure notifications, tags are fetched via `azureAdapter.getTags`.
   * Metrics notifications are ignored.
   */
  async handlePollingNotification(notification: DataChangeNotification): Promise<void> {
    if (notification.type === 'metrics') {
      return;
    }

    let tags: Tag[] = [];

    if (notification.type === 'github') {
      tags = this.extractGitHubTags(notification);
    } else if (notification.type === 'azure') {
      const fetchedTags = await this.fetchAzureTags(notification.identifier);
      if (fetchedTags === null) {
        return; // Error already logged
      }
      tags = fetchedTags;
    }

    this.config.logger.info('TagWatcher received tags', {
      type: notification.type,
      identifier: notification.identifier,
      tagCount: tags.length,
    });

    // Normalize the identifier to a full repository URL for matching against releases
    const repositoryUrl = this.resolveRepositoryUrl(notification.type, notification.identifier);

    for (const tag of tags) {
      await this.processTag(tag, repositoryUrl);
    }
  }

  /**
   * Process a single tag through the full transition pipeline:
   * 1. Check if it's a version tag
   * 2. Extract the version
   * 3. Check if already processed
   * 4. Match to a release
   * 5. Validate transition via StateManager
   * 6. Apply via ReleaseManagerService.updateReleaseStage
   * 7. Mark as processed on success
   */
  private async processTag(tag: Tag, repositoryUrl: string): Promise<void> {
    if (!isVersionTag(tag.name)) {
      return;
    }

    const version = extractVersion(tag.name);
    if (!version) {
      return;
    }

    if (this.config.processedTagStore.isProcessed(tag.name, repositoryUrl)) {
      this.config.logger.info('Skipping already processed tag', {
        tagName: tag.name,
        repositoryUrl,
      });
      // Ensure tagTrackingState reflects the latest processed tag for this release
      const processed = this.config.processedTagStore.getProcessedTags(repositoryUrl);
      const record = processed.find(r => r.tagName === tag.name);
      if (record) {
        const existing = this.tagTrackingState.get(record.releaseId);
        if (!existing || record.processedAt >= existing.lastCheckAt) {
          this.tagTrackingState.set(record.releaseId, {
            lastDetectedTag: tag.name,
            lastCheckAt: record.processedAt,
          });
        }
      }
      return;
    }

    const matchResult = await this.matchTagToRelease(version, repositoryUrl);
    if (!matchResult) {
      return; // No match — logged in matchTagToRelease
    }

    // Always update tracking state when a tag matches a release
    const now = new Date().toISOString();
    this.tagTrackingState.set(matchResult.releaseId, {
      lastDetectedTag: tag.name,
      lastCheckAt: now,
    });

    // If already at final stage, mark processed and return — no transition needed
    if (!matchResult.targetStage) {
      this.config.logger.info('Matched release is already at final stage', {
        tagName: tag.name,
        repositoryUrl,
        releaseId: matchResult.releaseId,
      });
      this.config.processedTagStore.markProcessed({
        tagName: tag.name,
        repositoryUrl,
        processedAt: now,
        releaseId: matchResult.releaseId,
        appliedStage: ReleaseStage.RollOut100Percent,
      });
      return;
    }

    // Validate the transition via StateManager
    const releaseResult = await this.config.releaseStore.getRelease(matchResult.releaseId);
    if (!releaseResult.success) {
      this.config.logger.error('Failed to fetch release for transition validation', releaseResult.error as Error, {
        releaseId: matchResult.releaseId,
      });
      return;
    }

    const release = releaseResult.value;
    const validation = this.config.stateManager.validateStateTransition(release, matchResult.targetStage);
    if (!validation.valid) {
      this.config.logger.warn('StateManager rejected stage transition', {
        releaseId: matchResult.releaseId,
        currentStage: release.currentStage,
        targetStage: matchResult.targetStage,
        errors: validation.errors,
      });
      // Mark as processed to avoid retrying a known-invalid transition
      this.config.processedTagStore.markProcessed({
        tagName: tag.name,
        repositoryUrl,
        processedAt: new Date().toISOString(),
        releaseId: matchResult.releaseId,
        appliedStage: release.currentStage,
      });
      return;
    }

    // Apply the transition via ReleaseManagerService
    const updateResult = await this.config.releaseManager.updateReleaseStage(
      matchResult.releaseId,
      matchResult.targetStage
    );

    if (!updateResult.success) {
      this.config.logger.error('Failed to update release stage', updateResult.error as Error, {
        releaseId: matchResult.releaseId,
        targetStage: matchResult.targetStage,
      });
      // Do NOT mark as processed — will retry on next cycle
      return;
    }

    // Mark tag as processed on success
    const processedAt = new Date().toISOString();
    this.config.processedTagStore.markProcessed({
      tagName: tag.name,
      repositoryUrl,
      processedAt,
      releaseId: matchResult.releaseId,
      appliedStage: matchResult.targetStage,
    });

    this.config.logger.info('Successfully advanced release stage via tag detection', {
      releaseId: matchResult.releaseId,
      tagName: tag.name,
      targetStage: matchResult.targetStage,
    });
  }

  /**
   * Extract tags from a GitHub polling notification's data payload.
   */
  private extractGitHubTags(notification: DataChangeNotification): Tag[] {
    if (!notification.data || !Array.isArray(notification.data.tags)) {
      this.config.logger.warn('GitHub notification missing tags data', {
        identifier: notification.identifier,
      });
      return [];
    }
    return notification.data.tags as Tag[];
  }

  /**
   * Fetch tags from Azure DevOps via the adapter.
   * Returns null if the fetch fails (error is logged).
   */
  private async fetchAzureTags(identifier: string): Promise<Tag[] | null> {
    const result = await this.config.azureAdapter.getTags(identifier);
    if (!result.success) {
      this.config.logger.error('Failed to fetch Azure DevOps tags', undefined, {
        identifier,
        error: result.error?.message,
      });
      return null;
    }
    return result.value;
  }
  /**
   * Resolve a polling identifier to a full repository URL for matching against releases.
   * GitHub identifiers are "owner/repo" format, which need to be expanded to full URLs.
   * Azure identifiers are passed through as-is since they may already be full URLs.
   */
  private resolveRepositoryUrl(type: string, identifier: string): string {
    if (type === 'github' && !identifier.startsWith('http')) {
      return `https://github.com/${identifier}`;
    }
    return identifier;
  }

  /**
   * Match a version string against active releases for a given repository URL.
   * Returns a TagMatchResult when exactly one active release matches by version AND repositoryUrl.
   * Returns null and logs info/warning for zero or multiple matches.
   */
  async matchTagToRelease(version: string, repositoryUrl: string): Promise<TagMatchResult | null> {
    const result = await this.config.releaseStore.getActiveReleases();
    if (!result.success) {
      this.config.logger.error('Failed to fetch releases for tag matching', result.error as Error, {
        version,
        repositoryUrl,
      });
      return null;
    }

    const activeReleases = result.value.filter(
      (r) => r.status === ReleaseStatus.Current || r.status === ReleaseStatus.Upcoming
    );

    const matches = activeReleases.filter(
      (r) => {
        const tagBaseVersion = extractBaseVersion(version);
        const releaseBaseVersion = extractBaseVersion(r.version);
        return (r.version === version || r.version === tagBaseVersion || releaseBaseVersion === tagBaseVersion) && r.repositoryUrl === repositoryUrl;
      }
    );

    if (matches.length === 0) {
      this.config.logger.info('No active release matched version tag', {
        version,
        repositoryUrl,
      });
      return null;
    }

    if (matches.length > 1) {
      this.config.logger.warn('Multiple active releases matched version tag', {
        version,
        repositoryUrl,
        releaseIds: matches.map((r) => r.id),
      });
      return null;
    }

    const release = matches[0];
    const targetStage = getNextStage(release.currentStage);

    return {
      releaseId: release.id,
      tagName: version,
      targetStage: targetStage ?? null,
      repositoryUrl,
    };
  }

}
