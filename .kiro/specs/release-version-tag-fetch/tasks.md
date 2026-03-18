# Implementation Plan: Release Version Tag Fetch

## Overview

Implement a `TagWatcher` service that detects new version tags in GitHub and Azure DevOps repositories, matches them to active releases by version string, and advances the matched release to its next pipeline stage. Includes a `ProcessedTagStore` for idempotency, a REST endpoint for tag detection status, and a frontend `TagDetectionStatus` component on the release detail page. Tasks build incrementally from pure utility functions through the service layer, API, and frontend.

## Tasks

- [x] 1. Implement version tag pattern matching utilities
  - [x] 1.1 Create `extractVersion` and `isVersionTag` pure functions
    - Create `packages/server/src/services/tag-utils.ts`
    - Implement `extractVersion(tagName: string): string | null` using the regex `^(?:.*\/)?v?(\d+\.\d+\.\d+)$`
    - Implement `isVersionTag(tagName: string): boolean` returning whether the tag matches the pattern
    - Export both functions
    - _Requirements: 1.3, 2.3, 3.1_

  - [ ]* 1.2 Write property test for version extraction round trip (Property 1)
    - **Property 1: Version extraction round trip**
    - Generate random strings with optional path prefixes, optional `v`, and three dot-separated non-negative integers. Assert `extractVersion` returns the bare semver. Generate random non-matching strings and assert `extractVersion` returns `null`.
    - **Validates: Requirements 1.3, 2.3, 3.1**

- [x] 2. Implement stage progression lookup
  - [x] 2.1 Create `getNextStage` utility function
    - Add `getNextStage(current: ReleaseStage): ReleaseStage | null` to `packages/server/src/services/tag-utils.ts`
    - Use the pipeline order: ReleaseBranching → FinalReleaseCandidate → SubmitForAppStoreReview → RollOut1Percent → RollOut100Percent
    - Return `null` for `RollOut100Percent` (final stage)
    - _Requirements: 4.1, 4.5_

  - [ ]* 2.2 Write property test for next stage successor (Property 3)
    - **Property 3: Next stage is always the immediate successor**
    - For each `ReleaseStage` value, assert `getNextStage` returns the correct successor or `null` for the final stage.
    - **Validates: Requirements 4.1, 4.5**

- [x] 3. Implement ProcessedTagStore
  - [x] 3.1 Create `ProcessedTagStore` class
    - Create `packages/server/src/services/processed-tag-store.ts`
    - Implement in-memory store with `ProcessedTagRecord` interface (`tagName`, `repositoryUrl`, `processedAt`, `releaseId`, `appliedStage`)
    - Implement `markProcessed(record)`, `isProcessed(tagName, repositoryUrl)`, `getProcessedTags(repositoryUrl)`, `getLastProcessedTimestamp(repositoryUrl)`
    - Implement `exportState()` and `importState(records)` for persistence across restarts
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.2 Write property test for processed tag idempotency (Property 5)
    - **Property 5: Processed tag idempotency**
    - Generate random tag names and repository URLs. Mark them as processed. Assert `isProcessed` returns `true`. Process them again and assert no duplicate entries are created.
    - **Validates: Requirements 5.2**

  - [ ]* 3.3 Write property test for export/import round trip (Property 6)
    - **Property 6: Processed tag store export/import round trip**
    - Generate random sets of `ProcessedTagRecord` entries. Export from one store, import into a fresh store. Assert `isProcessed` returns the same results for all tags.
    - **Validates: Requirements 5.1, 5.3**

