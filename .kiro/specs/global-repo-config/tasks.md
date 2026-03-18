# Implementation Plan: Global Repository Configuration

## Overview

Add repository-level default configurations that can be reused when creating releases. Implementation starts with the server domain types and store, then API routes, then web frontend service and pages, and finally wiring the config selector into the existing CreateReleaseForm.

## Tasks

- [x] 1. Define RepositoryConfig domain type and store
  - [x] 1.1 Add RepositoryConfig interface to server domain types
    - Add `RepositoryConfig` interface to `packages/server/src/domain/types.ts` with fields: id, name, repositoryUrl, sourceType, requiredSquads, qualityThresholds, rolloutStages, ciPipelineId?, analyticsProjectId?, createdAt, updatedAt
    - Export the new type from `packages/server/src/domain/index.ts`
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create ConfigStore with in-memory storage
    - Create `packages/server/src/data/config-store.ts` with a `ConfigStore` class
    - Implement `create()`, `getAll()`, `getById()`, `update()`, `delete()` methods returning `Result<T, ApplicationError>`
    - Use an in-memory `Map<string, RepositoryConfig>` for storage
    - Enforce unique name constraint on create and update (throw `ConflictError` for duplicates)
    - Generate UUID for `id`, set `createdAt`/`updatedAt` timestamps
    - Return `NotFoundError` for getById/update/delete with non-existent ID
    - Export from `packages/server/src/data/index.ts`
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 4.2, 4.3_

  - [x] 1.3 Add repository_configs table to schema.sql
    - Add `CREATE TABLE IF NOT EXISTS repository_configs` to `packages/server/src/data/schema.sql` with columns: id, name (UNIQUE), repository_url, source_type, required_squads (JSON), quality_thresholds (JSON), rollout_stages (JSON), ci_pipeline_id, analytics_project_id, created_at, updated_at
    - _Requirements: 1.2_

- [x] 2. Extend ConfigParser with RepositoryConfig validation and parsing
  - [x] 2.1 Add validateRepositoryConfig method to ConfigParser
    - Add `validateRepositoryConfig(config: Partial<RepositoryConfig>): ValidationResult` to the `ConfigParser` interface and `JSONConfigParser` class in `packages/server/src/application/config-parser.ts`
    - Validate: name (non-empty, max 100 chars), repositoryUrl (well-formed URL), sourceType ("github" or "azure"), requiredSquads (non-empty array of non-empty strings), crashRateThreshold and cpuExceptionRateThreshold (numbers 0-100), rolloutStages (non-empty array of numbers 0-100), optional fields (non-empty strings if present)
    - _Requirements: 1.4, 1.5, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 2.2 Add parseRepositoryConfig and formatRepositoryConfig methods
    - Add `parseRepositoryConfig(json: string): Result<RepositoryConfig, ParseError>` and `formatRepositoryConfig(config: RepositoryConfig): string` to the `ConfigParser` interface and `JSONConfigParser` class
    - `parseRepositoryConfig` should parse JSON, validate, and return the config or a ParseError
    - `formatRepositoryConfig` should serialize to JSON with 2-space indentation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.3 Write property test for parse/format round trip
    - Create `packages/server/src/application/config-parser.repo-config.property.test.ts`
    - Use `fast-check` to generate valid RepositoryConfig objects
    - Assert `parseRepositoryConfig(formatRepositoryConfig(config))` produces an equivalent object
    - Minimum 100 iterations
    - **Property 10: Parse/format round trip**
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [ ]* 2.4 Write property test for validation correctness
    - In the same test file, use `fast-check` to generate both valid and invalid RepositoryConfig objects
    - Assert `validateRepositoryConfig` returns valid=true for valid configs and valid=false with non-empty errors for invalid configs
    - Test edge cases: empty name, name > 100 chars, invalid URL, invalid sourceType, empty squads, thresholds outside [0,100], empty rollout stages, stages outside [0,100]
    - Minimum 100 iterations
    - **Property 3: Validation accepts valid configs and rejects invalid ones**
    - **Validates: Requirements 1.5, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

- [x] 3. Create Config API routes
  - [x] 3.1 Create config routes file
    - Create `packages/server/src/routes/configs.ts` with `createConfigRoutes(configStore, configParser)` function
    - Implement POST `/` (create), GET `/` (list all), GET `/:id` (get by id), PUT `/:id` (update), DELETE `/:id` (delete)
    - POST: validate with configParser, create in store, return 201
    - GET `/`: return all configs, 200
    - GET `/:id`: return config or 404
    - PUT `/:id`: validate, update in store, return 200 or 400/404/409
    - DELETE `/:id`: delete from store, return 200 or 404
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3_

  - [x] 3.2 Add ConflictError handling to error-handler middleware
    - Import `ConflictError` in `packages/server/src/middleware/error-handler.ts`
    - Add a handler that returns 409 status with `{ error: "Conflict", message: error.message }`
    - _Requirements: 1.3, 3.3_

  - [x] 3.3 Register config routes in server.ts
    - Import `createConfigRoutes` in `packages/server/src/server.ts`
    - Import `ConfigStore` and `JSONConfigParser`
    - Instantiate `ConfigStore` and pass it with the config parser to `createConfigRoutes`
    - Mount at `/api/configs`
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ]* 3.4 Write property tests for ConfigStore CRUD operations
    - Create `packages/server/src/data/config-store.property.test.ts`
    - Use `fast-check` to generate valid RepositoryConfig data
    - Test Property 1 (create-retrieve round trip), Property 2 (unique name enforcement), Property 4 (get all), Property 5 (update persists), Property 6 (delete removes)
    - Minimum 100 iterations per property
    - **Property 1: Create-retrieve round trip**
    - **Property 2: Unique name enforcement**
    - **Property 4: Get all returns all created configs**
    - **Property 5: Update persists changes**
    - **Property 6: Delete removes config**
    - **Validates: Requirements 1.2, 1.3, 2.1, 2.2, 3.2, 3.3, 4.2**

