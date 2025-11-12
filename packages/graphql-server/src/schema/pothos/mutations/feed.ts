/**
 * Feed Mutations - Pothos Implementation
 *
 * This file defines all feed-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { MarkFeedReadResponseType } from '../types/feed.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Feed Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Mark Feed Items as Read Mutation
   *
   * Marks multiple feed items as read for the current user.
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
        description: 'List of post IDs to mark as read in the feed',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'markFeedItemsAsRead',
        {
          userId: UserId(context.userId!),
          postIds: args.postIds,
        }
      );

      return result;
    },
  }),
}));
