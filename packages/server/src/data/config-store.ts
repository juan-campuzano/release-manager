/**
 * Config Store - In-memory storage for repository configurations
 * Provides CRUD operations with unique name enforcement
 */

import { RepositoryConfig } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { NotFoundError, ConflictError, ApplicationError } from '../common/errors';
import { randomUUID } from 'crypto';

/**
 * In-memory store for RepositoryConfig records
 */
export class ConfigStore {
  private configs: Map<string, RepositoryConfig> = new Map();

  /**
   * Create a new repository configuration
   */
  async create(
    config: Omit<RepositoryConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<RepositoryConfig, ApplicationError>> {
    try {
      // Enforce unique name constraint
      for (const existing of this.configs.values()) {
        if (existing.name === config.name) {
          return Failure(
            new ConflictError(`Configuration name '${config.name}' is already in use`)
          );
        }
      }

      const now = new Date();
      const newConfig: RepositoryConfig = {
        ...config,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      };

      this.configs.set(newConfig.id, newConfig);
      return Success(newConfig);
    } catch (error) {
      return Failure(new ApplicationError('Failed to create config', error as Error));
    }
  }

  /**
   * Get all repository configurations
   */
  async getAll(): Promise<Result<RepositoryConfig[], ApplicationError>> {
    try {
      return Success(Array.from(this.configs.values()));
    } catch (error) {
      return Failure(new ApplicationError('Failed to get configs', error as Error));
    }
  }

  /**
   * Get a repository configuration by ID
   */
  async getById(id: string): Promise<Result<RepositoryConfig, ApplicationError>> {
    try {
      const config = this.configs.get(id);
      if (!config) {
        return Failure(new NotFoundError(`Repository configuration '${id}' not found`));
      }
      return Success(config);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get config', error as Error));
    }
  }

  /**
   * Update an existing repository configuration
   */
  async update(
    id: string,
    updates: Partial<Omit<RepositoryConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Result<RepositoryConfig, ApplicationError>> {
    try {
      const existing = this.configs.get(id);
      if (!existing) {
        return Failure(new NotFoundError(`Repository configuration '${id}' not found`));
      }

      // Enforce unique name constraint if name is being updated
      if (updates.name && updates.name !== existing.name) {
        for (const other of this.configs.values()) {
          if (other.id !== id && other.name === updates.name) {
            return Failure(
              new ConflictError(`Configuration name '${updates.name}' is already in use`)
            );
          }
        }
      }

      const updated: RepositoryConfig = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      };

      this.configs.set(id, updated);
      return Success(updated);
    } catch (error) {
      return Failure(new ApplicationError('Failed to update config', error as Error));
    }
  }

  /**
   * Delete a repository configuration by ID
   */
  async delete(id: string): Promise<Result<void, ApplicationError>> {
    try {
      if (!this.configs.has(id)) {
        return Failure(new NotFoundError(`Repository configuration '${id}' not found`));
      }
      this.configs.delete(id);
      return Success(undefined);
    } catch (error) {
      return Failure(new ApplicationError('Failed to delete config', error as Error));
    }
  }
}
