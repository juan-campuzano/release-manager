import { APIClient } from '../client';
import { RepositoryConfig } from '../types';

/**
 * Service for managing repository configurations
 */
export class ConfigService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get all repository configurations
   * @returns Promise resolving to array of repository configs
   */
  async getAll(): Promise<RepositoryConfig[]> {
    const response = await this.apiClient.get<{ configs: RepositoryConfig[] }>('/api/configs');
    return response.configs;
  }

  /**
   * Get a repository configuration by ID
   * @param id - Configuration ID
   * @returns Promise resolving to repository config
   */
  async getById(id: string): Promise<RepositoryConfig> {
    const response = await this.apiClient.get<{ config: RepositoryConfig }>(`/api/configs/${id}`);
    return response.config;
  }

  /**
   * Create a new repository configuration
   * @param data - Configuration data without id and timestamps
   * @returns Promise resolving to created repository config
   */
  async create(data: Omit<RepositoryConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<RepositoryConfig> {
    const response = await this.apiClient.post<{ config: RepositoryConfig }>('/api/configs', data);
    return response.config;
  }

  /**
   * Update an existing repository configuration
   * @param id - Configuration ID
   * @param data - Partial configuration data to update
   * @returns Promise resolving to updated repository config
   */
  async update(id: string, data: Partial<RepositoryConfig>): Promise<RepositoryConfig> {
    const response = await this.apiClient.put<{ config: RepositoryConfig }>(`/api/configs/${id}`, data);
    return response.config;
  }

  /**
   * Delete a repository configuration
   * @param id - Configuration ID
   */
  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/configs/${id}`);
  }
}
