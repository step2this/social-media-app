/**
 * followingFeedResolver - Get Following Feed
 *
 * Returns paginated posts from users the authenticated user follows using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { UserId, Cursor } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the followingFeed resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.followingFeed
 */
export const createFollowingFeedResolver = (container: AwilixContainer<GraphQLContainer>): QueryResolvers['followingFeed'] => {
  return withAuth(async (_parent: any, args: { first?: number | null; after?: string | null }, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve('getFollowingFeed');

    // Execute use case
    const result = await useCase.execute({
      userId: UserId(context.userId!),
      pagination: {
        first: args.first ?? 20,
        after: args.after ? Cursor(args.after) : undefined,
      },
    });

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data;
  });
};
