/**
 * Feed item mapping utilities
 * Provides pure functional mappers for converting FeedItemEntity to PostWithAuthor domain objects
 */

import type { PostWithAuthor } from '@social-media-app/shared';
import type { FeedItemEntity } from '../entities/feed-item.entity.js';

/**
 * Maps FeedItemEntity (DynamoDB) to PostWithAuthor (domain schema)
 *
 * Transforms database entity to API response format.
 * Sets source to 'materialized' to indicate this came from the materialized feed cache.
 *
 * @param entity - FeedItemEntity from DynamoDB
 * @returns PostWithAuthor domain object
 *
 * @example
 * ```typescript
 * const feedItem = mapEntityToFeedPostItem(entity);
 * // Returns: { id, userId, userHandle, imageUrl, caption, likesCount, ... }
 * ```
 */
export const mapEntityToFeedPostItem = (entity: FeedItemEntity): PostWithAuthor => ({
  id: entity.postId,
  userId: entity.authorId,         // Author is userId for the post
  userHandle: entity.authorHandle,
  imageUrl: entity.imageUrl || '',
  caption: entity.caption,
  likesCount: entity.likesCount,
  commentsCount: entity.commentsCount,
  createdAt: entity.createdAt,
  authorId: entity.authorId,
  authorHandle: entity.authorHandle,
  authorFullName: entity.authorFullName,
  authorProfilePictureUrl: entity.authorProfilePictureUrl,
  isLiked: entity.isLiked,
  source: 'materialized'           // Indicate this came from materialized feed
});

/**
 * Maps array of FeedItemEntity to PostWithAuthor array
 *
 * Bulk mapper for efficient transformation of multiple feed items.
 * Uses functional programming style (map) for clean, composable code.
 *
 * @param entities - Array of FeedItemEntity from DynamoDB
 * @returns Array of PostWithAuthor domain objects
 *
 * @example
 * ```typescript
 * const feedItems = mapEntitiesToFeedPostItems(entities);
 * // Returns: [{ id, userId, ... }, { id, userId, ... }, ...]
 * ```
 */
export const mapEntitiesToFeedPostItems = (entities: FeedItemEntity[]): PostWithAuthor[] =>
  entities.map(mapEntityToFeedPostItem);
