# Implementation Plan: CI Pipeline Auto-Fetch

## Overview

Implement automatic fetching and display of CI pipeline executions (GitHub Actions / Azure Pipelines) on the release detail page. The implementation extends existing adapters, adds a new service and API endpoint, and introduces a frontend panel with auto-refresh. Tasks are ordered so each step builds on the previous, with no orphaned code.

## Tasks

- [x] 1. Define CIExecution type and extend Release with repositoryConfigId
  - [x] 1.1 Add `CIExecution` interface and `repositoryConfigId` to domain types
    - Add the `CIExecution` interface to `packages/server/src/domain/types.ts` with fields: `id`, `runNumber`, `status` (`'pending' | 'running' | 'passed' | 'failed'`), `branch`, `commitSha`, `startedAt` (ISO 8601 string), and optional `completedAt`
    - Add optional `repositoryConfigId?: string` field to the `Release` interface
    - Add optional `repositoryConfigId?: string` field to the `ReleaseConfiguration` interface
    - _Requirements: 7.1, 7.2, 1.2, 2.2_

  - [ ]* 1.2 Write property test for repositoryConfigId round trip (Property 7)
    - **Property 7: Release repositoryConfigId round trip**
    - Generate random release configs with `repositoryConfigId`. Create and retrieve via `ReleaseManagerService`. Assert the returned release's `repositoryConfigId` equals the value provided at creation.
    - **Validates: Requirements 7.2**

- [x] 2. Implement GitHubAdapter.getWorkflowRuns
  - [x] 2.1 Add `getWorkflowRuns` method to GitHubAdapter
    - Add `getWorkflowRuns(repository: string, workflowId: string): Promise<Result<CIExecution[], IntegrationError>>` to `packages/server/src/integration/github-adapter.ts`
    - Call `GET /repos/{owner}/{repo}/actions/workflows/{workflowId}/runs` using the existing Octokit client
    - Map GitHub `status`/`conclusion` to `CIExecution.status` per the design status mapping table
    - Cache results under key `github:workflowRuns:{repository}:{workflowId}` with 5-minute TTL using the existing `Cache`
    - Use existing `retryWithBackoff` and circuit breaker patterns
    - Return `Failure(IntegrationError)` on API errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.2 Write property test for GitHub workflow run mapping (Property 1)
    - **Property 1: GitHub workflow run mapping produces valid CIExecution**
    - Generate random GitHub run objects with arbitrary `status`/`conclusion` combinations using fast-check. Assert the mapping always produces a `CIExecution` with non-empty `id`, non-empty `runNumber`, valid `status`, non-empty `branch`, non-empty `commitSha`, and valid ISO 8601 `startedAt`.
    - **Validates: Requirements 1.2**

  - [ ]* 2.3 Write property test for adapter error wrapping — GitHub (Property 8)
    - **Property 8: Adapter errors are wrapped as IntegrationError (GitHub)**
    - Generate random error messages/codes. Pass through GitHubAdapter error handling. Assert result is `Failure(IntegrationError)` with non-empty message.
    - **Validates: Requirements 1.4**

- [x] 3. Implement AzureDevOpsAdapter.getPipelineBuilds
  - [x] 3.1 Add `getPipelineBuilds` method to AzureDevOpsAdapter
    - Add `getPipelineBuilds(pipelineId: string): Promise<Result<CIExecution[], IntegrationError>>` to `packages/server/src/integration/azure-devops-adapter.ts`
    - Call the Azure Pipelines builds API filtered by `definitions={pipelineId}` with no branch filter
    - Map Azure `status`/`result` to `CIExecution.status` per the design status mapping table
    - Cache results under key `azure:pipelineBuilds:{pipelineId}` with 5-minute TTL using the existing `Cache`
    - Use existing `retryWithBackoff` and circuit breaker patterns
    - Return `Failure(IntegrationError)` on API errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.2 Write property test for Azure build mapping (Property 2)
    - **Property 2: Azure build mapping produces valid CIExecution**
    - Generate random Azure build objects with arbitrary `status`/`result` combinations using fast-check. Assert the mapping always produces a `CIExecution` with non-empty `id`, non-empty `runNumber`, valid `status`, non-empty `branch`, non-empty `commitSha`, and valid ISO 8601 `startedAt`.
    - **Validates: Requirements 2.2**

  - [ ]* 3.3 Write property test for adapter error wrapping — Azure (Property 8)
    - **Property 8: Adapter errors are wrapped as IntegrationError (Azure)**
    - Generate random error messages/codes. Pass through AzureDevOpsAdapter error handling. Assert result is `Failure(IntegrationError)` with non-empty message.
    - **Validates: Requirements 2.4**

