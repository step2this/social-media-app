/**
 * Comments Queries - Pothos Implementation
 *
 * This file defines all comment-related queries using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { CommentConnectionType } from '../types/comments.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Comment Queries
 */
builder.queryFields((t) => ({
  /**
   * Get Comments Query
   *
   * Fetches paginated comments for a specific post.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  comments: t.field({
    type: CommentConnectionType,
    description: 'Get paginated comments for a post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      postId: t.arg.id({
        required: true,
        description: 'ID of the post to get comments for',
      }),
      limit: t.arg.int({
        required: false,
        description: 'Number of comments to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Cursor for pagination',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      if (!args.postId) {
        throw ErrorFactory.badRequest('postId is required');
      }

      const result = await context.container
        .resolve('getCommentsByPost')
        .execute(args.postId, args.limit ?? 20, args.cursor ?? undefined);

      if (!result.success) {
        throw ErrorFactory.fromUseCaseError((result as { success: false; error: Error }).error);
      }

      if (!result.data) {
        throw ErrorFactory.internalServerError('Use case returned no data');
      }

      return result.data as any;
    },
  }),
}));
