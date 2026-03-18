# Implementation Plan: Release Timeline Component

## Overview

Implement a vertical timeline component that visualizes release event history on the release details page. The implementation starts with backend data models and API, then builds frontend components incrementally, wiring everything together at the end.

## Tasks

- [x] 1. Define event data models and types
  - [x] 1.1 Add ReleaseEvent types to the server domain
    - Add `EventType` union type and `BaseReleaseEvent` interface to `packages/server/src/domain/types.ts`
    - Add discriminated union types for each event: `ReleaseCreatedEvent`, `StageChangeEvent`, `BlockerAddedEvent`, `BlockerResolvedEvent`, `SignOffRecordedEvent`, `RolloutUpdatedEvent`, `DistributionUpdatedEvent`, `ITGCUpdatedEvent`
    - Add `ReleaseEvent` union type and `GetEventsResponse` interface
    - _Requirements: 1.3, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2_

  - [x] 1.2 Create shared event types for the web package
    - Create `packages/web/src/types/releaseEvent.ts` mirroring the server event types for frontend use
    - Include `EventType`, `BaseReleaseEvent`, all specific event interfaces, and the `ReleaseEvent` union
    - _Requirements: 1.3_

- [x] 2. Implement backend event storage and API
  - [x] 2.1 Create event storage service
    - Create `packages/server/src/services/eventStore.ts` with an `EventStore` class
    - Implement `recordEvent(event)`, `getEventsByReleaseId(releaseId, options?)`, and storage indexed by `releaseId`
    - Support optional `limit`, `offset`, and `types` filter parameters
    - Return events sorted by timestamp descending (newest first)
    - _Requirements: 2.1, 1.2, 10.2_

  - [ ]* 2.2 Write property test for event chronological ordering
    - **Property 1: Event Chronological Ordering**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Add event recording to existing release operations
    - Modify `packages/server/src/services/` release manager methods to record events when: releases are created, stages change, blockers are added/resolved, sign-offs are recorded, rollout percentage updates, distribution status changes, ITGC status updates
    - Each operation should call `eventStore.recordEvent()` with the appropriate event type and data
    - _Requirements: 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2_

  - [x] 2.4 Create GET /api/releases/:id/events route
    - Add the events endpoint to `packages/server/src/routes/releases.ts`
    - Accept optional query parameters: `limit` (default 100), `offset` (default 0), `types` (comma-separated)
    - Return `{ events: ReleaseEvent[] }` response
    - Return 404 if release not found
    - _Requirements: 2.1_

  - [ ]* 2.5 Write unit tests for the events API route
    - Test successful event retrieval, filtering by type, pagination, and 404 for missing release
    - _Requirements: 2.1_

- [x] 3. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement utility functions and hooks
  - [x] 4.1 Create timestamp formatting utilities
    - Create `packages/web/src/utils/formatEventTimestamp.ts`
    - Implement `formatRelativeTime()` for events < 7 days old (returns "just now", "X minutes ago", "X hours ago", "X days ago")
    - Implement `formatAbsoluteTime()` for events >= 7 days old (returns "Jan 15, 2024 at 2:30 PM" format)
    - Export a single `formatEventTimestamp()` function that delegates based on event age
    - _Requirements: 1.5, 1.6_

  - [ ]* 4.2 Write property test for timestamp formatting
    - **Property 3: Timestamp Formatting by Age**
    - **Validates: Requirements 1.5, 1.6**

  - [x] 4.3 Create event description generator
    - Create `packages/web/src/utils/eventDescriptions.ts`
    - Implement `generateEventDescription(event: ReleaseEvent): string` using the description templates from the design
    - Handle all 8 event types with their required fields
    - _Requirements: 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2_

  - [ ]* 4.4 Write property test for event description required fields
    - **Property 6: Event Type Required Fields**
    - **Validates: Requirements 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2**

  - [x] 4.5 Create useReleaseEvents custom hook
    - Create `packages/web/src/hooks/useReleaseEvents.ts`
    - Implement data fetching from `GET /api/releases/:id/events` with loading/error state
    - Implement 60-second auto-refresh with `setInterval`
    - Implement 60-second response caching to avoid redundant requests
    - Expose `refresh()` for manual re-fetch
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 14.4_

- [x] 5. Implement core timeline sub-components
  - [x] 5.1 Create EventIcon component
    - Create `packages/web/src/components/EventIcon.tsx` and `EventIcon.module.css`
    - Map each `EventType` to an appropriate icon with color coding per the design (stage colors, severity colors, status colors)
    - Include `aria-label` text alternative for each icon
    - Ensure icons are 32px on desktop, 24px on mobile
    - _Requirements: 3.1, 3.4, 4.1, 4.3, 4.4, 5.1, 5.4, 6.1, 7.1, 7.3, 8.1, 8.4, 9.3, 15.3, 15.6_

  - [ ]* 5.2 Write property test for event icon mapping
    - **Property 5: Event Type Icon Mapping**
    - **Validates: Requirements 3.1, 4.1, 4.3, 5.1, 6.1, 7.1, 8.1, 9.3**

  - [ ]* 5.3 Write property test for ARIA labels on icons
    - **Property 13: ARIA Labels for Icons**
    - **Validates: Requirements 15.3**

  - [x] 5.4 Create TimelineEvent component
    - Create `packages/web/src/components/TimelineEvent.tsx` and `TimelineEvent.module.css`
    - Render `EventIcon`, formatted timestamp, event description, and vertical connector line
    - Implement expand/collapse on click with `aria-expanded` attribute
    - Show metadata (event ID, full timestamp, user info) in expanded view
    - Show optional details (blocker description, sign-off comments, issue URL links) when expanded
    - Support keyboard activation with Enter and Space keys
    - Use `<article>` with `aria-labelledby`, `<time>` with `datetime`, and `<button>` for expand toggle
    - Announce expansion state changes via ARIA live region
    - _Requirements: 1.3, 1.4, 3.2, 3.3, 4.2, 4.5, 5.2, 5.3, 6.2, 6.3, 7.2, 8.2, 8.3, 9.2, 9.4, 11.1, 11.2, 11.3, 11.4, 11.5, 15.1, 15.2, 15.4, 15.5_

  - [ ]* 5.5 Write property test for optional field display
    - **Property 7: Optional Field Display**
    - **Validates: Requirements 3.3, 4.5, 5.3, 6.3, 8.3, 11.4**

  - [ ]* 5.6 Write property test for expanded event metadata
    - **Property 12: Expanded Event Metadata**
    - **Validates: Requirements 11.3**

  - [ ]* 5.7 Write property test for multi-modal information conveyance
    - **Property 15: Multi-Modal Information Conveyance**
    - **Validates: Requirements 15.6**

