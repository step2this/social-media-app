/**
 * userPostsResolver - Get Posts by User Handle
 *
 * Returns paginated posts for a specific user identified by their handle.
 * Public operation - no authentication required.
 *
 * This resolver composes two use cases:
 * 1. GetProfileByHandle - to lookup user by handle
 * 2. GetUserPosts - to retrieve that user's posts
 */

import { ConnectionResolver } from '../../infrastructure/resolvers/ConnectionResolver.js';
import { Container } from '../../infrastructure/di/Container.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';
import { UserId } from '../../shared/types/index.js';
import type { GetProfileByHandle } from '../../application/use-cases/profile/GetProfileByHandle.js';
import type { GetUserPosts } from '../../application/use-cases/post/GetUserPosts.js';
import type { QueryResolvers } from '../../../generated/types.js';

/**
 * Create the userPosts resolver with DI container.
 *
 * @param container - DI container for resolving use cases
 * @returns GraphQL resolver for Query.userPosts
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 * const userPostsResolver = createUserPostsResolver(container);
 * ```
 */
export const createUserPostsResolver = (container: Container): QueryResolvers['userPosts'] =>
  async (_parent, args, _context) => {
    // First, resolve profile by handle to get userId
    const profileUseCase = container.resolve<GetProfileByHandle>('GetProfileByHandle');
    const profileResult = await profileUseCase.execute({ handle: args.handle });

    if (!profileResult.success) {
      throw ErrorFactory.internalServerError(profileResult.error.message);
    }

    if (!profileResult.data) {
      throw ErrorFactory.notFound(`Profile not found: ${args.handle}`);
    }

    const userId = UserId(profileResult.data.id);

    // Then, fetch posts for that user
    const postsUseCase = container.resolve<GetUserPosts>('GetUserPosts');

    const resolver = new ConnectionResolver((pagination) =>
      postsUseCase.execute({ userId, pagination })
    );

    const { first, after, limit, cursor } = args;
    // Support both Relay-style (first/after) and legacy (limit/cursor) pagination
    const paginationArgs = {
      first: first ?? limit ?? 10,
      after: after ?? cursor,
    };

    return resolver.resolve(paginationArgs);
  };
