/**
 * IPostRepository - Post data access interface
 *
 * Defines the contract for post data access.
 * Follows Repository Pattern and Dependency Inversion Principle.
 *
 * Benefits:
 * - Decouples business logic from data source
 * - Enables easy testing (mock this interface)
 * - Allows swapping implementations
 * - Type-safe with branded types and pagination
 * - Result type for explicit error handling
 *
 * @example
 * ```typescript
 * // In use case:
 * class GetPostById {
 *   constructor(private readonly postRepository: IPostRepository) {}
 *
 *   async execute(input: { postId: PostId }): AsyncResult<Post> {
 *     const result = await this.postRepository.findById(input.postId);
 *
 *     if (!result.success) return result;
 *     if (!result.data) {
 *       return { success: false, error: new NotFoundError('Post not found') };
 *     }
 *
 *     return { success: true, data: result.data };
 *   }
 * }
 * ```
 */

import { AsyncResult, PostId, UserId, Connection, PaginationArgs } from '../../shared/types/index.js';

/**
 * Post entity
 *
 * Represents a social media post.
 * This is the domain model, separate from database models or GraphQL types.
 */
export interface Post {
  /**
   * Unique post identifier
   */
  id: string;

  /**
   * User ID of the post author
   */
  userId: string;

  /**
   * URL to the post image
   */
  imageUrl: string;

  /**
   * Post caption/description
   */
  caption: string | null;

  /**
   * Number of likes on this post
   */
  likesCount: number;

  /**
   * Number of comments on this post
   */
  commentsCount: number;

  /**
   * Whether the current user has liked this post (optional, depends on viewer context)
   */
  isLiked?: boolean;

  /**
   * Post creation timestamp
   */
  createdAt: string;

  /**
   * Post last update timestamp
   */
  updatedAt: string;
}

/**
 * IPostRepository - Repository interface for post data access
 *
 * Defines methods for accessing post data.
 * All methods return AsyncResult for type-safe error handling.
 *
 * This interface is intentionally minimal - it only defines operations
 * actually needed by the application.
 */
export interface IPostRepository {
  /**
   * Find post by ID.
   *
   * @param id - The post ID to look up
   * @returns AsyncResult with Post if found, null if not found, or error on failure
   *
   * @example
   * ```typescript
   * const result = await postRepository.findById(PostId('post-123'));
   *
   * if (!result.success) {
   *   console.error('Failed to fetch post:', result.error);
   *   return;
   * }
   *
   * if (!result.data) {
   *   console.log('Post not found');
   *   return;
   * }
   *
   * console.log('Found post:', result.data.caption);
   * ```
   */
  findById(id: PostId): AsyncResult<Post | null>;

  /**
   * Find posts by user (paginated).
   *
   * Returns a Relay-style Connection for cursor-based pagination.
   *
   * @param userId - The user whose posts to fetch
   * @param pagination - Pagination arguments (first, after, etc.)
   * @returns AsyncResult with Connection of posts or error on failure
   *
   * @example
   * ```typescript
   * const result = await postRepository.findByUser(
   *   UserId('user-123'),
   *   { first: 10 }
   * );
   *
   * if (result.success) {
   *   console.log('Posts:', result.data.edges.length);
   *   console.log('Has more:', result.data.pageInfo.hasNextPage);
   * }
   * ```
   */
  findByUser(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>>;
}
