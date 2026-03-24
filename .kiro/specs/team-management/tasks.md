# Implementation Plan: Team Management

## Overview

Add team management to the Release Manager app: domain types, data store, REST API routes, React page with forms, and navigation integration. Implementation follows existing codebase patterns (ConfigStore, createConfigRoutes, ServicesContext).

## Tasks

- [ ] 1. Define domain types and database migration
  - [ ] 1.1 Add TeamSummary, TeamDetail, and Member interfaces to `packages/server/src/domain/types.ts`
    - Export `TeamSummary` (id, name, memberCount), `TeamDetail` (id, name, members, createdAt, updatedAt), and `Member` (id, name, email?, createdAt) interfaces
    - _Requirements: 1.3, 3.3, 4.3_

  - [ ] 1.2 Create database migration `packages/server/src/data/migrations/002_teams_schema.ts`
    - Create `teams` table with id (TEXT PK), name (TEXT NOT NULL UNIQUE), created_at, updated_at
    - Create `team_members` table with id (TEXT PK), team_id (TEXT NOT NULL FK), name (TEXT NOT NULL), email (TEXT), created_at, with ON DELETE CASCADE
    - Follow the pattern from `001_initial_schema.ts`
    - _Requirements: 7.1, 7.3_

- [ ] 2. Implement TeamStore data layer
  - [ ] 2.1 Create `packages/server/src/data/team-store.ts` implementing the TeamStore class
    - Model after `ConfigStore` pattern with `Result` return types
    - Implement `getAll()` returning `TeamSummary[]` with member counts
    - Implement `getById(id)` returning `TeamDetail` with full member list
    - Implement `create(name)` with unique name enforcement, returning `ConflictError` on duplicate
    - Implement `delete(id)` removing team and all members, returning `NotFoundError` if missing
    - Implement `addMember(teamId, name, email?)` returning `NotFoundError` if team missing
    - Implement `removeMember(teamId, memberId)` returning `NotFoundError` if team or member missing
    - _Requirements: 1.3, 2.4, 2.5, 3.3, 4.3, 4.4, 5.2, 5.3, 6.3, 6.4, 7.1, 7.3_

  - [ ]* 2.2 Write property test: Team creation returns valid object (Property 3)
    - **Property 3: Creating a team returns a valid object with unique ID and timestamps**
    - **Validates: Requirements 2.4**

  - [ ]* 2.3 Write property test: Duplicate team name returns ConflictError (Property 4)
    - **Property 4: Duplicate team name returns 409 Conflict**
    - **Validates: Requirements 2.5, 7.3**

  - [ ]* 2.4 Write property test: Team detail includes all members (Property 5)
    - **Property 5: Team detail includes all members**
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 2.5 Write property test: Adding a member increases member list by one (Property 7)
    - **Property 7: Adding a member increases the member list by one**
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 2.6 Write property test: Removing a member decreases member list by one (Property 8)
    - **Property 8: Removing a member decreases the member list by one**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 2.7 Write property test: Deleting a team removes it and all members (Property 9)
    - **Property 9: Deleting a team removes it and all its members**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 2.8 Write property test: Operations on non-existent resources return NotFoundError (Property 6)
    - **Property 6: Operations on non-existent resources return 404**
    - **Validates: Requirements 3.4, 4.4, 5.3, 6.4**

  - [ ]* 2.9 Write property test: Team data round-trip through store (Property 10)
    - **Property 10: Team data round-trip through store**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 3. Implement Team API routes
  - [ ] 3.1 Create `packages/server/src/routes/teams.ts` with `createTeamRoutes(teamStore)` function
    - GET `/` — list all teams, return 200 with `{ teams: TeamSummary[] }`
    - POST `/` — create team, validate non-empty name, return 201 with `{ team: TeamDetail }`, 400 on empty name, 409 on duplicate
    - GET `/:id` — get team detail, return 200 with `{ team: TeamDetail }`, 404 if not found
    - DELETE `/:id` — delete team, return 204, 404 if not found
    - POST `/:id/members` — add member, validate non-empty name, return 201 with `{ member: Member }`, 400 on empty name, 404 if team not found
    - DELETE `/:id/members/:memberId` — remove member, return 204, 404 if not found
    - Follow the pattern from `createConfigRoutes` in `packages/server/src/routes/configs.ts`
    - _Requirements: 1.3, 2.4, 2.5, 3.3, 3.4, 4.3, 4.4, 5.2, 5.3, 6.3, 6.4_

  - [ ]* 3.2 Write unit tests for team routes in `packages/server/src/routes/teams.test.ts`
    - Test each endpoint for success and error cases
    - Test validation of empty/whitespace names returns 400
    - _Requirements: 2.2, 4.2_

