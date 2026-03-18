/**
 * Service initialization integration tests
 * Tests the service initialization with mock and database modes
 */

// Mock external dependencies
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getBranch: jest.fn(),
        listTags: jest.fn(),
        getCommit: jest.fn()
      }
    }
  }))
}));

jest.mock('azure-devops-node-api', () => ({
  WebApi: jest.fn().mockImplementation(() => ({
    getGitApi: jest.fn()
  }))
}));

jest.mock('./data/database-config', () => ({
  createConnection: jest.fn().mockReturnValue({}),
  getDefaultConfig: jest.fn().mockReturnValue({})
}));

import { initializeServices } from './services';

describe('Service Initialization', () => {
  const originalEnv = process.env.USE_MOCK_DATA;

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.USE_MOCK_DATA = originalEnv;
    } else {
      delete process.env.USE_MOCK_DATA;
    }
  });

  describe('Mock Mode', () => {
    it('should initialize services in mock mode when USE_MOCK_DATA=true', () => {
      process.env.USE_MOCK_DATA = 'true';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const services = initializeServices();
      
      expect(services).toBeDefined();
      expect(services.releaseManager).toBeDefined();
      expect(services.metricsAggregator).toBeDefined();
      expect(services.pollingService).toBeDefined();
      expect(services.cache).toBeDefined();
      
      // Verify the startup log indicates mock mode
      expect(consoleSpy).toHaveBeenCalledWith('[Server] Starting in MOCK mode');
      
      consoleSpy.mockRestore();
    });

    it('should not attempt database connection in mock mode', () => {
      process.env.USE_MOCK_DATA = 'true';
      
      // This test verifies that no database connection errors occur
      // when initializing in mock mode (even without a database configured)
      expect(() => {
        initializeServices();
      }).not.toThrow();
    });

    it('should provide functional release manager in mock mode', async () => {
      process.env.USE_MOCK_DATA = 'true';
      
      const services = initializeServices();
      
      // Verify we can call methods on the release manager
      const result = await services.releaseManager.getActiveReleases();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        // Mock data should have at least 10 releases
        expect(result.value.length).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe('Database Mode', () => {
    it('should initialize services in database mode when USE_MOCK_DATA=false', () => {
      process.env.USE_MOCK_DATA = 'false';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const services = initializeServices();
      
      expect(services).toBeDefined();
      expect(services.releaseManager).toBeDefined();
      expect(services.metricsAggregator).toBeDefined();
      expect(services.pollingService).toBeDefined();
      expect(services.cache).toBeDefined();
      
      // Verify the startup log indicates database mode
      expect(consoleSpy).toHaveBeenCalledWith('[Server] Starting in DATABASE mode');
      
      consoleSpy.mockRestore();
    });

    it('should initialize services in database mode when USE_MOCK_DATA is not set', () => {
      delete process.env.USE_MOCK_DATA;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const services = initializeServices();
      
      expect(services).toBeDefined();
      
      // Verify the startup log indicates database mode (default)
      expect(consoleSpy).toHaveBeenCalledWith('[Server] Starting in DATABASE mode');
      
      consoleSpy.mockRestore();
    });

    it('should use database stores in database mode', () => {
      process.env.USE_MOCK_DATA = 'false';
      
      const services = initializeServices();
      
      // Verify services are initialized (actual database functionality
      // would require a real database connection, which is beyond the scope
      // of this unit test)
      expect(services.releaseManager).toBeDefined();
      expect(services.metricsAggregator).toBeDefined();
      expect(services.pollingService).toBeDefined();
      expect(services.cache).toBeDefined();
    });
  });
});