- [x] 4. Add RepositoryConfig types and ConfigService to web frontend
  - [x] 4.1 Add RepositoryConfig type to web types
    - Add `RepositoryConfig` interface to `packages/web/src/types/index.ts` with fields: id, name, repositoryUrl, sourceType, requiredSquads, qualityThresholds, rolloutStages, ciPipelineId?, analyticsProjectId?, createdAt (string), updatedAt (string)
    - _Requirements: 5.1, 6.1_

  - [x] 4.2 Create ConfigService
    - Create `packages/web/src/services/ConfigService.ts` with a `ConfigService` class
    - Constructor takes `APIClient`
    - Implement `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)` methods calling `/api/configs` endpoints
    - Export from `packages/web/src/services/index.ts`
    - _Requirements: 5.1, 6.1, 6.2, 6.3, 6.4_

  - [x] 4.3 Register ConfigService in ServicesContext
    - Add `configService: ConfigService` to the `Services` interface in `packages/web/src/contexts/ServicesContext.tsx`
    - Instantiate `ConfigService` in the `ServicesProvider` and include it in the context value
    - _Requirements: 5.1, 6.1_

- [x] 5. Create ConfigManagementPage
  - [x] 5.1 Create ConfigManagementPage component
    - Create `packages/web/src/pages/ConfigManagementPage.tsx` and `ConfigManagementPage.module.css`
    - Display a table of all configs (name, repositoryUrl, sourceType) with edit and delete buttons per row
    - Include a "Create New Configuration" button that shows/hides a form
    - Form includes fields for: name, repositoryUrl, sourceType (dropdown), requiredSquads (comma-separated input), crashRateThreshold, cpuExceptionRateThreshold, rolloutStages (comma-separated input), ciPipelineId (optional), analyticsProjectId (optional)
    - Edit mode: pre-fill form with current config values
    - Delete: show confirmation dialog before calling delete
    - Show success/error notifications via `useNotification()` context
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.2 Add route and navigation link for ConfigManagementPage
    - Add lazy import and route `/configs` in `packages/web/src/App.tsx` (protected, with Layout)
    - Add "Repo Configs" NavLink in `packages/web/src/components/Navigation.tsx`
    - Export from `packages/web/src/pages/index.ts`
    - _Requirements: 6.1_

- [x] 6. Integrate config selector into CreateReleaseForm
  - [x] 6.1 Add config dropdown to CreateReleaseForm
    - Modify `packages/web/src/components/CreateReleaseForm.tsx`
    - Fetch all configs via `useServices().configService.getAll()` on mount (use `useEffect`)
    - Add a `<select>` dropdown at the top of the form with "None (manual entry)" as default and all config names as options
    - On selection change, call `setValue()` from react-hook-form to populate: repositoryUrl, sourceType, requiredSquads, crashRateThreshold, cpuExceptionRateThreshold, rolloutStages
    - If selected config has ciPipelineId or analyticsProjectId, populate those fields too (add them to the form if not already present)
    - When "None" is selected, reset fields to default values
    - All fields remain editable after auto-population
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Write unit tests
  - [x] 7.1 Write unit tests for ConfigStore
    - Create `packages/server/src/data/config-store.test.ts`
    - Test: create returns config with id, getAll returns empty list initially, getById returns not-found for missing id, duplicate name returns conflict, update non-existent returns not-found, delete non-existent returns not-found
    - _Requirements: 1.2, 1.3, 2.3, 2.4, 3.3, 4.3_

  - [x] 7.2 Write unit tests for validateRepositoryConfig
    - Create or extend `packages/server/src/application/config-parser.test.ts`
    - Test specific examples: valid config passes, missing name fails, name > 100 chars fails, invalid URL fails, invalid sourceType fails, empty squads fails, thresholds out of range fail, empty rollout stages fails, stages out of range fail
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.3 Write unit tests for config routes
    - Create `packages/server/src/routes/configs.test.ts`
    - Test each endpoint with mocked ConfigStore: POST 201, POST 400 (validation), POST 409 (duplicate), GET 200, GET 404, PUT 200, PUT 400, PUT 404, PUT 409, DELETE 200, DELETE 404
    - _Requirements: 1.1, 1.3, 1.5, 2.1, 2.4, 3.1, 3.3, 3.5, 4.1, 4.3_

  - [x] 7.4 Write unit tests for CreateReleaseForm config integration
    - Extend `packages/web/src/components/CreateReleaseForm.test.tsx`
    - Test: dropdown renders with config names, selecting a config populates fields, selecting "None" resets fields, fields remain editable after auto-population
    - _Requirements: 5.1, 5.2, 5.5, 5.6_
