/**
 * followingFeedResolver - Get Following Feed
 *
 * Returns paginated posts from users the authenticated user follows.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { ConnectionResolver } from '../../infrastructure/resolvers/ConnectionResolver.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { GetFollowingFeed } from '../../application/use-cases/feed/GetFollowingFeed.js';
import type { QueryResolvers } from '../../../generated/types.js';

/**
 * Create the followingFeed resolver with DI container.
 *
 * @param container - DI container for resolving use cases
 * @returns GraphQL resolver for Query.followingFeed
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 * const followingFeedResolver = createFollowingFeedResolver(container);
 * ```
 */
export const createFollowingFeedResolver = (container: Container): QueryResolvers['followingFeed'] =>
  withAuth(async (_parent, args, context) => {
    const useCase = container.resolve<GetFollowingFeed>('GetFollowingFeed');

    const resolver = new ConnectionResolver((pagination) =>
      useCase.execute({ userId: context.userId, pagination })
    );

    const { first, after } = args;
    return resolver.resolve({ first, after });
  });
