# Implementation Plan: Release Detail Page Redesign

## Overview

Redesign the Release Detail Page from vertically stacked sections to a card-based layout with improved visual hierarchy. The implementation creates new `InfoCard` and `CardGrid` components, updates existing components (`ReleaseHeader`, `PipelineExecutionsPanel`, `TimelineFilters`, `ReleaseTimeline`), and wires everything together in `ReleaseDetailPage`. All styling uses CSS Modules. Tests use Vitest, Testing Library, and fast-check.

## Tasks

- [x] 1. Create InfoCard component
  - [x] 1.1 Create `packages/web/src/components/InfoCard.tsx` with `InfoCardField` and `InfoCardProps` interfaces
    - Render a titled card with label-value field pairs
    - Render `href` fields as `<a target="_blank">` links
    - Display `fallback` (default "N/A") when `value` is null
    - _Requirements: 5.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3, 8.2, 8.3, 8.4_
  - [x] 1.2 Create `packages/web/src/components/InfoCard.module.css`
    - Bordered card: `1px solid #e0e0e0`, `border-radius: 0.5rem`, white background, `padding: 1.5rem`
    - Title: bold, `font-size: 1rem`, `margin-bottom: 1rem`
    - Labels: `color: #666`, `font-size: 0.875rem`; Values: `color: #1a1a1a`, `font-size: 0.875rem`; Links: `color: #1976d2`
    - _Requirements: 5.1, 6.1, 7.1, 8.1_
  - [ ]* 1.3 Write property test: InfoCard displays fields with null fallback (Property 4)
    - **Property 4: Build Information card displays all fields with null fallback**
    - Generate random release objects with randomly null build fields
    - Assert three fields present, null values display "N/A", non-null values display as-is
    - **Validates: Requirements 6.2, 6.3**
  - [ ]* 1.4 Write property test: InfoCard renders repository as link (Property 3)
    - **Property 3: Version Information card displays all fields with repository as link**
    - Generate random release objects, build Version Information fields
    - Assert four fields present, repository rendered as `<a>` with `target="_blank"` and correct `href`
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 2. Create CardGrid component
  - [x] 2.1 Create `packages/web/src/components/CardGrid.tsx` with `CardGridProps` interface
    - Render children in a CSS Grid container
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 2.2 Create `packages/web/src/components/CardGrid.module.css`
    - `>1024px`: `grid-template-columns: repeat(4, 1fr)`
    - `769px–1024px`: `grid-template-columns: repeat(2, 1fr)`
    - `≤768px`: `grid-template-columns: 1fr`
    - `gap: 1rem`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Checkpoint - Verify new components
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Redesign ReleaseHeader status badge styling
  - [x] 4.1 Update `packages/web/src/components/ReleaseHeader.module.css`
    - Change `.status-upcoming` from blue (`#e3f2fd`/`#1976d2`) to green (`#e8f5e9`/`#388e3c`)
    - Ensure each status value (Upcoming, Current, Production) has a distinct CSS class
    - _Requirements: 3.2, 3.3_
  - [ ]* 4.2 Write property test: Header renders correct title and status badge (Property 1)
    - **Property 1: Header renders correct title and status badge with distinct styling**
    - Generate random releases with random platform, version, and status
    - Assert heading text matches `{platform} {version}`, badge text matches status, CSS class differs per status
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ]* 4.3 Write property test: Refresh button reflects refreshing state (Property 2)
    - **Property 2: Refresh button reflects refreshing state**
    - Generate random boolean `isRefreshing`
    - Assert text is "Refreshing..." and disabled when true; "↻ Refresh" and enabled when false
    - **Validates: Requirements 3.6**

- [x] 5. Redesign PipelineExecutionsPanel table columns
  - [x] 5.1 Update `packages/web/src/components/PipelineExecutionsPanel.tsx`
    - Change columns from `[Run #, Status, Branch, Commit, Started At]` to `[Action Name, Status, Duration, Started At]`
    - Implement `computeDuration(startedAt, completedAt)` helper: returns `{m}m {s}s` or "In progress"
    - Status column: green checkmark + "Success" for `passed`, red X + "Failure" for `failed`
    - Action Name column: use `runNumber` or URL link text as display value
    - _Requirements: 9.2, 9.3_
  - [x] 5.2 Update `packages/web/src/components/PipelineExecutionsPanel.module.css` for status icon styling
    - _Requirements: 9.3_
  - [ ]* 5.3 Write property test: Pipeline status maps to correct icon and label (Property 7)
    - **Property 7: Pipeline execution status maps to correct icon and label**
    - Generate random CIExecution objects with status `passed` or `failed`
    - Assert green checkmark + "Success" for passed, red X + "Failure" for failed
    - **Validates: Requirements 9.3**
  - [ ]* 5.4 Write unit tests for PipelineExecutionsPanel
    - Test column headers render: Action Name, Status, Duration, Started At
    - Test empty state message when executions array is empty
    - Test component returns null when `hasCiPipeline` is false
    - Test loading indicator when `isLoading` is true
    - _Requirements: 9.2, 9.4, 9.5, 9.6_

