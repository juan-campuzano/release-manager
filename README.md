# Release Manager - Monorepo

A comprehensive dashboard application for monitoring and managing software releases across iOS, Android, and Desktop platforms.

## Project Structure

This is a monorepo containing two packages:

```
packages/
├── server/     # Express.js API server
└── web/        # React web application
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm 7+ (for workspaces support)

### Installation

Install dependencies for all packages:

```bash
npm install
```

### Development

Run both server and web application:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1 - Start the API server
npm run dev:server

# Terminal 2 - Start the web application
npm run dev
```

The API server will be available at `http://localhost:3001`  
The web application will be available at `http://localhost:3000`

### Build

Build all packages:

```bash
npm run build
```

Or build individually:

```bash
npm run build:server
npm run build:web
```

### Testing

Run tests for all packages:

```bash
npm test
```

Or test individually:

```bash
npm run test:server
npm run test:web
```

## Packages

### [@release-manager/server](./packages/server)

Express.js API server providing:
- RESTful API for release management
- Integration with GitHub and Azure DevOps
- WebSocket support for real-time updates
- Comprehensive error handling

[Read more →](./packages/server/README.md)

### [@release-manager/web](./packages/web)

React web application featuring:
- Dashboard for viewing active releases
- Release detail pages with comprehensive information
- Blocker and sign-off management
- Quality metrics and DAU statistics
- Responsive design and accessibility

[Read more →](./packages/web/README.md)

## Configuration

### Server Configuration

Create `packages/server/.env`:

```env
PORT=3001
GITHUB_TOKEN=your_github_token
AZURE_DEVOPS_TOKEN=your_azure_token
AZURE_DEVOPS_ORG=your_org
```

### Web Configuration

Create `packages/web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

## Architecture

### Server Architecture

```
packages/server/src/
├── server/          # Express server setup
├── application/     # Business logic layer
├── data/           # Data access layer
├── domain/         # Domain models
├── integration/    # External service integrations
└── common/         # Shared utilities
```

### Web Architecture

```
packages/web/src/
├── api/          # API client and HTTP utilities
├── components/   # Reusable UI components
├── contexts/     # React Context providers
├── hooks/        # Custom React hooks
├── pages/        # Page-level components
├── services/     # Business logic and data services
├── types/        # TypeScript type definitions
└── utils/        # Utility functions and helpers
```

## Features

### Release Management
- Create and track releases across multiple platforms
- Manage release stages and statuses
- Control rollout percentages
- Track blockers and issues
- Manage squad sign-offs

### Metrics & Monitoring
- Quality metrics (crash rate, CPU exceptions)
- Daily Active Users (DAU) statistics
- ITGC compliance tracking
- Server health monitoring

### Integrations
- GitHub repository integration
- Azure DevOps integration
- Real-time updates via WebSocket

## Development

### Workspace Commands

The monorepo uses npm workspaces. You can run commands in specific packages:

```bash
# Run command in server package
npm run <command> --workspace=packages/server

# Run command in web package
npm run <command> --workspace=packages/web

# Run command in all packages
npm run <command> --workspaces
```

### Adding Dependencies

```bash
# Add to server
npm install <package> --workspace=packages/server

# Add to web
npm install <package> --workspace=packages/web

# Add to root (dev dependencies)
npm install <package> -D
```

## Testing

Each package has its own test suite:

- **Server**: Jest with ts-jest
- **Web**: Jest with React Testing Library and fast-check for property-based testing

## Documentation

- [Server Documentation](./packages/server/README.md)
- [Web Documentation](./packages/web/README.md)
- [API Integration Guide](./README-INTEGRATION.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Usage Guide](./USAGE.md)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## Support

For issues and questions, please open an issue on GitHub.
