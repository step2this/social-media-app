/**
 * PostLikeStatus Resolver
 *
 * GraphQL resolver for fetching like status for a post.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth';

export function createPostLikeStatusResolver(container: AwilixContainer<GraphQLContainer>): QueryResolvers['postLikeStatus'] {
  return async (_parent, args, context, _info) => {
    const userId = requireAuth(context);
    const useCase = container.resolve('getPostLikeStatus');

    const result = await useCase.execute(userId, args.postId);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  };
}
