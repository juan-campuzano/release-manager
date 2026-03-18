# Implementation Plan: Server Mock Data

## Overview

This plan implements mock data functionality for the Release Manager Tool server, enabling developers to run and demo the application without database setup. The implementation follows a strategy pattern where MockDataProvider replaces database stores when USE_MOCK_DATA=true. The solution maintains full API compatibility, ensuring the web application works identically in both mock and database modes.

## Tasks

- [ ] 1. Set up mock data infrastructure
  - [x] 1.1 Create MockDataGenerator class with configuration
    - Implement MockDataGenerator in packages/server/src/data/mock-data-generator.ts
    - Add MockDataConfig interface with releaseCount, minBlockersPerRelease, signOffSquads, platforms
    - Implement generateReleases() method that returns Release[]
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 1.2 Write property test for semantic version format
    - **Property 1: Semantic Version Format**
    - **Validates: Requirements 2.5**
  
  - [ ]* 1.3 Write property test for rollout percentage range
    - **Property 2: Rollout Percentage Range**
    - **Validates: Requirements 2.7**

- [ ] 2. Implement release generation
  - [x] 2.1 Implement platform-specific release generation
    - Add generatePlatformReleases(platform: Platform) method
    - Generate 3-4 releases per platform with varied stages and statuses
    - Include version numbers, branch names, repository URLs, build numbers
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 2.2 Implement blocker generation
    - Add generateBlockers(stage: ReleaseStage) method
    - Generate 2+ blockers for early-stage releases with varied severity levels
    - Include titles, descriptions, assignees, issue URLs, some with resolvedAt
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.3 Write property test for unique blocker IDs
    - **Property 3: Unique Blocker IDs**
    - **Validates: Requirements 3.6**

- [ ] 3. Implement sign-offs and distributions
  - [x] 3.1 Implement sign-off generation
    - Add generateSignOffs() method
    - Generate 3+ sign-offs per release with mixed approval states
    - Include squad names, approvedBy, approvedAt, comments for approved sign-offs
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 3.2 Write property test for sign-off data consistency
    - **Property 4: Sign-Off Data Consistency**
    - **Validates: Requirements 4.4, 4.5**
  
  - [x] 3.3 Implement distribution generation
    - Add generateDistributions(platform: Platform, status: ReleaseStatus) method
    - Generate 2+ platform-appropriate channels with status progression
    - Ensure Production releases have at least one live distribution
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 3.4 Write property test for platform-appropriate channels
    - **Property 5: Platform-Appropriate Distribution Channels**
    - **Validates: Requirements 5.2**
  
  - [ ]* 3.5 Write property test for production releases having live distributions
    - **Property 6: Production Releases Have Live Distributions**
    - **Validates: Requirements 5.5**

- [ ] 4. Implement metrics and statistics generation
  - [x] 4.1 Implement quality metrics generation
    - Add generateQualityMetrics(stage: ReleaseStage) method
    - Generate metrics for rollout stages with crash rates (0.0-5.0) and CPU exception rates (0.0-3.0)
    - Include thresholds (crashRate 2.0, cpuException 1.5) and collectedAt timestamps
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 4.2 Write property test for rollout stages having quality metrics
    - **Property 7: Rollout Stages Have Quality Metrics**
    - **Validates: Requirements 6.1**
  
  - [ ]* 4.3 Write property test for quality metrics within valid ranges
    - **Property 8: Quality Metrics Within Valid Ranges**
    - **Validates: Requirements 6.2, 6.3**
  
  - [x] 4.4 Implement DAU statistics generation
    - Add generateDAUStats(stage: ReleaseStage) method
    - Generate DAU counts (10,000-1,000,000) with 7+ trend data points
    - Include both increasing and decreasing trends with collectedAt timestamps
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 4.5 Write property test for rollout stages having DAU statistics
    - **Property 9: Rollout Stages Have DAU Statistics**
    - **Validates: Requirements 7.1**
  
  - [ ]* 4.6 Write property test for DAU count range
    - **Property 10: DAU Count Range**
    - **Validates: Requirements 7.2**
  
  - [ ]* 4.7 Write property test for DAU trend length
    - **Property 11: DAU Trend Length**
    - **Validates: Requirements 7.3**

