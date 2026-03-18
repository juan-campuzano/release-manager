/**
 * Conflict resolution utilities for handling concurrent modifications
 * Provides strategies for resolving conflicts when optimistic locking fails
 */

import { Release } from '../domain/types';

/**
 * Conflict resolution strategy
 */
export enum ConflictStrategy {
  KEEP_LOCAL = 'KEEP_LOCAL',       // Keep local changes, discard remote
  KEEP_REMOTE = 'KEEP_REMOTE',     // Discard local changes, keep remote
  MERGE = 'MERGE'                   // Attempt to merge changes
}

/**
 * Conflict information
 */
export interface Conflict {
  field: string;
  localValue: any;
  remoteValue: any;
  baseValue?: any;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  resolved: boolean;
  conflicts: Conflict[];
  mergedRelease?: Release;
}

/**
 * Detect conflicts between local and remote versions of a release
 * @param local Local version of the release
 * @param remote Remote version of the release
 * @param base Optional base version for three-way merge
 * @returns Array of detected conflicts
 */
export function detectConflicts(
  local: Partial<Release>,
  remote: Release,
  base?: Release
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Check each field in local updates
  for (const key of Object.keys(local)) {
    const field = key as keyof Release;
    const localValue = local[field];
    const remoteValue = remote[field];
    const baseValue = base?.[field];
    
    // Skip if values are the same
    if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) {
      continue;
    }
    
    // If we have a base value, check if both changed from base
    if (base && baseValue !== undefined) {
      const localChanged = JSON.stringify(localValue) !== JSON.stringify(baseValue);
      const remoteChanged = JSON.stringify(remoteValue) !== JSON.stringify(baseValue);
      
      // Only a conflict if both changed
      if (localChanged && remoteChanged) {
        conflicts.push({
          field: String(field),
          localValue,
          remoteValue,
          baseValue
        });
      }
    } else {
      // Without base, any difference is a potential conflict
      conflicts.push({
        field: String(field),
        localValue,
        remoteValue,
        baseValue
      });
    }
  }
  
  return conflicts;
}

/**
 * Resolve conflicts using a specified strategy
 * @param local Local version of the release
 * @param remote Remote version of the release
 * @param strategy Conflict resolution strategy
 * @param base Optional base version for three-way merge
 * @returns Conflict resolution result
 */
export function resolveConflicts(
  local: Partial<Release>,
  remote: Release,
  strategy: ConflictStrategy,
  base?: Release
): ConflictResolution {
  const conflicts = detectConflicts(local, remote, base);
  
  if (conflicts.length === 0) {
    // No conflicts, merge is straightforward
    return {
      resolved: true,
      conflicts: [],
      mergedRelease: { ...remote, ...local }
    };
  }
  
  switch (strategy) {
    case ConflictStrategy.KEEP_LOCAL:
      return {
        resolved: true,
        conflicts,
        mergedRelease: { ...remote, ...local }
      };
      
    case ConflictStrategy.KEEP_REMOTE:
      return {
        resolved: true,
        conflicts,
        mergedRelease: remote
      };
      
    case ConflictStrategy.MERGE:
      return attemptAutoMerge(local, remote, conflicts, base);
      
    default:
      return {
        resolved: false,
        conflicts
      };
  }
}

/**
 * Attempt to automatically merge changes
 * @param local Local version of the release
 * @param remote Remote version of the release
 * @param conflicts Detected conflicts
 * @param base Optional base version
 * @returns Conflict resolution result
 */
function attemptAutoMerge(
  local: Partial<Release>,
  remote: Release,
  conflicts: Conflict[],
  base?: Release
): ConflictResolution {
  const merged = { ...remote };
  const unresolvedConflicts: Conflict[] = [];
  
  for (const conflict of conflicts) {
    const field = conflict.field as keyof Release;
    
    // Try to auto-merge based on field type
    if (canAutoMerge(conflict, base)) {
      // Use local value for auto-mergeable fields
      (merged as any)[field] = conflict.localValue;
    } else {
      // Cannot auto-merge, requires manual resolution
      unresolvedConflicts.push(conflict);
    }
  }
  
  // Apply non-conflicting local changes
  for (const key of Object.keys(local)) {
    const field = key as keyof Release;
    if (!conflicts.some(c => c.field === field)) {
      (merged as any)[field] = local[field];
    }
  }
  
  return {
    resolved: unresolvedConflicts.length === 0,
    conflicts: unresolvedConflicts,
    mergedRelease: unresolvedConflicts.length === 0 ? merged : undefined
  };
}

/**
 * Check if a conflict can be automatically merged
 * @param conflict Conflict to check
 * @param base Optional base version
 * @returns True if conflict can be auto-merged
 */
function canAutoMerge(conflict: Conflict, _base?: Release): boolean {
  // Auto-merge rules:
  
  // 1. Timestamp fields - always use latest
  if (conflict.field.includes('At') || conflict.field.includes('Date')) {
    return true;
  }
  
  // 2. Arrays - can merge if no overlapping changes
  if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
    // For now, don't auto-merge arrays (requires more complex logic)
    return false;
  }
  
  // 3. Numbers - can't auto-merge (ambiguous which is correct)
  if (typeof conflict.localValue === 'number' && typeof conflict.remoteValue === 'number') {
    return false;
  }
  
  // 4. Strings - can't auto-merge (ambiguous which is correct)
  if (typeof conflict.localValue === 'string' && typeof conflict.remoteValue === 'string') {
    return false;
  }
  
  // Default: don't auto-merge
  return false;
}

/**
 * Format conflicts for display to user
 * @param conflicts Array of conflicts
 * @returns Formatted string describing conflicts
 */
export function formatConflictsForDisplay(conflicts: Conflict[]): string {
  if (conflicts.length === 0) {
    return 'No conflicts detected';
  }
  
  const lines: string[] = [
    'The following conflicts were detected:',
    ''
  ];
  
  for (const conflict of conflicts) {
    lines.push(`Field: ${conflict.field}`);
    lines.push(`  Your change: ${JSON.stringify(conflict.localValue)}`);
    lines.push(`  Remote change: ${JSON.stringify(conflict.remoteValue)}`);
    if (conflict.baseValue !== undefined) {
      lines.push(`  Original value: ${JSON.stringify(conflict.baseValue)}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}
