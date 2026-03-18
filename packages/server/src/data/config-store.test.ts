/**
 * Tests for ConfigStore
 */

import { ConfigStore } from './config-store';
import { RepositoryConfig } from '../domain/types';
import { isSuccess, isFailure } from '../common/result';

describe('ConfigStore', () => {
  let store: ConfigStore;

  beforeEach(() => {
    store = new ConfigStore();
  });

  const createTestConfigInput = (
    overrides: Partial<Omit<RepositoryConfig, 'id' | 'createdAt' | 'updatedAt'>> = {}
  ): Omit<RepositoryConfig, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'test-config',
    repositoryUrl: 'https://github.com/test/repo',
    sourceType: 'github',
    requiredSquads: ['squad-a'],
    qualityThresholds: {
      crashRateThreshold: 1,
      cpuExceptionRateThreshold: 5,
    },
    rolloutStages: [10, 50, 100],
    ...overrides,
  });

  describe('create', () => {
    it('should create a config and return it with an id', async () => {
      const input = createTestConfigInput();
      const result = await store.create(input);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.id).toBeDefined();
        expect(result.value.name).toBe('test-config');
        expect(result.value.repositoryUrl).toBe('https://github.com/test/repo');
        expect(result.value.sourceType).toBe('github');
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should return ConflictError for duplicate name', async () => {
      await store.create(createTestConfigInput({ name: 'duplicate' }));
      const result = await store.create(createTestConfigInput({ name: 'duplicate' }));

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('ConflictError');
      }
    });
  });

  describe('getAll', () => {
    it('should return empty list initially', async () => {
      const result = await store.getAll();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should return all created configs', async () => {
      await store.create(createTestConfigInput({ name: 'config-1' }));
      await store.create(createTestConfigInput({ name: 'config-2' }));

      const result = await store.getAll();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('getById', () => {
    it('should return NotFoundError for missing id', async () => {
      const result = await store.getById('non-existent');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });

    it('should retrieve a created config by id', async () => {
      const createResult = await store.create(createTestConfigInput());

      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const getResult = await store.getById(createResult.value.id);

        expect(isSuccess(getResult)).toBe(true);
        if (isSuccess(getResult)) {
          expect(getResult.value.name).toBe('test-config');
        }
      }
    });
  });

  describe('update', () => {
    it('should return NotFoundError for non-existent id', async () => {
      const result = await store.update('non-existent', { name: 'updated' });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });

    it('should update and return the updated config', async () => {
      const createResult = await store.create(createTestConfigInput());

      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const result = await store.update(createResult.value.id, { name: 'updated-name' });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.value.name).toBe('updated-name');
          expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
            createResult.value.updatedAt.getTime()
          );
        }
      }
    });

    it('should return ConflictError when updating name to a duplicate', async () => {
      await store.create(createTestConfigInput({ name: 'config-a' }));
      const createResult = await store.create(createTestConfigInput({ name: 'config-b' }));

      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const result = await store.update(createResult.value.id, { name: 'config-a' });

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
          expect(result.error.name).toBe('ConflictError');
        }
      }
    });
  });

  describe('delete', () => {
    it('should return NotFoundError for non-existent id', async () => {
      const result = await store.delete('non-existent');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });

    it('should delete a config and confirm removal', async () => {
      const createResult = await store.create(createTestConfigInput());

      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const deleteResult = await store.delete(createResult.value.id);
        expect(isSuccess(deleteResult)).toBe(true);

        const getResult = await store.getById(createResult.value.id);
        expect(isFailure(getResult)).toBe(true);
      }
    });
  });
});
