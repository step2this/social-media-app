/**
 * @fileoverview Tests for RedisCacheService
 * @module services/redis-cache.service.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisCacheService, type CachedPost, type CachedFeedResult } from './redis-cache.service.js';
import Redis from 'ioredis';

// Mock ioredis
vi.mock('ioredis', () => {
  const redisMock = {
    zrevrange: vi.fn(),
    zrem: vi.fn(),
    hset: vi.fn(),
    hgetall: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    pipeline: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    ping: vi.fn()
  };

  const pipelineMock = {
    hset: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn()
  };

  redisMock.pipeline.mockReturnValue(pipelineMock);

  return {
    default: vi.fn(() => redisMock),
    Redis: vi.fn(() => redisMock)
  };
});

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let redisMock: any;
  let pipelineMock: any;

  const samplePost: CachedPost = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    authorId: '223e4567-e89b-12d3-a456-426614174000',
    authorHandle: 'testuser',
    caption: 'Test post caption',
    imageUrl: 'https://example.com/image.jpg',
    isPublic: true,
    likesCount: 10,
    commentsCount: 5,
    createdAt: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Get mock instances
    const RedisConstructor = (Redis as any).default || Redis;
    redisMock = new RedisConstructor();

    pipelineMock = {
      hset: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 'OK'], [null, 1]])
    };

    redisMock.pipeline.mockReturnValue(pipelineMock);
    redisMock.ping.mockResolvedValue('PONG');

    // Create service instance with mocked Redis client
    service = new RedisCacheService(redisMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    test('connects to Redis successfully', async () => {
      // Service should be initialized without errors
      expect(service).toBeDefined();
      expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('handles connection errors gracefully', async () => {
      const errorHandler = redisMock.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Connection failed');

      errorHandler?.(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Redis connection error:', testError);
      consoleErrorSpy.mockRestore();
    });

    test('disconnects gracefully', async () => {
      redisMock.disconnect.mockResolvedValue('OK');

      await service.disconnect();

      expect(redisMock.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feed Caching (Sorted Sets)', () => {
    test('returns empty array when feed is empty', async () => {
      redisMock.zrevrange.mockResolvedValue([]);

      const result = await service.getUnreadFeed('user-123', 20);

      expect(result).toEqual({ posts: [] });
      expect(redisMock.zrevrange).toHaveBeenCalledWith(
        'feed:unread:user-123',
        0,
        19,
        'WITHSCORES'
      );
    });

    test('returns cached posts in reverse chronological order', async () => {
      const postId1 = '111e4567-e89b-12d3-a456-426614174000';
      const postId2 = '222e4567-e89b-12d3-a456-426614174000';

      // Mock ZREVRANGE returning post IDs with scores
      redisMock.zrevrange.mockResolvedValue([
        postId2, '1704067300000', // Newer post
        postId1, '1704067200000'  // Older post
      ]);

      // Mock HGETALL for each post
      redisMock.hgetall
        .mockResolvedValueOnce({
          id: postId2,
          authorId: 'author2',
          authorHandle: 'user2',
          isPublic: 'true',
          likesCount: '20',
          commentsCount: '10',
          createdAt: '2025-01-01T00:01:40Z'
        })
        .mockResolvedValueOnce({
          id: postId1,
          authorId: 'author1',
          authorHandle: 'user1',
          isPublic: 'false',
          likesCount: '10',
          commentsCount: '5',
          createdAt: '2025-01-01T00:00:00Z'
        });

      const result = await service.getUnreadFeed('user-123', 20);

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].id).toBe(postId2); // Newer post first
      expect(result.posts[1].id).toBe(postId1); // Older post second
      expect(result.posts[0].likesCount).toBe(20);
      expect(result.posts[0].isPublic).toBe(true);
      expect(result.posts[1].isPublic).toBe(false);
    });

    test('respects limit parameter', async () => {
      const postIds = Array.from({ length: 10 }, (_, i) =>
        `${i}11e4567-e89b-12d3-a456-426614174000`
      );

      // Mock ZREVRANGE with limit
      const zrevrangeResult: string[] = [];
      postIds.slice(0, 5).forEach((id, i) => {
        zrevrangeResult.push(id, String(1704067200000 - i * 1000));
      });

      redisMock.zrevrange.mockResolvedValue(zrevrangeResult);

      // Mock HGETALL for each post
      postIds.slice(0, 5).forEach(id => {
        redisMock.hgetall.mockResolvedValueOnce({
          id,
          authorId: 'author1',
          authorHandle: 'user1',
          isPublic: 'true',
          likesCount: '10',
          commentsCount: '5',
          createdAt: '2025-01-01T00:00:00Z'
        });
      });

      const result = await service.getUnreadFeed('user-123', 5);

      expect(redisMock.zrevrange).toHaveBeenCalledWith(
        'feed:unread:user-123',
        0,
        4,
        'WITHSCORES'
      );
      expect(result.posts).toHaveLength(5);
    });

    test('handles cursor pagination correctly', async () => {
      const cursor = '1704067200000';

      // Mock ZREVRANGE with cursor (score-based pagination)
      redisMock.zrevrange.mockResolvedValue([
        'post1', '1704067100000',
        'post2', '1704067000000'
      ]);

      // Mock HGETALL for posts
      redisMock.hgetall
        .mockResolvedValueOnce({
          id: 'post1',
          authorId: 'author1',
          authorHandle: 'user1',
          isPublic: 'true',
          likesCount: '10',
          commentsCount: '5',
          createdAt: '2025-01-01T00:00:00Z'
        })
        .mockResolvedValueOnce({
          id: 'post2',
          authorId: 'author2',
          authorHandle: 'user2',
          isPublic: 'true',
          likesCount: '20',
          commentsCount: '10',
          createdAt: '2024-12-31T23:58:20Z'
        });

      const result = await service.getUnreadFeed('user-123', 2, cursor);

      expect(redisMock.zrevrange).toHaveBeenCalledWith(
        'feed:unread:user-123',
        0,
        -1,
        'WITHSCORES'
      );
      expect(result.posts).toHaveLength(2);
      expect(result.nextCursor).toBe('1704067000000');
    });
  });

  describe('Mark as Read', () => {
    test('removes post from unread set', async () => {
      redisMock.zrem.mockResolvedValue(1);

      await service.markPostAsRead('user-123', 'post-456');

      expect(redisMock.zrem).toHaveBeenCalledWith(
        'feed:unread:user-123',
        'post-456'
      );
    });

    test('handles non-existent posts gracefully', async () => {
      redisMock.zrem.mockResolvedValue(0);

      // Should not throw
      await service.markPostAsRead('user-123', 'non-existent-post');

      expect(redisMock.zrem).toHaveBeenCalledWith(
        'feed:unread:user-123',
        'non-existent-post'
      );
    });

    test('handles Redis errors gracefully', async () => {
      redisMock.zrem.mockRejectedValue(new Error('Redis error'));

      await expect(service.markPostAsRead('user-123', 'post-456'))
        .rejects.toThrow('Failed to mark post as read: Redis error');
    });
  });

  describe('Post Metadata Caching (Hashes)', () => {
    test('caches post metadata with TTL', async () => {
      redisMock.hset.mockResolvedValue(8); // Number of fields set
      redisMock.expire.mockResolvedValue(1);

      await service.cachePost('post-123', samplePost);

      expect(redisMock.hset).toHaveBeenCalledWith(
        'post:post-123',
        'id', samplePost.id,
        'authorId', samplePost.authorId,
        'authorHandle', samplePost.authorHandle,
        'caption', samplePost.caption,
        'imageUrl', samplePost.imageUrl,
        'isPublic', 'true',
        'likesCount', '10',
        'commentsCount', '5',
        'createdAt', samplePost.createdAt
      );
      expect(redisMock.expire).toHaveBeenCalledWith('post:post-123', 3600);
    });

    test('retrieves cached post correctly', async () => {
      redisMock.hgetall.mockResolvedValue({
        id: samplePost.id,
        authorId: samplePost.authorId,
        authorHandle: samplePost.authorHandle,
        caption: samplePost.caption,
        imageUrl: samplePost.imageUrl,
        isPublic: 'true',
        likesCount: '10',
        commentsCount: '5',
        createdAt: samplePost.createdAt
      });

      const result = await service.getCachedPost('post-123');

      expect(redisMock.hgetall).toHaveBeenCalledWith('post:post-123');
      expect(result).toEqual(samplePost);
    });

    test('handles missing optional fields (caption, imageUrl)', async () => {
      const postWithoutOptionals: CachedPost = {
        ...samplePost,
        caption: undefined,
        imageUrl: undefined
      };

      redisMock.hset.mockResolvedValue(6);
      redisMock.expire.mockResolvedValue(1);

      await service.cachePost('post-123', postWithoutOptionals);

      const hsetCall = redisMock.hset.mock.calls[0];
      expect(hsetCall).toContain('post:post-123');
      expect(hsetCall).not.toContain('caption');
      expect(hsetCall).not.toContain('imageUrl');
    });

    test('batch caching uses pipeline', async () => {
      const posts = [
        samplePost,
        { ...samplePost, id: 'post-2', authorHandle: 'user2' },
        { ...samplePost, id: 'post-3', authorHandle: 'user3' }
      ];

      await service.cachePosts(posts);

      expect(redisMock.pipeline).toHaveBeenCalledTimes(1);
      expect(pipelineMock.hset).toHaveBeenCalledTimes(3);
      expect(pipelineMock.expire).toHaveBeenCalledTimes(3);
      expect(pipelineMock.exec).toHaveBeenCalledTimes(1);

      // Verify each post was added to pipeline
      posts.forEach((post, index) => {
        const hsetCall = pipelineMock.hset.mock.calls[index];
        expect(hsetCall[0]).toBe(`post:${post.id}`);

        const expireCall = pipelineMock.expire.mock.calls[index];
        expect(expireCall[0]).toBe(`post:${post.id}`);
        expect(expireCall[1]).toBe(3600);
      });
    });
  });

  describe('Cache Invalidation', () => {
    test('deletes cached post', async () => {
      redisMock.del.mockResolvedValue(1);

      await service.invalidatePost('post-123');

      expect(redisMock.del).toHaveBeenCalledWith('post:post-123');
    });

    test('handles non-existent post gracefully', async () => {
      redisMock.del.mockResolvedValue(0);

      // Should not throw
      await service.invalidatePost('non-existent-post');

      expect(redisMock.del).toHaveBeenCalledWith('post:non-existent-post');
    });

    test('handles Redis errors gracefully', async () => {
      redisMock.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidatePost('post-123'))
        .rejects.toThrow('Failed to invalidate post cache: Redis error');
    });
  });

  describe('Error Handling', () => {
    test('throws errors for invalid userId', async () => {
      await expect(service.getUnreadFeed('', 20))
        .rejects.toThrow('Invalid userId: userId cannot be empty');

      await expect(service.markPostAsRead('', 'post-123'))
        .rejects.toThrow('Invalid userId: userId cannot be empty');
    });

    test('throws errors for invalid postId', async () => {
      await expect(service.markPostAsRead('user-123', ''))
        .rejects.toThrow('Invalid postId: postId cannot be empty');

      await expect(service.cachePost('', samplePost))
        .rejects.toThrow('Invalid postId: postId cannot be empty');

      await expect(service.invalidatePost(''))
        .rejects.toThrow('Invalid postId: postId cannot be empty');
    });

    test('handles Redis connection failures', async () => {
      redisMock.zrevrange.mockRejectedValue(new Error('Connection refused'));

      await expect(service.getUnreadFeed('user-123', 20))
        .rejects.toThrow('Failed to get unread feed: Connection refused');
    });
  });

  describe('Additional helper method tests', () => {
    test('getCachedPost returns null for non-existent post', async () => {
      redisMock.hgetall.mockResolvedValue({});

      const result = await service.getCachedPost('non-existent');

      expect(result).toBeNull();
    });

    test('handles limit validation in getUnreadFeed', async () => {
      await expect(service.getUnreadFeed('user-123', 0))
        .rejects.toThrow('Invalid limit: must be between 1 and 100');

      await expect(service.getUnreadFeed('user-123', 101))
        .rejects.toThrow('Invalid limit: must be between 1 and 100');
    });

    test('handles empty batch in cachePosts', async () => {
      await service.cachePosts([]);

      expect(redisMock.pipeline).not.toHaveBeenCalled();
    });
  });
});