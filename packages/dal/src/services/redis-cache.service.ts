/**
 * @fileoverview Redis caching service for Feed system
 * @module services/redis-cache
 */

import Redis, { type Redis as RedisClient } from 'ioredis';

/**
 * Cached post metadata structure
 */
export interface CachedPost {
  /** Post unique identifier */
  readonly id: string;
  /** Author user ID */
  readonly authorId: string;
  /** Author handle/username */
  readonly authorHandle: string;
  /** Post caption (optional) */
  readonly caption?: string;
  /** Post image URL (optional) */
  readonly imageUrl?: string;
  /** Public visibility flag */
  readonly isPublic: boolean;
  /** Number of likes */
  readonly likesCount: number;
  /** Number of comments */
  readonly commentsCount: number;
  /** ISO 8601 timestamp of post creation */
  readonly createdAt: string;
}

/**
 * Feed result with pagination support
 */
export interface CachedFeedResult {
  /** Array of cached posts */
  readonly posts: ReadonlyArray<CachedPost>;
  /** Cursor for next page (optional) */
  readonly nextCursor?: string;
}

/**
 * Redis caching service for feed system
 *
 * Provides caching patterns for:
 * - Feed caching using sorted sets
 * - Post metadata caching using hashes
 * - Batch operations with pipeline
 * - Cache invalidation
 *
 * @example
 * ```typescript
 * const redis = new Redis({ host: 'localhost', port: 6379 });
 * const cacheService = new RedisCacheService(redis);
 *
 * // Get unread feed
 * const feed = await cacheService.getUnreadFeed('user-123', 20);
 *
 * // Cache post metadata
 * await cacheService.cachePost('post-123', postData);
 *
 * // Mark post as read
 * await cacheService.markPostAsRead('user-123', 'post-123');
 * ```
 */
export class RedisCacheService {
  private readonly redis: RedisClient;
  private readonly POST_CACHE_TTL = 3600; // 1 hour in seconds

  /**
   * Creates a new RedisCacheService instance
   *
   * @param redis - Redis client instance
   */
  constructor(redis: RedisClient) {
    this.redis = redis;

    // Set up error handler
    this.redis.on('error', (error: Error) => {
      console.error('Redis connection error:', error);
    });
  }

  /**
   * Get unread feed posts for a user
   *
   * @param userId - User ID (UUID)
   * @param limit - Maximum posts to return (1-100)
   * @param cursor - Pagination cursor (optional)
   * @returns Feed result with posts and next cursor
   * @throws {Error} Invalid userId, limit out of range, or Redis connection error
   *
   * @example
   * ```typescript
   * const result = await cacheService.getUnreadFeed('user-123', 20);
   * console.log(result.posts); // Array of CachedPost
   *
   * // With pagination
   * const page2 = await cacheService.getUnreadFeed('user-123', 20, result.nextCursor);
   * ```
   */
  async getUnreadFeed(
    userId: Readonly<string>,
    limit: Readonly<number>,
    cursor?: Readonly<string>
  ): Promise<CachedFeedResult> {
    // Validation
    if (!userId || userId.trim() === '') {
      throw new Error('Invalid userId: userId cannot be empty');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Invalid limit: must be between 1 and 100');
    }

    try {
      const feedKey = `feed:unread:${userId}`;

      // Get posts from sorted set with scores (timestamps)
      let results: string[];

      if (cursor) {
        // Get all items and filter manually for cursor-based pagination
        results = await this.redis.zrevrange(feedKey, 0, -1, 'WITHSCORES');

        // Find cursor position and slice from there
        let startIndex = 0;
        for (let i = 1; i < results.length; i += 2) {
          if (parseFloat(results[i]) < parseFloat(cursor)) {
            startIndex = i - 1;
            break;
          }
        }

        if (startIndex > 0) {
          results = results.slice(startIndex);
        }

        // Apply limit (multiply by 2 for id/score pairs)
        results = results.slice(0, limit * 2);
      } else {
        // Simple limit-based query
        results = await this.redis.zrevrange(feedKey, 0, limit - 1, 'WITHSCORES');
      }

      // Parse results (alternating postId, score)
      const posts: CachedPost[] = [];
      let lastScore: string | undefined;

      for (let i = 0; i < results.length; i += 2) {
        const postId = results[i];
        const score = results[i + 1];
        lastScore = score;

        // Get post metadata from hash
        const postData = await this.getCachedPost(postId);
        if (postData) {
          posts.push(postData);
        }
      }

      // Set next cursor to last score if we have full page
      const nextCursor = posts.length === limit ? lastScore : undefined;

      return {
        posts,
        nextCursor
      };
    } catch (error: any) {
      throw new Error(`Failed to get unread feed: ${error.message}`);
    }
  }

  /**
   * Mark a post as read by removing it from the user's unread feed
   *
   * @param userId - User ID (UUID)
   * @param postId - Post ID to mark as read
   * @throws {Error} Invalid userId/postId or Redis connection error
   *
   * @example
   * ```typescript
   * await cacheService.markPostAsRead('user-123', 'post-456');
   * ```
   */
  async markPostAsRead(
    userId: Readonly<string>,
    postId: Readonly<string>
  ): Promise<void> {
    // Validation
    if (!userId || userId.trim() === '') {
      throw new Error('Invalid userId: userId cannot be empty');
    }

    if (!postId || postId.trim() === '') {
      throw new Error('Invalid postId: postId cannot be empty');
    }

    try {
      const feedKey = `feed:unread:${userId}`;
      await this.redis.zrem(feedKey, postId);
    } catch (error: any) {
      throw new Error(`Failed to mark post as read: ${error.message}`);
    }
  }

