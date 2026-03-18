/**
 * In-memory cache implementation for the Release Web Application
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * In-memory cache with TTL support
 */
export class Cache {
  private store: Map<string, CacheEntry<any>>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Set a value in the cache with a TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl: number): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + ttl;
    this.store.set(key, { data, timestamp, expiresAt });
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Invalidate a specific cache entry
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Cache keys for different data types
 */
export const CACHE_KEYS = {
  releases: (platform?: string) => `releases:${platform || 'all'}`,
  release: (id: string) => `release:${id}`,
  metrics: (id: string) => `metrics:${id}`,
  blockers: (id: string) => `blockers:${id}`,
  signoffs: (id: string) => `signoffs:${id}`,
  distributions: (id: string) => `distributions:${id}`,
};

/**
 * Cache TTL (time to live) constants in milliseconds
 */
export const CACHE_TTL = {
  releases: 60000, // 60 seconds
  release: 30000, // 30 seconds
  metrics: 30000, // 30 seconds
  static: 300000, // 5 minutes
};
