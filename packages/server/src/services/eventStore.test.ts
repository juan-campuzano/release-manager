/**
 * Tests for EventStore service
 */

import { EventStore } from './eventStore';
import {
  ReleaseCreatedEvent,
  StageChangeEvent,
  BlockerAddedEvent,
  Platform,
  ReleaseStage,
} from '../domain/types';

function makeReleaseCreatedEvent(
  releaseId: string,
  timestamp: string,
  id = 'evt-1'
): ReleaseCreatedEvent {
  return {
    id,
    releaseId,
    type: 'release_created',
    timestamp,
    data: { platform: Platform.iOS, version: '1.0.0', createdBy: 'user-1' },
  };
}

function makeStageChangeEvent(
  releaseId: string,
  timestamp: string,
  id = 'evt-2'
): StageChangeEvent {
  return {
    id,
    releaseId,
    type: 'stage_change',
    timestamp,
    data: {
      previousStage: ReleaseStage.ReleaseBranching,
      newStage: ReleaseStage.FinalReleaseCandidate,
    },
  };
}

function makeBlockerAddedEvent(
  releaseId: string,
  timestamp: string,
  id = 'evt-3'
): BlockerAddedEvent {
  return {
    id,
    releaseId,
    type: 'blocker_added',
    timestamp,
    data: {
      blockerId: 'blk-1',
      title: 'Crash on launch',
      severity: 'critical',
      assignee: 'dev-1',
    },
  };
}

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore();
  });

  describe('recordEvent', () => {
    it('should store an event and retrieve it by releaseId', () => {
      const event = makeReleaseCreatedEvent('rel-1', '2024-01-15T10:00:00Z');
      store.recordEvent(event);

      const events = store.getEventsByReleaseId('rel-1');
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('should store multiple events for the same release', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T11:00:00Z', 'evt-2'));

      const events = store.getEventsByReleaseId('rel-1');
      expect(events).toHaveLength(2);
    });

    it('should keep events for different releases separate', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-1'));
      store.recordEvent(makeReleaseCreatedEvent('rel-2', '2024-01-15T11:00:00Z', 'evt-2'));

      expect(store.getEventsByReleaseId('rel-1')).toHaveLength(1);
      expect(store.getEventsByReleaseId('rel-2')).toHaveLength(1);
    });
  });

  describe('getEventsByReleaseId', () => {
    it('should return empty array for unknown releaseId', () => {
      expect(store.getEventsByReleaseId('nonexistent')).toEqual([]);
    });

    it('should return events sorted by timestamp descending (newest first)', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T12:00:00Z', 'evt-2'));
      store.recordEvent(makeBlockerAddedEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-3'));

      const events = store.getEventsByReleaseId('rel-1');
      expect(events.map(e => e.id)).toEqual(['evt-2', 'evt-3', 'evt-1']);
    });

    it('should filter events by types', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-2'));
      store.recordEvent(makeBlockerAddedEvent('rel-1', '2024-01-15T12:00:00Z', 'evt-3'));

      const events = store.getEventsByReleaseId('rel-1', {
        types: ['stage_change', 'blocker_added'],
      });
      expect(events).toHaveLength(2);
      expect(events.every(e => e.type === 'stage_change' || e.type === 'blocker_added')).toBe(true);
    });

    it('should return all events when types filter is empty array', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-2'));

      const events = store.getEventsByReleaseId('rel-1', { types: [] });
      expect(events).toHaveLength(2);
    });

    it('should apply limit', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-2'));
      store.recordEvent(makeBlockerAddedEvent('rel-1', '2024-01-15T12:00:00Z', 'evt-3'));

      const events = store.getEventsByReleaseId('rel-1', { limit: 2 });
      expect(events).toHaveLength(2);
      // Should return the 2 newest events
      expect(events.map(e => e.id)).toEqual(['evt-3', 'evt-2']);
    });

    it('should apply offset', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-2'));
      store.recordEvent(makeBlockerAddedEvent('rel-1', '2024-01-15T12:00:00Z', 'evt-3'));

      const events = store.getEventsByReleaseId('rel-1', { offset: 1 });
      expect(events).toHaveLength(2);
      // Should skip the newest and return the rest
      expect(events.map(e => e.id)).toEqual(['evt-2', 'evt-1']);
    });

    it('should apply both limit and offset for pagination', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-2'));
      store.recordEvent(makeBlockerAddedEvent('rel-1', '2024-01-15T12:00:00Z', 'evt-3'));

      const events = store.getEventsByReleaseId('rel-1', { limit: 1, offset: 1 });
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('evt-2');
    });

    it('should combine types filter with pagination', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z', 'evt-1'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T09:00:00Z', 'evt-2'));
      store.recordEvent(makeBlockerAddedEvent('rel-1', '2024-01-15T10:00:00Z', 'evt-3'));
      store.recordEvent(makeStageChangeEvent('rel-1', '2024-01-15T11:00:00Z', 'evt-4'));

      const events = store.getEventsByReleaseId('rel-1', {
        types: ['stage_change'],
        limit: 1,
        offset: 0,
      });
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('evt-4'); // newest stage_change
    });

    it('should return empty array when offset exceeds event count', () => {
      store.recordEvent(makeReleaseCreatedEvent('rel-1', '2024-01-15T08:00:00Z'));

      const events = store.getEventsByReleaseId('rel-1', { offset: 10 });
      expect(events).toEqual([]);
    });
  });
});
