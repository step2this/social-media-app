/**
 * Main Resolver Factory
 *
 * Creates complete resolver map by composing individual resolver functions.
 * All resolvers are instantiated with their dependencies from the Awilix DI container.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../infrastructure/di/awilix-container.js';
import { createMeResolver, createProfileResolver } from './profile/index.js';
import { createPostResolver, createUserPostsResolver } from './post/index.js';
import { createFollowingFeedResolver, createExploreFeedResolver } from './feed/index.js';
import type { Resolvers } from '../../generated/types.js';

/**
 * Create complete resolver map with all resolvers.
 *
 * This factory function instantiates all GraphQL resolvers and wires them up
 * with their dependencies from the Awilix DI container. Each resolver is a thin
 * wrapper around use cases from the application layer.
 *
 * Architecture:
 * - Awilix container provides use cases with automatic dependency injection
 * - Use cases implement business logic
 * - Resolvers are thin wrappers (error translation, auth, pagination)
 *
 * @param container - Awilix DI container with registered services
 * @returns Complete Resolvers object for GraphQL schema
 *
 * @example
 * ```typescript
 * // In server setup (context.ts):
 * const container = createGraphQLContainer(context);
 * const resolvers = createResolvers(container);
 *
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 * });
 * ```
 */
export function createResolvers(container: AwilixContainer<GraphQLContainer>): Resolvers {
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
