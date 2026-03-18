/**
 * In-memory store for tracking processed version tags.
 * Prevents duplicate stage transitions across polling cycles and server restarts
 * by maintaining a record of which tags have already been handled.
 */

import { ReleaseStage } from '../domain/types';

/**
 * Record of a processed version tag, stored for idempotency.
 */
export interface ProcessedTagRecord {
  tagName: string;
  repositoryUrl: string;
  processedAt: string; // ISO 8601
  releaseId: string;
  appliedStage: ReleaseStage;
}

/**
 * Builds a composite key for tag+repository lookups.
 */
function makeKey(tagName: string, repositoryUrl: string): string {
  return `${repositoryUrl}::${tagName}`;
}

export class ProcessedTagStore {
  private records: Map<string, ProcessedTagRecord> = new Map();

  /**
   * Record a tag as processed. If the same tag+repository combination
   * already exists, the record is overwritten (no duplicates).
   */
  markProcessed(record: ProcessedTagRecord): void {
    const key = makeKey(record.tagName, record.repositoryUrl);
    this.records.set(key, record);
  }

  /**
   * Check if a tag has already been processed for a given repository.
   */
  isProcessed(tagName: string, repositoryUrl: string): boolean {
    return this.records.has(makeKey(tagName, repositoryUrl));
  }

  /**
   * Get all processed tag records for a specific repository.
   */
  getProcessedTags(repositoryUrl: string): ProcessedTagRecord[] {
    const result: ProcessedTagRecord[] = [];
    for (const record of this.records.values()) {
      if (record.repositoryUrl === repositoryUrl) {
        result.push(record);
      }
    }
    return result;
  }

  /**
   * Get the most recent processedAt timestamp across all tags for a repository.
   * Returns null if no tags have been processed for the repository.
   */
  getLastProcessedTimestamp(repositoryUrl: string): Date | null {
    let latest: Date | null = null;
    for (const record of this.records.values()) {
      if (record.repositoryUrl === repositoryUrl) {
        const date = new Date(record.processedAt);
        if (latest === null || date.getTime() > latest.getTime()) {
          latest = date;
        }
      }
    }
    return latest;
  }

  /**
   * Export all records for external persistence (e.g., saving to disk).
   */
  exportState(): ProcessedTagRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Import records from external persistence, replacing current state.
   */
  importState(records: ProcessedTagRecord[]): void {
    this.records.clear();
    for (const record of records) {
      const key = makeKey(record.tagName, record.repositoryUrl);
      this.records.set(key, record);
    }
  }
}