- [x] 4. Checkpoint — Adapter layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement PipelineFetcher service
  - [x] 5.1 Create `PipelineFetcher` service
    - Create `packages/server/src/services/pipeline-fetcher.ts`
    - Implement `PipelineFetcher` class with constructor accepting `ReleaseStore`, `ConfigStore`, `GitHubAdapter`, and `AzureDevOpsAdapter`
    - Implement `getExecutions(releaseId: string): Promise<Result<CIExecution[], ApplicationError>>` with logic: load release → read `repositoryConfigId` → load config → check `ciPipelineId` → select adapter by `sourceType` → call adapter → sort by `startedAt` descending → limit to 50 records
    - Return `Success([])` when `repositoryConfigId` is absent, config is missing, or `ciPipelineId` is absent
    - Wrap adapter `IntegrationError` as a 502-appropriate error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.3_

  - [ ]* 5.2 Write property test for adapter selection (Property 3)
    - **Property 3: Adapter selection matches sourceType**
    - Generate random `RepositoryConfig` objects with `sourceType` of `"github"` or `"azure"`. Mock both adapters. Assert the correct adapter is called with the correct `ciPipelineId`.
    - **Validates: Requirements 3.2**

  - [ ]* 5.3 Write property test for missing config returns empty list (Property 4)
    - **Property 4: Missing config or missing ciPipelineId returns empty list**
    - Generate random releases with no `repositoryConfigId` or configs with no `ciPipelineId`. Assert `PipelineFetcher.getExecutions()` returns `Success([])`.
    - **Validates: Requirements 3.3**

  - [ ]* 5.4 Write property test for sorting and limit (Property 5)
    - **Property 5: Executions are sorted descending by startedAt and limited to 50**
    - Generate random arrays of 0–100 `CIExecution` objects. Pass through the sorting/limiting logic. Assert output is sorted descending by `startedAt` and length ≤ 50.
    - **Validates: Requirements 3.5, 3.6**

- [x] 6. Add pipeline-executions API endpoint and wire PipelineFetcher
  - [x] 6.1 Add GET `/api/releases/:id/pipeline-executions` endpoint
    - Add the route handler in `packages/server/src/routes/releases.ts`
    - Call `PipelineFetcher.getExecutions(releaseId)` and return `{ executions: CIExecution[] }` on success
    - Return 502 with `{ error: "Integration Error", message: "..." }` when the adapter fails
    - Return 200 with `{ executions: [] }` when no config or no `ciPipelineId`
    - _Requirements: 3.1, 3.4_

  - [x] 6.2 Register PipelineFetcher in the services container
    - Update `packages/server/src/services.ts` to instantiate `PipelineFetcher` with existing `releaseStore`, `configStore`, `githubAdapter`, and `azureAdapter`
    - Add `pipelineFetcher` to the `Services` interface and the returned object
    - Pass `services` to `createReleaseRoutes` (already done) so the route can access `pipelineFetcher`
    - _Requirements: 3.1, 7.3_

- [x] 7. Checkpoint — Server-side complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add frontend CIExecution type and PipelineExecutionService
  - [x] 8.1 Add `CIExecution` type to frontend types
    - Add the `CIExecution` interface to `packages/web/src/types/index.ts` mirroring the server-side type
    - _Requirements: 4.1_

  - [x] 8.2 Create `PipelineExecutionService`
    - Create `packages/web/src/services/PipelineExecutionService.ts`
    - Implement `getExecutions(releaseId: string): Promise<CIExecution[]>` calling `GET /api/releases/{releaseId}/pipeline-executions`
    - Register the service in `packages/web/src/contexts/ServicesContext.tsx`
    - _Requirements: 4.1, 4.3, 4.4_

- [x] 9. Implement usePipelineExecutions hook
  - [x] 9.1 Create `usePipelineExecutions` hook
    - Create `packages/web/src/hooks/usePipelineExecutions.ts`
    - Implement the hook accepting `releaseId`, `service`, and `hasCiPipeline` flag
    - Return `{ executions, isLoading, isRefreshing, error, refresh }`
    - Fetch on mount only when `hasCiPipeline` is true
    - Use the existing `useAutoRefresh` hook with a 60-second interval for auto-refresh
    - Track `isRefreshing` separately from initial `isLoading`
    - Support manual refresh via the returned `refresh` function
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Implement PipelineExecutionsPanel component
  - [x] 10.1 Create `PipelineExecutionsPanel` component and styles
    - Create `packages/web/src/components/PipelineExecutionsPanel.tsx` and `PipelineExecutionsPanel.module.css`
    - Render a list/table of CI executions showing: run number, status badge, branch, truncated commit SHA (first 7 chars), and started-at timestamp
    - Status badge colors: pending=gray, running=blue, passed=green, failed=red
    - Show `LoadingSpinner` on initial load (`isLoading` is true)
    - Show error message with a retry button when `error` is set
    - Show subtle refresh indicator when `isRefreshing` is true (keep previous data visible)
    - Do not render the component when `hasCiPipeline` is false
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 10.2 Write property test for rendered CIExecution fields (Property 6)
    - **Property 6: Rendered CIExecution contains all required fields with correct status color**
    - Generate random `CIExecution` objects using fast-check. Render the panel row. Assert the DOM contains `runNumber`, `branch`, first 7 characters of `commitSha`, `startedAt`, and a status badge with the correct CSS class for the status.
    - **Validates: Requirements 4.1, 4.2**

- [x] 11. Modify BuildInfoForm and wire PipelineExecutionsPanel into ReleaseDetailPage
  - [x] 11.1 Update `BuildInfoForm` to show auto-fetch notice
    - Add `hasCiPipeline: boolean` prop to `packages/web/src/components/BuildInfoForm.tsx`
    - When `hasCiPipeline` is true, display an informational notice: "Build information is being auto-fetched from the CI pipeline."
    - Keep the form visible and editable regardless of the flag
    - When `hasCiPipeline` is false, no changes to existing behavior
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Integrate `PipelineExecutionsPanel` into `ReleaseDetailPage`
    - Update `packages/web/src/pages/ReleaseDetailPage.tsx` to determine `hasCiPipeline` from the release's associated config
    - Render `PipelineExecutionsPanel` when `hasCiPipeline` is true
    - Pass `hasCiPipeline` to `BuildInfoForm`
    - Wire the page-level refresh button to also trigger `PipelineExecutionsPanel` refresh
    - _Requirements: 4.5, 5.3, 6.1_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- fast-check is already available in `packages/web`; add it as a dev dependency in `packages/server` when implementing server-side property tests
