import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { FeedPostItem } from '@social-media-app/shared';

/**
 * Feed service for managing materialized feed items
 * Part of Phase 2 hybrid feed architecture
 *
 * This service handles:
 * - Writing feed items to user's materialized feed cache
 * - Reading paginated feed items from cache
 * - Deleting feed items on post deletion or unfollow
 *
 * Architecture:
 * - Phase 2.1: Write & Read operations (this file)
 * - Phase 2.2: Stream processors for fanout
 * - Phase 2.3: Hybrid feed combining materialized + query-time
 */
export class FeedService {
  private readonly tableName: string;

  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    tableName: string
  ) {
    this.tableName = tableName;
  }

  /**
   * Write a feed item to user's materialized feed cache
   *
   * Called by stream processor when:
   * - New post created (fanout to followers if < 5000)
   * - Post liked/unliked (update isLiked flag)
   * - Post metrics updated (update likesCount/commentsCount)
   *
   * @param params - Feed item parameters
   * @throws Error if validation fails
   *
   * @example
   * ```typescript
   * await feedService.writeFeedItem({
   *   userId: 'user-123',
   *   postId: 'post-456',
   *   authorId: 'author-789',
   *   authorHandle: 'john_doe',
   *   isLiked: false,
   *   createdAt: '2025-10-12T10:00:00Z'
   * });
   * ```
   */
  async writeFeedItem(_params: {
    userId: string;
    postId: string;
    authorId: string;
    authorHandle: string;
    authorFullName?: string;
    authorProfilePictureUrl?: string;
    caption?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    likesCount?: number;
    commentsCount?: number;
    isLiked: boolean;
    createdAt: string;
  }): Promise<void> {
    throw new Error('Not implemented: writeFeedItem');
  }

  /**
   * Get user's materialized feed items with pagination
   *
   * Returns feed items sorted by post creation time (newest first).
   * Uses cursor-based pagination for efficient large result sets.
   *
   * @param params - Query parameters
   * @returns Paginated feed items with cursor
   *
   * @example
   * ```typescript
   * const { items, nextCursor } = await feedService.getMaterializedFeedItems({
   *   userId: 'user-123',
   *   limit: 20
   * });
   *
   * // Get next page
   * const page2 = await feedService.getMaterializedFeedItems({
   *   userId: 'user-123',
   *   limit: 20,
   *   cursor: nextCursor
   * });
   * ```
   */
  async getMaterializedFeedItems(_params: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    items: FeedPostItem[];
    nextCursor?: string;
  }> {
    throw new Error('Not implemented: getMaterializedFeedItems');
  }

  /**
   * Delete all feed items for a specific post across all users
   *
   * Called when post is deleted by author.
   * Uses scan + batch delete to remove post from all feeds.
   *
   * PERFORMANCE NOTE: This is a scan operation. For large datasets,
   * consider using GSI2 (postId as PK) for efficient deletion.
   *
   * @param params - Deletion parameters
   * @returns Number of feed items deleted
   *
   * @example
   * ```typescript
   * const { deletedCount } = await feedService.deleteFeedItemsByPost({
   *   postId: 'post-456'
   * });
   * console.log(`Removed post from ${deletedCount} feeds`);
   * ```
   */
  async deleteFeedItemsByPost(_params: {
    postId: string;
  }): Promise<{ deletedCount: number }> {
    throw new Error('Not implemented: deleteFeedItemsByPost');
  }

  /**
   * Delete feed items for specific author from user's feed
   *
   * Called when user unfollows another user.
   * Removes all posts from unfollowed user from this user's feed.
   *
   * @param params - Deletion parameters
   * @returns Number of feed items deleted
   *
   * @example
   * ```typescript
   * const { deletedCount } = await feedService.deleteFeedItemsForUser({
   *   userId: 'user-123',
   *   authorId: 'unfollowed-user-456'
   * });
   * console.log(`Removed ${deletedCount} posts from feed`);
   * ```
   */
  async deleteFeedItemsForUser(_params: {
    userId: string;
    authorId: string;
  }): Promise<{ deletedCount: number }> {
    throw new Error('Not implemented: deleteFeedItemsForUser');
  }
}
