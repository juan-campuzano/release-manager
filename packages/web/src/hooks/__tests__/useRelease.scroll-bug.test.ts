/**
 * Bug Condition Exploration Test: Background Refresh Sets isLoading True
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * Property 1: Fault Condition - For any call to `refresh()` or `fetchRelease`
 * when `release` is already loaded (non-null), `isLoading` MUST remain `false`
 * throughout the refresh cycle.
 *
 * EXPECTED: These tests FAIL on unfixed code, confirming the bug exists.
 * The bug: `fetchRelease` unconditionally calls `setIsLoading(true)` even
 * during background refreshes, causing content unmount and scroll reset.
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

/** Creates a deferred promise that can be resolved externally */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Bug Condition Exploration: Background refresh sets isLoading true', () => {
  let mockService: jest.Mocked<ReleaseService>;
  let mockRelease: Release;

  beforeEach(() => {
    jest.clearAllMocks();
    clearReleaseCache();
    mockService = createMockReleaseService();
    mockRelease = createMockRelease();
  });

  /**
   * Property test: For any valid release data, calling refresh() when release
   * is already loaded should NOT set isLoading to true while the API call
   * is in-flight.
   *
   * Uses a deferred promise to pause the API call mid-flight and observe
   * the intermediate isLoading state.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Property: refresh() with loaded release must not set isLoading to true during in-flight fetch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
          rolloutPercentage: fc.integer({ min: 0, max: 100 }),
        }),
        async ({ version, rolloutPercentage }) => {
          clearReleaseCache();
          jest.clearAllMocks();

          const release = createMockRelease({ version, rolloutPercentage });
          const service = createMockReleaseService();

          // Initial load resolves immediately
          service.getReleaseById.mockResolvedValue(release);

          const { result, unmount } = renderHook(() => useRelease('1', service));

          // Wait for initial load to complete — release is now non-null
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });
          expect(result.current.release).not.toBeNull();

          // Setup: use a deferred promise so we can observe state mid-flight
          const deferred = createDeferred<Release>();
          service.getReleaseById.mockReturnValue(deferred.promise);

          // Act: call refresh() — this starts a background refresh
          // Do NOT await — we want to observe state while fetch is in-flight
          act(() => {
            result.current.refresh();
          });

          // PROPERTY: isLoading must remain false while the refresh API call is in-flight
          // On unfixed code, fetchRelease calls setIsLoading(true) unconditionally,
          // so isLoading will be true here — this is the bug.
          expect(result.current.isLoading).toBe(false);

          // Resolve the deferred to clean up
          const updatedRelease = createMockRelease({ version, rolloutPercentage });
          await act(async () => {
            deferred.resolve(updatedRelease);
          });

          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Concrete test: refresh() on loaded release sets isLoading to true
   * while the API call is in-flight (bug).
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('refresh() when release is loaded should keep isLoading false during in-flight fetch', async () => {
    mockService.getReleaseById.mockResolvedValue(mockRelease);

    const { result } = renderHook(() => useRelease('1', mockService));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.release).toEqual(mockRelease);

    // Setup: deferred promise to pause the refresh mid-flight
    const deferred = createDeferred<Release>();
    mockService.getReleaseById.mockReturnValue(deferred.promise);

    // Start refresh — do NOT await
    act(() => {
      result.current.refresh();
    });

    // ASSERT: isLoading should NOT be true during background refresh
    // On unfixed code, this will be true because fetchRelease calls setIsLoading(true)
    expect(result.current.isLoading).toBe(false);

    // Clean up: resolve the deferred
    const updatedRelease = createMockRelease({ updatedAt: '2024-06-01T00:00:00Z' });
    await act(async () => {
      deferred.resolve(updatedRelease);
    });
  });

  /**
   * Concrete test: After refresh completes, release data should be updated
   * and isLoading should never have been true during the refresh cycle.
   *
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  it('background refresh should update data without isLoading transitioning to true at any point', async () => {
    mockService.getReleaseById.mockResolvedValue(mockRelease);

    const { result } = renderHook(() => useRelease('1', mockService));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Track isLoading transitions using a deferred to observe mid-flight state
    const deferred = createDeferred<Release>();
    mockService.getReleaseById.mockReturnValue(deferred.promise);

    // Start refresh
    act(() => {
      result.current.refresh();
    });

    // Capture isLoading while fetch is in-flight
    const isLoadingDuringFetch = result.current.isLoading;

    // Resolve with updated data
    const updatedRelease = createMockRelease({ version: '1.0.1' });
    await act(async () => {
      deferred.resolve(updatedRelease);
    });

    // After refresh completes
    expect(result.current.isLoading).toBe(false);
    expect(result.current.release?.version).toBe('1.0.1');

    // ASSERT: isLoading was never true during the background refresh
    expect(isLoadingDuringFetch).toBe(false);
  });
});
