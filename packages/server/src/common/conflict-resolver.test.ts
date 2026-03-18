import {
  detectConflicts,
  resolveConflicts,
  ConflictStrategy,
  formatConflictsForDisplay
} from './conflict-resolver';
import { Release, Platform, ReleaseStatus, ReleaseStage } from '../domain/types';

describe('conflict-resolver', () => {
  const baseRelease: Release = {
    id: 'rel-1',
    platform: Platform.iOS,
    status: ReleaseStatus.Current,
    currentStage: ReleaseStage.ReleaseBranching,
    version: '1.0.0',
    branchName: 'release/1.0.0',
    sourceType: 'github',
    repositoryUrl: 'https://github.com/org/repo',
    latestBuild: 'build-100',
    latestPassingBuild: 'build-99',
    latestAppStoreBuild: 'build-98',
    blockers: [],
    signOffs: [],
    rolloutPercentage: 0,
    itgcStatus: {
      compliant: true,
      rolloutComplete: false,
      details: '',
      lastCheckedAt: new Date()
    },
    distributions: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastSyncedAt: new Date('2024-01-01')
  };
  
  describe('detectConflicts', () => {
    it('should detect no conflicts when values are the same', () => {
      const local: Partial<Release> = {
        version: '1.0.0'
      };
      
      const remote = { ...baseRelease };
      
      const conflicts = detectConflicts(local, remote);
      
      expect(conflicts).toHaveLength(0);
    });
    
    it('should detect conflicts when values differ', () => {
      const local: Partial<Release> = {
        version: '1.0.1'
      };
      
      const remote = { ...baseRelease, version: '1.0.2' };
      
      const conflicts = detectConflicts(local, remote);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe('version');
      expect(conflicts[0].localValue).toBe('1.0.1');
      expect(conflicts[0].remoteValue).toBe('1.0.2');
    });
    
    it('should detect multiple conflicts', () => {
      const local: Partial<Release> = {
        version: '1.0.1',
        rolloutPercentage: 50
      };
      
      const remote = { 
        ...baseRelease, 
        version: '1.0.2',
        rolloutPercentage: 100
      };
      
      const conflicts = detectConflicts(local, remote);
      
      expect(conflicts).toHaveLength(2);
    });
    
    it('should use base version for three-way merge detection', () => {
      const local: Partial<Release> = {
        version: '1.0.1'
      };
      
      const remote = { ...baseRelease, version: '1.0.0' };
      const base = { ...baseRelease, version: '1.0.0' };
      
      const conflicts = detectConflicts(local, remote, base);
      
      // No conflict because remote didn't change from base
      expect(conflicts).toHaveLength(0);
    });
  });
  
  describe('resolveConflicts', () => {
    it('should resolve with KEEP_LOCAL strategy', () => {
      const local: Partial<Release> = {
        version: '1.0.1'
      };
      
      const remote = { ...baseRelease, version: '1.0.2' };
      
      const resolution = resolveConflicts(local, remote, ConflictStrategy.KEEP_LOCAL);
      
      expect(resolution.resolved).toBe(true);
      expect(resolution.mergedRelease?.version).toBe('1.0.1');
    });
    
    it('should resolve with KEEP_REMOTE strategy', () => {
      const local: Partial<Release> = {
        version: '1.0.1'
      };
      
      const remote = { ...baseRelease, version: '1.0.2' };
      
      const resolution = resolveConflicts(local, remote, ConflictStrategy.KEEP_REMOTE);
      
      expect(resolution.resolved).toBe(true);
      expect(resolution.mergedRelease?.version).toBe('1.0.2');
    });
    
    it('should attempt auto-merge with MERGE strategy', () => {
      const local: Partial<Release> = {
        updatedAt: new Date('2024-01-02')
      };
      
      const remote = { 
        ...baseRelease, 
        updatedAt: new Date('2024-01-01')
      };
      
      const resolution = resolveConflicts(local, remote, ConflictStrategy.MERGE);
      
      // Timestamp fields can be auto-merged
      expect(resolution.resolved).toBe(true);
    });
    
    it('should return unresolved for non-auto-mergeable conflicts', () => {
      const local: Partial<Release> = {
        version: '1.0.1'
      };
      
      const remote = { ...baseRelease, version: '1.0.2' };
      
      const resolution = resolveConflicts(local, remote, ConflictStrategy.MERGE);
      
      // Version strings cannot be auto-merged
      expect(resolution.resolved).toBe(false);
      expect(resolution.conflicts).toHaveLength(1);
    });
    
    it('should merge non-conflicting changes', () => {
      const local: Partial<Release> = {
        version: '1.0.1',
        rolloutPercentage: 50
      };
      
      const remote = { ...baseRelease };
      
      const resolution = resolveConflicts(local, remote, ConflictStrategy.KEEP_LOCAL);
      
      expect(resolution.resolved).toBe(true);
      expect(resolution.mergedRelease?.version).toBe('1.0.1');
      expect(resolution.mergedRelease?.rolloutPercentage).toBe(50);
    });
  });
  
  describe('formatConflictsForDisplay', () => {
    it('should format conflicts for display', () => {
      const conflicts = [
        {
          field: 'version',
          localValue: '1.0.1',
          remoteValue: '1.0.2'
        }
      ];
      
      const formatted = formatConflictsForDisplay(conflicts);
      
      expect(formatted).toContain('version');
      expect(formatted).toContain('1.0.1');
      expect(formatted).toContain('1.0.2');
    });
    
    it('should handle no conflicts', () => {
      const formatted = formatConflictsForDisplay([]);
      
      expect(formatted).toBe('No conflicts detected');
    });
    
    it('should include base value when available', () => {
      const conflicts = [
        {
          field: 'version',
          localValue: '1.0.1',
          remoteValue: '1.0.2',
          baseValue: '1.0.0'
        }
      ];
      
      const formatted = formatConflictsForDisplay(conflicts);
      
      expect(formatted).toContain('1.0.0');
    });
  });
});
