# Requirements Document

## Introduction

This document defines the requirements for adding mock data functionality to the Release Manager Tool server. The mock data feature will allow the server to operate without a database connection, enabling developers to demo and test the web application without requiring database setup. The mock data will simulate realistic release management scenarios including releases across multiple platforms, blockers, sign-offs, distributions, quality metrics, DAU statistics, and ITGC status.

## Glossary

- **Mock_Data_Provider**: A component that generates and serves simulated release management data
- **Server**: The Express.js backend application that exposes REST endpoints for release management
- **Database_Mode**: Server operation mode that uses a real database connection
- **Mock_Mode**: Server operation mode that uses the Mock_Data_Provider instead of a database
- **Release**: A software deployment tracked through various stages from branching to production rollout
- **Blocker**: An issue preventing release progress with severity levels (critical, high, medium)
- **Sign_Off**: Squad approval required before a release can progress to certain stages
- **Distribution**: A platform-specific delivery channel with status tracking
- **Quality_Metrics**: Crash rate and CPU exception rate measurements for a release
- **DAU_Stats**: Daily Active Users statistics and trends for a release
- **ITGC_Status**: IT General Controls compliance status for a release
- **Platform**: Deployment target (iOS, Android, Desktop)

## Requirements

### Requirement 1: Mock Mode Configuration

**User Story:** As a developer, I want to enable mock mode via configuration, so that I can run the server without database setup.

#### Acceptance Criteria

1. THE Server SHALL read a USE_MOCK_DATA environment variable to determine whether to use mock mode
2. WHEN USE_MOCK_DATA is set to "true", THE Server SHALL initialize the Mock_Data_Provider instead of database connections
3. WHEN USE_MOCK_DATA is not set or set to "false", THE Server SHALL initialize database connections in Database_Mode
4. THE Server SHALL log the current mode (mock or database) during startup
5. WHEN running in Mock_Mode, THE Server SHALL not attempt to connect to a database

### Requirement 2: Generate Mock Releases

**User Story:** As a developer, I want realistic mock releases, so that I can demo the web application with representative data.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate at least 10 mock releases across all platforms
2. THE Mock_Data_Provider SHALL generate at least 3 iOS releases, 3 Android releases, and 3 Desktop releases
3. THE Mock_Data_Provider SHALL generate releases with status values of Upcoming, Current, and Production
4. THE Mock_Data_Provider SHALL generate releases in different stages including Release Branching, Final Release Candidate, Submit For App Store Review, Roll Out 1%, and Roll Out 100%
5. THE Mock_Data_Provider SHALL generate releases with semantic version numbers following the pattern MAJOR.MINOR.PATCH
6. THE Mock_Data_Provider SHALL generate releases with realistic branch names, repository URLs, and build numbers
7. THE Mock_Data_Provider SHALL generate releases with rollout percentages ranging from 0 to 100

### Requirement 3: Generate Mock Blockers

**User Story:** As a developer, I want mock blockers associated with releases, so that I can demo blocker management functionality.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate at least 2 blockers for releases in early stages
2. THE Mock_Data_Provider SHALL generate blockers with severity levels of critical, high, and medium
3. THE Mock_Data_Provider SHALL generate blockers with realistic titles and descriptions
4. THE Mock_Data_Provider SHALL generate some blockers with resolvedAt timestamps and some without
5. THE Mock_Data_Provider SHALL generate blockers with assignee names and issue URLs
6. THE Mock_Data_Provider SHALL generate unique blocker IDs for each blocker

### Requirement 4: Generate Mock Sign-Offs

**User Story:** As a developer, I want mock sign-offs for releases, so that I can demo approval workflow functionality.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate sign-offs for at least 3 squads per release
2. THE Mock_Data_Provider SHALL generate sign-offs with squad names including Backend, Frontend, Mobile, QA, and Security
3. THE Mock_Data_Provider SHALL generate some sign-offs with approved status true and some with false
4. WHEN a sign-off is approved, THE Mock_Data_Provider SHALL include approvedBy name, approvedAt timestamp, and comments
5. WHEN a sign-off is not approved, THE Mock_Data_Provider SHALL set approved to false without approvedBy or approvedAt

### Requirement 5: Generate Mock Distributions

