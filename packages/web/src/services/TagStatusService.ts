import { APIClient } from '../client';
import { TagDetectionInfo } from '../types';

/**
 * Service for fetching tag detection status for releases
 */
export class TagStatusService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get tag detection status for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to tag detection info
   */
  async getTagStatus(releaseId: string): Promise<TagDetectionInfo> {
    const response = await this.apiClient.get<{ tagStatus: TagDetectionInfo }>(
      `/api/releases/${releaseId}/tag-status`
    );
    return response.tagStatus;
  }
}
