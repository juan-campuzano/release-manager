# Requirements Document

## Introduction

The CI Pipeline Auto-Fetch feature automatically retrieves CI pipeline executions (workflow runs from GitHub Actions or builds from Azure Pipelines) when a release is associated with a Repository Configuration that includes a `ciPipelineId`. Instead of manually entering build pipeline numbers on the release detail page, the system fetches and displays pipeline executions from the CI provider, reducing manual effort and improving accuracy.

## Glossary

- **Pipeline_Fetcher**: The server-side service responsible for retrieving CI pipeline executions from external CI providers using the configured adapter
- **CI_Execution**: A single pipeline run or workflow run retrieved from a CI provider, containing an identifier, run number, status, branch, commit, and timestamps
- **Pipeline_Executions_API**: The REST API endpoint that returns CI pipeline executions for a given release
- **Pipeline_Executions_Panel**: The UI component on the release detail page that displays fetched CI pipeline executions
- **Build_Info_Form**: The existing UI form on the release detail page where build numbers are manually entered
- **GitHub_Adapter**: The existing server-side adapter for interacting with the GitHub API
- **Azure_Adapter**: The existing server-side adapter for interacting with the Azure DevOps API
- **Release_Manager**: A user of the Release Manager Tool who creates and manages releases
- **Repository_Config**: A named set of default values associated with a single repository, including an optional `ciPipelineId`

## Requirements

### Requirement 1: Fetch GitHub Actions Workflow Runs

**User Story:** As a Release Manager, I want the system to automatically fetch GitHub Actions workflow runs for my release, so that I can see CI execution status without leaving the tool.

#### Acceptance Criteria

1. THE GitHub_Adapter SHALL expose a method that accepts a pipeline ID (workflow ID) and a repository identifier and returns a list of CI_Execution records
2. WHEN the GitHub_Adapter fetches workflow runs, THE GitHub_Adapter SHALL map each run to a CI_Execution containing: id, run number, status (pending, running, passed, or failed), branch, head commit SHA, started-at timestamp, and optional completed-at timestamp
3. THE GitHub_Adapter SHALL cache fetched workflow runs for 5 minutes to reduce API calls
4. IF the GitHub API returns an error, THEN THE GitHub_Adapter SHALL return a descriptive integration error

### Requirement 2: Fetch Azure Pipelines Builds by Pipeline ID Without Branch Filter

**User Story:** As a Release Manager, I want the system to fetch Azure Pipelines builds using only the pipeline ID, so that I can see all recent builds regardless of branch.

#### Acceptance Criteria

1. THE Azure_Adapter SHALL expose a method that accepts a pipeline ID and returns a list of CI_Execution records across all branches
2. WHEN the Azure_Adapter fetches builds, THE Azure_Adapter SHALL map each build to a CI_Execution containing: id, build number, status (pending, running, passed, or failed), branch, source commit SHA, started-at timestamp, and optional completed-at timestamp
3. THE Azure_Adapter SHALL cache fetched builds for 5 minutes to reduce API calls
4. IF the Azure DevOps API returns an error, THEN THE Azure_Adapter SHALL return a descriptive integration error

### Requirement 3: Pipeline Executions API Endpoint

**User Story:** As a frontend developer, I want an API endpoint that returns CI pipeline executions for a release, so that the UI can display them.

#### Acceptance Criteria

1. THE Pipeline_Executions_API SHALL expose a GET endpoint that accepts a release ID and returns a list of CI_Execution records
2. WHEN a release has an associated Repository_Config with a ciPipelineId, THE Pipeline_Fetcher SHALL use the Repository_Config sourceType to select the correct adapter (GitHub_Adapter for "github", Azure_Adapter for "azure") and fetch executions using the ciPipelineId and repositoryUrl
3. WHEN a release has no associated Repository_Config or the Repository_Config has no ciPipelineId, THE Pipeline_Executions_API SHALL return an empty list
4. IF the selected adapter returns an error, THEN THE Pipeline_Executions_API SHALL return a descriptive error with a 502 status code
5. THE Pipeline_Executions_API SHALL return CI_Execution records sorted by started-at timestamp in descending order (most recent first)
6. THE Pipeline_Executions_API SHALL limit the response to the 50 most recent CI_Execution records

### Requirement 4: Display Pipeline Executions on Release Detail Page

**User Story:** As a Release Manager, I want to see CI pipeline executions on the release detail page, so that I can monitor build status at a glance.

#### Acceptance Criteria

1. WHEN a release has a ciPipelineId configured, THE Pipeline_Executions_Panel SHALL display a list of CI_Execution records showing: run number, status, branch, commit SHA (truncated to 7 characters), and started-at timestamp
2. THE Pipeline_Executions_Panel SHALL display a visual status indicator for each CI_Execution: a color-coded badge showing pending (gray), running (blue), passed (green), or failed (red)
3. WHEN the Pipeline_Executions_Panel is loading data, THE Pipeline_Executions_Panel SHALL display a loading indicator
4. IF the Pipeline_Executions_API returns an error, THEN THE Pipeline_Executions_Panel SHALL display an error message with a retry button
5. WHEN a release has no ciPipelineId configured, THE Pipeline_Executions_Panel SHALL not be rendered on the page

### Requirement 5: Auto-Refresh Pipeline Executions

**User Story:** As a Release Manager, I want pipeline executions to refresh automatically, so that I always see the latest CI status.

#### Acceptance Criteria

1. WHILE the release detail page is open and a ciPipelineId is configured, THE Pipeline_Executions_Panel SHALL refresh the CI_Execution list every 60 seconds
2. WHILE a refresh is in progress, THE Pipeline_Executions_Panel SHALL display the previously loaded data alongside a subtle refresh indicator
3. WHEN the Release_Manager clicks the existing page-level refresh button, THE Pipeline_Executions_Panel SHALL also refresh its data

### Requirement 6: Make Manual Build Entry Optional

**User Story:** As a Release Manager, I want manual build entry to become optional when pipeline executions are available, so that I do not duplicate effort.

#### Acceptance Criteria

1. WHEN a release has a ciPipelineId configured and pipeline executions are available, THE Build_Info_Form SHALL display a notice indicating that build information is being auto-fetched from the CI pipeline
2. WHEN a release has a ciPipelineId configured, THE Build_Info_Form SHALL remain visible and editable so the Release_Manager can override auto-fetched values if needed
3. WHEN a release has no ciPipelineId configured, THE Build_Info_Form SHALL behave as it does today with no changes

### Requirement 7: Link Release to Repository Configuration

**User Story:** As a developer, I want releases to store a reference to their Repository Configuration, so that the system can look up the ciPipelineId and sourceType at runtime.

#### Acceptance Criteria

1. THE Release domain type SHALL include an optional repositoryConfigId field that references a Repository_Config
2. WHEN a release is created using a Repository_Config, THE system SHALL store the Repository_Config identifier on the Release record
3. WHEN the Pipeline_Fetcher needs CI configuration for a release, THE Pipeline_Fetcher SHALL retrieve the associated Repository_Config using the repositoryConfigId stored on the Release