- [x] 6. Implement timeline container components
  - [x] 6.1 Create TimelineFilters component
    - Create `packages/web/src/components/TimelineFilters.tsx` and `TimelineFilters.module.css`
    - Render filter buttons for each event type with `aria-pressed` state
    - Include "All Events" button to clear filters
    - Display visible/total event count when filters are active via ARIA live region
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 15.1, 15.5_

  - [ ]* 6.2 Write property test for event filtering logic
    - **Property 9: Event Filtering**
    - **Validates: Requirements 10.2**

  - [ ]* 6.3 Write property test for filtered event count accuracy
    - **Property 11: Filtered Event Count Accuracy**
    - **Validates: Requirements 10.5**

  - [x] 6.4 Create VirtualizedEventList component
    - Create `packages/web/src/components/VirtualizedEventList.tsx`
    - Use `react-window` for virtualization when event count exceeds 100
    - Render plain list for <= 100 events
    - Pass through expand/collapse handlers to each `TimelineEvent`
    - _Requirements: 14.2_

  - [x] 6.5 Create EmptyState, LoadingSpinner usage, and ErrorMessage sub-components
    - Create `packages/web/src/components/TimelineEmptyState.tsx` and CSS module for empty timeline state with helpful message and release creation date reference
    - Create `packages/web/src/components/TimelineError.tsx` and CSS module for error display with retry button
    - Reuse existing `LoadingSpinner` component for loading state
    - _Requirements: 2.2, 2.3, 12.1, 12.2, 12.3_

  - [x] 6.6 Create ReleaseTimeline container component
    - Create `packages/web/src/components/ReleaseTimeline.tsx` and `ReleaseTimeline.module.css`
    - Use `useReleaseEvents` hook for data fetching and auto-refresh
    - Manage filter state (`selectedFilters: Set<EventType>`) and expanded events state (`expandedEvents: Set<string>`)
    - Persist filter selections across auto-refreshes
    - Render `TimelineFilters`, conditional loading/error/empty states, `VirtualizedEventList`, and a manual refresh button
    - Apply responsive layout: full layout >= 768px, compact layout < 768px
    - Use `React.memo` and `useMemo` for filtered events to optimize re-renders
    - Wrap in `role="feed"` with `aria-label="Release event timeline"`
    - Ensure minimum 44x44px touch targets on mobile
    - _Requirements: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5, 10.1, 10.4, 13.1, 13.2, 13.3, 13.4, 14.1, 14.3, 15.1, 15.4_

  - [ ]* 6.7 Write property test for filter persistence across refresh
    - **Property 10: Filter Persistence Across Refresh**
    - **Validates: Requirements 10.4**

  - [ ]* 6.8 Write property test for release creation event position
    - **Property 8: Release Creation Event Position**
    - **Validates: Requirements 9.1**

- [x] 7. Checkpoint - Components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate timeline into release details page and finalize
  - [x] 8.1 Add ReleaseTimeline to ReleaseDetailPage
    - Import and render `ReleaseTimeline` in `packages/web/src/pages/ReleaseDetailPage.tsx` below the `<ReleaseInfo>` component
    - Pass `release.id` as the `releaseId` prop
    - Wrap with existing `ErrorBoundary` component
    - _Requirements: 1.1_

  - [x] 8.2 Export new components from the components index
    - Add exports for `ReleaseTimeline`, `TimelineEvent`, `TimelineFilters`, `EventIcon`, `VirtualizedEventList`, `TimelineEmptyState`, and `TimelineError` to `packages/web/src/components/index.ts`
    - _Requirements: 1.1_

  - [ ]* 8.3 Write property test for event display completeness
    - **Property 2: Event Display Completeness**
    - **Validates: Requirements 1.3**

  - [ ]* 8.4 Write property test for ARIA live region updates
    - **Property 14: ARIA Live Region Updates**
    - **Validates: Requirements 15.5**

  - [ ]* 8.5 Write integration tests for the full timeline flow
    - Test timeline renders within ReleaseDetailPage with mocked API
    - Test loading → data → rendered events flow
    - Test error state with retry
    - Test filter interaction and event expand/collapse
    - Test keyboard navigation (Tab, Enter, Space)
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 10.1, 11.2, 15.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` library as specified in the design
- Checkpoints ensure incremental validation at backend and frontend boundaries
- The existing `LoadingSpinner` and `ErrorBoundary` components are reused where possible
