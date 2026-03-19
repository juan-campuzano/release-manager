# Scroll Reset on Refresh Bugfix Design

## Overview

When the release detail page auto-refreshes every 30 seconds (or when the user clicks Refresh), the `useRelease` hook's `fetchRelease` function unconditionally sets `isLoading` to `true`. This causes `ReleaseDetailPage` to unmount the entire content tree and render a loading placeholder, which resets the browser's scroll position. The fix introduces a distinction between initial loads and background refreshes so that existing content remains visible during background data fetching.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `fetchRelease` is called when `release` data already exists (i.e., a background refresh), and `isLoading` is set to `true`, causing content unmount
- **Property (P)**: The desired behavior — background refreshes should keep `isLoading` as `false` (or use a separate `isRefreshing` flag) so existing content stays mounted and scroll position is preserved
- **Preservation**: Initial load behavior (loading placeholder, error states) and data update behavior must remain unchanged
- **fetchRelease**: The function in `packages/web/src/hooks/useRelease.ts` that fetches release data from the API and manages loading/error state
- **isLoading**: The boolean state in `useRelease` that controls whether `ReleaseDetailPage` renders a loading placeholder or the actual content
- **useAutoRefresh**: The hook in `packages/web/src/hooks/useAutoRefresh.ts` that calls `refresh()` on a 30-second interval

## Bug Details

### Fault Condition

The bug manifests when `fetchRelease` is called as a background refresh (release data already exists in state) and it unconditionally sets `isLoading` to `true`. This causes `ReleaseDetailPage` to evaluate `if (isLoading)` as true, unmount the content tree, and render the loading placeholder — destroying the user's scroll position.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { fetchType: 'initial' | 'refresh', existingRelease: Release | null }
  OUTPUT: boolean

  RETURN input.existingRelease IS NOT NULL
         AND input.fetchType = 'refresh'
         AND isLoading IS SET TO true DURING fetch
         AND content tree IS UNMOUNTED due to isLoading = true
