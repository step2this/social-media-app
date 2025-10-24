/**
 * Feed Test Fixtures
 *
 * Factory functions for creating test data for feeds.
 * Follows the DRY principle with sensible defaults.
 */

import type { PostConnection } from '../../interfaces/IPostService';
import type { MarkPostsAsReadInput, MarkPostsAsReadResult } from '../../interfaces/IFeedService';
import { createMockPost, createMockPosts, createMockPostConnection } from './postFixtures';

/**
 * Create a mock explore feed with posts
 *
 * @param postCount - Number of posts in feed
 * @param hasNextPage - Whether there are more posts
 * @returns PostConnection for explore feed
 */
export function createMockExploreFeed(
  postCount: number = 3,
  hasNextPage: boolean = false
): PostConnection {
  const posts = createMockPosts(postCount);
  return createMockPostConnection(posts, hasNextPage);
}

/**
 * Create a mock following feed with posts from specific users
 *
 * @param postCount - Number of posts in feed
 * @param hasNextPage - Whether there are more posts
 * @returns PostConnection for following feed
 */
export function createMockFollowingFeed(
  postCount: number = 3,
  hasNextPage: boolean = false
): PostConnection {
  const posts = createMockPosts(postCount, {
    author: {
      id: 'following-user-1',
      handle: 'following_user',
      username: 'Following User',
      displayName: 'Following User Display',
      profilePictureUrl: 'https://example.com/avatar.jpg',
    },
  });
  return createMockPostConnection(posts, hasNextPage);
}

/**
 * Create an empty feed
 *
 * @returns Empty PostConnection
 */
export function createMockEmptyFeed(): PostConnection {
  return createMockPostConnection([], false);
}

/**
 * Create mark posts as read input
 *
 * @param postIds - Array of post IDs to mark as read
 * @returns MarkPostsAsReadInput
 */
export function createMockMarkPostsAsReadInput(
  postIds: readonly string[] = ['post-1', 'post-2', 'post-3']
): MarkPostsAsReadInput {
  return {
    postIds,
  };
}

/**
 * Create mark posts as read result
 *
 * @param success - Whether operation succeeded
 * @param markedCount - Number of posts marked
 * @returns MarkPostsAsReadResult
 */
export function createMockMarkPostsAsReadResult(
  success: boolean = true,
  markedCount: number = 3
): MarkPostsAsReadResult {
  return {
    success,
    markedCount,
  };
}

/**
 * Create a mock feed with specific post IDs
 *
 * @param postIds - Specific post IDs to include
 * @param hasNextPage - Whether there are more posts
 * @returns PostConnection with specified posts
 */
export function createMockFeedWithPostIds(
  postIds: string[],
  hasNextPage: boolean = false
): PostConnection {
  const posts = postIds.map((id) => createMockPost({ id }));
  return createMockPostConnection(posts, hasNextPage);
}
