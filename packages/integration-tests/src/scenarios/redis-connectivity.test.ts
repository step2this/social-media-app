import { describe, test, expect, beforeAll } from 'vitest';
import Redis from 'ioredis';

describe('Redis Connectivity', () => {
  let redis: Redis;

  beforeAll(() => {
    // Create Redis client with test configuration
    redis = new Redis({
      host: process.env.REDIS_ENDPOINT || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      lazyConnect: true // Don't connect immediately
    });
  });

  test('can connect to LocalStack Redis', async () => {
    try {
      await redis.connect();
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    } finally {
      await redis.quit();
    }
  }, 10000);

  test('can set and get values', async () => {
    const testRedis = new Redis({
      host: 'localhost',
      port: 6379
    });

    try {
      await testRedis.set('test-key', 'test-value');
      const value = await testRedis.get('test-key');
      expect(value).toBe('test-value');
    } finally {
      await testRedis.del('test-key');
      await testRedis.quit();
    }
  });

  test('supports sorted sets for feed caching', async () => {
    const testRedis = new Redis({
      host: 'localhost',
      port: 6379
    });

    const testKey = 'test-feed:user-123';

    try {
      // Add posts with timestamps as scores
      await testRedis.zadd(testKey, 1000, 'post-1');
      await testRedis.zadd(testKey, 2000, 'post-2');
      await testRedis.zadd(testKey, 3000, 'post-3');

      // Get posts in reverse chronological order (newest first)
      const posts = await testRedis.zrevrange(testKey, 0, 10);

      expect(posts).toEqual(['post-3', 'post-2', 'post-1']);

      // Get posts with scores (timestamps)
      const postsWithScores = await testRedis.zrevrange(testKey, 0, 10, 'WITHSCORES');
      expect(postsWithScores).toEqual([
        'post-3', '3000',
        'post-2', '2000',
        'post-1', '1000'
      ]);

      // Get count of posts
      const count = await testRedis.zcard(testKey);
      expect(count).toBe(3);

      // Get posts in a time range (score range)
      const rangedPosts = await testRedis.zrangebyscore(testKey, 1500, 2500);
      expect(rangedPosts).toEqual(['post-2']);
    } finally {
      await testRedis.del(testKey);
      await testRedis.quit();
    }
  });

  test('supports hash operations for post metadata', async () => {
    const testRedis = new Redis({
      host: 'localhost',
      port: 6379
    });

    const testKey = 'post:metadata:post-123';

    try {
      // Set multiple fields at once
      await testRedis.hmset(testKey, {
        author: 'user-456',
        likes: '42',
        comments: '7',
        timestamp: '1234567890'
      });

      // Get all fields
      const metadata = await testRedis.hgetall(testKey);
      expect(metadata).toEqual({
        author: 'user-456',
        likes: '42',
        comments: '7',
        timestamp: '1234567890'
      });

      // Increment likes
      await testRedis.hincrby(testKey, 'likes', 1);
      const newLikes = await testRedis.hget(testKey, 'likes');
      expect(newLikes).toBe('43');
    } finally {
      await testRedis.del(testKey);
      await testRedis.quit();
    }
  });

  test('supports expiration for cache invalidation', async () => {
    const testRedis = new Redis({
      host: 'localhost',
      port: 6379
    });

    const testKey = 'expiring-key';

    try {
      await testRedis.set(testKey, 'will-expire', 'EX', 1); // Expires in 1 second

      const value1 = await testRedis.get(testKey);
      expect(value1).toBe('will-expire');

      const ttl = await testRedis.ttl(testKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const value2 = await testRedis.get(testKey);
      expect(value2).toBeNull();
    } finally {
      await testRedis.quit();
    }
  });

  test('supports pipeline operations for batch updates', async () => {
    const testRedis = new Redis({
      host: 'localhost',
      port: 6379
    });

    const feedKey = 'test-pipeline-feed';
    const metaKey1 = 'test-pipeline-meta-1';
    const metaKey2 = 'test-pipeline-meta-2';

    try {
      // Use pipeline for batch operations
      const pipeline = testRedis.pipeline();

      // Add multiple posts to feed
      pipeline.zadd(feedKey, 1000, 'post-1');
      pipeline.zadd(feedKey, 2000, 'post-2');
      pipeline.zadd(feedKey, 3000, 'post-3');

      // Set metadata for posts
      pipeline.hmset(metaKey1, { author: 'user-1', likes: '10' });
      pipeline.hmset(metaKey2, { author: 'user-2', likes: '20' });

      // Execute all commands
      const results = await pipeline.exec();

      expect(results).toBeDefined();
      expect(results?.length).toBe(5);

      // Verify data was set correctly
      const posts = await testRedis.zrevrange(feedKey, 0, -1);
      expect(posts).toEqual(['post-3', 'post-2', 'post-1']);

      const meta1 = await testRedis.hgetall(metaKey1);
      expect(meta1.author).toBe('user-1');
    } finally {
      await testRedis.del(feedKey, metaKey1, metaKey2);
      await testRedis.quit();
    }
  });

  test('handles connection errors gracefully', async () => {
    const badRedis = new Redis({
      host: 'nonexistent-host',
      port: 6379,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      enableOfflineQueue: false,
      retryStrategy: () => null // Don't retry
    });

    try {
      await expect(badRedis.ping()).rejects.toThrow();
    } finally {
      badRedis.disconnect();
    }
  });
});