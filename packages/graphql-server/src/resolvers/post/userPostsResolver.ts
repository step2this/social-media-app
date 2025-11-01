/**
 * userPostsResolver - Get Posts by User ID
 *
 * Returns paginated posts for a specific user.
 * Public operation - no authentication required.
 */

import { ConnectionResolver } from '../../infrastructure/resolvers/ConnectionResolver.js';
import { Container } from '../../infrastructure/di/Container.js';
import { UserId } from '../../shared/types/index.js';
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
    const useCase = container.resolve<GetUserPosts>('GetUserPosts');

    const resolver = new ConnectionResolver((pagination) =>
      useCase.execute({ userId: UserId(args.userId), pagination })
    );

    const { first, after } = args;
    return resolver.resolve({ first, after });
  };
