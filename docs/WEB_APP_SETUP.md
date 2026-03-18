# Web Application Setup

This document describes the Vite-based React web application setup for the Release Manager Tool.

## Project Structure

The web application follows a modular architecture with the following directory structure:

```
src/
├── api/          # API client and HTTP utilities
├── components/   # Reusable UI components
├── contexts/     # React Context providers
├── hooks/        # Custom React hooks
├── pages/        # Page-level components
├── services/     # Business logic and data services
├── types/        # TypeScript type definitions
├── utils/        # Utility functions and helpers
├── App.tsx       # Root application component
├── main.tsx      # Application entry point
└── index.css     # Global styles
```

## Technology Stack

- **React 18.2+** - UI framework
- **TypeScript 5.0+** - Type safety with strict mode enabled
- **Vite 5.1+** - Build tool and dev server
- **React Router 6.22+** - Client-side routing
- **Axios 1.6+** - HTTP client
- **React Hook Form 7.50+** - Form management
- **Zod 3.22+** - Schema validation
- **Recharts 2.12+** - Data visualization

## Configuration

### TypeScript

The project uses strict TypeScript configuration with:
- Strict mode enabled
- No unused locals/parameters
- No implicit returns
- No fallthrough cases in switch statements
- CSS Modules type support

### Vite

Vite is configured with:
- React plugin for Fast Refresh
- CSS Modules support with camelCase convention
- Path alias `@/` pointing to `src/`
- Dev server on port 3000
- Proxy for `/api` requests to backend on port 3001

### CSS Modules

CSS Modules are enabled with camelCase naming convention. Create component styles with `.module.css` extension:

```typescript
import styles from './Component.module.css';

function Component() {
  return <div className={styles.container}>Content</div>;
}
```

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build web application for production
- `npm run preview` - Preview production build locally
- `npm run dev:server` - Start backend API server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## Development Workflow

1. Start the backend server:
   ```bash
   npm run dev:server
   ```

2. In a separate terminal, start the Vite dev server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Next Steps

The project structure is ready for implementation. The following components need to be developed:

1. API client with retry logic and authentication
2. Authentication context and login flow
3. Page components (Dashboard, Release Detail, History, etc.)
4. Reusable UI components
5. Custom hooks for data fetching
6. Services for business logic
7. Type definitions for API models
