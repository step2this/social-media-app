import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

/**
 * Cache Service Configuration
 */
export interface CacheConfig {
  /**
   * Redis connection string
   * If not provided, uses in-memory store (for testing)
   * @example 'redis://localhost:6379'
   */
  redisUrl?: string;

  /**
   * Namespace for cache keys (prevents collisions)
   * @example 'social-media-app:dev'
   */
  namespace: string;

  /**
   * Default TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  defaultTTL?: number;

  /**
   * Enable cache metrics
   * @default true
   */
  enableMetrics?: boolean;
}

/**
 * Cache Service Interface
 *
 * Provides a simple, type-safe caching layer over Keyv/Redis.
 * Supports TTL, namespacing, and optional metrics.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}

/**
 * Cache Metrics for monitoring
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * Keyv-based Cache Service Implementation
 *
 * Wraps Keyv with additional features:
 * - Type safety
 * - Metrics tracking
 * - Error handling
 * - getOrSet pattern
 */
export class CacheService implements ICacheService {
  private readonly store: Keyv;
  private readonly config: Required<Omit<CacheConfig, 'redisUrl'>> & Pick<CacheConfig, 'redisUrl'>;
  private metrics: CacheMetrics;

  constructor(config: CacheConfig) {
    this.config = {
      defaultTTL: 3600000, // 1 hour
      enableMetrics: true,
      ...config,
    };

    // Initialize Keyv with Redis backend (or in-memory for testing)
    if (this.config.redisUrl) {
      this.store = new Keyv({
        store: new KeyvRedis(this.config.redisUrl),
        namespace: this.config.namespace,
        ttl: this.config.defaultTTL,
      });
    } else {
      // Use in-memory store when no Redis URL provided (for testing)
      this.store = new Keyv({
        namespace: this.config.namespace,
        ttl: this.config.defaultTTL,
      });
    }

    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };

    // Handle connection errors
    this.store.on('error', (err) => {
      console.error('Cache error:', err);
      this.metrics.errors++;
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.store.get<T>(key);

      if (this.config.enableMetrics) {
        if (value !== undefined) {
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
        this.updateHitRate();
      }

      return value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.store.set(key, value, ttl);

      if (this.config.enableMetrics) {
        this.metrics.sets++;
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.store.delete(key);

      if (this.config.enableMetrics) {
        this.metrics.deletes++;
      }
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Clear entire cache namespace
   */
  async clear(): Promise<void> {
    try {
      await this.store.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Get-or-set pattern: Try cache first, fallback to factory
   *
   * @example
   * const profile = await cache.getOrSet(
   *   `profile:${userId}`,
   *   () => profileService.getById(userId),
   *   300000 // 5 minutes
   * );
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss - call factory
    const value = await factory();

    // Store in cache for next time
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }
}

/**
 * Create CacheService from environment variables
 */
export function createCacheServiceFromEnv(): CacheService {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const namespace = `social-media-app:${process.env.STAGE || 'dev'}`;

  return new CacheService({
    redisUrl,
    namespace,
    defaultTTL: 3600000, // 1 hour
    enableMetrics: true,
  });
}
