/**
 * PostServiceAdapter
 * 
 * Adapter that bridges PostService to IPostRepository interface.
 * Applies the Adapter Pattern to decouple from concrete PostService.
 * 
 * Features:
 * - Adapts PostService methods to IPostRepository interface
 * - Wraps errors in Result type for type-safe error handling
 * - Handles pagination via ConnectionBuilder
 * - Stateless and thread-safe
 */

import type { PostService } from '@social-media-app/dal';
import type { IPostRepository, Post } from '../../domain/repositories/IPostRepository.js';
import { AsyncResult, PostId, UserId, Connection, PaginationArgs } from '../../shared/types/index.js';
import { ConnectionBuilder } from '../pagination/ConnectionBuilder.js';
import { CursorCodec } from '../pagination/CursorCodec.js';

/**
 * PostServiceAdapter - Adapts PostService to IPostRepository
 * 
 * This adapter wraps the existing PostService and implements the
 * IPostRepository interface.
 */
export class PostServiceAdapter implements IPostRepository {
  private readonly connectionBuilder: ConnectionBuilder;

  /**
   * Creates a PostServiceAdapter.
   * 
   * @param postService - The PostService instance to adapt
   */
  constructor(private readonly postService: PostService) {
    const cursorCodec = new CursorCodec();
    this.connectionBuilder = new ConnectionBuilder(cursorCodec);
  }

  /**
   * Find post by ID.
   * 
   * @param id - The post ID (branded type)
   * @returns AsyncResult with Post if found, null if not found, or error on failure
   */
  async findById(id: PostId): AsyncResult<Post | null> {
    try {
      const post = await this.postService.getPostById(id);
      return {
        success: true,
        data: post,
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
   * Find posts by user (paginated).
   * 
   * @param userId - The user whose posts to fetch
   * @param pagination - Pagination arguments
   * @returns AsyncResult with Connection of posts or error on failure
   */
  async findByUser(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>> {
    try {
      // Call PostService with pagination
      const result = await this.postService.getPostsByUser(userId, {
        limit: pagination.first || 10,
        cursor: pagination.after,
      });

      // Build Relay Connection
      const connection = this.connectionBuilder.build<Post>({
        nodes: result.posts,
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
