/**
 * Feed Service Interface
 *
 * Defines the contract for feed services.
 * Supports dependency injection and easy swapping of implementations.
 */

import type { AsyncState } from '../../graphql/types';
import type { PostConnection } from './IPostService';
import type { PostWithAuthor } from '@social-media-app/shared';

/**
 * Feed type discriminated union
 * Ensures type-safe feed filtering
 */
export type FeedType = 'explore' | 'following';

/**
 * Feed query options with pagination
 */
export interface FeedQueryOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Feed result - cleaner interface that hides GraphQL implementation details
 * Components don't need to know about edges/nodes
 */
export interface FeedResult {
  items: PostWithAuthor[];
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Mark posts as read input
 */
export interface MarkPostsAsReadInput {
  readonly postIds: readonly string[];
}

/**
 * Mark posts as read result
 */
export interface MarkPostsAsReadResult {
  readonly success: boolean;
  readonly markedCount: number;
}

/**
 * Feed Service Interface
 *
 * All implementations must provide these methods.
 * Returns AsyncState for consistent state management (no throwing).
 */
export interface IFeedService {
  /**
   * Get explore feed posts (all public posts from all users)
   * No authentication required - shows all public content
   *
   * @param options - Pagination options (limit, cursor)
   * @returns AsyncState with FeedResult
   */
  getExploreFeed(options?: FeedQueryOptions): Promise<AsyncState<FeedResult>>;

  /**
   * Get following feed posts (posts from users you follow)
   * Requires authentication
   *
   * @param options - Pagination options (limit, cursor)
   * @returns AsyncState with FeedResult
   */
  getFollowingFeed(options?: FeedQueryOptions): Promise<AsyncState<FeedResult>>;

  /**
   * Mark posts as read (Instagram-like behavior)
   * Posts marked as read will not appear in future feed requests
   * Requires authentication
   *
   * @param input - Post IDs to mark as read
   * @returns AsyncState with result indicating success and count
   */
  markPostsAsRead(input: MarkPostsAsReadInput): Promise<AsyncState<MarkPostsAsReadResult>>;
}
