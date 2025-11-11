/**
 * Feed Matchers for GraphQL Tests
 *
 * Custom assertion helpers for feed-related tests.
 * Provides semantic, readable assertions for common feed testing scenarios.
 *
 * @example
 * ```typescript
 * import { FeedMatchers } from '../helpers/feed-matchers.js';
 *
 * FeedMatchers.expectPostConnection(data.exploreFeed);
 * FeedMatchers.expectPost(data.exploreFeed.edges[0].node, 'post-1');
 * FeedMatchers.expectPageInfo(data.exploreFeed.pageInfo, true, false);
 * ```
 */

import { expect } from 'vitest';

/**
 * Custom matchers for feed tests
 * Provides semantic assertions for common feed testing patterns
 */
export const FeedMatchers = {
  /**
   * Assert that an object is a valid PostConnection
   *
   * @param connection - Object to check
   */
  expectPostConnection(connection: unknown): void {
    expect(connection).toBeDefined();
    expect(connection).toHaveProperty('edges');
    expect(connection).toHaveProperty('pageInfo');
    expect(Array.isArray((connection as any).edges)).toBe(true);
  },

  /**
   * Assert that an object is a valid Post with expected ID
   *
   * @param post - Object to check
   * @param expectedId - Expected post ID
   */
  expectPost(post: unknown, expectedId: string): void {
    expect(post).toBeDefined();
    expect(post).toHaveProperty('id', expectedId);
    expect(post).toHaveProperty('userId');
    expect(post).toHaveProperty('author');
    expect(post).toHaveProperty('likesCount');
    expect(post).toHaveProperty('commentsCount');
    expect(post).toHaveProperty('createdAt');
  },

  /**
   * Assert that PageInfo has expected pagination state
   *
   * @param pageInfo - PageInfo object to check
   * @param expectedHasNext - Expected hasNextPage value
   * @param expectedHasPrevious - Expected hasPreviousPage value (default: false)
   */
  expectPageInfo(
    pageInfo: unknown,
    expectedHasNext: boolean,
    expectedHasPrevious: boolean = false
  ): void {
    expect(pageInfo).toBeDefined();
    expect(pageInfo).toHaveProperty('hasNextPage', expectedHasNext);
    expect(pageInfo).toHaveProperty('hasPreviousPage', expectedHasPrevious);
    
    if (expectedHasNext) {
      expect(pageInfo).toHaveProperty('endCursor');
      expect((pageInfo as any).endCursor).toBeTruthy();
    }
  },

  /**
   * Assert that an author object has expected handle
   *
   * @param author - Author object to check
   * @param expectedHandle - Expected handle
   */
  expectAuthor(author: unknown, expectedHandle: string): void {
    expect(author).toBeDefined();
    expect(author).toHaveProperty('id');
    expect(author).toHaveProperty('handle', expectedHandle);
    expect(author).toHaveProperty('fullName');
  },

  /**
   * Assert that a post has like information
   *
   * @param post - Post object to check
   * @param expectedIsLiked - Expected isLiked value
   * @param expectedLikesCount - Expected likesCount (optional)
   */
  expectPostWithLikes(
    post: unknown,
    expectedIsLiked: boolean,
    expectedLikesCount?: number
  ): void {
    expect(post).toBeDefined();
    expect(post).toHaveProperty('isLiked', expectedIsLiked);
    expect(post).toHaveProperty('likesCount');
    
    if (expectedLikesCount !== undefined) {
      expect((post as any).likesCount).toBe(expectedLikesCount);
    }
  },

  /**
   * Assert that a connection has expected number of edges
   *
   * @param connection - Connection object to check
   * @param expectedCount - Expected number of edges
   */
  expectEdgeCount(connection: unknown, expectedCount: number): void {
    expect(connection).toBeDefined();
    expect(connection).toHaveProperty('edges');
    expect((connection as any).edges).toHaveLength(expectedCount);
  },

  /**
   * Assert that all posts in a connection have unique IDs
   *
   * @param connection - Connection object to check
   */
  expectUniquePostIds(connection: unknown): void {
    expect(connection).toBeDefined();
    const edges = (connection as any).edges;
    expect(Array.isArray(edges)).toBe(true);

    const ids = edges.map((edge: any) => edge.node.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  },

  /**
   * Assert that posts are in descending order by createdAt
   *
   * @param connection - Connection object to check
   */
  expectPostsInChronologicalOrder(connection: unknown): void {
    expect(connection).toBeDefined();
    const edges = (connection as any).edges;
    expect(Array.isArray(edges)).toBe(true);

    if (edges.length <= 1) return;

    for (let i = 0; i < edges.length - 1; i++) {
      const current = new Date(edges[i].node.createdAt).getTime();
      const next = new Date(edges[i + 1].node.createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  },

  /**
   * Assert that a cursor is valid base64
   *
   * @param cursor - Cursor string to check
   */
  expectValidCursor(cursor: unknown): void {
    expect(cursor).toBeDefined();
    expect(typeof cursor).toBe('string');
    
    // Try to decode as base64
    try {
      Buffer.from(cursor as string, 'base64').toString('utf8');
    } catch (error) {
      throw new Error(`Expected valid base64 cursor, got: ${cursor}`);
    }
  },

  /**
   * Assert that an empty connection is valid
   *
   * @param connection - Connection object to check
   */
  expectEmptyConnection(connection: unknown): void {
    expect(connection).toBeDefined();
    expect(connection).toHaveProperty('edges');
    expect((connection as any).edges).toHaveLength(0);
    expect(connection).toHaveProperty('pageInfo');
    expect((connection as any).pageInfo.hasNextPage).toBe(false);
    expect((connection as any).pageInfo.hasPreviousPage).toBe(false);
  },

  /**
   * Assert that a post has all required fields
   *
   * @param post - Post object to check
   */
  expectCompletePost(post: unknown): void {
    expect(post).toBeDefined();
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('userId');
    expect(post).toHaveProperty('imageUrl');
    expect(post).toHaveProperty('thumbnailUrl');
    expect(post).toHaveProperty('likesCount');
    expect(post).toHaveProperty('commentsCount');
    expect(post).toHaveProperty('createdAt');
    expect(post).toHaveProperty('author');
    
    const author = (post as any).author;
    expect(author).toHaveProperty('id');
    expect(author).toHaveProperty('handle');
  },
};
