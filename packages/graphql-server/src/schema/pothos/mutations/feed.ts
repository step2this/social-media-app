/**
 * Feed Mutations - Pothos Implementation
 *
 * This file defines all feed-related mutations using Pothos.
 *
 * Mutations:
 * - markFeedItemsAsRead: Mark multiple feed items as read (requires auth)
 */

import { builder } from '../builder.js';
import { MarkFeedReadResponseType } from '../types/feed.js';
import { executeUseCase } from '../../../infrastructure/resolvers/helpers/useCase.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

builder.mutationFields((t) => ({
  /**
   * MarkFeedItemsAsRead Mutation
   *
   * Marks multiple feed items as read for the current user.
   * Used to track which posts the user has seen in their feed.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  markFeedItemsAsRead: t.field({
    type: MarkFeedReadResponseType,
    description: 'Mark feed items as read',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      postIds: t.arg.idList({
        required: true,
        description: 'List of post IDs to mark as read',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container.resolve('markFeedItemsAsRead'),
        {
          userId: UserId(context.userId!),
          postIds: args.postIds as string[],
        }
      );

      return result as any;
    },
  }),
}));
