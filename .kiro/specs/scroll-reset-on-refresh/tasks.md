# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Background Refresh Sets isLoading True
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: `useRelease` hook with non-null `release` state triggers `refresh()` or `fetchRelease()`, and assert `isLoading` remains `false`
  - Test file: `packages/web/src/hooks/__tests__/useRelease.scroll-bug.test.ts`
  - Use `renderHook` from `@testing-library/react-hooks` to test `useRelease`
  - Setup: Mock `ReleaseService.getReleaseById` to return valid release data. Render hook, wait for initial load to complete so `release` is non-null
  - Property: For any call to `refresh()` when `release` is already loaded, `isLoading` MUST remain `false` throughout the refresh cycle
  - Also test: Call `fetchRelease` (via re-render with same releaseId) when `release` is non-null, assert `isLoading` stays `false`
  - Also test: Render `ReleaseDetailPage` with loaded data, trigger refresh, assert content DOM elements remain mounted (not replaced by "Loading release details...")
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS because `fetchRelease` unconditionally calls `setIsLoading(true)`, confirming the bug exists
  - Document counterexamples: `isLoading` transitions to `true` during background refresh when `release` is non-null, causing content unmount
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Initial Load and Error State Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `packages/web/src/hooks/__tests__/useRelease.preservation.test.ts`
  - Observe on UNFIXED code: When `release` is `null` (initial load), `isLoading` is `true` and "Loading release details..." placeholder renders
  - Observe on UNFIXED code: When initial load fails with an error, error state renders with retry button
  - Observe on UNFIXED code: When `releaseId` changes (navigation to different release), `isLoading` resets to `true` and loading placeholder shows for the new release
  - Observe on UNFIXED code: When a refresh returns updated data (e.g., stage changed), `release` state reflects the new data
  - Write property-based tests:
    - For all initial loads where `release` is `null`: `isLoading` is `true` and loading placeholder renders (validates 3.1)
    - For all initial load errors: error UI with retry button renders (validates 3.2)
    - For all releaseId changes: loading state resets and placeholder shows (validates 3.5)
    - For all successful refreshes: updated release data is reflected in state (validates 3.4)
    - For all background refresh errors: existing `release` data is not cleared and page does not crash (validates 3.3)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix background refresh scroll reset bug

  - [x] 3.1 Modify `useRelease` hook to distinguish initial loads from background refreshes
    - In `packages/web/src/hooks/useRelease.ts`, update `fetchRelease` to only call `setIsLoading(true)` when `release` is currently `null` (initial load)
    - Add `const [isRefreshing, setIsRefreshing] = useState<boolean>(false)` state
    - When `release` is non-null and `fetchRelease` is called, set `isRefreshing(true)` instead of `isLoading(true)`
    - Set `isRefreshing(false)` when the background fetch completes (success or error)
    - Export `isRefreshing` from the hook's return value (add to `UseReleaseResult` interface)
    - When a background refresh errors, do NOT overwrite existing `release` data with `null` — keep the current data visible
    - When `releaseId` changes, reset to initial load behavior: set `release` to `null` and `isLoading` to `true`
    - _Bug_Condition: isBugCondition(input) where input.existingRelease IS NOT NULL AND input.fetchType = 'refresh' AND isLoading IS SET TO true_
    - _Expected_Behavior: isLoading remains false during background refresh; isRefreshing is true instead; existing content stays mounted_
    - _Preservation: Initial loads (release is null) continue to set isLoading(true); error states unchanged; data updates reflected; releaseId changes trigger fresh load_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Update `ReleaseDetailPage` to use `isRefreshing` for the Refresh button
    - In `packages/web/src/pages/ReleaseDetailPage.tsx`, destructure `isRefreshing` from `useRelease`
    - Update the Refresh button: `disabled={isRefreshing}` and label `{isRefreshing ? 'Refreshing...' : 'Refresh'}`
    - The `if (isLoading)` conditional rendering block remains unchanged — it still gates initial load placeholder
    - _Requirements: 2.2_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Background Refresh Preserves Content Visibility
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: `isLoading` stays `false` during background refresh
    - When this test passes, it confirms the bug is fixed and content remains mounted during refreshes
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Initial Load and Error State Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm initial load still shows loading placeholder, errors still show error UI, data updates still reflected, releaseId changes still trigger fresh load
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite to confirm no regressions
  - Verify bug condition exploration test passes (Property 1)
  - Verify preservation tests pass (Property 2)
  - Verify any existing tests in the project still pass
  - Ensure all tests pass, ask the user if questions arise