- [ ] 5. Implement ITGC status generation
  - [x] 5.1 Implement ITGC status generation
    - Add generateITGCStatus(stage: ReleaseStage) method
    - Generate mixed compliant states with rolloutComplete true only for Roll Out 100%
    - Include details text and lastCheckedAt timestamps
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 5.2 Write property test for all releases having ITGC status
    - **Property 12: All Releases Have ITGC Status**
    - **Validates: Requirements 8.1**
  
  - [ ]* 5.3 Write property test for rollout complete correctness
    - **Property 13: Rollout Complete Correctness**
    - **Validates: Requirements 8.3, 8.4**

- [x] 6. Checkpoint - Ensure mock data generation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement MockDataProvider class
  - [x] 7.1 Create MockDataProvider with DataProvider interface
    - Implement MockDataProvider in packages/server/src/data/mock-data-provider.ts
    - Add in-memory Map<string, Release> and Release[] history storage
    - Implement initializeData() method using MockDataGenerator
    - _Requirements: 9.1, 9.2, 12.1, 12.3_
  
  - [x] 7.2 Implement read operations
    - Implement findById(id: string) method
    - Implement findAll(filters?: ReleaseFilters) method with platform, status, date filtering
    - Implement getHistory(filters?: HistoryFilters) method
    - _Requirements: 9.1, 9.2, 9.10, 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 7.3 Write property test for platform filtering
    - **Property 14: Platform Filtering**
    - **Validates: Requirements 10.1**
  
  - [ ]* 7.4 Write property test for status filtering
    - **Property 15: Status Filtering**
    - **Validates: Requirements 10.2**
  
  - [ ]* 7.5 Write property test for date range filtering
    - **Property 16: Date Range Filtering**
    - **Validates: Requirements 10.3**

- [ ] 8. Implement MockDataProvider mutation operations
  - [x] 8.1 Implement release creation and updates
    - Implement create(release: Release) method with validation
    - Implement update(id: string, updates: Partial<Release>) method
    - Implement updateStage, updateStatus, updateRollout methods
    - _Requirements: 11.1, 11.5, 11.6, 11.7, 12.1, 12.2_
  
  - [ ]* 8.2 Write property test for release creation persistence
    - **Property 17: Release Creation Persistence**
    - **Validates: Requirements 11.1**
  
  - [ ]* 8.3 Write property test for stage update persistence
    - **Property 21: Stage Update Persistence**
    - **Validates: Requirements 11.5**
  
  - [ ]* 8.4 Write property test for status update persistence
    - **Property 22: Status Update Persistence**
    - **Validates: Requirements 11.6**
  
  - [ ]* 8.5 Write property test for rollout update persistence
    - **Property 23: Rollout Update Persistence**
    - **Validates: Requirements 11.7**
  
  - [x] 8.6 Implement blocker operations
    - Implement addBlocker(releaseId: string, blocker: Blocker) method
    - Implement resolveBlocker(releaseId: string, blockerId: string) method
    - _Requirements: 11.2, 11.3, 12.1, 12.2_
  
  - [ ]* 8.7 Write property test for blocker addition persistence
    - **Property 18: Blocker Addition Persistence**
    - **Validates: Requirements 11.2**
  
  - [ ]* 8.8 Write property test for blocker resolution
    - **Property 19: Blocker Resolution**
    - **Validates: Requirements 11.3**
  
  - [x] 8.9 Implement sign-off and distribution operations
    - Implement updateSignOff(releaseId: string, signOff: SignOff) method
    - Implement addDistribution(releaseId: string, distribution: Distribution) method
    - Implement updateDistribution(releaseId: string, channel: string, status: DistributionStatus) method
    - _Requirements: 11.4, 11.8, 11.9, 12.1, 12.2_
  
  - [ ]* 8.10 Write property test for sign-off update persistence
    - **Property 20: Sign-Off Update Persistence**
    - **Validates: Requirements 11.4**
  
  - [ ]* 8.11 Write property test for distribution addition persistence
    - **Property 24: Distribution Addition Persistence**
    - **Validates: Requirements 11.8**
  
  - [ ]* 8.12 Write property test for distribution status update persistence
    - **Property 25: Distribution Status Update Persistence**
    - **Validates: Requirements 11.9**
  
  - [x] 8.13 Implement ITGC operations
    - Implement updateITGC(releaseId: string, itgcStatus: ITGCStatus) method
    - _Requirements: 11.10, 12.1, 12.2_
  
  - [ ]* 8.14 Write property test for ITGC update persistence
    - **Property 26: ITGC Update Persistence**
    - **Validates: Requirements 11.10**
  
  - [ ]* 8.15 Write property test for in-memory mutation persistence
    - **Property 27: In-Memory Mutation Persistence**
    - **Validates: Requirements 12.1, 12.2**
  
  - [ ]* 8.16 Write property test for referential integrity
    - **Property 28: Referential Integrity**
    - **Validates: Requirements 12.4**

