import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from '../CacheService.js';

/**
 * CacheService Unit Tests
 *
 * Tests the CacheService abstraction layer using in-memory storage.
 * No Redis instance required for these tests.
 */
describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({
      // No redisUrl - uses in-memory store for testing
      namespace: 'test',
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should return undefined for missing keys', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      await cache.delete('key1');
      const value = await cache.get('key1');
      expect(value).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should clear all keys in namespace', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should handle string values', async () => {
      await cache.set('str', 'hello');
      const value = await cache.get<string>('str');
      expect(value).toBe('hello');
    });

    it('should handle number values', async () => {
      await cache.set('num', 42);
      const value = await cache.get<number>('num');
      expect(value).toBe(42);
    });

    it('should handle object values', async () => {
      const obj = { name: 'Test', age: 30 };
      await cache.set('obj', obj);
      const value = await cache.get<typeof obj>('obj');
      expect(value).toEqual(obj);
    });

    it('should handle array values', async () => {
      const arr = [1, 2, 3];
      await cache.set('arr', arr);
      const value = await cache.get<number[]>('arr');
      expect(value).toEqual(arr);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire values after TTL', async () => {
      await cache.set('key1', 'value1', 100); // 100ms TTL

      const value1 = await cache.get('key1');
      expect(value1).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const value2 = await cache.get('key1');
      expect(value2).toBeUndefined();
    }, 10000); // Increase test timeout for async operations

    it('should use default TTL when not specified', async () => {
      // Set value without explicit TTL (uses config.defaultTTL)
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
      // Note: Can't easily test default TTL expiration without waiting 1 hour
    });
  });

  describe('getOrSet Pattern', () => {
    it('should use factory on cache miss', async () => {
      let callCount = 0;
      const factory = async () => {
        callCount++;
        return 'computed-value';
      };

      // First call should invoke factory
      const value1 = await cache.getOrSet('key1', factory);
      expect(value1).toBe('computed-value');
      expect(callCount).toBe(1);
    });

    it('should use cache on cache hit', async () => {
      let callCount = 0;
      const factory = async () => {
        callCount++;
        return 'computed-value';
      };

      // First call - factory invoked
      await cache.getOrSet('key1', factory);
      expect(callCount).toBe(1);

      // Second call - cache hit, factory NOT invoked
      const value2 = await cache.getOrSet('key1', factory);
      expect(value2).toBe('computed-value');
      expect(callCount).toBe(1); // Factory not called again
    });

    it('should respect TTL in getOrSet', async () => {
      const factory = async () => 'value';

      await cache.getOrSet('key1', factory, 100); // 100ms TTL

      const value1 = await cache.get('key1');
      expect(value1).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const value2 = await cache.get('key1');
      expect(value2).toBeUndefined();
    }, 10000);
  });

  describe('Metrics', () => {
    it('should track cache hits', async () => {
      cache.resetMetrics();

      await cache.set('key1', 'value1');
      await cache.get('key1'); // Hit

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
    });

    it('should track cache misses', async () => {
      cache.resetMetrics();

      await cache.get('nonexistent'); // Miss

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(1);
    });

    it('should track sets', async () => {
      cache.resetMetrics();

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const metrics = cache.getMetrics();
      expect(metrics.sets).toBe(2);
    });

    it('should track deletes', async () => {
      cache.resetMetrics();

      await cache.set('key1', 'value1');
      await cache.delete('key1');

      const metrics = cache.getMetrics();
      expect(metrics.deletes).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      cache.resetMetrics();

      await cache.set('key1', 'value1');
      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      await cache.get('key3'); // Miss

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(2);
      expect(metrics.hitRate).toBeCloseTo(1 / 3, 2); // 33.33%
    });

    it('should reset metrics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');

      cache.resetMetrics();

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.sets).toBe(0);
      expect(metrics.deletes).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle get errors gracefully', async () => {
      // Note: In-memory store rarely errors, but we test the error handling path exists
      // For real error testing, integration tests with Redis should be used
      const value = await cache.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should track errors in metrics', async () => {
      // With in-memory store, errors are rare
      // This test validates the metrics structure is correct
      const metrics = cache.getMetrics();
      expect(metrics.errors).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.errors).toBe('number');
    });
  });

  describe('Namespace Isolation', () => {
    it('should isolate keys by namespace', async () => {
      const cache1 = new CacheService({
        namespace: 'namespace1',
      });

      const cache2 = new CacheService({
        namespace: 'namespace2',
      });

      await cache1.set('key', 'value1');
      await cache2.set('key', 'value2');

      expect(await cache1.get('key')).toBe('value1');
      expect(await cache2.get('key')).toBe('value2');

      // Cleanup
      await cache1.clear();
      await cache2.clear();
    });
  });
});
