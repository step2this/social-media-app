/**
 * FollowStatus Resolver
 *
 * GraphQL resolver for fetching follow status between users.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth';

export function createFollowStatusResolver(container: AwilixContainer<GraphQLContainer>): QueryResolvers['followStatus'] {
  return async (_parent, args, context, _info) => {
    const userId = requireAuth(context);
    const useCase = container.resolve('getFollowStatus');

    const result = await useCase.execute(userId, args.followeeId);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  };
}
