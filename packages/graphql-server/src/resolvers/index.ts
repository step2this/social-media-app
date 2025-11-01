/**
 * Main Resolver Factory
 *
 * Creates complete resolver map by composing individual resolver functions.
 * All resolvers are instantiated with their dependencies from the DI container.
 */

import { Container } from '../infrastructure/di/Container.js';
import { createMeResolver, createProfileResolver } from './profile/index.js';
import { createPostResolver, createUserPostsResolver } from './post/index.js';
import { createFollowingFeedResolver, createExploreFeedResolver } from './feed/index.js';
import type { Resolvers } from '../../generated/types.js';

/**
 * Create complete resolver map with all resolvers.
 *
 * This factory function instantiates all GraphQL resolvers and wires them up
 * with their dependencies from the DI container. Each resolver is a thin
 * wrapper around use cases from the application layer.
 *
 * Architecture:
 * - Container provides use cases
 * - Use cases implement business logic
 * - Resolvers are thin wrappers (error translation, auth, pagination)
 *
 * @param container - DI container with registered services
 * @returns Complete Resolvers object for GraphQL schema
 *
 * @example
 * ```typescript
 * // In server setup:
 * const container = new Container();
 * registerServices(container, context);
 * const resolvers = createResolvers(container);
 *
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 * });
 * ```
 */
export function createResolvers(container: Container): Resolvers {
  return {
    Query: {
      // Profile queries
      me: createMeResolver(container),
      profile: createProfileResolver(container),

      // Post queries
      post: createPostResolver(container),
      userPosts: createUserPostsResolver(container),

      // Feed queries
      followingFeed: createFollowingFeedResolver(container),
      exploreFeed: createExploreFeedResolver(container),
    },
  };
}