**User Story:** As a developer, I want mock distribution channels, so that I can demo distribution tracking functionality.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate at least 2 distribution channels per release
2. THE Mock_Data_Provider SHALL generate distributions with channel names appropriate to the platform (App Store for iOS, Google Play for Android, Microsoft Store for Desktop)
3. THE Mock_Data_Provider SHALL generate distributions with status values of pending, submitted, approved, and live
4. THE Mock_Data_Provider SHALL generate distributions with realistic updatedAt timestamps
5. THE Mock_Data_Provider SHALL generate at least one distribution in live status for Production releases

### Requirement 6: Generate Mock Quality Metrics

**User Story:** As a developer, I want mock quality metrics, so that I can demo quality monitoring functionality.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate quality metrics for releases in Roll Out stages
2. THE Mock_Data_Provider SHALL generate crash rates between 0.0 and 5.0 percent
3. THE Mock_Data_Provider SHALL generate CPU exception rates between 0.0 and 3.0 percent
4. THE Mock_Data_Provider SHALL generate quality thresholds with crashRateThreshold of 2.0 and cpuExceptionRateThreshold of 1.5
5. THE Mock_Data_Provider SHALL generate some releases where metrics exceed thresholds and some where they do not
6. THE Mock_Data_Provider SHALL generate quality metrics with realistic collectedAt timestamps

### Requirement 7: Generate Mock DAU Statistics

**User Story:** As a developer, I want mock DAU statistics, so that I can demo user adoption tracking functionality.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate DAU statistics for releases in Roll Out stages
2. THE Mock_Data_Provider SHALL generate daily active user counts between 10000 and 1000000
3. THE Mock_Data_Provider SHALL generate trend arrays with at least 7 data points representing daily values
4. THE Mock_Data_Provider SHALL generate trends showing both increasing and decreasing patterns
5. THE Mock_Data_Provider SHALL generate DAU statistics with realistic collectedAt timestamps

### Requirement 8: Generate Mock ITGC Status

**User Story:** As a developer, I want mock ITGC compliance status, so that I can demo compliance tracking functionality.

#### Acceptance Criteria

1. THE Mock_Data_Provider SHALL generate ITGC status for all releases
2. THE Mock_Data_Provider SHALL generate some releases with compliant true and some with compliant false
3. THE Mock_Data_Provider SHALL generate rolloutComplete true for releases at Roll Out 100% stage
4. THE Mock_Data_Provider SHALL generate rolloutComplete false for releases not at Roll Out 100% stage
5. THE Mock_Data_Provider SHALL generate ITGC details text describing compliance status
6. THE Mock_Data_Provider SHALL generate ITGC status with realistic lastCheckedAt timestamps

### Requirement 9: Serve Mock Data via API Endpoints

**User Story:** As a developer, I want mock data served through existing API endpoints, so that the web application works without code changes.

#### Acceptance Criteria

1. WHEN running in Mock_Mode, THE Server SHALL serve mock data from GET /api/releases
2. WHEN running in Mock_Mode, THE Server SHALL serve mock release details from GET /api/releases/:id
3. WHEN running in Mock_Mode, THE Server SHALL serve mock blockers from GET /api/releases/:id/blockers
4. WHEN running in Mock_Mode, THE Server SHALL serve mock sign-offs from GET /api/releases/:id/signoffs
5. WHEN running in Mock_Mode, THE Server SHALL serve mock distributions from GET /api/releases/:id/distributions
6. WHEN running in Mock_Mode, THE Server SHALL serve mock quality metrics from GET /api/metrics/:releaseId/quality
7. WHEN running in Mock_Mode, THE Server SHALL serve mock DAU statistics from GET /api/metrics/:releaseId/dau
8. WHEN running in Mock_Mode, THE Server SHALL serve mock rollout percentage from GET /api/metrics/:releaseId/rollout
9. WHEN running in Mock_Mode, THE Server SHALL serve mock ITGC status from GET /api/releases/:id/itgc
10. WHEN running in Mock_Mode, THE Server SHALL serve mock release history from GET /api/releases/history

### Requirement 10: Support Mock Data Filtering

**User Story:** As a developer, I want mock data to respect query parameters, so that filtering functionality works correctly.

#### Acceptance Criteria

