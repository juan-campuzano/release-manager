# Release Manager - Web Application

React-based web application for managing software releases across iOS, Android, and Desktop platforms.

## Features

- Dashboard for viewing active releases
- Release detail pages with comprehensive information
- Blocker management
- Squad sign-off tracking
- Distribution channel management
- Quality metrics and DAU statistics
- ITGC compliance tracking
- Release history with filtering
- Health monitoring
- Responsive design (mobile, tablet, desktop)
- Accessibility compliant (WCAG AA)

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
# API Configuration
# In development, uses Vite proxy to /api
# In production, set to your actual API server URL
VITE_API_BASE_URL=/api
```

**Development Configuration:**
- The Vite dev server runs on port 3000
- API requests to `/api` are proxied to `http://localhost:3001`
- This is configured in `vite.config.ts`

**Production Configuration:**
- Set `VITE_API_BASE_URL` to your production API server URL
- Example: `VITE_API_BASE_URL=https://api.example.com`

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

The production build will be output to the `dist/` directory with:
- Optimized and minified JavaScript bundles
- Code splitting for better caching
- Vendor chunks separated for React, forms, utilities, and charts
- CSS modules compiled and optimized
- Source maps for debugging

### Preview Production Build

```bash
npm run preview
```

This starts a local server to preview the production build at `http://localhost:4173`

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Technology Stack

- **React 18.2+** - UI framework
- **TypeScript 5.0+** - Type safety
- **Vite 5.1+** - Build tool and dev server
- **React Router 6.22+** - Client-side routing
- **Axios 1.6+** - HTTP client
- **React Hook Form 7.50+** - Form management
- **Zod 3.22+** - Schema validation
- **Recharts 2.12+** - Data visualization

## Project Structure

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
└── main.tsx      # Application entry point
```

## Key Features

### Authentication

- Login with username and password
- Token-based authentication
- Automatic token refresh
- Protected routes

### Release Management

- View active releases by platform
- Create new releases
- Update release stage and status
- Control rollout percentage
- Track blockers and sign-offs
- Manage distribution channels

### Metrics & Monitoring

- Quality metrics (crash rate, CPU exceptions)
- Daily Active Users (DAU) statistics
- ITGC compliance status
- Server health monitoring

### Responsive Design

- Mobile-first approach
- Breakpoints: 768px (tablet), 1024px (desktop)
- Touch-friendly interface
- Accessible navigation

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use CSS Modules for styling
- Write unit tests for components

### Testing

- Unit tests with Jest and React Testing Library
- Property-based tests with fast-check
- Aim for >80% code coverage

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Maintain WCAG AA color contrast

## License

MIT

## Deployment

### Building for Production

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   # Create .env file
   echo "VITE_API_BASE_URL=https://your-api-server.com" > .env
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. The `dist/` directory contains the production-ready files

### Deployment Options

#### Static Hosting (Netlify, Vercel, AWS S3 + CloudFront)

The application is a static SPA that can be deployed to any static hosting service:

1. Build the application
2. Upload the `dist/` directory contents
3. Configure redirects for client-side routing:
   - Netlify: Create `_redirects` file with `/* /index.html 200`
   - Vercel: Automatically handled
   - AWS S3: Configure CloudFront with custom error responses

#### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api-server:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Build and run:

```bash
docker build -t release-manager-web .
docker run -p 80:80 release-manager-web
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Base URL for the API server | `/api` | Yes |

### Performance Optimization

The build is optimized with:
- **Code Splitting**: Routes are lazy-loaded
- **Vendor Chunking**: Third-party libraries separated for better caching
- **Tree Shaking**: Unused code eliminated
- **Minification**: JavaScript and CSS minified
- **Compression**: Enable gzip/brotli on your server for additional compression

### Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

### Troubleshooting

**API Connection Issues:**
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration on the API server
- Ensure the API server is accessible from the client

**Build Failures:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check Node.js version (requires 20+)

**Routing Issues in Production:**
- Ensure your server is configured to serve `index.html` for all routes
- Check that the base path in `vite.config.ts` matches your deployment path
