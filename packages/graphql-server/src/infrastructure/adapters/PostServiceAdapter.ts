/**
 * PostServiceAdapter
 *
 * Adapter that bridges PostService to IPostRepository interface.
 * Applies the Adapter Pattern to decouple from concrete PostService.
 *
 * Features:
 * - Adapts PostService methods to IPostRepository interface
 * - Transforms DAL Post (caption?: string | undefined) to Domain Post (caption: string | null)
 * - Wraps errors in Result type for type-safe error handling
 * - Handles pagination via ConnectionBuilder
 * - Stateless and thread-safe
 *
 * Advanced TypeScript Pattern: Undefined to Null Transformation
 * GraphQL uses null for absent values, not undefined
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
      const dalPost = await this.postService.getPostById(id);
      if (!dalPost) {
        return { success: true, data: null };
      }
      // Transform DAL post (caption?: undefined) to domain post (caption: null)
      const domainPost: Post = {
        ...dalPost,
        caption: dalPost.caption ?? null,
      };
      return {
        success: true,
        data: domainPost,
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
      // Call PostService with correct method name: getUserPosts (not getPostsByUser)
      const result = await this.postService.getUserPosts(
        userId,
        pagination.first || 10,
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