- [ ] 9. Implement validation and error handling
  - [x] 9.1 Add validation for all mutation operations
    - Validate release data (required fields, enum values, version format, rollout range)
    - Return Result<T, ApplicationError> with 400 errors for invalid data
    - Return 404 errors for non-existent release IDs and blocker IDs
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 9.2 Write property test for invalid data validation
    - **Property 29: Invalid Data Validation**
    - **Validates: Requirements 13.1, 13.2**
  
  - [ ]* 9.3 Write property test for non-existent resource errors
    - **Property 30: Non-Existent Resource Errors**
    - **Validates: Requirements 13.3, 13.4**
  
  - [ ]* 9.4 Write property test for validation consistency across modes
    - **Property 31: Validation Consistency Across Modes**
    - **Validates: Requirements 13.5**

- [x] 10. Checkpoint - Ensure MockDataProvider tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Update service initialization
  - [x] 11.1 Modify service initialization to support mock mode
    - Update packages/server/src/services/index.ts or initialization file
    - Read USE_MOCK_DATA environment variable
    - Instantiate MockDataProvider when USE_MOCK_DATA=true, otherwise use database stores
    - Log the active mode (mock or database) at startup
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 11.2 Write unit tests for service initialization
    - Test USE_MOCK_DATA="true" initializes MockDataProvider
    - Test USE_MOCK_DATA="false" or unset initializes database stores
    - Test startup logs indicate correct mode
    - Test no database connection attempted in mock mode
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 12. Update API endpoints for mock mode
  - [x] 12.1 Verify all GET endpoints work with MockDataProvider
    - Test GET /api/releases returns mock data
    - Test GET /api/releases/:id returns mock release details
    - Test GET /api/releases/:id/blockers, signoffs, distributions return mock data
    - Test GET /api/metrics/:releaseId/quality, dau, rollout return mock data
    - Test GET /api/releases/:id/itgc returns mock ITGC status
    - Test GET /api/releases/history returns mock history
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_
  
  - [x] 12.2 Verify all POST/PATCH endpoints work with MockDataProvider
    - Test POST /api/releases creates mock release
    - Test POST /api/releases/:id/blockers adds blocker
    - Test PATCH /api/releases/:id/blockers/:blockerId/resolve resolves blocker
    - Test POST /api/releases/:id/signoffs updates sign-off
    - Test PATCH /api/releases/:id/stage, status, rollout update mock data
    - Test POST /api/releases/:id/distributions adds distribution
    - Test PATCH /api/releases/:id/distributions/:channel updates distribution
    - Test PATCH /api/releases/:id/itgc updates ITGC status
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

- [ ] 13. Update health check endpoints
  - [x] 13.1 Update health check for mock mode
    - Modify GET /api/health to return 200 in mock mode
    - Modify GET /api/health/detailed to include mode information (mock or database)
    - Remove database connection status from health checks in mock mode
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 13.2 Write unit tests for health checks in mock mode
    - Test health endpoint returns healthy status in mock mode
    - Test detailed health includes mode information
    - Test no database status in mock mode health checks
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 14. Update documentation
  - [x] 14.1 Update README with mock mode instructions
    - Add section explaining USE_MOCK_DATA environment variable
    - Provide example commands for starting server in mock mode
    - Document differences between mock and database modes
    - Document that mock data changes are not persisted across restarts
    - _Requirements: 15.1, 15.3, 15.4, 15.5_
  
  - [x] 14.2 Update .env.example with USE_MOCK_DATA
    - Add USE_MOCK_DATA=false to .env.example with comments
    - _Requirements: 15.2_

- [ ] 15. Integration testing
  - [x] 15.1 Write end-to-end integration tests
    - Test server startup in mock mode → all endpoints work → create release → verify persistence → restart → verify fresh data
    - Test filtering releases by platform → update release → verify filtered results reflect update
    - Test create release with blockers → resolve blocker → verify blocker marked resolved
    - Test update release stage to rollout → verify quality metrics and DAU stats present
    - _Requirements: 1.1, 1.2, 9.1, 10.1, 11.1, 11.2, 11.3, 11.5, 12.1, 12.2, 12.3_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library with minimum 100 iterations
- Mock mode maintains full API compatibility with database mode
- In-memory data persists only during server session
- All validation rules are consistent between mock and database modes
