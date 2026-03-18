# Getting Started with Release Manager Monorepo

This guide will help you get the Release Manager application up and running in the new monorepo structure.

## Prerequisites

- Node.js 20 or higher
- npm 7 or higher (for workspaces support)
- Git

## Initial Setup

### 1. Install Dependencies

From the root directory, install all dependencies for both packages:

```bash
npm install
```

This will install dependencies for:
- Root workspace
- Server package (`packages/server`)
- Web package (`packages/web`)

### 2. Configure Environment Variables

#### Server Configuration

Create `packages/server/.env`:

```bash
cd packages/server
cp .env.example .env
```

Edit `packages/server/.env`:

```env
PORT=3001
GITHUB_TOKEN=your_github_personal_access_token
AZURE_DEVOPS_TOKEN=your_azure_devops_token
AZURE_DEVOPS_ORG=your_organization_name
```

#### Web Configuration

Create `packages/web/.env`:

```bash
cd packages/web
cp .env.example .env
```

Edit `packages/web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Start Development Servers

From the root directory:

```bash
# Option 1: Start both server and web together
npm run dev:all

# Option 2: Start them separately in different terminals
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev
```

### 4. Access the Application

- **Web Application**: http://localhost:3000
- **API Server**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## Development Workflow

### Running Commands

```bash
# Development
npm run dev              # Start web app
npm run dev:server       # Start API server
npm run dev:all          # Start both

# Building
npm run build            # Build all packages
npm run build:server     # Build server only
npm run build:web        # Build web only

# Testing
npm test                 # Test all packages
npm run test:server      # Test server only
npm run test:web         # Test web only
```

### Adding Dependencies

```bash
# Add to server
npm install <package-name> --workspace=packages/server

# Add to web
npm install <package-name> --workspace=packages/web
```

## Next Steps

1. Read the [README](./README.md) for overview
2. Check [Server Documentation](./packages/server/README.md)
3. Check [Web Documentation](./packages/web/README.md)
4. Continue with spec implementation in `.kiro/specs/release-web-app/tasks.md`

Happy coding! 🚀
