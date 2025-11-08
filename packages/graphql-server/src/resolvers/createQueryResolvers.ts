/**
 * Type-Safe Resolver Factory
 *
 * Creates GraphQL Query resolvers with automatic Awilix container injection.
 * Uses advanced TypeScript patterns to eliminate repetitive boilerplate.
 *
 * Architecture:
 * 1. Generic helper extracts container from context
 * 2. Resolver factories receive container automatically
 * 3. Type-safe argument and return type inference
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
 * Generic resolver type that takes a container and returns a GraphQL resolver
 */
type ResolverFactory<TArgs = any, TResult = any> = (
  container: AwilixContainer<GraphQLContainer>
) => (
  parent: unknown,
  args: TArgs,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

/**
 * Higher-order function that wraps a resolver factory with automatic container injection
 *
 * This eliminates the need to manually extract container from context in each resolver.
 * Uses generics to maintain full type safety for arguments and return types.
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
function withContainer<TArgs, TResult>(
  factory: ResolverFactory<TArgs, TResult>
) {
  return async (
    parent: unknown,
    args: TArgs,
    context: GraphQLContext,
    info: GraphQLResolveInfo
  ): Promise<TResult> => {
    const resolver = factory(context.container);
    return resolver(parent, args, context, info);
  };
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
