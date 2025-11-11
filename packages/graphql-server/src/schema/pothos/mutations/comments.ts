/**
 * Comments Mutations - Pothos Implementation
 *
 * This file defines all comment-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { CommentType, DeleteResponseType } from '../types/comments.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId, PostId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';
import type { CommentParent } from '../../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * Comment Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Create Comment Mutation
   *
   * Creates a new comment on a post.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  createComment: t.field({
    type: CommentType,
    description: 'Create a new comment on a post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      postId: t.arg.id({
        required: true,
        description: 'ID of the post to comment on',
      }),
      content: t.arg.string({
        required: true,
        description: 'Comment content/text',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'createComment',
        {
          userId: UserId(context.userId!),
          postId: PostId(args.postId),
          content: args.content,
        }
      );

      // Type assertion: Use case returns CommentParent (without field resolver fields).
      // GraphQL will invoke Comment field resolver to add author.
      return result as CommentParent;
    },
  }),

  /**
   * Delete Comment Mutation
   *
   * Deletes a comment. User must be the comment author.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated and comment owner
   */
  deleteComment: t.field({
    type: DeleteResponseType,
    description: 'Delete a comment',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the comment to delete',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'deleteComment',
        {
          commentId: args.id,
          userId: UserId(context.userId!),
        }
      );

      return result;
    },
  }),
}));
