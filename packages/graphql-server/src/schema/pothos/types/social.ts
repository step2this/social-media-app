/**
 * Social Types - Pothos Implementation
 *
 * This file defines all social interaction GraphQL types using Pothos.
 * Includes likes and follows functionality.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Autocomplete: Full IntelliSense when defining fields
 * - ✅ Refactoring: Rename a field = schema updates automatically
 */

import { builder } from '../builder.js';

/**
 * LikeResponse Type
 *
 * Response for like/unlike mutations.
 * Includes updated like count and current like status.
 */
export const LikeResponseType = builder.objectRef<any>('LikeResponse');

LikeResponseType.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success', {
      description: 'Whether the operation was successful',
    }),
    likesCount: t.exposeInt('likesCount', {
      description: 'Updated like count for the post',
    }),
    isLiked: t.exposeBoolean('isLiked', {
      description: 'Whether the post is now liked by the user',
    }),
  }),
});

/**
 * LikeStatus Type
 *
 * Current like status for a post.
 * Used by the postLikeStatus query.
 */
export const LikeStatusType = builder.objectRef<any>('LikeStatus');

LikeStatusType.implement({
  fields: (t) => ({
    isLiked: t.exposeBoolean('isLiked', {
      description: 'Whether the post is liked by the current user',
    }),
    likesCount: t.exposeInt('likesCount', {
      description: 'Total number of likes on the post',
    }),
  }),
});

/**
 * FollowResponse Type
 *
 * Response for follow/unfollow mutations.
 * Includes updated follower counts and current follow status.
 */
export const FollowResponseType = builder.objectRef<any>('FollowResponse');

FollowResponseType.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success', {
      description: 'Whether the operation was successful',
    }),
    followersCount: t.exposeInt('followersCount', {
      description: 'Updated follower count for the user',
    }),
    followingCount: t.exposeInt('followingCount', {
      description: 'Updated following count for the current user',
    }),
    isFollowing: t.exposeBoolean('isFollowing', {
      description: 'Whether the current user is now following the user',
    }),
  }),
});

/**
 * FollowStatus Type
 *
 * Current follow status for a user relationship.
 * Used by the followStatus query.
 */
export const FollowStatusType = builder.objectRef<any>('FollowStatus');

FollowStatusType.implement({
  fields: (t) => ({
    isFollowing: t.exposeBoolean('isFollowing', {
      description: 'Whether the current user follows the specified user',
    }),
    followersCount: t.exposeInt('followersCount', {
      description: 'Total number of followers the user has',
    }),
    followingCount: t.exposeInt('followingCount', {
      description: 'Total number of users the specified user is following',
    }),
  }),
});