1. WHEN GET /api/releases receives a platform query parameter in Mock_Mode, THE Server SHALL return only releases matching that platform
2. WHEN GET /api/releases/history receives a status query parameter in Mock_Mode, THE Server SHALL return only releases matching that status
3. WHEN GET /api/releases/history receives startDate and endDate query parameters in Mock_Mode, THE Server SHALL return only releases within that date range
4. WHEN GET /api/releases receives no query parameters in Mock_Mode, THE Server SHALL return all mock releases

### Requirement 11: Support Mock Data Mutations

**User Story:** As a developer, I want to modify mock data through API endpoints, so that I can demo create and update functionality.

#### Acceptance Criteria

1. WHEN POST /api/releases is called in Mock_Mode, THE Server SHALL create a new mock release with the provided data and return it
2. WHEN POST /api/releases/:id/blockers is called in Mock_Mode, THE Server SHALL add a new blocker to the mock release and return it
3. WHEN PATCH /api/releases/:id/blockers/:blockerId/resolve is called in Mock_Mode, THE Server SHALL mark the mock blocker as resolved
4. WHEN POST /api/releases/:id/signoffs is called in Mock_Mode, THE Server SHALL add or update a sign-off for the mock release
5. WHEN PATCH /api/releases/:id/stage is called in Mock_Mode, THE Server SHALL update the mock release stage
6. WHEN PATCH /api/releases/:id/status is called in Mock_Mode, THE Server SHALL update the mock release status
7. WHEN PATCH /api/releases/:id/rollout is called in Mock_Mode, THE Server SHALL update the mock release rollout percentage
8. WHEN POST /api/releases/:id/distributions is called in Mock_Mode, THE Server SHALL add a distribution channel to the mock release
9. WHEN PATCH /api/releases/:id/distributions/:channel is called in Mock_Mode, THE Server SHALL update the mock distribution status
10. WHEN PATCH /api/releases/:id/itgc is called in Mock_Mode, THE Server SHALL update the mock ITGC status

### Requirement 12: Persist Mock Data Changes in Memory

**User Story:** As a developer, I want mock data changes to persist during the server session, so that I can interact with the data across multiple requests.

#### Acceptance Criteria

1. WHEN mock data is modified through API endpoints, THE Mock_Data_Provider SHALL store the changes in memory
2. WHEN subsequent GET requests are made in Mock_Mode, THE Server SHALL return the modified mock data
3. WHEN the Server restarts, THE Mock_Data_Provider SHALL regenerate fresh mock data
4. THE Mock_Data_Provider SHALL maintain referential integrity between releases and their associated data (blockers, sign-offs, distributions)

### Requirement 13: Mock Data Validation

**User Story:** As a developer, I want mock data mutations to be validated, so that invalid data is rejected consistently with database mode.

#### Acceptance Criteria

1. WHEN POST /api/releases is called with invalid data in Mock_Mode, THE Server SHALL return a 400 error with validation messages
2. WHEN PATCH requests are made with invalid data in Mock_Mode, THE Server SHALL return a 400 error with validation messages
3. WHEN requests reference non-existent release IDs in Mock_Mode, THE Server SHALL return a 404 error
4. WHEN requests reference non-existent blocker IDs in Mock_Mode, THE Server SHALL return a 404 error
5. THE Server SHALL apply the same validation rules in Mock_Mode as in Database_Mode

### Requirement 14: Health Check in Mock Mode

**User Story:** As a developer, I want health checks to work in mock mode, so that I can verify the server is running correctly.

#### Acceptance Criteria

1. WHEN GET /api/health is called in Mock_Mode, THE Server SHALL return a 200 status with healthy status
2. WHEN GET /api/health/detailed is called in Mock_Mode, THE Server SHALL return server uptime, memory usage, and version
3. THE Server SHALL include mode information (mock or database) in the detailed health response
4. THE Server SHALL not report database connection status in Mock_Mode health checks

### Requirement 15: Mock Data Documentation

**User Story:** As a developer, I want documentation for mock mode, so that I can understand how to enable and use it.

#### Acceptance Criteria

1. THE Server SHALL include mock mode configuration instructions in the README file
2. THE Server SHALL document the USE_MOCK_DATA environment variable in the .env.example file
3. THE Server SHALL provide example commands for starting the server in mock mode
4. THE Server SHALL document the differences between mock mode and database mode
5. THE Server SHALL document that mock data changes are not persisted across server restarts