- [x] 4. Checkpoint — Utility layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement TagWatcher service
  - [x] 5.1 Create `TagWatcher` class with polling subscriber integration
    - Create `packages/server/src/services/tag-watcher.ts`
    - Implement `TagWatcherConfig` interface accepting `releaseStore`, `releaseManager`, `stateManager`, `eventStore`, `pollingService`, `githubAdapter`, `azureAdapter`, `logger`
    - Implement `start()` to subscribe to `PollingService` notifications and `stop()` to unsubscribe
    - Implement `handlePollingNotification(notification: DataChangeNotification)` to process tags from GitHub notifications (extract `data.tags`) and Azure notifications (call `azureAdapter.getTags` directly)
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 5.2 Implement tag-to-release matching logic
    - Implement `matchTagToRelease(version: string, repositoryUrl: string): Promise<TagMatchResult | null>` in `TagWatcher`
    - Query active releases (status `Current` or `Upcoming`) from `ReleaseStore`
    - Match by extracted version string AND `repositoryUrl`
    - Return `TagMatchResult` when exactly one release matches; return `null` and log info/warning for zero or multiple matches
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.3 Write property test for tag-to-release matching (Property 2)
    - **Property 2: Tag-to-release matching correctness**
    - Generate random sets of active releases (varying versions, repository URLs, statuses) and random version tags. Assert the matching function returns a `TagMatchResult` only when exactly one release matches by version AND repository URL.
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 5.4 Implement stage transition logic
    - In `handlePollingNotification`, after matching a tag to a release: use `getNextStage` to determine the target stage, validate via `StateManager`, apply via `ReleaseManagerService.updateReleaseStage`, and mark the tag as processed in `ProcessedTagStore`
    - Skip tags already in `ProcessedTagStore`
    - Skip releases at `RollOut100Percent` (final stage)
    - Log warnings when `StateManager` rejects a transition; do NOT mark tag as processed when `updateReleaseStage` fails
    - Record `stage_change` event in `EventStore` on successful transition (handled by `ReleaseManagerService`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.2_

  - [ ]* 5.5 Write property test for rejected transitions (Property 4)
    - **Property 4: Rejected transitions leave release unchanged**
    - Generate random releases where `StateManager` rejects the transition. Assert the release's `currentStage` remains unchanged after `TagWatcher` processes a matching version tag.
    - **Validates: Requirements 4.4**

  - [x] 5.6 Implement `getTagStatus` method
    - Implement `getTagStatus(releaseId: string): TagDetectionInfo` on `TagWatcher`
    - Return `active: true` when the release has a non-empty `repositoryUrl` and valid `sourceType`; include `lastDetectedTag` and `lastCheckAt` from internal tracking state
    - Return `active: false` with `null` fields when tag watching is not configured
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.7 Write property test for tag status response (Property 7)
    - **Property 7: Tag status response reflects release configuration**
    - Generate random releases with varying `repositoryUrl` and `sourceType` values (including empty/null). Assert the method returns `active: true` iff both fields are present, and `null` fields when inactive.
    - **Validates: Requirements 6.1, 6.2**

- [x] 6. Register TagWatcher in the services container
  - [x] 6.1 Wire TagWatcher into `services.ts`
    - Update `packages/server/src/services.ts` to import and instantiate `TagWatcher` and `ProcessedTagStore`
    - Pass existing `releaseStore`, `releaseManager`, `stateManager`, `eventStore`, `pollingService`, `githubAdapter`, `azureAdapter` to `TagWatcher`
    - Add `tagWatcher` to the `Services` interface and the returned object
    - Call `tagWatcher.start()` after initialization
    - _Requirements: 1.1, 2.1_

- [x] 7. Add tag-status API endpoint
  - [x] 7.1 Add GET `/api/releases/:id/tag-status` endpoint
    - Add the route handler in `packages/server/src/routes/releases.ts`
    - Call `tagWatcher.getTagStatus(releaseId)` and return `{ tagStatus: TagDetectionInfo }` with status 200
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Checkpoint — Server-side complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add frontend TagDetectionInfo type and TagStatusService
  - [x] 9.1 Add `TagDetectionInfo` type to frontend types
    - Add the `TagDetectionInfo` interface to `packages/web/src/types/index.ts` with fields: `active: boolean`, `lastDetectedTag: string | null`, `lastCheckAt: string | null`
    - _Requirements: 7.1_

  - [x] 9.2 Create `TagStatusService`
    - Create `packages/web/src/services/TagStatusService.ts`
    - Implement `getTagStatus(releaseId: string): Promise<TagDetectionInfo>` calling `GET /api/releases/{releaseId}/tag-status`
    - Register the service in `packages/web/src/contexts/ServicesContext.tsx`
    - _Requirements: 6.1, 7.1_

- [x] 10. Implement useTagStatus hook
  - [x] 10.1 Create `useTagStatus` hook
    - Create `packages/web/src/hooks/useTagStatus.ts`
    - Implement the hook accepting `releaseId`, `service`, and `isActive` flag
    - Return `{ tagStatus, isLoading, error, refresh }`
    - Fetch on mount only when `isActive` is true
    - Use the existing `useAutoRefresh` hook with a 30-second interval for auto-refresh
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 11. Implement TagDetectionStatus component
  - [x] 11.1 Create `TagDetectionStatus` component and styles
    - Create `packages/web/src/components/TagDetectionStatus.tsx` and `TagDetectionStatus.module.css`
    - Display a status indicator showing whether tag watching is active
    - Show the last detected tag name and last check timestamp when active and a tag has been detected
    - Show "Watching for tags..." when active but no tags detected yet
    - Do not render the component when tag watching is inactive (`active` is `false`)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 11.2 Write property test for tag detection status rendering (Property 8)
    - **Property 8: Tag detection status rendering contains required fields**
    - Generate random `TagDetectionInfo` objects with `active: true` and non-null `lastDetectedTag`. Render the component. Assert the DOM contains the tag name and a formatted timestamp.
    - **Validates: Requirements 7.1**

- [x] 12. Integrate TagDetectionStatus into ReleaseDetailPage
  - [x] 12.1 Wire `TagDetectionStatus` into `ReleaseDetailPage`
    - Update `packages/web/src/pages/ReleaseDetailPage.tsx` to determine `isActive` from the release's `repositoryUrl` and `sourceType`
    - Render `TagDetectionStatus` component when tag watching is active
    - Wire the page-level refresh to also trigger `useTagStatus` refresh
    - _Requirements: 7.1, 7.3, 7.4_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- fast-check is already available in `packages/web`; add it as a dev dependency in `packages/server` when implementing server-side property tests
- The `TagWatcher` subscribes to existing `PollingService` notifications — no new polling loops are introduced
- For Azure, `TagWatcher` calls `AzureDevOpsAdapter.getTags` directly since `pollAzure` does not currently fetch tags
