# Requirements Document

## Introduction

The Release Version Tag Fetch feature automatically detects when a version tag related to a release is created in the source repository (GitHub or Azure DevOps) and advances the release to its next pipeline stage. Currently, release stage progression is manual. This feature closes the gap by polling for new version tags, matching them to active releases by version string, and triggering the appropriate stage transition through the existing StateManager, reducing manual intervention and keeping the dashboard in sync with the actual release lifecycle.

## Glossary

- **Tag_Watcher**: The server-side service responsible for periodically checking repositories for new version tags and correlating them with active releases
- **Version_Tag**: A git tag in a repository whose name matches a release version pattern (e.g., `v1.2.3`, `1.2.3`, `release/1.2.3`)
- **Release_Stage**: A specific phase in the release pipeline as defined by the ReleaseStage enum: Release Branching, Final Release Candidate, Submit For App Store Review, Roll Out 1%, Roll Out 100%
- **Stage_Transition**: The act of advancing a release from its current Release_Stage to the next sequential Release_Stage via the StateManager
- **Active_Release**: A release with a status of Current or Upcoming that has not yet reached Roll Out 100%
- **GitHub_Adapter**: The existing server-side adapter for interacting with the GitHub API, which already supports getTags and detectNewTags methods
- **Azure_Adapter**: The existing server-side adapter for interacting with the Azure DevOps API, which already supports a getTags method
- **Polling_Service**: The existing server-side service that periodically polls GitHub and Azure DevOps for data changes
- **State_Manager**: The existing application-layer component that validates and applies release stage transitions
- **Release_Manager_Service**: The existing application-layer service that orchestrates release operations including stage updates
- **Tag_Match_Result**: The outcome of matching a Version_Tag to an Active_Release, containing the matched release ID, the tag name, and the target stage

## Requirements

### Requirement 1: Detect New Version Tags from GitHub Repositories

**User Story:** As a Release Manager, I want the system to automatically detect new version tags in GitHub repositories, so that release stage progression can happen without manual intervention.

#### Acceptance Criteria

1. WHILE the Polling_Service is running for a GitHub repository, THE Tag_Watcher SHALL check for new Version_Tags at each polling interval
2. THE Tag_Watcher SHALL use the existing GitHub_Adapter detectNewTags method to retrieve tags created since the last successful poll
3. THE Tag_Watcher SHALL identify Version_Tags by matching tag names against the pattern: optional `v` prefix followed by a semantic version (e.g., `v1.2.3`, `1.2.3`)
4. IF the GitHub_Adapter returns an error while fetching tags, THEN THE Tag_Watcher SHALL log the error and retry on the next polling cycle

### Requirement 2: Detect New Version Tags from Azure DevOps Repositories

**User Story:** As a Release Manager, I want the system to automatically detect new version tags in Azure DevOps repositories, so that Azure-hosted releases also benefit from automatic stage progression.

#### Acceptance Criteria

1. WHILE the Polling_Service is running for an Azure DevOps repository, THE Tag_Watcher SHALL check for new Version_Tags at each polling interval
2. THE Tag_Watcher SHALL use the existing Azure_Adapter getTags method to retrieve tags and compare against previously known tags to detect new ones
3. THE Tag_Watcher SHALL identify Version_Tags by matching tag names against the same pattern used for GitHub: optional `v` prefix followed by a semantic version
4. IF the Azure_Adapter returns an error while fetching tags, THEN THE Tag_Watcher SHALL log the error and retry on the next polling cycle

### Requirement 3: Match Version Tags to Active Releases

**User Story:** As a Release Manager, I want detected version tags to be matched to the correct active release, so that the right release is advanced.

#### Acceptance Criteria

1. WHEN a new Version_Tag is detected, THE Tag_Watcher SHALL extract the version string from the tag name by stripping any `v` prefix and path prefixes (e.g., `release/`)
2. THE Tag_Watcher SHALL query Active_Releases and match the extracted version string against the release version field
3. WHEN a Version_Tag matches exactly one Active_Release, THE Tag_Watcher SHALL produce a Tag_Match_Result for that release
4. WHEN a Version_Tag matches zero Active_Releases, THE Tag_Watcher SHALL log an informational message and take no further action
5. WHEN a Version_Tag matches more than one Active_Release, THE Tag_Watcher SHALL log a warning and take no action to avoid ambiguous stage transitions
6. THE Tag_Watcher SHALL also match tags against the release repository URL to ensure the tag comes from the same repository as the release

### Requirement 4: Advance Release to Next Stage on Tag Detection

**User Story:** As a Release Manager, I want the release to automatically advance to its next pipeline stage when a matching version tag is detected, so that the dashboard reflects the actual release state.

#### Acceptance Criteria

1. WHEN a Tag_Match_Result is produced, THE Tag_Watcher SHALL determine the next Release_Stage by looking up the stage immediately following the matched release's current stage in the pipeline order
2. THE Tag_Watcher SHALL use the State_Manager to validate whether the Stage_Transition is allowed before applying it
3. WHEN the State_Manager confirms the transition is valid, THE Tag_Watcher SHALL invoke the Release_Manager_Service updateReleaseStage method to apply the transition
4. WHEN the State_Manager rejects the transition (e.g., missing prerequisites), THE Tag_Watcher SHALL log a warning with the validation errors and skip the transition
5. WHEN a release is already at Roll Out 100% (the final stage), THE Tag_Watcher SHALL take no action for additional matching tags
6. THE Tag_Watcher SHALL record a stage_change event in the Event Store when a transition is successfully applied

### Requirement 5: Persist Tag Detection State

**User Story:** As a developer, I want the system to track which tags have already been processed, so that duplicate stage transitions do not occur after server restarts or polling cycles.

#### Acceptance Criteria

1. THE Tag_Watcher SHALL maintain a record of processed Version_Tags per repository, storing the tag name and the timestamp it was processed
2. WHEN a Version_Tag has already been processed, THE Tag_Watcher SHALL skip it on subsequent polling cycles
3. THE Tag_Watcher SHALL persist the last processed tag timestamp so that detection survives server restarts
4. IF the processed-tag state is lost or corrupted, THEN THE Tag_Watcher SHALL re-evaluate all recent tags but only apply transitions for releases whose current stage has not already been advanced

### Requirement 6: Expose Tag Detection Status via API

**User Story:** As a Release Manager, I want to see the tag detection status for my releases on the dashboard, so that I know whether automatic stage progression is active and working.

#### Acceptance Criteria

1. THE Release_Manager_Tool SHALL expose a GET endpoint that returns the tag detection status for a given release, including: whether tag watching is active, the last detected Version_Tag name, and the timestamp of the last successful tag check
2. WHEN tag watching is not configured for a release (no repository URL or source type), THE endpoint SHALL return a status indicating tag watching is inactive
3. WHEN the Tag_Watcher detects a new tag and advances a release, THE endpoint SHALL reflect the updated tag information within 5 seconds

### Requirement 7: Display Tag Detection Status on Release Detail Page

**User Story:** As a Release Manager, I want to see on the release detail page whether a version tag has been detected and when the last tag check occurred, so that I have visibility into the automation.

#### Acceptance Criteria

1. WHEN a release has tag watching active, THE Dashboard SHALL display a tag detection status indicator showing the last detected Version_Tag name and the time of the last check
2. WHEN no tags have been detected yet for a release, THE Dashboard SHALL display a status indicating the system is watching for tags
3. WHEN tag watching is inactive for a release, THE Dashboard SHALL not display the tag detection status indicator
4. WHEN a new tag is detected and the release stage advances, THE Dashboard SHALL update the stage visualization and the tag status within 5 seconds

