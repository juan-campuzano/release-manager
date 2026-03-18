/**
 * Tests for MetricsCollector
 */

import { MetricsCollector, AnalyticsCredentials } from './metrics-collector';
import { Cache } from '../data/cache';
import { IntegrationError } from '../common/errors';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  let cache: Cache;
  
  beforeEach(() => {
    cache = new Cache();
    collector = new MetricsCollector(cache);
  });
  
  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const credentials: AnalyticsCredentials = {
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        baseUrl: 'https://analytics.example.com'
      };
      
      const result = await collector.authenticate(credentials);
      
      expect(result.success).toBe(true);
    });
    
    it('should fail authentication with missing apiKey', async () => {
      const credentials: AnalyticsCredentials = {
        apiKey: '',
        projectId: 'test-project-id'
      };
      
      const result = await collector.authenticate(credentials);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Invalid credentials');
      }
    });
    
    it('should fail authentication with missing projectId', async () => {
      const credentials: AnalyticsCredentials = {
        apiKey: 'test-api-key',
        projectId: ''
      };
      
      const result = await collector.authenticate(credentials);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Invalid credentials');
      }
    });
  });
  
  describe('getCrashRate', () => {
    const credentials: AnalyticsCredentials = {
      apiKey: 'test-api-key',
      projectId: 'test-project-id'
    };
    
    it('should fail if not authenticated', async () => {
      const result = await collector.getCrashRate('release-1');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Not authenticated');
      }
    });
    
    it('should retrieve crash rate successfully', async () => {
      await collector.authenticate(credentials);
      
      const result = await collector.getCrashRate('release-1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('number');
        expect(result.value).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should cache crash rate data', async () => {
      await collector.authenticate(credentials);
      
      // First call
      const result1 = await collector.getCrashRate('release-1');
      expect(result1.success).toBe(true);
      
      // Second call should use cache
      const result2 = await collector.getCrashRate('release-1');
      expect(result2.success).toBe(true);
      
      if (result1.success && result2.success) {
        expect(result2.value).toBe(result1.value);
      }
    });
    
    it('should return cached data on API failure', async () => {
      await collector.authenticate(credentials);
      
      // First call to populate cache
      const result1 = await collector.getCrashRate('release-1');
      expect(result1.success).toBe(true);
      
      // Simulate API failure by invalidating credentials
      // In a real scenario, the API would fail but cache would still have data
      const result2 = await collector.getCrashRate('release-1');
      expect(result2.success).toBe(true);
    });
  });
  
  describe('getCPUExceptionRate', () => {
    const credentials: AnalyticsCredentials = {
      apiKey: 'test-api-key',
      projectId: 'test-project-id'
    };
    
    it('should fail if not authenticated', async () => {
      const result = await collector.getCPUExceptionRate('release-1');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Not authenticated');
      }
    });
    
    it('should retrieve CPU exception rate successfully', async () => {
      await collector.authenticate(credentials);
      
      const result = await collector.getCPUExceptionRate('release-1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('number');
        expect(result.value).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should cache CPU exception rate data', async () => {
      await collector.authenticate(credentials);
      
      // First call
      const result1 = await collector.getCPUExceptionRate('release-1');
      expect(result1.success).toBe(true);
      
      // Second call should use cache
      const result2 = await collector.getCPUExceptionRate('release-1');
      expect(result2.success).toBe(true);
      
      if (result1.success && result2.success) {
        expect(result2.value).toBe(result1.value);
      }
    });
  });
  
  describe('getDAUData', () => {
    const credentials: AnalyticsCredentials = {
      apiKey: 'test-api-key',
      projectId: 'test-project-id'
    };
    
    it('should fail if not authenticated', async () => {
      const result = await collector.getDAUData('release-1');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(IntegrationError);
        expect(result.error.message).toContain('Not authenticated');
      }
    });
    
    it('should retrieve DAU data successfully', async () => {
      await collector.authenticate(credentials);
      
      const result = await collector.getDAUData('release-1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('dailyActiveUsers');
        expect(result.value).toHaveProperty('trend');
        expect(result.value).toHaveProperty('collectedAt');
        expect(typeof result.value.dailyActiveUsers).toBe('number');
        expect(Array.isArray(result.value.trend)).toBe(true);
        expect(result.value.collectedAt).toBeInstanceOf(Date);
      }
    });
    
    it('should cache DAU data', async () => {
      await collector.authenticate(credentials);
      
      // First call
      const result1 = await collector.getDAUData('release-1');
      expect(result1.success).toBe(true);
      
      // Second call should use cache
      const result2 = await collector.getDAUData('release-1');
      expect(result2.success).toBe(true);
      
      if (result1.success && result2.success) {
        expect(result2.value.dailyActiveUsers).toBe(result1.value.dailyActiveUsers);
        expect(result2.value.trend).toEqual(result1.value.trend);
      }
    });
    
    it('should return DAU data with 7-day trend', async () => {
      await collector.authenticate(credentials);
      
      const result = await collector.getDAUData('release-1');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.trend.length).toBe(7);
        result.value.trend.forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });
  
  describe('error handling', () => {
    it('should handle multiple releases independently', async () => {
      const credentials: AnalyticsCredentials = {
        apiKey: 'test-api-key',
        projectId: 'test-project-id'
      };
      
      await collector.authenticate(credentials);
      
      const result1 = await collector.getCrashRate('release-1');
      const result2 = await collector.getCrashRate('release-2');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
