import { Cache, CACHE_KEYS, CACHE_TTL } from './cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const data = { id: '1', name: 'Test' };
      cache.set('test-key', data, 1000);
      
      const result = cache.get('test-key');
      expect(result).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      cache.set('string', 'hello', 1000);
      cache.set('number', 42, 1000);
      cache.set('boolean', true, 1000);
      cache.set('array', [1, 2, 3], 1000);
      cache.set('object', { a: 1 }, 1000);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ a: 1 });
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired entries', async () => {
      cache.set('test-key', 'data', 50); // 50ms TTL
      
      // Should be available immediately
      expect(cache.get('test-key')).toBe('data');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      expect(cache.get('test-key')).toBeNull();
    });

    it('should not return expired entries', async () => {
      cache.set('key1', 'data1', 50);
      cache.set('key2', 'data2', 200);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('data2');
    });
  });

  describe('invalidate', () => {
    it('should remove a specific cache entry', () => {
      cache.set('key1', 'data1', 1000);
      cache.set('key2', 'data2', 1000);
      
      cache.invalidate('key1');
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('data2');
    });

    it('should not throw error for non-existent keys', () => {
      expect(() => cache.invalidate('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      cache.set('key1', 'data1', 1000);
      cache.set('key2', 'data2', 1000);
      cache.set('key3', 'data3', 1000);
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should allow setting new entries after clear', () => {
      cache.set('key1', 'data1', 1000);
      cache.clear();
      cache.set('key2', 'data2', 1000);
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('data2');
    });
  });
});

describe('CACHE_KEYS', () => {
  it('should generate correct cache keys', () => {
    expect(CACHE_KEYS.releases()).toBe('releases:all');
    expect(CACHE_KEYS.releases('iOS')).toBe('releases:iOS');
    expect(CACHE_KEYS.release('123')).toBe('release:123');
    expect(CACHE_KEYS.metrics('456')).toBe('metrics:456');
    expect(CACHE_KEYS.blockers('789')).toBe('blockers:789');
    expect(CACHE_KEYS.signoffs('abc')).toBe('signoffs:abc');
    expect(CACHE_KEYS.distributions('def')).toBe('distributions:def');
  });
});

describe('CACHE_TTL', () => {
  it('should have correct TTL values', () => {
    expect(CACHE_TTL.releases).toBe(60000); // 60 seconds
    expect(CACHE_TTL.release).toBe(30000); // 30 seconds
    expect(CACHE_TTL.metrics).toBe(30000); // 30 seconds
    expect(CACHE_TTL.static).toBe(300000); // 5 minutes
  });
});
