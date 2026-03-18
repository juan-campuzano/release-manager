import { APIClient } from '../client';
import { CIExecution } from '../types';

/**
 * Service for fetching CI pipeline executions
 */
export class PipelineExecutionService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get CI pipeline executions for a release
   * @param releaseId - Release ID
   * @returns Promise resolving to an array of CI executions
   */
  async getExecutions(releaseId: string): Promise<CIExecution[]> {
    const response = await this.apiClient.get<{ executions: CIExecution[] }>(
      `/api/releases/${releaseId}/pipeline-executions`
    );
    return response.executions;
  }
}
