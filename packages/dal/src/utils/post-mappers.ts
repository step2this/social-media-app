/**
 * Post mapping utilities
 * Provides pure functional mappers for converting PostEntity to various output types
 */

import type { Post, PostGridItem, PostWithAuthor, Profile } from '@social-media-app/shared';

/**
 * PostEntity for DynamoDB (re-exported from service)
 */
export interface PostEntity {
  readonly PK: string;
  readonly SK: string;
  readonly GSI1PK: string;
  readonly GSI1SK: string;
  readonly GSI4PK?: string;  // GSI4 for efficient user post queries
  readonly GSI4SK?: string;  // GSI4 sort key with timestamp for ordering
  readonly id: string;
  readonly userId: string;
  readonly userHandle: string;
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  readonly caption?: string;
  readonly tags: readonly string[];
  readonly likesCount: number;
  readonly commentsCount: number;
  readonly isPublic: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly entityType: 'POST';
}

/**
 * Base post fields common to all mapper outputs
 */
interface BasePostFields {
  readonly id: string;
  readonly userId: string;
  readonly userHandle: string;
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  readonly caption?: string;
  readonly tags: readonly string[];
  readonly likesCount: number;
  readonly commentsCount: number;
  readonly isPublic: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Mapper configuration for specialized post types
 */
export interface MapperConfig {
  readonly type: 'post' | 'grid' | 'feed';
  readonly additionalFields: readonly string[];
}

/**
 * Maps PostEntity to base post fields
 * Pure function - extracts common fields all mappers need
 *
 * @param entity - PostEntity from DynamoDB
 * @returns Base post fields (without DynamoDB keys)
 */
export const mapBasePostFields = (entity: PostEntity): BasePostFields => ({
  id: entity.id,
  userId: entity.userId,
  userHandle: entity.userHandle,
  imageUrl: entity.imageUrl,
  thumbnailUrl: entity.thumbnailUrl,
  caption: entity.caption,
  tags: [...entity.tags],
  // Fallback to 0 for legacy posts that don't have likesCount/commentsCount initialized
  likesCount: entity.likesCount ?? 0,
  commentsCount: entity.commentsCount ?? 0,
  isPublic: entity.isPublic,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt
});

/**
 * Creates a specialized post mapper based on configuration
 * Factory pattern for generating type-specific mappers
 *
 * @param config - Mapper configuration
 * @returns Mapper function for the specified type
 *
 * @example
 * ```typescript
 * const postMapper = createPostMapper({ type: 'post', additionalFields: [] });
 * const post = postMapper(entity);
 * ```
 */
export const createPostMapper = <T>(config: MapperConfig) => {
  return (entity: PostEntity): T => {
    const base = mapBasePostFields(entity);

    switch (config.type) {
      case 'post':
        return base as T;

      case 'grid':
        // PostGridItem: thumbnail, no full image, limited fields
        return {
          id: base.id,
          userId: base.userId,
          userHandle: base.userHandle,
          thumbnailUrl: base.thumbnailUrl,
          caption: base.caption,
          likesCount: base.likesCount,
          commentsCount: base.commentsCount,
          createdAt: base.createdAt
        } as T;

      case 'feed':
        // PostWithAuthor base: full image, author info, no tags
        return {
          id: base.id,
          userId: base.userId,
          userHandle: base.userHandle,
          imageUrl: base.imageUrl,
          caption: base.caption,
          likesCount: base.likesCount,
          commentsCount: base.commentsCount,
          createdAt: base.createdAt,
          authorId: base.userId,
          authorHandle: base.userHandle,
          isLiked: false
        } as T;

      default:
        throw new Error(`Unknown mapper type: ${config.type}`);
    }
  };
};

/**
 * Enriches a feed post item with profile information
 * Pure function - adds author details from profile
 *
 * @param feedItem - Base feed post item (without profile data)
 * @param profile - User profile with author information
 * @returns Complete feed post item with author details
 *
 * @example
 * ```typescript
 * const baseFeedItem = createPostMapper({ type: 'feed', additionalFields: [] })(entity);
 * const completeFeedItem = enrichWithProfile(baseFeedItem, profile);
 * ```
 */
export const enrichWithProfile = (
  feedItem: Omit<PostWithAuthor, 'authorFullName' | 'authorProfilePictureUrl'>,
  profile: Profile
): PostWithAuthor => ({
  ...feedItem,
  authorFullName: profile.fullName,
  authorProfilePictureUrl: profile.profilePictureUrl
});

/**
 * Convenience mapper: PostEntity → Post
 */
export const mapEntityToPost = createPostMapper<Post>({
  type: 'post',
  additionalFields: []
});

/**
 * Convenience mapper: PostEntity → PostGridItem
 */
export const mapEntityToPostGridItem = createPostMapper<PostGridItem>({
  type: 'grid',
  additionalFields: []
});

/**
 * Convenience mapper: PostEntity → PostWithAuthor base
 * Note: Use enrichWithProfile() to add author profile data
 */
export const mapEntityToFeedItemBase = createPostMapper<
  Omit<PostWithAuthor, 'authorFullName' | 'authorProfilePictureUrl'>
>({
  type: 'feed',
  additionalFields: []
});
