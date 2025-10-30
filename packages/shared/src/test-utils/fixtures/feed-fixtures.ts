/**
 * Feed Test Fixtures
 *
 * Shared feed factory functions for creating test data across all packages.
 * Supports PostGridResponse, FeedResponse, and various feed-related types.
 *
 * @example
 * ```typescript
 * import { createMockExploreFeed, createMockFollowingFeed } from '@social-media-app/shared/test-utils';
 *
 * // Create explore feed with posts
 * const exploreFeed = createMockExploreFeed(10, true);
 *
 * // Create following feed with posts
 * const followingFeed = createMockFollowingFeed(5, false);
 * ```
 */

import type { PostGridResponse, FeedResponse, PostGridItem, PostWithAuthor } from '../../schemas/index.js';
import { createMockPostGridItems, createMockPostsWithAuthor } from './post-fixtures.js';

/**
 * Create a mock explore feed (PostGridResponse)
 *
 * @param postCount - Number of posts in the feed
 * @param hasNextPage - Whether there are more posts
 * @returns PostGridResponse object
 */
export function createMockExploreFeed(
  postCount: number = 10,
  hasNextPage: boolean = false
): PostGridResponse {
  const posts = createMockPostGridItems(postCount);
  
  return {
    posts,
    hasMore: hasNextPage,
    totalCount: hasNextPage ? postCount + 10 : postCount,
    nextCursor: hasNextPage ? Buffer.from(`cursor-${postCount}`).toString('base64') : undefined,
  };
}

/**
 * Create a mock following feed (FeedResponse with PostWithAuthor)
 *
 * @param postCount - Number of posts in the feed
 * @param hasNextPage - Whether there are more posts
 * @returns FeedResponse object
 */
export function createMockFollowingFeed(
  postCount: number = 10,
  hasNextPage: boolean = false
): FeedResponse {
  const posts = createMockPostsWithAuthor(postCount);
  
  return {
    posts,
    hasMore: hasNextPage,
  };
}

/**
 * Create an empty explore feed
 *
 * @returns Empty PostGridResponse
 */
export function createMockEmptyExploreFeed(): PostGridResponse {
  return {
    posts: [],
    hasMore: false,
    totalCount: 0,
    nextCursor: undefined,
  };
}

/**
 * Create an empty following feed
 *
 * @returns Empty FeedResponse
 */
export function createMockEmptyFollowingFeed(): FeedResponse {
  return {
    posts: [],
    hasMore: false,
  };
}

/**
 * Create a mock explore feed with specific post IDs
 *
 * @param postIds - Array of post IDs to include
 * @param hasNextPage - Whether there are more posts
 * @returns PostGridResponse object
 */
export function createMockExploreFeedWithPostIds(
  postIds: string[],
  hasNextPage: boolean = false
): PostGridResponse {
  const posts: PostGridItem[] = postIds.map((id, index) => ({
    id,
    userId: `user-${index + 1}`,
    userHandle: `user${index + 1}`,
    thumbnailUrl: `https://example.com/thumbnails/${id}.jpg`,
    caption: `Caption for ${id}`,
    likesCount: Math.floor(Math.random() * 100),
    commentsCount: Math.floor(Math.random() * 50),
    createdAt: new Date().toISOString(),
  }));

  return {
    posts,
    hasMore: hasNextPage,
    totalCount: hasNextPage ? postIds.length + 10 : postIds.length,
    nextCursor: hasNextPage ? Buffer.from(`cursor-${postIds.length}`).toString('base64') : undefined,
  };
}

/**
 * Create a mock following feed with specific post IDs
 *
 * @param postIds - Array of post IDs to include
 * @param hasNextPage - Whether there are more posts
 * @returns FeedResponse object
 */
export function createMockFollowingFeedWithPostIds(
  postIds: string[],
  hasNextPage: boolean = false
): FeedResponse {
  const posts: PostWithAuthor[] = postIds.map((id, index) => ({
    id,
    userId: `user-${index + 1}`,
    userHandle: `user${index + 1}`,
    imageUrl: `https://example.com/images/${id}.jpg`,
    caption: `Caption for ${id}`,
    likesCount: Math.floor(Math.random() * 100),
    commentsCount: Math.floor(Math.random() * 50),
    createdAt: new Date().toISOString(),
    authorId: `user-${index + 1}`,
    authorHandle: `user${index + 1}`,
    authorFullName: `User ${index + 1}`,
    authorProfilePictureUrl: `https://example.com/avatars/user-${index + 1}.jpg`,
    isLiked: false,
  }));

  return {
    posts,
    hasMore: hasNextPage,
  };
}

/**
 * Create mock input for marking posts as read
 *
 * @param postIds - Array of post IDs to mark as read
 * @returns MarkPostsAsReadInput object
 */
export function createMockMarkPostsAsReadInput(postIds: string[]) {
  return {
    postIds,
  };
}

/**
 * Create mock result for marking posts as read
 *
 * @param success - Whether the operation was successful
 * @param markedCount - Number of posts marked as read
 * @returns MarkPostsAsReadResult object
 */
export function createMockMarkPostsAsReadResult(
  success: boolean = true,
  markedCount: number = 0
) {
  return {
    success,
    markedCount,
  };
}
