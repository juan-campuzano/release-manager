/**
 * In-memory event storage service for release timeline events.
 * Stores events indexed by releaseId for efficient lookup.
 */

import { EventType, ReleaseEvent } from '../domain/types';

export interface GetEventsOptions {
  limit?: number;
  offset?: number;
  types?: EventType[];
}

export class EventStore {
  private eventsByReleaseId: Map<string, ReleaseEvent[]> = new Map();

  /**
   * Records a release event, storing it indexed by releaseId.
   */
  recordEvent(event: ReleaseEvent): void {
    const events = this.eventsByReleaseId.get(event.releaseId) ?? [];
    events.push(event);
    this.eventsByReleaseId.set(event.releaseId, events);
  }

  /**
   * Retrieves events for a given release, sorted by timestamp descending (newest first).
   * Supports optional filtering by event types and pagination via limit/offset.
   */
  getEventsByReleaseId(releaseId: string, options?: GetEventsOptions): ReleaseEvent[] {
    const events = this.eventsByReleaseId.get(releaseId) ?? [];

    // Filter by event types if specified
    let filtered = options?.types && options.types.length > 0
      ? events.filter(e => options.types!.includes(e.type))
      : [...events];

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit !== undefined) {
      return filtered.slice(offset, offset + limit);
    }

    return filtered.slice(offset);
  }
}
