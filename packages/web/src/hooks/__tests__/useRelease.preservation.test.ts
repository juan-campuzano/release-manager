/**
 * Preservation Property Tests: Initial Load and Error State Behavior
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * Property 2: Preservation - These tests capture the baseline behavior of the
 * UNFIXED code that must remain unchanged after the bug fix is applied.
 *
 * All tests here MUST PASS on the current unfixed code. They verify:
 * - Initial loads (release is null) show loading placeholder
 * - Error states show error UI with retry button
 * - releaseId changes reset loading state
 * - Successful refreshes update release data
 * - Background refresh errors don't clear existing release data
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { useRelease, clearReleaseCache } from '../useRelease';
import { ReleaseService } from '../../services/ReleaseService';
import type { Release, Platform, ReleaseStage, ReleaseStatus } from '../../types';

// --- Helpers ---

function createMockRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: '1',
    platform: 'iOS' as Platform,
    version: '1.0.0',
    branchName: 'release/1.0.0',
    repositoryUrl: 'https://github.com/org/repo',
    sourceType: 'github',
    latestBuild: 'build-100',
    latestPassingBuild: 'build-99',
    latestAppStoreBuild: null,
    currentStage: 'Release Branching' as ReleaseStage,
    status: 'Current' as ReleaseStatus,
    rolloutPercentage: 0,
    requiredSquads: ['squad-a'],
    qualityThresholds: { crashRateThreshold: 1, cpuExceptionRateThreshold: 2 },
    rolloutStages: [1, 5, 10, 50, 100],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastSyncedAt: null,
    ...overrides,
  };
}

function createMockReleaseService(): jest.Mocked<ReleaseService> {
  return {
    getReleaseById: jest.fn(),
    updateStage: jest.fn(),
    updateStatus: jest.fn(),
    updateRollout: jest.fn(),
  } as any;
}

/** Creates a deferred promise that can be resolved/rejected externally */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// --- fast-check arbitraries for release data ---

const platformArb = fc.constantFrom<Platform>('iOS', 'Android', 'Desktop');
const stageArb = fc.constantFrom<ReleaseStage>(
  'Release Branching',
  'Final Release Candidate',
  'Submit For App Store Review',
  'Roll Out 1%',
  'Roll Out 100%'
);
const statusArb = fc.constantFrom<ReleaseStatus>('Upcoming', 'Current', 'Production');
const versionArb = fc.stringMatching(/^\d+\.\d+\.\d+$/);
const rolloutArb = fc.integer({ min: 0, max: 100 });

/** Arbitrary that generates valid release overrides for property tests */
const releaseOverridesArb = fc.record({
  platform: platformArb,
  version: versionArb,
  currentStage: stageArb,
  status: statusArb,
  rolloutPercentage: rolloutArb,
});

