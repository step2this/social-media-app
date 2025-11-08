/**
 * Type-Safe Query Resolvers with Explicit Parameter Typing
 *
 * This file contains all GraphQL Query resolvers with:
 * - Explicit parameter typing (required for GraphQL Codegen union types)
 * - Direct use case composition (no factory indirection)
 * - Proper argument transformation (GraphQL args → use case inputs)
 * - Type-safe error handling
 * - Authentication guards where needed
 *
 * Architecture Notes:
 * - All resolver parameters are explicitly typed (GraphQL Codegen best practice)
 * - Some resolvers compose multiple use cases (e.g., handle lookup → posts fetch)
 * - GraphQL args don't always match use case inputs 1:1 - translation is needed
 * - Domain Connection<T> types are returned (field resolvers add computed fields)
 */

import type {
  QueryResolvers,
  QueryMeArgs,
  QueryProfileArgs,
  QueryPostArgs,
  QueryUserPostsArgs,
  QueryFollowingFeedArgs,
  QueryExploreFeedArgs,
  QueryCommentsArgs,
  QueryFollowStatusArgs,
  QueryPostLikeStatusArgs,
  QueryNotificationsArgs,
  QueryUnreadNotificationsCountArgs,
  QueryAuctionArgs,
  QueryAuctionsArgs,
  QueryBidsArgs,
} from '../schema/generated/types.js';
import type { GraphQLContext } from '../context.js';
import { requireAuth } from '../infrastructure/resolvers/helpers/requireAuth.js';
import { Handle, UserId, PostId, AuctionId, Cursor } from '../shared/types/index.js';
import { ErrorFactory } from '../infrastructure/errors/ErrorFactory.js';

/**
 * Create all Query resolvers with direct use case composition
 */
