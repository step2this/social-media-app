/**
 * Advanced caching utilities for Lambda functions
 *
 * Features:
 * - LRU (Least Recently Used) eviction
 * - TTL (Time To Live) expiration
 * - Size-based limits
 * - Metrics collection
 * - Async refresh capability
 * - Stale-while-revalidate pattern
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
  size?: number;
  stale?: boolean;
}

/**
 * Cache configuration options
 */
interface CacheOptions {
  /** Maximum number of entries */
  maxSize?: number;
  /** TTL in milliseconds */
  ttlMs?: number;
  /** Enable stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Stale timeout in milliseconds */
  staleTimeoutMs?: number;
  /** Calculate size of entry for memory limits */
  sizeCalculator?: <T>(value: T) => number;
  /** Maximum memory in bytes */
  maxMemoryBytes?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  memoryBytes: number;
  hitRate: number;
}

/**
 * Advanced LRU cache with TTL and metrics
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private accessOrder: K[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private totalMemoryBytes = 0;
  private refreshPromises: Map<K, Promise<V>> = new Map();

  constructor(private readonly options: CacheOptions = {}) {
    this.options.maxSize = options.maxSize ?? 1000;
    this.options.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
    this.options.maxMemoryBytes = options.maxMemoryBytes ?? 50 * 1024 * 1024; // 50MB default
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry, now)) {
      // If stale-while-revalidate is enabled, return stale value
      if (this.options.staleWhileRevalidate && !entry.stale) {
        entry.stale = true;
        this.stats.hits++;
        entry.hits++;
        this.updateAccessOrder(key);
        return entry.value;
      }

      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    entry.hits++;
    this.updateAccessOrder(key);
    return entry.value;
  }

  /**
   * Get value with async refresh if stale
   */
  async getWithRefresh(
    key: K,
    refreshFn: () => Promise<V>
  ): Promise<V | undefined> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      // Fetch and cache
      const value = await refreshFn();
      this.set(key, value);
      return value;
    }

    // Check if expired
    if (this.isExpired(entry, now)) {
      if (this.options.staleWhileRevalidate) {
        // Return stale value and refresh in background
        this.refreshInBackground(key, refreshFn);
        this.stats.hits++;
        entry.hits++;
        return entry.value;
      }

      // Refresh synchronously
      const value = await refreshFn();
      this.set(key, value);
      return value;
    }

    this.stats.hits++;
    entry.hits++;
    this.updateAccessOrder(key);
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    const size = this.options.sizeCalculator ? this.options.sizeCalculator(value) : 1;

    // Check memory limit
    if (this.options.maxMemoryBytes && this.totalMemoryBytes + size > this.options.maxMemoryBytes) {
      this.evictUntilMemoryAvailable(size);
    }

    // Check size limit
    if (this.options.maxSize && this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Update or create entry
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.totalMemoryBytes -= existingEntry.size ?? 0;
    }

    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      hits: 0,
      size,
      stale: false
    };

    this.cache.set(key, entry);
    this.totalMemoryBytes += size;
    this.updateAccessOrder(key);
  }

  /**
   * Delete entry from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalMemoryBytes -= entry.size ?? 0;
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return true;
    }
    return false;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.totalMemoryBytes = 0;
    this.refreshPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      memoryBytes: this.totalMemoryBytes,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<V>, now: number): boolean {
    if (!this.options.ttlMs) return false;

    const age = now - entry.timestamp;
    if (entry.stale && this.options.staleTimeoutMs) {
      return age > this.options.ttlMs + this.options.staleTimeoutMs;
    }

    return age > this.options.ttlMs;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: K): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const key = this.accessOrder.shift();
    if (key !== undefined) {
      this.delete(key);
      this.stats.evictions++;
    }
  }

  /**
   * Evict entries until enough memory is available
   */
  private evictUntilMemoryAvailable(requiredSize: number): void {
    const targetMemory = this.options.maxMemoryBytes! - requiredSize;

    while (this.totalMemoryBytes > targetMemory && this.accessOrder.length > 0) {
      this.evictLRU();
    }
  }

  /**
   * Refresh value in background
   */
  private async refreshInBackground(key: K, refreshFn: () => Promise<V>): Promise<void> {
    // Check if refresh is already in progress
    const existingPromise = this.refreshPromises.get(key);
    if (existingPromise) return;

    const refreshPromise = refreshFn()
      .then(value => {
        this.set(key, value);
        this.refreshPromises.delete(key);
        return value;
      })
      .catch(error => {
        console.error(`Cache refresh failed for key ${key}:`, error);
        this.refreshPromises.delete(key);
        throw error;
      });

    this.refreshPromises.set(key, refreshPromise);
  }
}

/**
 * Simple TTL cache for basic use cases
 */
export class TTLCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();

  constructor(private readonly ttlMs: number = 5 * 60 * 1000) {}

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Batch cache for aggregating multiple cache operations
 */
export class BatchCache<K, V> {
  private cache: LRUCache<K, V>;

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache(options);
  }

  /**
   * Get multiple values at once
   */
  getMany(keys: K[]): Map<K, V> {
    const results = new Map<K, V>();

    for (const key of keys) {
      const value = this.cache.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  setMany(entries: Array<[K, V]>): void {
    for (const [key, value] of entries) {
      this.cache.set(key, value);
    }
  }

  /**
   * Get values with batch fetch for misses
   */
  async getManyWithFetch(
    keys: K[],
    fetchFn: (missingKeys: K[]) => Promise<Map<K, V>>
  ): Promise<Map<K, V>> {
    const results = new Map<K, V>();
    const missingKeys: K[] = [];

    // Check cache first
    for (const key of keys) {
      const value = this.cache.get(key);
      if (value !== undefined) {
        results.set(key, value);
      } else {
        missingKeys.push(key);
      }
    }

    // Fetch missing values
    if (missingKeys.length > 0) {
      const fetched = await fetchFn(missingKeys);

      for (const [key, value] of fetched.entries()) {
        this.cache.set(key, value);
        results.set(key, value);
      }
    }

    return results;
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

/**
 * Create a memoized version of an async function
 */
export function memoizeAsync<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyGenerator?: (...args: TArgs) => string;
    ttlMs?: number;
    maxSize?: number;
  } = {}
): (...args: TArgs) => Promise<TResult> {
  const cache = new LRUCache<string, TResult>({
    ttlMs: options.ttlMs ?? 5 * 60 * 1000,
    maxSize: options.maxSize ?? 100
  });

  const keyGen = options.keyGenerator ?? ((...args: TArgs) => JSON.stringify(args));

  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGen(...args);

    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Deduplicate concurrent requests for the same key
 */
export class RequestDeduplicator<K, V> {
  private inFlight: Map<K, Promise<V>> = new Map();

  async dedupe(
    key: K,
    fetchFn: () => Promise<V>
  ): Promise<V> {
    // Check if request is already in flight
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    // Create new request
    const promise = fetchFn()
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  size(): number {
    return this.inFlight.size;
  }
}

/**
 * Circuit breaker for protecting downstream services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly options: {
      threshold: number;
      timeout: number;
      resetTimeout: number;
    } = {
      threshold: 5,
      timeout: 10000,
      resetTimeout: 30000
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}