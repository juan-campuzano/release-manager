/**
 * Tests for TeamStore
 */

import { TeamStore } from './team-store';
import { isSuccess, isFailure } from '../common/result';

describe('TeamStore', () => {
  let store: TeamStore;

  beforeEach(() => {
    store = new TeamStore();
  });

  describe('getAll', () => {
    it('should return empty list initially', async () => {
      const result = await store.getAll();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should return all created teams with member counts', async () => {
      const team1 = await store.create('Team Alpha');
      const team2 = await store.create('Team Beta');
      expect(isSuccess(team1)).toBe(true);
      expect(isSuccess(team2)).toBe(true);

      if (isSuccess(team1)) {
        await store.addMember(team1.value.id, 'Alice');
        await store.addMember(team1.value.id, 'Bob');
      }

      const result = await store.getAll();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        const alpha = result.value.find(t => t.name === 'Team Alpha');
        const beta = result.value.find(t => t.name === 'Team Beta');
        expect(alpha?.memberCount).toBe(2);
        expect(beta?.memberCount).toBe(0);
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

    it('should return team detail with members', async () => {
      const createResult = await store.create('Team Alpha');
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        await store.addMember(createResult.value.id, 'Alice', 'alice@example.com');
        await store.addMember(createResult.value.id, 'Bob');

        const result = await store.getById(createResult.value.id);
        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.value.name).toBe('Team Alpha');
          expect(result.value.members).toHaveLength(2);
          expect(result.value.createdAt).toBeDefined();
          expect(result.value.updatedAt).toBeDefined();

          const alice = result.value.members.find(m => m.name === 'Alice');
          expect(alice?.email).toBe('alice@example.com');

          const bob = result.value.members.find(m => m.name === 'Bob');
          expect(bob?.email).toBeUndefined();
        }
      }
    });
  });

  describe('create', () => {
    it('should create a team and return it with id and timestamps', async () => {
      const result = await store.create('Team Alpha');
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.id).toBeDefined();
        expect(result.value.name).toBe('Team Alpha');
        expect(result.value.members).toHaveLength(0);
        expect(result.value.createdAt).toBeDefined();
        expect(result.value.updatedAt).toBeDefined();
        // Verify ISO 8601 format
        expect(() => new Date(result.value.createdAt)).not.toThrow();
        expect(new Date(result.value.createdAt).toISOString()).toBe(result.value.createdAt);
      }
    });

    it('should return ConflictError for duplicate name', async () => {
      await store.create('Duplicate');
      const result = await store.create('Duplicate');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('ConflictError');
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

    it('should delete a team and all its members', async () => {
      const createResult = await store.create('Team Alpha');
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        await store.addMember(createResult.value.id, 'Alice');

        const deleteResult = await store.delete(createResult.value.id);
        expect(isSuccess(deleteResult)).toBe(true);

        const getResult = await store.getById(createResult.value.id);
        expect(isFailure(getResult)).toBe(true);
      }
    });
  });

  describe('addMember', () => {
    it('should return NotFoundError if team does not exist', async () => {
      const result = await store.addMember('non-existent', 'Alice');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });

    it('should add a member and return the member object', async () => {
      const createResult = await store.create('Team Alpha');
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const result = await store.addMember(createResult.value.id, 'Alice', 'alice@example.com');
        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.value.id).toBeDefined();
          expect(result.value.name).toBe('Alice');
          expect(result.value.email).toBe('alice@example.com');
          expect(result.value.createdAt).toBeDefined();
        }
      }
    });
  });

  describe('removeMember', () => {
    it('should return NotFoundError if team does not exist', async () => {
      const result = await store.removeMember('non-existent', 'member-id');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.name).toBe('NotFoundError');
      }
    });

    it('should return NotFoundError if member does not exist', async () => {
      const createResult = await store.create('Team Alpha');
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const result = await store.removeMember(createResult.value.id, 'non-existent');
        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
          expect(result.error.name).toBe('NotFoundError');
        }
      }
    });

    it('should remove a member from the team', async () => {
      const createResult = await store.create('Team Alpha');
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        const memberResult = await store.addMember(createResult.value.id, 'Alice');
        expect(isSuccess(memberResult)).toBe(true);
        if (isSuccess(memberResult)) {
          const removeResult = await store.removeMember(createResult.value.id, memberResult.value.id);
          expect(isSuccess(removeResult)).toBe(true);

          const teamResult = await store.getById(createResult.value.id);
          expect(isSuccess(teamResult)).toBe(true);
          if (isSuccess(teamResult)) {
            expect(teamResult.value.members).toHaveLength(0);
          }
        }
      }
    });
  });
});