- [x] 6. Redesign TimelineFilters styling to pill/chip buttons
  - [x] 6.1 Update `packages/web/src/components/TimelineFilters.module.css`
    - Default: `border: 1px solid #e0e0e0`, `border-radius: 9999px`, `padding: 0.375rem 0.875rem`, `background: white`, `color: #333`
    - Active/selected: `border-color: #4caf50`, `color: #4caf50`, `background: #f1f8e9`
    - _Requirements: 10.2_
  - [ ]* 6.2 Write property test: Timeline filter shows only matching events (Property 8)
    - **Property 8: Timeline filter shows only matching events**
    - Generate random arrays of release events with random types, pick a random filter
    - Assert filtered results match selected type; "All Events" returns all events
    - **Validates: Requirements 10.3, 10.4**

- [x] 7. Update ReleaseTimeline container styling
  - [x] 7.1 Update `packages/web/src/components/ReleaseTimeline.module.css`
    - Add bordered card wrapper: `border: 1px solid #e0e0e0`, `border-radius: 0.5rem`, `padding: 1.5rem`, `background: white`
    - Remove inline refresh button from timeline header
    - _Requirements: 10.1_
  - [ ]* 7.2 Write property test: Timeline events ordered newest first (Property 9)
    - **Property 9: Timeline events are ordered newest first**
    - Generate random arrays of release events with random timestamps
    - Assert displayed order is descending by timestamp
    - **Validates: Requirements 10.6**
  - [ ]* 7.3 Write property test: Timeline entries contain icon, timestamp, and description (Property 10)
    - **Property 10: Timeline entries contain icon, timestamp, and description**
    - Generate random release events, render TimelineEvent
    - Assert output contains an icon element, a `<time>` element, and description text
    - **Validates: Requirements 10.5**

- [x] 8. Checkpoint - Verify all component redesigns
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update ReleaseDetailPage to use new components
  - [x] 9.1 Update `packages/web/src/pages/ReleaseDetailPage.tsx`
    - Remove `<ReleaseInfo>`, `<TagDetectionStatus>`, `<StageControl>` from render tree
    - Add `<CardGrid>` with four `<InfoCard>` children (Version Information, Build Information, Release State, Timestamps)
    - Map `Release` data to `InfoCardField[]` arrays for each card per the design's data mapping table
    - Keep `<Breadcrumb>`, `<BackButton>`, `<ReleaseHeader>`, `<PipelineExecutionsPanel>`, `<ReleaseTimeline>`
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4_
  - [ ]* 9.2 Write property test: Release State card displays rollout as percentage (Property 5)
    - **Property 5: Release State card displays all fields with rollout as percentage**
    - Generate random releases with random `rolloutPercentage` (0–100)
    - Assert rollout field value matches `{number}%`
    - **Validates: Requirements 7.2, 7.3**
  - [ ]* 9.3 Write property test: Timestamps card displays human-readable format (Property 6)
    - **Property 6: Timestamps card displays all fields in human-readable format**
    - Generate random ISO 8601 date strings and random null/non-null `lastSyncedAt`
    - Assert `formatDate` output is valid and non-empty, null `lastSyncedAt` shows "N/A"
    - **Validates: Requirements 8.2, 8.3, 8.4**
  - [ ]* 9.4 Write unit tests for ReleaseDetailPage integration
    - Test card titles: "Version Information", "Build Information", "Release State", "Timestamps"
    - Test breadcrumb renders correct path for a known release ID
    - Test breadcrumb terminal item is not a link
    - Test back button displays "← Back to Releases" and navigates to releases list
    - Test page loading state renders breadcrumb + back button + loading message
    - Test page error state renders error message + retry button, retry triggers refresh
    - Test "Release Not Found" state
    - Test timeline section title is "Timeline"
    - Test timeline filter tabs render all nine labels
    - Test timeline empty state when no events
    - Test auto-refresh configured with 30s interval
    - Test auto-refresh disabled during loading and error states
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 5.1, 6.1, 7.1, 8.1, 10.1, 10.2, 10.7, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3_

- [x] 10. Export new components from barrel file
  - [x] 10.1 Update `packages/web/src/components/index.ts`
    - Add exports for `InfoCard` and `CardGrid`
    - _Requirements: 4.1, 5.1_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check with 100 iterations
- Unit tests validate specific examples and edge cases using Vitest + Testing Library
- All styling uses CSS Modules consistent with the existing codebase
- No new hooks or data layer changes are needed — this is a UI restructuring only
