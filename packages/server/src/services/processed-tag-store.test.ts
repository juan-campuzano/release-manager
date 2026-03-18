/**
 * Tests for ProcessedTagStore — in-memory store for tracking processed version tags.
 */

import { ProcessedTagStore, ProcessedTagRecord } from './processed-tag-store';
import { ReleaseStage } from '../domain/types';

function makeRecord(overrides: Partial<ProcessedTagRecord> = {}): ProcessedTagRecord {
  return {
    tagName: 'v1.0.0',
    repositoryUrl: 'https://github.com/org/repo',
    processedAt: '2025-01-15T10:00:00Z',
    releaseId: 'release-1',
    appliedStage: ReleaseStage.FinalReleaseCandidate,
    ...overrides,
  };
}

describe('ProcessedTagStore', () => {
  let store: ProcessedTagStore;

  beforeEach(() => {
    store = new ProcessedTagStore();
  });

  describe('markProcessed / isProcessed', () => {
    it('should mark a tag as processed and report it as processed', () => {
      const record = makeRecord();
      store.markProcessed(record);
      expect(store.isProcessed('v1.0.0', 'https://github.com/org/repo')).toBe(true);
    });

    it('should return false for tags that have not been processed', () => {
      expect(store.isProcessed('v1.0.0', 'https://github.com/org/repo')).toBe(false);
    });

    it('should distinguish tags by repository URL', () => {
      store.markProcessed(makeRecord({ repositoryUrl: 'https://github.com/org/repo-a' }));
      expect(store.isProcessed('v1.0.0', 'https://github.com/org/repo-a')).toBe(true);
      expect(store.isProcessed('v1.0.0', 'https://github.com/org/repo-b')).toBe(false);
    });

    it('should distinguish tags by tag name', () => {
      store.markProcessed(makeRecord({ tagName: 'v1.0.0' }));
      expect(store.isProcessed('v1.0.0', 'https://github.com/org/repo')).toBe(true);
      expect(store.isProcessed('v2.0.0', 'https://github.com/org/repo')).toBe(false);
    });

    it('should not create duplicates when marking the same tag twice', () => {
      store.markProcessed(makeRecord());
      store.markProcessed(makeRecord({ processedAt: '2025-01-16T10:00:00Z' }));
      const tags = store.getProcessedTags('https://github.com/org/repo');
      expect(tags).toHaveLength(1);
      expect(tags[0].processedAt).toBe('2025-01-16T10:00:00Z');
    });
  });

  describe('getProcessedTags', () => {
    it('should return empty array for unknown repository', () => {
      expect(store.getProcessedTags('https://github.com/org/unknown')).toEqual([]);
    });

    it('should return only tags for the specified repository', () => {
      store.markProcessed(makeRecord({ tagName: 'v1.0.0', repositoryUrl: 'https://github.com/org/repo-a' }));
      store.markProcessed(makeRecord({ tagName: 'v2.0.0', repositoryUrl: 'https://github.com/org/repo-a' }));
      store.markProcessed(makeRecord({ tagName: 'v1.0.0', repositoryUrl: 'https://github.com/org/repo-b' }));

      const tagsA = store.getProcessedTags('https://github.com/org/repo-a');
      expect(tagsA).toHaveLength(2);
      expect(tagsA.map(t => t.tagName).sort()).toEqual(['v1.0.0', 'v2.0.0']);

      const tagsB = store.getProcessedTags('https://github.com/org/repo-b');
      expect(tagsB).toHaveLength(1);
      expect(tagsB[0].tagName).toBe('v1.0.0');
    });
  });

  describe('getLastProcessedTimestamp', () => {
    it('should return null for unknown repository', () => {
      expect(store.getLastProcessedTimestamp('https://github.com/org/unknown')).toBeNull();
    });

    it('should return the latest timestamp for a repository', () => {
      store.markProcessed(makeRecord({
        tagName: 'v1.0.0',
        processedAt: '2025-01-10T10:00:00Z',
      }));
      store.markProcessed(makeRecord({
        tagName: 'v2.0.0',
        processedAt: '2025-01-15T10:00:00Z',
      }));
      store.markProcessed(makeRecord({
        tagName: 'v1.5.0',
        processedAt: '2025-01-12T10:00:00Z',
      }));

      const latest = store.getLastProcessedTimestamp('https://github.com/org/repo');
      expect(latest).toEqual(new Date('2025-01-15T10:00:00Z'));
    });

    it('should only consider tags from the specified repository', () => {
      store.markProcessed(makeRecord({
        repositoryUrl: 'https://github.com/org/repo-a',
        processedAt: '2025-01-10T10:00:00Z',
      }));
      store.markProcessed(makeRecord({
        repositoryUrl: 'https://github.com/org/repo-b',
        processedAt: '2025-01-20T10:00:00Z',
      }));

      const latest = store.getLastProcessedTimestamp('https://github.com/org/repo-a');
      expect(latest).toEqual(new Date('2025-01-10T10:00:00Z'));
    });
  });

  describe('exportState / importState', () => {
    it('should export an empty array when no tags are processed', () => {
      expect(store.exportState()).toEqual([]);
    });

    it('should export all processed records', () => {
      store.markProcessed(makeRecord({ tagName: 'v1.0.0' }));
      store.markProcessed(makeRecord({ tagName: 'v2.0.0' }));
      const exported = store.exportState();
      expect(exported).toHaveLength(2);
    });

    it('should import state into a fresh store preserving isProcessed results', () => {
      store.markProcessed(makeRecord({ tagName: 'v1.0.0' }));
      store.markProcessed(makeRecord({ tagName: 'v2.0.0' }));
      const exported = store.exportState();

      const newStore = new ProcessedTagStore();
      newStore.importState(exported);

      expect(newStore.isProcessed('v1.0.0', 'https://github.com/org/repo')).toBe(true);
      expect(newStore.isProcessed('v2.0.0', 'https://github.com/org/repo')).toBe(true);
      expect(newStore.isProcessed('v3.0.0', 'https://github.com/org/repo')).toBe(false);
    });

    it('should replace existing state on import', () => {
      store.markProcessed(makeRecord({ tagName: 'v1.0.0' }));
      store.importState([makeRecord({ tagName: 'v9.0.0' })]);

      expect(store.isProcessed('v1.0.0', 'https://github.com/org/repo')).toBe(false);
      expect(store.isProcessed('v9.0.0', 'https://github.com/org/repo')).toBe(true);
    });

    it('should round-trip records with all fields intact', () => {
      const record = makeRecord({
        tagName: 'v3.2.1',
        repositoryUrl: 'https://dev.azure.com/org/project',
        processedAt: '2025-06-01T12:30:00Z',
        releaseId: 'release-42',
        appliedStage: ReleaseStage.RollOut1Percent,
      });
      store.markProcessed(record);
      const exported = store.exportState();

      const newStore = new ProcessedTagStore();
      newStore.importState(exported);
      const reimported = newStore.exportState();

      expect(reimported).toHaveLength(1);
      expect(reimported[0]).toEqual(record);
    });
  });
});
