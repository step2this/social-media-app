/**
 * FeedServiceAdapter
 *
 * Adapter that bridges PostService and FollowService to IFeedRepository interface.
 * Applies the Adapter Pattern to decouple from concrete DAL services.
 *
 * Features:
 * - Implements IFeedRepository using PostService feed methods
 * - Transforms DAL Post types to Domain Post types
 * - Wraps errors in Result type for type-safe error handling
 * - Handles pagination via ConnectionBuilder
 * - Stateless and thread-safe
 */

import type { PostService, FollowService } from '@social-media-app/dal';
import type { IFeedRepository } from '../../domain/repositories/IFeedRepository.js';
import type { Post } from '../../domain/repositories/IPostRepository.js';
import { AsyncResult, UserId, Connection, PaginationArgs } from '../../shared/types/index.js';
import { ConnectionBuilder } from '../pagination/ConnectionBuilder.js';
import { CursorCodec } from '../pagination/CursorCodec.js';

/**
 * FeedServiceAdapter - Adapts PostService to IFeedRepository
 *
 * This adapter wraps the existing PostService and FollowService
 * to implement the IFeedRepository interface for feed operations.
 */
export class FeedServiceAdapter implements IFeedRepository {
  private readonly connectionBuilder: ConnectionBuilder;

  /**
   * Creates a FeedServiceAdapter.
   *
   * @param postService - The PostService instance for feed operations
   * @param followService - The FollowService instance for following relationships
   */
  constructor(
    private readonly postService: PostService,
    private readonly followService: FollowService
  ) {
    const cursorCodec = new CursorCodec();
    this.connectionBuilder = new ConnectionBuilder(cursorCodec);
  }

  /**
   * Get following feed for a user (posts from users they follow).
   *
   * @param userId - The user whose following feed to fetch
   * @param pagination - Pagination arguments (first, after, etc.)
   * @returns AsyncResult with Connection of posts or error on failure
   */
  async getFollowingFeed(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>> {
    try {
      const result = await this.postService.getFollowingFeedPosts(
        userId,
        this.followService,
        pagination.first || 20,
        pagination.after
      );

      // Transform DAL posts to domain posts (caption?: undefined → caption: null)
      const domainPosts = result.posts.map((dalPost: any) => ({
        ...dalPost,
        caption: dalPost.caption ?? null,
      } as Post));

      // Build Relay Connection
      const connection = this.connectionBuilder.build<Post>({
        nodes: domainPosts,
        hasMore: result.hasMore,
        getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt }),
      });

      return {
        success: true,
        data: connection,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err,
      };
    }
  }

  /**
   * Get explore feed (public feed for discovery).
   *
   * @param pagination - Pagination arguments (first, after, etc.)
   * @param _viewerId - Optional viewer ID for personalization (not used in Phase 1)
   * @returns AsyncResult with Connection of posts or error on failure
   */
  async getExploreFeed(pagination: PaginationArgs, _viewerId?: UserId): AsyncResult<Connection<Post>> {
    try {
      const result = await this.postService.getFeedPosts(
        pagination.first || 20,
        pagination.after
      );

      // Transform DAL posts to domain posts (caption?: undefined → caption: null)
      const domainPosts = result.posts.map((dalPost: any) => ({
        ...dalPost,
        caption: dalPost.caption ?? null,
      } as Post));

      // Build Relay Connection
      const connection = this.connectionBuilder.build<Post>({
        nodes: domainPosts,
        hasMore: result.hasMore,
        getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt }),
      });

      return {
        success: true,
        data: connection,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err,
      };
    }
  }
}
