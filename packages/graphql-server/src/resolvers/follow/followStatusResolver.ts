/**
 * FollowStatus Resolver
 *
 * GraphQL resolver for fetching follow status between users.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth';

export function createFollowStatusResolver(container: Container): QueryResolvers['followStatus'] {
  return async (_parent, args, context, _info) => {
    const userId = requireAuth(context);
    const useCase = container.resolve('GetFollowStatus');

    const result = await useCase.execute(userId, args.followeeId);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  };
}
