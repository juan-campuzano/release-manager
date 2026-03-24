/**
 * Express server startup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeServices } from './services';
import { createHealthRoutes } from './routes/health';
import { createAuthRoutes } from './routes/auth';
import { createReleaseRoutes } from './routes/releases';
import { createConfigRoutes } from './routes/configs';
import { createTeamRoutes } from './routes/teams';
import { JSONConfigParser } from './application';
import { createMetricsRoutes } from './routes/metrics';
import { errorHandler } from './middleware/error-handler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Initialize services
const services = initializeServices();

// Health check routes
app.use('/api/health', createHealthRoutes());

// Authentication routes
app.use('/api/auth', createAuthRoutes());

// Release management routes
app.use('/api/releases', createReleaseRoutes(services));

// Metrics routes
app.use('/api/metrics', createMetricsRoutes(services));

// Repository configuration routes
const configParser = new JSONConfigParser();
app.use('/api/configs', createConfigRoutes(services.configStore, configParser));

// Team management routes
app.use('/api/teams', createTeamRoutes(services.teamStore));

// Basic route for testing
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Release Manager API Server',
    mode: process.env.USE_MOCK_DATA === 'true' ? 'mock' : 'database'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  const mode = process.env.USE_MOCK_DATA === 'true' ? 'mock' : 'database';
  console.log(`🚀 Server running on port ${PORT} in ${mode} mode`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
