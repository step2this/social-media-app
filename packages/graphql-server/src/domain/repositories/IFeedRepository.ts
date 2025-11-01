/**
 * IFeedRepository - Feed data access interface
 *
 * Defines the contract for feed data access (user feeds, explore feeds).
 * Follows Repository Pattern and Dependency Inversion Principle.
 *
 * Benefits:
 * - Decouples business logic from feed service
 * - Enables easy testing (mock this interface)
 * - Allows swapping feed implementations (algorithm changes, caching)
 * - Type-safe with branded types and pagination
 * - Result type for explicit error handling
 */

import { AsyncResult, UserId, Connection, PaginationArgs } from '../../shared/types/index.js';
import { Post } from './IPostRepository.js';

/**
 * IFeedRepository - Repository interface for feed data access
 *
 * Defines methods for accessing different types of feeds.
 * All methods return AsyncResult with Connection for pagination.
 */
export interface IFeedRepository {
  /**
   * Get following feed for a user (posts from users they follow).
   *
   * @param userId - The user whose following feed to fetch
   * @param pagination - Pagination arguments (first, after, etc.)
   * @returns AsyncResult with Connection of posts or error on failure
   *
   * @example
   * ```typescript
   * const result = await feedRepository.getFollowingFeed(
   *   UserId('user-123'),
   *   { first: 20 }
   * );
   *
   * if (result.success) {
   *   console.log('Feed posts:', result.data.edges.length);
   *   console.log('Has more:', result.data.pageInfo.hasNextPage);
   * }
   * ```
   */
  getFollowingFeed(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>>;

  /**
   * Get explore feed (public feed for discovery).
   *
   * @param pagination - Pagination arguments (first, after, etc.)
   * @param viewerId - Optional viewer ID for personalization
   * @returns AsyncResult with Connection of posts or error on failure
   *
   * @example
   * ```typescript
   * // Anonymous user
   * const result = await feedRepository.getExploreFeed({ first: 20 });
   *
   * // Authenticated user (personalized)
   * const result = await feedRepository.getExploreFeed(
   *   { first: 20 },
   *   UserId('user-123')
   * );
   * ```
   */
  getExploreFeed(pagination: PaginationArgs, viewerId?: UserId): AsyncResult<Connection<Post>>;
}
