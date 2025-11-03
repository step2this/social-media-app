/**
 * Comments Resolver
 *
 * GraphQL resolver for fetching paginated comments on a post.
 * Uses CommentAdapter for type transformation from domain to GraphQL types.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import { CommentAdapter } from '../../infrastructure/adapters/CommentAdapter';
import { GraphQLError } from 'graphql';

/**
 * Comments Query Resolver
 *
 * Fetches paginated comments for a post. Requires authentication.
 * Returns GraphQL CommentConnection with proper type transformation.
 */
export const commentsResolver: QueryResolvers['comments'] = async (
  _parent,
  args,
  context
) => {
  // Require authentication
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // Validate required args
  if (!args.postId) {
    throw new GraphQLError('postId is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  // Create adapter with comment service from context
  const commentAdapter = new CommentAdapter(context.services.commentService);

  const first = args.limit ?? 20;

  // Delegate to adapter - handles all transformation and validation
  return commentAdapter.getCommentsByPostId({
    postId: args.postId,
    first,
    after: args.cursor ?? undefined,
  });
};
