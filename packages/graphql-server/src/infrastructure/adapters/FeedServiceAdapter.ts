/**
 * FeedServiceAdapter
 * 
 * Adapter that bridges FeedService to IFeedRepository interface.
 * Handles different feed types (following, explore) with pagination.
 */

import type { FeedService } from '@social-media-app/dal';
import type { IFeedRepository } from '../../domain/repositories/IFeedRepository.js';
import type { Post } from '../../domain/repositories/IPostRepository.js';
import { AsyncResult, UserId, Connection, PaginationArgs } from '../../shared/types/index.js';
import { ConnectionBuilder } from '../pagination/ConnectionBuilder.js';
import { CursorCodec } from '../pagination/CursorCodec.js';

/**
 * FeedServiceAdapter - Adapts FeedService to IFeedRepository
 */
export class FeedServiceAdapter implements IFeedRepository {
  private readonly connectionBuilder: ConnectionBuilder;

  constructor(private readonly feedService: FeedService) {
    const cursorCodec = new CursorCodec();
    this.connectionBuilder = new ConnectionBuilder(cursorCodec);
  }

  async getFollowingFeed(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>> {
    try {
      const result = await this.feedService.getFollowingFeed(userId, {
        limit: pagination.first || 20,
        cursor: pagination.after,
      });

      const connection = this.connectionBuilder.build<Post>({
        nodes: result.posts,
        hasMore: result.hasMore,
        getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt }),
      });

      return { success: true, data: connection };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err };
    }
  }

  async getExploreFeed(pagination: PaginationArgs, viewerId?: UserId): AsyncResult<Connection<Post>> {
    try {
      const result = await this.feedService.getExploreFeed({
        limit: pagination.first || 20,
        cursor: pagination.after,
        viewerId,
      });

      const connection = this.connectionBuilder.build<Post>({
        nodes: result.posts,
        hasMore: result.hasMore,
        getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt }),
      });

      return { success: true, data: connection };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err };
    }
  }
}
