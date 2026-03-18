# Release Manager Tool - Quick Start Guide

## Overview

The Release Manager Tool is a dashboard application for monitoring and managing software releases across iOS, Android, and Desktop platforms. It integrates with GitHub and Azure DevOps to track releases through the entire pipeline.

## Prerequisites

- Node.js (v20+)
- npm
- GitHub Personal Access Token (for GitHub integration)
- Azure DevOps Personal Access Token (for Azure integration)

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=release_manager
DB_USER=root
DB_PASSWORD=
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=10000

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token

# Azure DevOps Configuration
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org
AZURE_DEVOPS_TOKEN=your_azure_personal_access_token

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 2. GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with these scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
3. Copy the token to your `.env` file

### 3. Azure DevOps Personal Access Token

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create a new token with these scopes:
   - Code (Read)
   - Build (Read)
   - Work Items (Read)
3. Copy the token to your `.env` file

## Running the Application

### Development Mode

Build and start the server:

```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

### Running Tests

Run all tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Running Integration Tests

Test the complete release lifecycle:

```bash
npm run test:integration
```

## Using the Application

### 1. Create a Release

```typescript
import { ReleaseManagerService } from './application/release-manager';
import { Platform } from './domain/types';

// Initialize the service (see src/server/services.ts for full setup)
const releaseManager = initializeServices().releaseManager;

// Create a release
const result = await releaseManager.createRelease({
  platform: Platform.iOS,
  version: '1.0.0',
  branchName: 'release/1.0.0',
  repositoryUrl: 'https://github.com/your-org/your-repo',
  sourceType: 'github',
  requiredSquads: ['mobile', 'qa', 'backend'],
  qualityThresholds: {
    crashRateThreshold: 1.0,
    cpuExceptionRateThreshold: 0.5
  },
  rolloutStages: [1, 10, 50, 100]
});

if (result.success) {
  console.log('Release created:', result.value.id);
}
```

### 2. Track Blockers

```typescript
// Add a blocker
await releaseManager.addBlocker(releaseId, {
  title: 'Critical bug in login',
  description: 'Users cannot log in on iOS 17',
  severity: 'critical',
  assignee: 'john.doe@example.com'
});

// Resolve a blocker
await releaseManager.resolveBlocker(releaseId, blockerId);
```

### 3. Manage Sign-Offs

```typescript
// Record squad sign-off
await releaseManager.recordSignOff(
  releaseId,
  'mobile',
  'mobile-lead@example.com',
  'Approved by mobile team'
);

// Check sign-off status
const status = await releaseManager.getSignOffStatus(releaseId);
console.log('All approved:', status.value.allApproved);
```

### 4. Progress Through Stages

```typescript
import { ReleaseStage } from './domain/types';

// Move to next stage
await releaseManager.updateReleaseStage(
  releaseId,
  ReleaseStage.FinalReleaseCandidate
);

// Update rollout percentage
await releaseManager.updateRolloutPercentage(releaseId, 50);
```

### 5. View Releases

```typescript
// Get all active releases
const releases = await releaseManager.getActiveReleases();

// Get releases for specific platform
const iOSReleases = await releaseManager.getActiveReleases(Platform.iOS);

// Get single release
const release = await releaseManager.getRelease(releaseId);
```

## API Endpoints

Once the server is running, you can access these endpoints:

### Health Check
```
GET /health
GET /health/detailed
```

### Releases
```
GET /api/releases              # Get all active releases
GET /api/releases/:id          # Get specific release
POST /api/releases             # Create new release
PUT /api/releases/:id/stage    # Update release stage
PUT /api/releases/:id/rollout  # Update rollout percentage
```

### Blockers
```
GET /api/releases/:id/blockers           # Get all blockers
POST /api/releases/:id/blockers          # Add blocker
PUT /api/releases/:id/blockers/:blockerId # Resolve blocker
```

### Sign-Offs
```
GET /api/releases/:id/signoffs           # Get sign-off status
POST /api/releases/:id/signoffs          # Record sign-off
```

### Metrics
```
GET /api/releases/:id/metrics            # Get quality metrics
GET /api/releases/:id/dau                # Get DAU statistics
```

## Architecture

The application follows a layered architecture:

- **Presentation Layer**: React components for the dashboard UI
- **Application Layer**: Business logic (ReleaseManager, StateManager, MetricsAggregator)
- **Integration Layer**: External API adapters (GitHub, Azure DevOps, Metrics)
- **Data Layer**: Storage and caching (ReleaseStore, HistoryStore, Cache)

## Key Features

✅ Multi-platform support (iOS, Android, Desktop)
✅ GitHub and Azure DevOps integration
✅ Real-time polling (60s for releases, 5min for external data)
✅ Quality metrics monitoring with thresholds
✅ Blocker tracking and resolution
✅ Squad sign-off management
✅ Rollout percentage control
✅ Historical data access
✅ ITGC compliance tracking
✅ Distribution channel management
✅ Circuit breaker pattern for graceful degradation
✅ Optimistic locking for concurrency control

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Test Failures

If tests fail:

```bash
# Run tests in verbose mode
npm test -- --verbose

# Run specific test file
npm test -- src/application/release-manager.test.ts
```

### Connection Issues

- Verify your GitHub token has the correct scopes
- Verify your Azure DevOps token has the correct permissions
- Check that your `.env` file is properly configured
- Ensure the database connection settings are correct

## Next Steps

1. Configure your `.env` file with actual credentials
2. Start the server: `npm run build && npm start`
3. Create your first release using the API or integration test
4. Access the dashboard at `http://localhost:3000`
5. Set up polling for your GitHub repositories and Azure pipelines

## Support

For issues or questions:
- Check the requirements document: `.kiro/specs/release-manager-tool/requirements.md`
- Review the design document: `.kiro/specs/release-manager-tool/design.md`
- See the implementation tasks: `.kiro/specs/release-manager-tool/tasks.md`
