/**
 * Social Queries - Pothos Implementation
 *
 * This file defines all social interaction queries using Pothos.
 * Includes like and follow status queries.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { LikeStatusType, FollowStatusType } from '../types/social.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Social Queries
 */
builder.queryFields((t) => ({
  /**
   * Post Like Status Query
   *
   * Gets the current like status for a post.
   * Returns whether the current user has liked the post and the total like count.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  postLikeStatus: t.field({
    type: LikeStatusType,
    description: 'Check if current user liked a post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      postId: t.arg.id({
        required: true,
        description: 'ID of the post to check',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await context.container
        .resolve('getPostLikeStatus')
        .execute(context.userId!, args.postId);

      if (!result.success) {
        throw ErrorFactory.fromUseCaseError((result as { success: false; error: Error }).error);
      }

      if (!result.data) {
        throw ErrorFactory.internalServerError('Use case returned no data');
      }

      return result.data as any;
    },
  }),

  /**
   * Follow Status Query
   *
   * Gets the current follow status for a user.
   * Returns whether the current user follows the specified user and follower counts.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  followStatus: t.field({
    type: FollowStatusType,
    description: 'Check if current user follows another user',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      userId: t.arg.id({
        required: true,
        description: 'ID of the user to check',
      }),
    },

    // @ts-expect-error - Pothos type inference issue with complex return types
    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await context.container
        .resolve('getFollowStatus')
        .execute(context.userId!, args.userId);

      if (!result.success) {
        throw ErrorFactory.fromUseCaseError((result as { success: false; error: Error }).error);
      }

      if (!result.data) {
        throw ErrorFactory.internalServerError('Use case returned no data');
      }

      return result.data;
    },
  }),
}));