export function createQueryResolvers(): QueryResolvers {
  return {
    /**
     * Query.me - Get current user's profile
     * Requires authentication
     */
    me: async (
      _parent: unknown,
      _args: QueryMeArgs,
      context: GraphQLContext
    ) => {
      requireAuth(context, 'view profile');

      const useCase = context.container.resolve('getCurrentUserProfile');
      const result = await useCase.execute({ userId: UserId(context.userId) });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      if (!result.data) {
        throw ErrorFactory.notFound('Profile', context.userId);
      }

      return result.data as any;
    },

    /**
     * Query.profile - Get public profile by handle
     * Public - no authentication required
     */
    profile: async (
      _parent: unknown,
      args: QueryProfileArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getProfileByHandle');
      const result = await useCase.execute({ handle: Handle(args.handle) });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      if (!result.data) {
        throw ErrorFactory.notFound('Profile', args.handle);
      }

      return result.data as any;
    },

    /**
     * Query.post - Get single post by ID
     * Public - no authentication required
     */
    post: async (
      _parent: unknown,
      args: QueryPostArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getPostById');
      const result = await useCase.execute({ postId: PostId(args.id) });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      if (!result.data) {
        throw ErrorFactory.notFound('Post', args.id);
      }

      return result.data as any;
    },

    /**
     * Query.userPosts - Get paginated posts for a user
     * Public - no authentication required
     *
     * Two-step process:
     * 1. Look up profile by handle to get userId
     * 2. Fetch posts for that userId
     */
    userPosts: async (
      _parent: unknown,
      args: QueryUserPostsArgs,
      context: GraphQLContext
    ) => {
      // Step 1: Look up profile by handle
      const profileUseCase = context.container.resolve('getProfileByHandle');
      const profileResult = await profileUseCase.execute({ handle: Handle(args.handle) });

      if (!profileResult.success) {
        throw ErrorFactory.internalServerError(profileResult.error.message);
      }

      if (!profileResult.data) {
        throw ErrorFactory.notFound('Profile', args.handle);
      }

      // Step 2: Fetch posts with pagination
      const postsUseCase = context.container.resolve('getUserPosts');
      const first = args.first ?? 20;
      const after = args.after ? Cursor(args.after) : undefined;

      if (first <= 0) {
        throw ErrorFactory.badRequest('first must be greater than 0');
      }

      const postsResult = await postsUseCase.execute({
        userId: UserId(profileResult.data.id),
        pagination: { first, after },
      });

      if (!postsResult.success) {
        throw ErrorFactory.internalServerError(postsResult.error.message);
      }

      return postsResult.data as any;
    },

    /**
     * Query.followingFeed - Get posts from followed users
     * Requires authentication
     */
    followingFeed: async (
      _parent: unknown,
      args: QueryFollowingFeedArgs,
      context: GraphQLContext
    ) => {
      requireAuth(context, 'view following feed');

      const useCase = context.container.resolve('getFollowingFeed');
      const first = args.first ?? 20;
      const after = args.after ? Cursor(args.after) : undefined;

      if (first <= 0) {
        throw ErrorFactory.badRequest('first must be greater than 0');
      }

      const result = await useCase.execute({
        userId: UserId(context.userId),
        pagination: { first, after },
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.exploreFeed - Get explore feed (public posts)
     * Public - no authentication required
     */
    exploreFeed: async (
      _parent: unknown,
      args: QueryExploreFeedArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getExploreFeed');
      const first = args.first ?? 20;
      const after = args.after ? Cursor(args.after) : undefined;

      if (first <= 0) {
        throw ErrorFactory.badRequest('first must be greater than 0');
      }

      const result = await useCase.execute({
        pagination: { first, after },
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.comments - Get paginated comments for a post
     * Public - no authentication required
     */
    comments: async (
      _parent: unknown,
      args: QueryCommentsArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getCommentsByPost');
      const first = args.first ?? 20;
      const after = args.after ? Cursor(args.after) : undefined;

      if (first <= 0) {
        throw ErrorFactory.badRequest('first must be greater than 0');
      }

      const result = await useCase.execute({
        postId: PostId(args.postId),
        pagination: { first, after },
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.followStatus - Check if current user follows another user
     * Requires authentication
     */
    followStatus: async (
      _parent: unknown,
      args: QueryFollowStatusArgs,
      context: GraphQLContext
    ) => {
      requireAuth(context, 'check follow status');

      const useCase = context.container.resolve('getFollowStatus');
      const result = await useCase.execute({
        followerId: UserId(context.userId),
        followeeId: UserId(args.userId),
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.postLikeStatus - Check if current user liked a post
     * Requires authentication
     */
    postLikeStatus: async (
      _parent: unknown,
      args: QueryPostLikeStatusArgs,
      context: GraphQLContext
    ) => {
      requireAuth(context, 'check like status');

      const useCase = context.container.resolve('getPostLikeStatus');
      const result = await useCase.execute({
        userId: UserId(context.userId),
        postId: PostId(args.postId),
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.notifications - Get paginated notifications for current user
     * Requires authentication
     */
    notifications: async (
      _parent: unknown,
      args: QueryNotificationsArgs,
      context: GraphQLContext
    ) => {
      requireAuth(context, 'view notifications');

      const useCase = context.container.resolve('getNotifications');
      const first = args.first ?? 20;
      const after = args.after ? Cursor(args.after) : undefined;

      if (first <= 0) {
        throw ErrorFactory.badRequest('first must be greater than 0');
      }

      const result = await useCase.execute({
        userId: UserId(context.userId),
        pagination: { first, after },
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.unreadNotificationsCount - Get count of unread notifications
     * Requires authentication
     */
    unreadNotificationsCount: async (
      _parent: unknown,
      _args: QueryUnreadNotificationsCountArgs,
      context: GraphQLContext
    ) => {
      requireAuth(context, 'view notification count');

      const useCase = context.container.resolve('getUnreadNotificationsCount');
      const result = await useCase.execute({ userId: UserId(context.userId) });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.auction - Get single auction by ID
     * Public - no authentication required
     */
    auction: async (
      _parent: unknown,
      args: QueryAuctionArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getAuction');
      const result = await useCase.execute({ auctionId: AuctionId(args.id) });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      if (!result.data) {
        throw ErrorFactory.notFound('Auction', args.id);
      }

      return result.data as any;
    },

    /**
     * Query.auctions - Get paginated auctions with optional filtering
     * Public - no authentication required
     */
    auctions: async (
      _parent: unknown,
      args: QueryAuctionsArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getAuctions');
      const result = await useCase.execute({
        status: args.status ?? undefined,
        limit: args.limit ?? undefined,
        cursor: args.cursor ?? undefined,
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },

    /**
     * Query.bids - Get paginated bid history for an auction
     * Public - no authentication required
     */
    bids: async (
      _parent: unknown,
      args: QueryBidsArgs,
      context: GraphQLContext
    ) => {
      const useCase = context.container.resolve('getBidHistory');
      const result = await useCase.execute({
        auctionId: AuctionId(args.auctionId),
        limit: args.limit ?? undefined,
        cursor: args.cursor ?? undefined,
      });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }

      return result.data as any;
    },
  };
}
