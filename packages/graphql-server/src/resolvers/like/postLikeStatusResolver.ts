/**
 * PostLikeStatus Resolver
 *
 * GraphQL resolver for fetching like status for a post.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth';

export function createPostLikeStatusResolver(container: Container): QueryResolvers['postLikeStatus'] {
  return async (_parent, args, context, _info) => {
    const userId = requireAuth(context);
    const useCase = container.resolve('GetPostLikeStatus');

    const result = await useCase.execute(userId, args.postId);

    if (!result.success) {
      throw result.error;
    }

    return result.value;
  };
}
