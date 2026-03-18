import { APIClient } from '../client';
import {
  Release,
  ReleaseConfig,
  Platform,
  ReleaseStage,
  ReleaseStatus,
  Blocker,
  BlockerInput,
  SignOff,
  SignOffInput,
  Distribution,
  DistributionInput,
  DistributionStatus,
  ITGCStatus,
  ITGCStatusInput,
  HistoryFilters,
} from '../types';

/**
 * Service for managing releases and related operations
 */
export class ReleaseService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  // ============================================================================
  // Release CRUD Operations
  // ============================================================================

  /**
   * Get active releases with optional platform filter
   * @param platform - Optional platform filter (iOS, Android, Desktop)
   * @returns Promise resolving to array of releases
   */
  async getActiveReleases(platform?: Platform): Promise<Release[]> {
    const params = platform ? { platform } : {};
    const response: any = await this.apiClient.get('/api/releases', { params });
    console.log('[ReleaseService] Raw response:', response);
    
    // The response should have a releases property
    if (response && response.releases && Array.isArray(response.releases)) {
      console.log('[ReleaseService] Found releases array, length:', response.releases.length);
      return response.releases;
    }
    
    console.log('[ReleaseService] No releases found, returning empty array');
    return [];
  }

  /**
   * Get a single release by ID
   * @param id - Release ID
   * @returns Promise resolving to release details
   */
  async getReleaseById(id: string): Promise<Release> {
    const response = await this.apiClient.get<{ release: Release }>(`/api/releases/${id}`);
    return response.release;
  }

  /**
   * Create a new release
   * @param config - Release configuration
   * @returns Promise resolving to created release
   */
  async createRelease(config: ReleaseConfig): Promise<Release> {
    const response = await this.apiClient.post<{ release: Release }>('/api/releases', config);
    return response.release;
  }

  // ============================================================================
  // Release Update Operations
  // ============================================================================

  /**
   * Update release stage
   * @param id - Release ID
   * @param stage - New release stage
   * @returns Promise resolving to updated release
   */
  async updateStage(id: string, stage: ReleaseStage): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(`/api/releases/${id}/stage`, { stage });
    return response.release;
  }

  /**
   * Update release status
   * @param id - Release ID
   * @param status - New release status
   * @returns Promise resolving to updated release
   */
  async updateStatus(id: string, status: ReleaseStatus): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(`/api/releases/${id}/status`, { status });
    return response.release;
  }

  /**
   * Update rollout percentage
   * @param id - Release ID
   * @param percentage - Rollout percentage (0-100)
   * @returns Promise resolving to updated release
   */
  async updateRollout(id: string, percentage: number): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(`/api/releases/${id}/rollout`, { percentage });
    return response.release;
  }

  /**
   * Update build information
   */
  async updateBuildInfo(
    id: string,
    buildInfo: { latestBuild?: string; latestPassingBuild?: string; latestAppStoreBuild?: string }
  ): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(`/api/releases/${id}/builds`, buildInfo);
    return response.release;
  }

  // ============================================================================
  // Blocker Management
  // ============================================================================

  /**
   * Get all blockers for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to array of blockers
   */
  async getBlockers(releaseId: string): Promise<Blocker[]> {
    const response = await this.apiClient.get<{ blockers: Blocker[] }>(`/api/releases/${releaseId}/blockers`);
    return response.blockers;
  }

  /**
   * Add a new blocker to a release
   * @param releaseId - Release ID
   * @param blocker - Blocker input data
   * @returns Promise resolving to created blocker
   */
  async addBlocker(releaseId: string, blocker: BlockerInput): Promise<Release> {
    const response = await this.apiClient.post<{ release: Release }>(`/api/releases/${releaseId}/blockers`, blocker);
    return response.release;
  }

  /**
   * Resolve a blocker
   * @param releaseId - Release ID
   * @param blockerId - Blocker ID
   * @returns Promise resolving to updated blocker
   */
  async resolveBlocker(releaseId: string, blockerId: string): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(
      `/api/releases/${releaseId}/blockers/${blockerId}/resolve`
    );
    return response.release;
  }

  // ============================================================================
  // Sign-Off Management
  // ============================================================================

  /**
   * Get all sign-offs for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to array of sign-offs
   */
  async getSignOffs(releaseId: string): Promise<SignOff[]> {
    const response = await this.apiClient.get<{ signOffStatus: SignOff[] }>(`/api/releases/${releaseId}/signoffs`);
    return response.signOffStatus;
  }

  /**
   * Record a sign-off for a release
   * @param releaseId - Release ID
   * @param signOff - Sign-off input data
   * @returns Promise resolving to created sign-off
   */
  async recordSignOff(releaseId: string, signOff: SignOffInput): Promise<Release> {
    const response = await this.apiClient.post<{ release: Release }>(`/api/releases/${releaseId}/signoffs`, signOff);
    return response.release;
  }

  // ============================================================================
  // Distribution Management
  // ============================================================================

  /**
   * Get all distribution channels for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to array of distributions
   */
  async getDistributions(releaseId: string): Promise<Distribution[]> {
    const response = await this.apiClient.get<{ distributions: Distribution[] }>(`/api/releases/${releaseId}/distributions`);
    return response.distributions;
  }

  /**
   * Add a new distribution channel to a release
   * @param releaseId - Release ID
   * @param distribution - Distribution input data
   * @returns Promise resolving to created distribution
   */
  async addDistribution(
    releaseId: string,
    distribution: DistributionInput
  ): Promise<Release> {
    const response = await this.apiClient.post<{ release: Release }>(
      `/api/releases/${releaseId}/distributions`,
      distribution
    );
    return response.release;
  }

  /**
   * Update distribution channel status
   * @param releaseId - Release ID
   * @param channel - Distribution channel name
   * @param status - New distribution status
   * @returns Promise resolving to updated distribution
   */
  async updateDistribution(
    releaseId: string,
    channel: string,
    status: DistributionStatus
  ): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(
      `/api/releases/${releaseId}/distributions/${channel}`,
      { status }
    );
    return response.release;
  }

  // ============================================================================
  // ITGC Management
  // ============================================================================

  /**
   * Get ITGC status for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to ITGC status
   */
  async getITGCStatus(releaseId: string): Promise<ITGCStatus> {
    const response = await this.apiClient.get<{ itgcStatus: ITGCStatus }>(`/api/releases/${releaseId}/itgc`);
    return response.itgcStatus;
  }

  /**
   * Update ITGC status for a release
   * @param releaseId - Release ID
   * @param status - ITGC status input data
   * @returns Promise resolving to updated ITGC status
   */
  async updateITGCStatus(releaseId: string, status: ITGCStatusInput): Promise<Release> {
    const response = await this.apiClient.patch<{ release: Release }>(`/api/releases/${releaseId}/itgc`, status);
    return response.release;
  }

  // ============================================================================
  // Release History
  // ============================================================================

  /**
   * Get release history with optional filters
   * @param filters - Optional filters for platform, status, and date range
   * @returns Promise resolving to array of historical releases
   */
  async getReleaseHistory(filters: HistoryFilters = {}): Promise<Release[]> {
    const params: Record<string, string> = {};
    
    if (filters.platform) {
      params.platform = filters.platform;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.startDate) {
      params.startDate = filters.startDate;
    }
    if (filters.endDate) {
      params.endDate = filters.endDate;
    }

    const response = await this.apiClient.get<{ releases: Release[] }>('/api/releases/history', { params });
    return response.releases;
  }
}
