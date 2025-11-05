/**
 * followingFeedResolver - Get Following Feed
 *
 * Returns paginated posts from users the authenticated user follows using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { GetFollowingFeed } from '../../application/use-cases/feed/GetFollowingFeed.js';
import { UserId, Cursor } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the followingFeed resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.followingFeed
 */
export const createFollowingFeedResolver = (container: Container): QueryResolvers['followingFeed'] => {
  return withAuth(async (_parent: any, args: { first?: number | null; after?: string | null }, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve<GetFollowingFeed>('GetFollowingFeed');

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
