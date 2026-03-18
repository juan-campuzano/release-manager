# How to Use the Release Manager Tool

## Quick Start (3 Steps)

### Step 1: Build the Application

```bash
npm run build
```

This compiles the TypeScript code to JavaScript in the `dist/` folder.

### Step 2: Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

You should see:
```
[INFO] HTTP server listening on port 3000
[INFO] WebSocket server listening on port 3001
```

### Step 3: Test the API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-10T...",
  "uptime": 5.123
}
```

## What You Can Do

### 1. Create a Release

```bash
curl -X POST http://localhost:3000/api/releases \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "iOS",
    "version": "1.0.0",
    "branchName": "release/1.0.0",
    "repositoryUrl": "https://github.com/your-org/your-repo",
    "sourceType": "github",
    "requiredSquads": ["mobile", "qa"],
    "qualityThresholds": {
      "crashRateThreshold": 1.0,
      "cpuExceptionRateThreshold": 0.5
    },
    "rolloutStages": [1, 10, 50, 100]
  }'
```

### 2. Get All Releases

```bash
curl http://localhost:3000/api/releases
```

### 3. Get a Specific Release

```bash
curl http://localhost:3000/api/releases/{releaseId}
```

### 4. Add a Blocker

```bash
curl -X POST http://localhost:3000/api/releases/{releaseId}/blockers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical bug",
    "description": "Login fails on iOS 17",
    "severity": "critical"
  }'
```

### 5. Record Squad Sign-Off

```bash
curl -X POST http://localhost:3000/api/releases/{releaseId}/signoffs \
  -H "Content-Type: application/json" \
  -d '{
    "squad": "mobile",
    "approvedBy": "john@example.com",
    "comments": "Approved"
  }'
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration test
npm run test:integration
```

## Common Issues

### "Cannot find module" errors

Run:
```bash
npm install
npm run build
```

### Port already in use

Change the port in `.env`:
```
PORT=3001
```

Or kill the process using port 3000:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### TypeScript errors

Make sure you've built the project:
```bash
npm run build
```

## Project Structure

```
release-manager-tool/
├── src/
│   ├── application/      # Business logic
│   ├── data/            # Database and storage
│   ├── domain/          # Core types and models
│   ├── integration/     # External API adapters
│   ├── presentation/    # React UI components
│   ├── server/          # Express API server
│   └── client/          # React app entry point
├── dist/                # Compiled JavaScript (after build)
├── tests/               # Test files
└── package.json         # Dependencies and scripts
```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the server (requires build first)
- `npm run dev` - Build and start in one command
- `npm test` - Run all tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:integration` - Run integration tests
- `npm run lint` - Check code style

## Next Steps

1. ✅ Build the project: `npm run build`
2. ✅ Start the server: `npm start`
3. ✅ Test the API: `curl http://localhost:3000/api/health`
4. 📖 Read QUICKSTART.md for detailed configuration
5. 🚀 Create your first release via the API

## Need Help?

- Check `QUICKSTART.md` for detailed setup
- Review `.kiro/specs/release-manager-tool/requirements.md` for features
- Run `npm test` to verify everything works
