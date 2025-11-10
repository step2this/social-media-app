/**
 * Cache Service Interface
 *
 * Minimal interface for caching support in DAL services.
 * Implementations can be provided by backend packages.
 *
 * This interface allows DAL to be cache-agnostic while enabling
 * optional caching support when provided.
 */
export interface ICache {
  /**
   * Get value from cache
   * @returns Value if found, undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete value from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Get-or-set pattern: Try cache first, fallback to factory
   * @param key Cache key
   * @param factory Function to call on cache miss
   * @param ttl Time to live in milliseconds (optional)
   */
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}
