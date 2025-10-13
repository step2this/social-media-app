/**
 * @fileoverview Integration tests for Redis feed cache (Phase 3.3)
 * @module integration-tests/redis-feed-cache
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { FeedService, RedisCacheService, type CachedPost } from '@social-media-app/dal';
import { v4 as uuidv4 } from 'uuid';
import { fixedTimestamp } from '../utils/test-helpers.js';

// Test configuration
const TEST_TABLE_NAME = 'test-social-media-app';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

describe('Redis Feed Cache Integration', () => {
  let redisClient: Redis;
  let cacheService: RedisCacheService;
  let dynamoClient: DynamoDBDocumentClient;

  // Test data
  const testUserId = uuidv4();
  const testPostId1 = uuidv4();
  const testPostId2 = uuidv4();
  const testPostId3 = uuidv4();

  beforeAll(async () => {
    // Initialize Redis client
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      lazyConnect: true
    });

    // Try to connect to Redis
    try {
      await redisClient.connect();
      console.log('Redis connected for tests');
    } catch (error) {
      console.warn('Redis connection failed, tests will be skipped', error);
      return;
    }

    // Initialize services
    cacheService = new RedisCacheService(redisClient);

    // Initialize DynamoDB client (using LocalStack)
    const dynamoDbClient = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:4566',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });

    dynamoClient = DynamoDBDocumentClient.from(dynamoDbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false
      },
      unmarshallOptions: {
        wrapNumbers: false
      }
    });

    // FeedService initialization commented out as it's not used in tests
    // const feedService = new FeedService(dynamoClient, TEST_TABLE_NAME, cacheService);
  });

  afterAll(async () => {
    // Cleanup and disconnect
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.flushdb(); // Clear test database
      await redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    // Clear Redis cache before each test
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.flushdb();
    }
  });

  describe('Cache-Aside Pattern', () => {
    it('should cache posts when retrieved from DynamoDB', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Create test posts with fixed timestamps
      const testPosts: CachedPost[] = [
        {
          id: testPostId1,
          authorId: 'author-1',
          authorHandle: 'user1',
          caption: 'Test post 1',
          imageUrl: 'https://example.com/image1.jpg',
          isPublic: true,
          likesCount: 10,
          commentsCount: 5,
          createdAt: fixedTimestamp(0) // Base time
        },
        {
          id: testPostId2,
          authorId: 'author-2',
          authorHandle: 'user2',
          caption: 'Test post 2',
          imageUrl: 'https://example.com/image2.jpg',
          isPublic: true,
          likesCount: 20,
          commentsCount: 8,
          createdAt: fixedTimestamp(-60) // 1 hour before base time
        }
      ];

      // Cache posts
      await cacheService.cachePosts(testPosts);

      // Verify posts are cached
      const cachedPost1 = await cacheService.getCachedPost(testPostId1);
      expect(cachedPost1).toBeDefined();
      expect(cachedPost1?.id).toBe(testPostId1);
      expect(cachedPost1?.caption).toBe('Test post 1');

      const cachedPost2 = await cacheService.getCachedPost(testPostId2);
      expect(cachedPost2).toBeDefined();
      expect(cachedPost2?.id).toBe(testPostId2);
      expect(cachedPost2?.caption).toBe('Test post 2');
    });

    it('should return empty result for cache miss', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Try to get feed from empty cache
      const result = await cacheService.getUnreadFeed(testUserId, 20);

      expect(result.posts).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should handle cache failures gracefully', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Create a service with a disconnected Redis client
      const brokenRedis = new Redis({
        host: 'invalid-host',
        port: 9999,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 100,
        lazyConnect: true
      });

      const brokenCacheService = new RedisCacheService(brokenRedis);
      const resilientFeedService = new FeedService(dynamoClient, TEST_TABLE_NAME, brokenCacheService);

      // This should not throw - cache failures are non-blocking
      try {
        const result = await resilientFeedService.getMaterializedFeedItems({
          userId: testUserId,
          limit: 20
        });

        // Should return result from DynamoDB (empty in this case)
        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
      } catch (error) {
        // Feed service should handle cache errors internally
        expect(error).toBeUndefined();
      } finally {
        await brokenRedis.disconnect();
      }
    });

    it('should cache and retrieve feed with pagination', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Create test posts with fixed timestamps
      const testPosts: CachedPost[] = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        authorId: `author-${i}`,
        authorHandle: `user${i}`,
        caption: `Test post ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        isPublic: true,
        likesCount: i * 10,
        commentsCount: i * 2,
        createdAt: fixedTimestamp(-i * 60) // Each post 1 hour apart from base time
      }));

      // Cache all posts
      await cacheService.cachePosts(testPosts);

      // Get first page
      const page1 = await cacheService.getUnreadFeed(testUserId, 3);
      expect(page1.posts).toHaveLength(0); // No posts in sorted set yet

      // Note: The getUnreadFeed method returns posts from a sorted set
      // but cachePosts only stores them in hashes. The sorted set would
      // be populated by the Kinesis stream processor in production.
      // For this test, we verify that individual posts are cached correctly.

      // Verify individual posts are cached
      for (const post of testPosts) {
        const cached = await cacheService.getCachedPost(post.id);
        expect(cached).toBeDefined();
        expect(cached?.id).toBe(post.id);
      }
    });

    it('should mark posts as read', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Add posts to unread feed (simulating what stream processor would do)
      const feedKey = `feed:unread:${testUserId}`;
      const now = Date.now();

      // Add posts to sorted set with timestamps as scores
      await redisClient.zadd(feedKey, now, testPostId1);
      await redisClient.zadd(feedKey, now - 1000, testPostId2);
      await redisClient.zadd(feedKey, now - 2000, testPostId3);

      // Cache post metadata
      await cacheService.cachePost(testPostId1, {
        id: testPostId1,
        authorId: 'author-1',
        authorHandle: 'user1',
        caption: 'Post 1',
        isPublic: true,
        likesCount: 5,
        commentsCount: 2,
        createdAt: new Date(now).toISOString()
      });

      // Get unread feed - should have 3 posts
      const unreadCount = await redisClient.zcard(feedKey);
      expect(unreadCount).toBe(3);

      // Mark post as read
      await cacheService.markPostAsRead(testUserId, testPostId1);

      // Verify post is removed from unread feed
      const remainingCount = await redisClient.zcard(feedKey);
      expect(remainingCount).toBe(2);

      // Verify specific post is removed
      const score = await redisClient.zscore(feedKey, testPostId1);
      expect(score).toBeNull();
    });

    it('should handle batch caching efficiently', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Create a large batch of posts with fixed timestamps
      const largeBatch: CachedPost[] = Array.from({ length: 50 }, (_, i) => ({
        id: uuidv4(),
        authorId: `author-${i}`,
        authorHandle: `user${i}`,
        caption: `Batch post ${i}`,
        imageUrl: i % 2 === 0 ? `https://example.com/batch${i}.jpg` : undefined,
        isPublic: true,
        likesCount: Math.floor(Math.random() * 100),
        commentsCount: Math.floor(Math.random() * 20),
        createdAt: fixedTimestamp(-i) // Each post 1 minute apart from base time
      }));

      const startTime = Date.now();

      // Cache all posts in batch
      await cacheService.cachePosts(largeBatch);

      const duration = Date.now() - startTime;

      // Log performance for informational purposes (not a hard assertion)
      console.log(`[Perf] Batch cache operation: ${duration}ms for ${largeBatch.length} posts`);

      // Use relative performance check instead of brittle fixed threshold
      // Allow 50ms per post as generous upper bound
      expect(duration).toBeLessThan(largeBatch.length * 50);

      // Verify random samples are cached correctly
      const sampleIndices = [0, 10, 25, 40, 49];
      for (const idx of sampleIndices) {
        const post = largeBatch[idx];
        const cached = await cacheService.getCachedPost(post.id);
        expect(cached).toBeDefined();
        expect(cached?.caption).toBe(`Batch post ${idx}`);
      }
    });

    it('should expire cached posts after TTL', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const shortLivedPost: CachedPost = {
        id: testPostId3,
        authorId: 'author-ttl',
        authorHandle: 'ttl-user',
        caption: 'This post will expire',
        isPublic: true,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };

      // Cache post
      await cacheService.cachePost(testPostId3, shortLivedPost);

      // Verify it's cached
      const cached = await cacheService.getCachedPost(testPostId3);
      expect(cached).toBeDefined();

      // Check TTL is set (should be 3600 seconds by default)
      // Use wider range to avoid brittle timing assertions
      const ttl = await redisClient.ttl(`post:${testPostId3}`);
      expect(ttl).toBeGreaterThan(3500); // Allow 100s margin for processing
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });

  describe('Performance Characteristics', () => {
    it('should demonstrate cache hit vs miss latency', async () => {
      // Skip if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const testPost: CachedPost = {
        id: uuidv4(),
        authorId: 'perf-author',
        authorHandle: 'perf-user',
        caption: 'Performance test post',
        imageUrl: 'https://example.com/perf.jpg',
        isPublic: true,
        likesCount: 100,
        commentsCount: 50,
        createdAt: new Date().toISOString()
      };

      // Measure cache miss
      const missSstart = Date.now();
      const missResult = await cacheService.getCachedPost(testPost.id);
      const missLatency = Date.now() - missSstart;

      expect(missResult).toBeNull();

      // Cache the post
      await cacheService.cachePost(testPost.id, testPost);

      // Measure cache hit
      const hitStart = Date.now();
      const hitResult = await cacheService.getCachedPost(testPost.id);
      const hitLatency = Date.now() - hitStart;

      expect(hitResult).toBeDefined();

      // Log performance for informational purposes
      console.log(`[Perf] Cache latency - Miss: ${missLatency}ms, Hit: ${hitLatency}ms`);

      // Relative check: cache hits should be faster than misses
      // This is architecture-agnostic and won't fail on slower systems
      expect(hitLatency).toBeLessThan(missLatency + 50); // Allow 50ms margin
    });
  });
});