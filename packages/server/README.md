# Release Manager - Server

Express.js API server for the Release Manager application.

## Features

- RESTful API for release management
- Integration with GitHub and Azure DevOps
- WebSocket support for real-time updates
- Comprehensive error handling
- CORS and security middleware (Helmet)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
GITHUB_TOKEN=your_github_token
AZURE_DEVOPS_TOKEN=your_azure_token
AZURE_DEVOPS_ORG=your_org
USE_MOCK_DATA=false
```

## Mock Mode

The server supports a mock data mode that allows you to run and demo the application without requiring database setup. This is useful for development, testing, and demonstrations.

### Enabling Mock Mode

Set the `USE_MOCK_DATA` environment variable to `true`:

```bash
# Using environment variable
USE_MOCK_DATA=true npm run dev

# Or in your .env file
USE_MOCK_DATA=true
```

### Mock Mode vs Database Mode

| Feature | Mock Mode | Database Mode |
|---------|-----------|---------------|
| Database Required | No | Yes |
| Data Persistence | In-memory only (lost on restart) | Persistent in database |
| Setup Time | Instant | Requires database configuration |
| Data Volume | ~10 realistic releases | Production data |
| Best For | Development, demos, testing | Production, staging |

### Mock Data Characteristics

When running in mock mode, the server generates realistic release management data including:

- 10+ releases across iOS, Android, and Desktop platforms
- Releases in various stages (Release Branching, Final RC, App Store Review, Rollout stages)
- Blockers with different severity levels (critical, high, medium)
- Sign-offs from multiple squads (Backend, Frontend, Mobile, QA, Security)
- Distribution channels appropriate to each platform
- Quality metrics (crash rates, CPU exception rates)
- DAU (Daily Active Users) statistics with trends
- ITGC compliance status

### Working with Mock Data

All API endpoints work identically in both modes:

```bash
# Get all releases
curl http://localhost:3001/api/releases

# Create a new release
curl -X POST http://localhost:3001/api/releases \
  -H "Content-Type: application/json" \
  -d '{"platform":"iOS","version":"2.6.0",...}'

# Update release stage
curl -X PATCH http://localhost:3001/api/releases/:id/stage \
  -H "Content-Type: application/json" \
  -d '{"stage":"Roll Out 1%"}'
```

### Important Notes

- **Data is not persisted**: Changes made to mock data (creating releases, updating stages, etc.) are stored in memory and will be lost when the server restarts
- **Fresh data on restart**: Each time the server starts in mock mode, it generates a fresh set of mock data
- **Full API compatibility**: The web application works identically in both modes without code changes
- **Validation applies**: The same validation rules apply in mock mode as in database mode

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Start Production

```bash
npm start
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

## API Endpoints

### Releases

- `GET /api/releases` - Get active releases (optional `?platform=iOS|Android|Desktop`)
- `GET /api/releases/:id` - Get release by ID
- `POST /api/releases` - Create new release
- `PATCH /api/releases/:id/stage` - Update release stage
- `PATCH /api/releases/:id/status` - Update release status
- `PATCH /api/releases/:id/rollout` - Update rollout percentage

### Blockers

- `GET /api/releases/:id/blockers` - Get release blockers
- `POST /api/releases/:id/blockers` - Add blocker
- `PATCH /api/releases/:id/blockers/:blockerId/resolve` - Resolve blocker

### Sign-offs

- `GET /api/releases/:id/signoffs` - Get sign-offs
- `POST /api/releases/:id/signoffs` - Record sign-off

### Distributions

- `GET /api/releases/:id/distributions` - Get distributions
- `POST /api/releases/:id/distributions` - Add distribution
- `PATCH /api/releases/:id/distributions/:channel` - Update distribution status

### Metrics

- `GET /api/metrics/:releaseId/quality` - Get quality metrics
- `GET /api/metrics/:releaseId/dau` - Get DAU statistics
- `GET /api/metrics/:releaseId/rollout` - Get rollout percentage

### ITGC

- `GET /api/releases/:id/itgc` - Get ITGC status
- `PATCH /api/releases/:id/itgc` - Update ITGC status

### History

- `GET /api/releases/history` - Get release history (supports filters)

### Health

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health information

## Architecture

```
src/
├── server/          # Express server setup
├── application/     # Business logic layer
├── data/           # Data access layer
├── domain/         # Domain models
├── integration/    # External service integrations
└── common/         # Shared utilities
```

## License

MIT