  /**
   * Cache post metadata with TTL
   *
   * @param postId - Post ID
   * @param postData - Post metadata to cache
   * @throws {Error} Invalid postId or Redis connection error
   *
   * @example
   * ```typescript
   * await cacheService.cachePost('post-123', {
   *   id: 'post-123',
   *   authorId: 'user-456',
   *   authorHandle: 'johndoe',
   *   caption: 'Hello world',
   *   isPublic: true,
   *   likesCount: 10,
   *   commentsCount: 5,
   *   createdAt: '2025-01-01T00:00:00Z'
   * });
   * ```
   */
  async cachePost(
    postId: Readonly<string>,
    postData: Readonly<CachedPost>
  ): Promise<void> {
    // Validation
    if (!postId || postId.trim() === '') {
      throw new Error('Invalid postId: postId cannot be empty');
    }

    try {
      const postKey = `post:${postId}`;

      // Build hash fields array with all fields in order
      const fields: (string | number)[] = [
        'id', postData.id,
        'authorId', postData.authorId,
        'authorHandle', postData.authorHandle
      ];

      // Add optional fields if present
      if (postData.caption) {
        fields.push('caption', postData.caption);
      }
      if (postData.imageUrl) {
        fields.push('imageUrl', postData.imageUrl);
      }

      // Add remaining required fields
      fields.push(
        'isPublic', String(postData.isPublic),
        'likesCount', String(postData.likesCount),
        'commentsCount', String(postData.commentsCount),
        'createdAt', postData.createdAt
      );

      // Set hash fields
      await this.redis.hset(postKey, ...fields);

      // Set TTL
      await this.redis.expire(postKey, this.POST_CACHE_TTL);
    } catch (error: any) {
      throw new Error(`Failed to cache post: ${error.message}`);
    }
  }

  /**
   * Get cached post metadata
   *
   * @param postId - Post ID
   * @returns Cached post or null if not found
   * @throws {Error} Redis connection error
   *
   * @example
   * ```typescript
   * const post = await cacheService.getCachedPost('post-123');
   * if (post) {
   *   console.log(post.authorHandle);
   * }
   * ```
   */
  async getCachedPost(postId: Readonly<string>): Promise<CachedPost | null> {
    try {
      const postKey = `post:${postId}`;
      const data = await this.redis.hgetall(postKey);

      // Check if post exists (hgetall returns empty object for non-existent key)
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      // Parse and return cached post
      return {
        id: data.id,
        authorId: data.authorId,
        authorHandle: data.authorHandle,
        caption: data.caption || undefined,
        imageUrl: data.imageUrl || undefined,
        isPublic: data.isPublic === 'true',
        likesCount: parseInt(data.likesCount, 10),
        commentsCount: parseInt(data.commentsCount, 10),
        createdAt: data.createdAt
      };
    } catch (error: any) {
      throw new Error(`Failed to get cached post: ${error.message}`);
    }
  }

  /**
   * Cache multiple posts in batch using pipeline
   *
   * @param posts - Array of posts to cache
   * @throws {Error} Redis connection error
   *
   * @example
   * ```typescript
   * await cacheService.cachePosts([
   *   { id: 'post-1', authorId: 'user-1', ... },
   *   { id: 'post-2', authorId: 'user-2', ... },
   *   { id: 'post-3', authorId: 'user-3', ... }
   * ]);
   * ```
   */
  async cachePosts(posts: ReadonlyArray<CachedPost>): Promise<void> {
    // Early return for empty batch
    if (!posts || posts.length === 0) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const post of posts) {
        const postKey = `post:${post.id}`;

        // Build hash fields array with all fields in order
        const fields: (string | number)[] = [
          'id', post.id,
          'authorId', post.authorId,
          'authorHandle', post.authorHandle
        ];

        // Add optional fields if present
        if (post.caption) {
          fields.push('caption', post.caption);
        }
        if (post.imageUrl) {
          fields.push('imageUrl', post.imageUrl);
        }

        // Add remaining required fields
        fields.push(
          'isPublic', String(post.isPublic),
          'likesCount', String(post.likesCount),
          'commentsCount', String(post.commentsCount),
          'createdAt', post.createdAt
        );

        // Add commands to pipeline
        pipeline.hset(postKey, ...fields);
        pipeline.expire(postKey, this.POST_CACHE_TTL);
      }

      // Execute pipeline
      await pipeline.exec();
    } catch (error: any) {
      throw new Error(`Failed to cache posts batch: ${error.message}`);
    }
  }

  /**
   * Invalidate cached post
   *
   * @param postId - Post ID to invalidate
   * @throws {Error} Invalid postId or Redis connection error
   *
   * @example
   * ```typescript
   * await cacheService.invalidatePost('post-123');
   * ```
   */
  async invalidatePost(postId: Readonly<string>): Promise<void> {
    // Validation
    if (!postId || postId.trim() === '') {
      throw new Error('Invalid postId: postId cannot be empty');
    }

    try {
      const postKey = `post:${postId}`;
      await this.redis.del(postKey);
    } catch (error: any) {
      throw new Error(`Failed to invalidate post cache: ${error.message}`);
    }
  }

  /**
   * Disconnect from Redis gracefully
   *
   * @example
   * ```typescript
   * await cacheService.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}