END FUNCTION
```

### Examples

- **Auto-refresh while scrolled down**: User scrolls to the StageControl section. After 30 seconds, `useAutoRefresh` calls `refresh()` → `fetchRelease()` sets `isLoading(true)` → page shows "Loading release details..." → data arrives → content re-renders at scroll position 0. Expected: content stays visible, scroll position unchanged.
- **Manual refresh while scrolled down**: User clicks the "Refresh" button while viewing the ReleaseTimeline. Same unmount/remount cycle occurs. Expected: content updates in-place, scroll position unchanged.
- **Auto-refresh with cache hit**: `fetchRelease` is called, cache is valid, but `isLoading(true)` is still set before the cache check. The loading placeholder flashes briefly. Expected: no loading flash, content stays visible.
- **Initial page load (not a bug)**: User navigates to `/releases/123` for the first time. `release` is `null`, `isLoading` is `true`, loading placeholder shows correctly.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Initial page load (when `release` is `null`) must continue to show the "Loading release details..." placeholder
- Error states during initial load must continue to show the error UI with a retry button
- Background refresh errors must continue to be handled without crashing the page
- Updated release data from refreshes must continue to be reflected in the UI
- Navigating to a different release (releaseId change) must show the loading state for the new release
- The `useAutoRefresh` hook's interval and enable/disable logic must remain unchanged

**Scope:**
All inputs that do NOT involve a background refresh (i.e., where `release` is already loaded) should be completely unaffected by this fix. This includes:
- Initial page loads where no release data exists yet
- Error handling flows
- Stage/status/rollout update operations
- Navigation between different releases
- The auto-refresh interval timing itself

## Hypothesized Root Cause

Based on the code analysis, the root cause is clear and singular:

1. **Unconditional `setIsLoading(true)` in `fetchRelease`**: In `useRelease.ts`, line `setIsLoading(true)` at the top of `fetchRelease` runs on every call — both initial loads and background refreshes. There is no check for whether data already exists before setting loading state.

2. **Conditional rendering on `isLoading` in `ReleaseDetailPage`**: The page component uses `if (isLoading) { return <loading placeholder> }` which completely unmounts the content tree when `isLoading` is `true`. This is correct for initial loads but destructive for background refreshes.

3. **`refresh()` clears cache then calls `fetchRelease`**: The `refresh` function deletes the cache entry and then calls `fetchRelease`, which guarantees a full API call with `isLoading(true)` — even though the previous data is still valid and could be displayed.

4. **No distinction between initial and background fetch**: The hook has no concept of "already have data, just refreshing" vs "loading for the first time." Both paths go through the same `setIsLoading(true)` → fetch → `setIsLoading(false)` cycle.

## Correctness Properties

Property 1: Fault Condition - Background Refresh Preserves Content Visibility

_For any_ call to `fetchRelease` or `refresh` where `release` state is already non-null (data has been previously loaded), the fixed `useRelease` hook SHALL NOT set `isLoading` to `true`, ensuring the page content remains mounted and the user's scroll position is preserved.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Initial Load Shows Loading Placeholder

_For any_ call to `fetchRelease` where `release` state is `null` (no data has been loaded yet, including navigation to a new releaseId), the fixed `useRelease` hook SHALL set `isLoading` to `true`, producing the same loading placeholder behavior as the original code.

**Validates: Requirements 3.1, 3.2, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `packages/web/src/hooks/useRelease.ts`

**Function**: `fetchRelease`

**Specific Changes**:
1. **Conditional loading state**: Only set `isLoading(true)` when `release` is currently `null` (initial load). When `release` already has data, skip setting `isLoading` so the existing content stays mounted.
   - Change `setIsLoading(true)` to only fire when there's no existing release data
   - Optionally add an `isRefreshing` state for UI feedback (e.g., a subtle spinner on the Refresh button)

2. **Add `isRefreshing` state** (optional but recommended): Introduce a separate `isRefreshing` boolean that is `true` during background refreshes. This allows the UI to show a non-destructive loading indicator (like disabling the Refresh button or showing a small spinner) without unmounting content.
   - Add `const [isRefreshing, setIsRefreshing] = useState<boolean>(false)`
   - Set `isRefreshing(true)` at the start of background fetches, `isRefreshing(false)` when complete
   - Export `isRefreshing` from the hook

3. **Update `refresh` function**: The `refresh` function should set `isRefreshing` instead of relying on `isLoading` for background refreshes.

4. **Handle error during background refresh**: When a background refresh fails, avoid overwriting the existing `release` data. The error can be logged or shown as a non-destructive notification, but the existing content should remain visible.

**File**: `packages/web/src/pages/ReleaseDetailPage.tsx`

**Function**: `ReleaseDetailPage`

**Specific Changes**:
5. **Use `isRefreshing` for Refresh button state**: If `isRefreshing` is added to the hook, use it to show "Refreshing..." on the button instead of relying on `isLoading`.
   - Update the destructured return from `useRelease` to include `isRefreshing`
   - Update the Refresh button's `disabled` and label to use `isRefreshing`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render `useRelease` with pre-existing release data, then trigger a refresh, and assert that `isLoading` remains `false`. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Auto-refresh loading state test**: Call `fetchRelease` when `release` is non-null, assert `isLoading` stays `false` (will fail on unfixed code — `isLoading` becomes `true`)
2. **Manual refresh loading state test**: Call `refresh()` when `release` is non-null, assert `isLoading` stays `false` (will fail on unfixed code)
3. **Content mount preservation test**: Render `ReleaseDetailPage` with loaded data, trigger refresh, assert content is still in the DOM (will fail on unfixed code — content unmounts)
4. **Cache hit loading flash test**: Call `fetchRelease` when cache is valid and `release` is non-null, assert no `isLoading(true)` transition (will fail on unfixed code)

**Expected Counterexamples**:
- `isLoading` transitions to `true` during background refresh, causing content unmount
- Possible causes: unconditional `setIsLoading(true)` in `fetchRelease`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  // release is non-null, fetchRelease is called as a refresh
  result := useRelease_fixed.fetchRelease(input.releaseId)
  ASSERT isLoading REMAINS false THROUGHOUT fetch
  ASSERT release data IS UPDATED when fetch completes
  ASSERT content tree REMAINS MOUNTED
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  // release is null (initial load) or releaseId changed
  ASSERT useRelease_original(input) = useRelease_fixed(input)
  // isLoading should be true, loading placeholder should show
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for initial loads and error states, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Initial load preservation**: Verify that when `release` is `null`, `isLoading` is set to `true` and the loading placeholder renders — same as unfixed code
2. **Error state preservation**: Verify that initial load errors show the error UI with retry button — same as unfixed code
3. **Data update preservation**: Verify that when a background refresh returns updated data, the `release` state is updated with the new data
4. **Navigation preservation**: Verify that changing `releaseId` triggers a fresh load with `isLoading(true)` and loading placeholder

### Unit Tests

- Test `useRelease` hook: initial load sets `isLoading` to `true`
- Test `useRelease` hook: background refresh does NOT set `isLoading` to `true` when `release` is non-null
- Test `useRelease` hook: `isRefreshing` is `true` during background refresh (if implemented)
- Test `useRelease` hook: error during background refresh does not clear existing `release` data
- Test `useRelease` hook: changing `releaseId` resets to initial load behavior

### Property-Based Tests

- Generate random sequences of fetch/refresh calls with varying initial states (release null vs non-null) and verify `isLoading` is only `true` when `release` is `null`
- Generate random release data and verify that background refresh updates the data without transitioning through `isLoading = true`
- Generate random error scenarios during background refresh and verify existing release data is preserved

### Integration Tests

- Test full `ReleaseDetailPage` render with auto-refresh: verify content stays mounted across refresh cycles
- Test `ReleaseDetailPage` with manual refresh button: verify content stays visible and data updates
- Test `ReleaseDetailPage` navigation from one release to another: verify loading placeholder shows for new release
