/**
 * Type-Safe Resolver Factory
 *
 * Creates GraphQL Query resolvers with automatic Awilix container injection.
 * Uses advanced TypeScript patterns to eliminate repetitive boilerplate.
 *
 * Architecture:
 * 1. Generic helper extracts container from context
 * 2. Resolver factories receive container automatically
 * 3. Type-safe via inference (no manual type annotations needed)
 *
 * Benefits:
 * - DRY: Single helper for all resolvers
 * - Type-safe: Full TypeScript inference
 * - Maintainable: One place to update resolver pattern
 * - Zero overhead: Compiles to same JS
 */

import type { QueryResolvers } from '../schema/generated/types.js';
import type { GraphQLResolveInfo } from 'graphql';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../infrastructure/di/awilix-container.js';
import type { GraphQLContext } from '../context.js';

import { createMeResolver, createProfileResolver } from './profile/index.js';
import { createPostResolver, createUserPostsResolver } from './post/index.js';
import { createFollowingFeedResolver, createExploreFeedResolver } from './feed/index.js';
import { createCommentsResolver } from './comment/commentsResolver.js';
import { createFollowStatusResolver } from './follow/followStatusResolver.js';
import { createPostLikeStatusResolver } from './like/postLikeStatusResolver.js';
import { createNotificationsResolver } from './notification/notificationsResolver.js';
import { createUnreadNotificationsCountResolver } from './notification/unreadNotificationsCountResolver.js';
import { createAuctionResolver } from './auction/auctionResolver.js';
import { createAuctionsResolver } from './auction/auctionsResolver.js';
import { createBidsResolver } from './auction/bidsResolver.js';

/**
 * Higher-order function that wraps a resolver factory with automatic container injection
 *
 * This eliminates the need to manually extract container from context in each resolver.
 * Uses TypeScript's type inference to automatically infer all types.
 * Handles GraphQL resolver types that may be `undefined`.
 *
 * @param factory - Resolver factory function that takes a container
 * @returns GraphQL resolver function with automatic container injection
 *
 * @example
 * ```typescript
 * const resolvers = {
 *   me: withContainer(createMeResolver),
 *   profile: withContainer(createProfileResolver),
 * };
 * ```
 */
function withContainer<TResolver extends ((...args: any[]) => any) | undefined>(
  factory: (container: AwilixContainer<GraphQLContainer>) => TResolver
): TResolver {
  return ((...args: any[]) => {
    const context = args[2] as GraphQLContext;
    const resolver = factory(context.container);
    if (!resolver) return undefined;
    return resolver(...args);
  }) as TResolver;
}

/**
 * Create all Query resolvers with dependency injection
 *
 * Uses withContainer helper to eliminate boilerplate and maintain type safety.
 * Each resolver factory receives the Awilix container automatically.
 *
 * @returns Complete QueryResolvers object for GraphQL schema
 */
export function createQueryResolvers(): QueryResolvers {
  return {
    // Profile queries
    me: withContainer(createMeResolver),
    profile: withContainer(createProfileResolver),

    // Post queries
    post: withContainer(createPostResolver),
    userPosts: withContainer(createUserPostsResolver),

    // Feed queries
    followingFeed: withContainer(createFollowingFeedResolver),
    exploreFeed: withContainer(createExploreFeedResolver),

    // Comment queries
    comments: withContainer(createCommentsResolver),

    // Follow queries
    followStatus: withContainer(createFollowStatusResolver),

    // Like queries
    postLikeStatus: withContainer(createPostLikeStatusResolver),

    // Notification queries
    notifications: withContainer(createNotificationsResolver),
    unreadNotificationsCount: withContainer(createUnreadNotificationsCountResolver),

    // Auction queries
    auction: withContainer(createAuctionResolver),
    auctions: withContainer(createAuctionsResolver),
    bids: withContainer(createBidsResolver),
  };
}