describe('Preservation: Initial Load and Error State Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearReleaseCache();
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Property: For all initial loads where `release` is `null`,
   * `isLoading` starts as `true` and the hook eventually resolves
   * with the fetched release data.
   */
  it('Property: initial load sets isLoading to true and resolves with release data', async () => {
    await fc.assert(
      fc.asyncProperty(releaseOverridesArb, async (overrides) => {
        clearReleaseCache();
        jest.clearAllMocks();

        const release = createMockRelease(overrides);
        const service = createMockReleaseService();
        service.getReleaseById.mockResolvedValue(release);

        const { result, unmount } = renderHook(() => useRelease('1', service));

        // On initial render, release is null and isLoading is true
        expect(result.current.release).toBeNull();
        expect(result.current.isLoading).toBe(true);

        // Wait for load to complete
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // After load, release data is available
        expect(result.current.release).not.toBeNull();
        expect(result.current.release?.version).toBe(overrides.version);
        expect(result.current.release?.platform).toBe(overrides.platform);
        expect(result.current.error).toBeNull();

        unmount();
      }),
      { numRuns: 5 }
    );
  });

  /**
   * **Validates: Requirements 3.2**
   *
   * Property: For all initial load errors, the hook sets error state
   * and isLoading becomes false, allowing error UI to render.
   */
  it('Property: initial load error sets error state with isLoading false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          clearReleaseCache();
          jest.clearAllMocks();

          const service = createMockReleaseService();
          service.getReleaseById.mockRejectedValue(new Error(errorMessage));

          const { result, unmount } = renderHook(() => useRelease('1', service));

          // Initially loading
          expect(result.current.isLoading).toBe(true);

          // Wait for error to be set
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Error state is set, release remains null
          expect(result.current.error).not.toBeNull();
          expect(result.current.error?.message).toBe(errorMessage);
          expect(result.current.release).toBeNull();

          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * Property: For all releaseId changes, loading state resets to true
   * and the hook fetches data for the new release.
   */
  it('Property: releaseId change resets isLoading to true and fetches new release', async () => {
    await fc.assert(
      fc.asyncProperty(
        releaseOverridesArb,
        releaseOverridesArb,
        async (overrides1, overrides2) => {
          clearReleaseCache();
          jest.clearAllMocks();

          const release1 = createMockRelease({ ...overrides1, id: 'release-1' });
          const release2 = createMockRelease({ ...overrides2, id: 'release-2' });
          const service = createMockReleaseService();

          // First call returns release1, second returns release2
          service.getReleaseById
            .mockResolvedValueOnce(release1)
            .mockResolvedValueOnce(release2);

          let releaseId = 'release-1';
          const { result, rerender, unmount } = renderHook(
            ({ id }) => useRelease(id, service),
            { initialProps: { id: releaseId } }
          );

          // Wait for first load to complete
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });
          expect(result.current.release?.id).toBe('release-1');

          // Change releaseId — this should trigger a new load
          rerender({ id: 'release-2' });

          // isLoading should be true for the new release
          // (the hook calls fetchRelease which sets isLoading(true))
          await waitFor(() => {
            expect(result.current.isLoading).toBe(true);
          });

          // Wait for second load to complete
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });
          expect(result.current.release?.id).toBe('release-2');
          expect(result.current.release?.version).toBe(overrides2.version);

          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Property: For all successful refreshes, updated release data
   * is reflected in the hook's state.
   */
  it('Property: successful refresh updates release data in state', async () => {
    await fc.assert(
      fc.asyncProperty(
        releaseOverridesArb,
        releaseOverridesArb,
        async (initialOverrides, updatedOverrides) => {
          clearReleaseCache();
          jest.clearAllMocks();

          const initialRelease = createMockRelease(initialOverrides);
          const updatedRelease = createMockRelease({
            ...updatedOverrides,
            updatedAt: '2024-06-01T00:00:00Z',
          });
          const service = createMockReleaseService();

          // Initial load
          service.getReleaseById.mockResolvedValueOnce(initialRelease);

          const { result, unmount } = renderHook(() => useRelease('1', service));

          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });
          expect(result.current.release?.version).toBe(initialOverrides.version);

          // Setup refresh to return updated data
          service.getReleaseById.mockResolvedValueOnce(updatedRelease);

          // Trigger refresh
          await act(async () => {
            await result.current.refresh();
          });

          // After refresh, release data should reflect the update
          expect(result.current.release?.version).toBe(updatedOverrides.version);
          expect(result.current.release?.currentStage).toBe(updatedOverrides.currentStage);
          expect(result.current.release?.status).toBe(updatedOverrides.status);
          expect(result.current.release?.rolloutPercentage).toBe(updatedOverrides.rolloutPercentage);

          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * Property: For all background refresh errors, existing release data
   * is not cleared and the page does not crash. The error is captured
   * in the error state.
   */
  it('Property: background refresh error does not clear existing release data', async () => {
    await fc.assert(
      fc.asyncProperty(
        releaseOverridesArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (overrides, errorMessage) => {
          clearReleaseCache();
          jest.clearAllMocks();

          const release = createMockRelease(overrides);
          const service = createMockReleaseService();

          // Initial load succeeds
          service.getReleaseById.mockResolvedValueOnce(release);

          const { result, unmount } = renderHook(() => useRelease('1', service));

          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });
          expect(result.current.release).not.toBeNull();

          // Capture the release data before the error refresh
          const releaseBefore = result.current.release;

          // Refresh fails with an error
          service.getReleaseById.mockRejectedValueOnce(new Error(errorMessage));

          await act(async () => {
            await result.current.refresh();
          });

          // After error refresh: isLoading is false, error is set
          expect(result.current.isLoading).toBe(false);
          expect(result.current.error).not.toBeNull();
          expect(result.current.error?.message).toBe(errorMessage);

          // CRITICAL: The existing release data should still be available
          // Note: On the current unfixed code, the error path in fetchRelease
          // does NOT clear the release state — it only sets the error.
          // This behavior must be preserved.
          expect(result.current.release).not.toBeNull();
          expect(result.current.release?.version).toBe(releaseBefore?.version);

          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });
});
