/**
 * Comments Resolver
 *
 * GraphQL resolver for fetching paginated comments on a post.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';
import { requireValidCursor } from '../../infrastructure/resolvers/helpers/validateCursor';
import { buildConnection } from '../../infrastructure/resolvers/helpers/ConnectionBuilder';

export function createCommentsResolver(container: Container): QueryResolvers['comments'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('GetCommentsByPost');
    const cursor = requireValidCursor(args.cursor);

    const result = await useCase.execute(args.postId, args.limit || 20, cursor);

    if (!result.success) {
      throw result.error;
    }

    return buildConnection({
      items: result.value.items,
      hasMore: result.value.hasMore,
      getCursorKeys: (comment) => ({
        PK: `POST#${args.postId}`,
        SK: `COMMENT#${comment.createdAt}#${comment.id}`,
      }),
    });
  };
}
