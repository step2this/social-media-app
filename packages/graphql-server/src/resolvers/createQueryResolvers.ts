/**
 * Type-Safe Resolver Factory
 *
 * Creates GraphQL Query resolvers with dependency injection via Awilix container.
 * Each resolver explicitly extracts the container from context and calls the factory.
 *
 * Architecture:
 * 1. Resolver gets context with Awilix container
 * 2. Resolver calls factory function with container
 * 3. Factory returns configured resolver
 * 4. Resolver executes and returns result
 *
 * Benefits:
 * - Type-safe: Full TypeScript inference
 * - Explicit: Clear dependency flow
 * - Debuggable: Easy to trace execution
 */

import type { QueryResolvers } from '../schema/generated/types.js';
import type { GraphQLResolveInfo } from 'graphql';
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
 * Create all Query resolvers with dependency injection
 *
 * Each resolver extracts the Awilix container from context and uses it
 * to get the appropriate use case. This pattern is explicit and type-safe.
 *
 * @returns Complete QueryResolvers object for GraphQL schema
 */
export function createQueryResolvers(): QueryResolvers {
  return {
    /**
     * Query.me - Get current user's profile
     * Requires authentication
     */
    me: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createMeResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create me resolver');
      }
      return resolver(_parent, _args, context, info);
    },

    /**
     * Query.profile - Get public profile by handle
     * Public - no authentication required
     */
    profile: async (
      _parent: unknown,
      args: { handle: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createProfileResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create profile resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.post - Get single post by ID
     * Public - no authentication required
     */
    post: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createPostResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create post resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.userPosts - Get paginated posts for a user
     * Public - no authentication required
     */
    userPosts: async (
      _parent: unknown,
      args: { handle: string; first?: number | null; after?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createUserPostsResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create userPosts resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.followingFeed - Get posts from followed users
     * Requires authentication
     */
    followingFeed: async (
      _parent: unknown,
      args: { first?: number | null; after?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createFollowingFeedResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create followingFeed resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.exploreFeed - Get explore feed (public posts)
     * Public - no authentication required
     */
    exploreFeed: async (
      _parent: unknown,
      args: { first?: number | null; after?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createExploreFeedResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create exploreFeed resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.comments - Get paginated comments for a post
     * Requires authentication
     */
    comments: async (
      _parent: unknown,
      args: { postId: string; first?: number | null; after?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createCommentsResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create comments resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.followStatus - Check if current user follows another user
     * Requires authentication
     */
    followStatus: async (
      _parent: unknown,
      args: { followeeId: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createFollowStatusResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create followStatus resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.postLikeStatus - Check if current user liked a post
     * Requires authentication
     */
    postLikeStatus: async (
      _parent: unknown,
      args: { postId: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createPostLikeStatusResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create postLikeStatus resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.notifications - Get paginated notifications for current user
     * Requires authentication
     */
    notifications: async (
      _parent: unknown,
      args: { first?: number | null; after?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createNotificationsResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create notifications resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.unreadNotificationsCount - Get count of unread notifications
     * Requires authentication
     */
    unreadNotificationsCount: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createUnreadNotificationsCountResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create unreadNotificationsCount resolver');
      }
      return resolver(_parent, _args, context, info);
    },

    /**
     * Query.auction - Get single auction by ID
     * Public - no authentication required
     */
    auction: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createAuctionResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create auction resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.auctions - Get paginated auctions with optional filtering
     * Public - no authentication required
     */
    auctions: async (
      _parent: unknown,
      args: { status?: string | null; limit?: number | null; cursor?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createAuctionsResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create auctions resolver');
      }
      return resolver(_parent, args, context, info);
    },

    /**
     * Query.bids - Get paginated bid history for an auction
     * Public - no authentication required
     */
    bids: async (
      _parent: unknown,
      args: { auctionId: string; limit?: number | null; cursor?: string | null },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createBidsResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create bids resolver');
      }
      return resolver(_parent, args, context, info);
    },
  };
}