- [ ] 4. Wire TeamStore and routes into the server
  - [ ] 4.1 Register TeamStore in `packages/server/src/services.ts`
    - Add `teamStore: TeamStore` to the `Services` interface
    - Instantiate `TeamStore` in `initializeServices()` and include in returned object
    - _Requirements: 7.1_

  - [ ] 4.2 Mount team routes in `packages/server/src/server.ts`
    - Import `createTeamRoutes` and mount at `/api/teams`
    - Pass `services.teamStore` to the route factory
    - _Requirements: 1.3, 2.4, 3.3, 4.3, 5.2, 6.3_

- [ ] 5. Checkpoint
  - Ensure all server-side tests pass, ask the user if questions arise.

- [ ] 6. Create frontend types and TeamService
  - [ ] 6.1 Create `packages/web/src/types/team.ts` with TeamSummary, TeamDetail, and Member interfaces
    - Mirror the server domain types for use in the frontend
    - _Requirements: 1.3, 3.3, 4.3_

  - [ ] 6.2 Create `packages/web/src/services/TeamService.ts`
    - Implement `getTeams()`, `getTeam(id)`, `createTeam(name)`, `deleteTeam(id)`, `addMember(teamId, name, email?)`, `removeMember(teamId, memberId)`
    - Use the existing `APIClient` pattern from other services (e.g., `ConfigService`)
    - _Requirements: 1.3, 2.4, 3.3, 4.3, 5.2, 6.3_

  - [ ] 6.3 Register TeamService in `packages/web/src/contexts/ServicesContext.tsx`
    - Add `teamService: TeamService` to the `Services` interface
    - Instantiate and provide in `ServicesProvider`
    - _Requirements: 1.3_

- [ ] 7. Build TeamManagementPage and form components
  - [ ] 7.1 Create `packages/web/src/components/TeamForm.tsx` and `TeamForm.module.css`
    - Controlled input for team name + submit button
    - Validate non-empty name before calling `onSubmit`
    - Display inline validation errors and API errors (e.g., duplicate name from 409)
    - Clear input after successful submission
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 7.2 Create `packages/web/src/components/MemberForm.tsx` and `MemberForm.module.css`
    - Controlled inputs for member name (required) and email (optional) + submit button
    - Validate non-empty name before calling `onSubmit`
    - Clear inputs after successful submission
    - _Requirements: 4.1, 4.2_

  - [ ] 7.3 Create `packages/web/src/pages/TeamManagementPage.tsx` and `TeamManagementPage.module.css`
    - Two-panel layout: left panel with team list + TeamForm, right panel with selected team detail + MemberForm
    - State: teams, selectedTeamId, selectedTeam, isLoading, error
    - Fetch team list on mount; fetch team detail on selection
    - Create/delete team, add/remove member with optimistic UI updates
    - Empty state messages for no teams and no members
    - Delete team with `window.confirm()` confirmation dialog
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 4.1, 5.1, 6.1, 6.2_

  - [ ]* 7.4 Write property test: Team list displays all teams with name and member count (Property 1)
    - **Property 1: Team list displays all teams with name and member count**
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 7.5 Write property test: Whitespace-only names are rejected by forms (Property 2)
    - **Property 2: Whitespace-only names are rejected by forms**
    - **Validates: Requirements 2.2, 4.2**

  - [ ]* 7.6 Write unit tests for TeamManagementPage, TeamForm, and MemberForm
    - Test empty state messages, confirmation dialog on delete, input clearing after submit
    - _Requirements: 1.2, 3.2, 6.1_

- [ ] 8. Integrate navigation and routing
  - [ ] 8.1 Add "Teams" NavLink to `packages/web/src/components/Navigation.tsx`
    - Add NavLink to `/teams` with label "Teams", following the existing NavLink pattern
    - _Requirements: 8.1, 8.2_

  - [ ] 8.2 Add `/teams` route to `packages/web/src/App.tsx`
    - Lazy-load `TeamManagementPage`, wrap in `ProtectedRoute` and `Layout`, matching existing route pattern
    - _Requirements: 8.1_

- [ ] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
