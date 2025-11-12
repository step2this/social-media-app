/**
 * Social Mutations - Pothos Implementation
 *
 * This file defines all social interaction mutations using Pothos.
 * Includes likes and follows functionality.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { LikeResponseType, FollowResponseType } from '../types/social.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId, PostId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Social Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Like Post Mutation
   *
   * Adds a like to a post from the current user.
   * Idempotent - multiple likes don't create duplicates.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  likePost: t.field({
    type: LikeResponseType,
    description: 'Like a post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      postId: t.arg.id({
        required: true,
        description: 'ID of the post to like',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'likePost',
        {
          userId: UserId(context.userId!),
          postId: PostId(args.postId),
        }
      );

      return result;
    },
  }),

  /**
   * Unlike Post Mutation
   *
   * Removes a like from a post for the current user.
   * Idempotent - multiple unlikes don't cause errors.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  unlikePost: t.field({
    type: LikeResponseType,
    description: 'Unlike a post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      postId: t.arg.id({
        required: true,
        description: 'ID of the post to unlike',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'unlikePost',
        {
          userId: UserId(context.userId!),
          postId: PostId(args.postId),
        }
      );

      return result;
    },
  }),

  /**
   * Follow User Mutation
   *
   * Follows another user.
   * Idempotent - multiple follows don't create duplicates.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  followUser: t.field({
    type: FollowResponseType,
    description: 'Follow a user',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      userId: t.arg.id({
        required: true,
        description: 'ID of the user to follow',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'followUser',
        {
          followerId: UserId(context.userId!),
          followeeId: UserId(args.userId),
        }
      );

      return result;
    },
  }),

  /**
   * Unfollow User Mutation
   *
   * Unfollows a user.
   * Idempotent - multiple unfollows don't cause errors.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  unfollowUser: t.field({
    type: FollowResponseType,
    description: 'Unfollow a user',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      userId: t.arg.id({
        required: true,
        description: 'ID of the user to unfollow',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'unfollowUser',
        {
          followerId: UserId(context.userId!),
          followeeId: UserId(args.userId),
        }
      );

      return result;
    },
  }),
}));
