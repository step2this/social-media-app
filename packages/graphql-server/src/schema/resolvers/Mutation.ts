// @ts-nocheck - TODO: Fix type compatibility issues between generated types and resolvers
/**
 * Mutation Resolvers
 *
 * Implements all root-level Mutation resolvers for the GraphQL schema.
 * Handles write operations for auth, posts, comments, likes, and follows.
 *
 * Phase 3 Migration (COMPLETE) + Validation Migration:
 * - ALL mutations (including auth) use the use case pattern
 * - ALL Zod validation now in use cases (business logic layer)
 * - Full type safety with branded types
 * - Consistent error handling via use case Result types
 *
 * Benefits:
 * - 100% testable business logic (isolated in use cases)
 * - Validation in business logic layer (not GraphQL layer)
 * - Type-safe with branded types (UserId, PostId, etc.)
 * - Consistent error handling across all mutations
 * - Auth logic now reusable across interfaces (GraphQL, REST, etc.)
 */

import type { MutationResolvers } from '../generated/types.js';
import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { executeUseCase } from '../../infrastructure/resolvers/helpers/useCase.js';
import { UserId, PostId } from '../../shared/types/index.js';
import type {
  PostParent,
  CommentParent,
  CreatePostPayloadParent,
  PlaceBidPayloadParent,
} from '../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * Mutation resolvers
 *
 * All mutations use the use case pattern:
 * Auth mutations:
 * - register(input: RegisterInput!): AuthPayload!
 * - login(input: LoginInput!): AuthPayload!
 * - refreshToken(refreshToken: String!): AuthPayload!
 * - logout(): LogoutResponse!
 *
 * Other mutations:
 * - createPost, updatePost, deletePost
 * - likePost, unlikePost
 * - followUser, unfollowUser
 * - createComment, deleteComment
 * - updateProfile, getProfilePictureUploadUrl
 * - markNotificationAsRead, markAllNotificationsAsRead, deleteNotification
 * - markFeedItemsAsRead
 * - createAuction, activateAuction, placeBid
 */
export const Mutation: MutationResolvers = {
  // ============================================================================
  // AUTH MUTATIONS
  // ============================================================================
  // Note: Auth mutations (register, login, refreshToken, logout) moved to Pothos schema (src/schema/pothos/mutations/auth.ts)

  // ============================================================================
  // POST MUTATIONS
  // ============================================================================
  // Note: Posts mutations (createPost, updatePost, deletePost) moved to Pothos schema (src/schema/pothos/mutations/posts.ts)

  // ============================================================================
  // LIKE MUTATIONS
  // ============================================================================

  /**
   * Like a post
   * Requires authentication
   */
  likePost: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('likePost'),
      {
        userId: UserId(context.userId),
        postId: PostId(args.postId),
      }
    );
  }),

  /**
   * Unlike a post
   * Requires authentication
   */
  unlikePost: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('unlikePost'),
      {
        userId: UserId(context.userId),
        postId: PostId(args.postId),
      }
    );
  }),

  // ============================================================================
  // FOLLOW MUTATIONS
  // ============================================================================

  /**
   * Follow a user
   * Requires authentication
   */
  followUser: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('followUser'),
      {
        followerId: UserId(context.userId),
        followeeId: UserId(args.userId),
      }
    );
  }),

  /**
   * Unfollow a user
   * Requires authentication
   */
  unfollowUser: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('unfollowUser'),
      {
        followerId: UserId(context.userId),
        followeeId: UserId(args.userId),
      }
    );
  }),

  // ============================================================================
  // COMMENT MUTATIONS
  // ============================================================================

  /**
   * Create a comment
   * Requires authentication
   *
   * Returns a CommentParent with partial Comment data.
   * Comment field resolver (author) will complete the Comment object.
   */
  createComment: withAuth(async (_parent, args, context) => {
    const result = await executeUseCase(
      context.container.resolve('createComment'),
      {
        userId: UserId(context.userId),
        postId: PostId(args.input.postId),
        content: args.input.content,
      }
    );

    // Type assertion: Use case returns CommentParent (without field resolver fields).
    // GraphQL will invoke Comment field resolver to add author.
    return result as CommentParent;
  }),

  /**
   * Delete a comment
   * Requires authentication and ownership
   */
  deleteComment: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('deleteComment'),
      {
        commentId: args.id,
        userId: UserId(context.userId),
      }
    );
  }),

  // ============================================================================
  // PROFILE MUTATIONS
  // ============================================================================

  /**
   * Update profile information
   * Requires authentication
   */
  // @ts-ignore - UpdateProfileOutput doesn't include immutable fields (email, username, emailVerified)
  updateProfile: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('updateProfile'),
      {
        userId: UserId(context.userId),
        handle: args.input.handle ?? undefined,
        fullName: args.input.fullName ?? undefined,
        bio: args.input.bio ?? undefined,
      }
    );
  }),

  /**
   * Get presigned URL for profile picture upload
   * Requires authentication
   */
  getProfilePictureUploadUrl: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('getProfilePictureUploadUrl'),
      {
        userId: UserId(context.userId),
        fileType: (args.fileType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      }
    );
  }),

  // ============================================================================
  // NOTIFICATION MUTATIONS
  // ============================================================================

  /**
   * Mark a notification as read
   * Requires authentication and ownership
   */
  // @ts-ignore - DAL Notification type differs from GraphQL Notification type (status enum values differ)
  markNotificationAsRead: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('markNotificationAsRead'),
      {
        userId: UserId(context.userId),
        notificationId: args.id,
      }
    );
  }),

  /**
   * Mark all notifications as read
   * Requires authentication
   */
  markAllNotificationsAsRead: withAuth(async (_parent, _args, context) => {
    return executeUseCase(
      context.container.resolve('markAllNotificationsAsRead'),
      {
        userId: UserId(context.userId),
      }
    );
  }),

  /**
   * Delete a notification
   * Requires authentication and ownership (idempotent)
   */
  deleteNotification: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('deleteNotification'),
      {
        userId: UserId(context.userId),
        notificationId: args.id,
      }
    );
  }),

  // ============================================================================
  // FEED MUTATIONS
  // ============================================================================
  // Note: Feed mutations (markFeedItemsAsRead) moved to Pothos schema (src/schema/pothos/mutations/feed.ts)

  // ============================================================================
  // AUCTION MUTATIONS
  // ============================================================================

  /**
   * Create a new auction
   * Requires authentication
   * Returns auction with presigned S3 upload URL for image
   *
   * Note: Validation moved to CreateAuction use case (business logic layer)
   */
  // @ts-ignore - DAL Auction type differs from GraphQL Auction type (seller/winner field resolvers handle missing fields)
  createAuction: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('createAuction'),
      {
        userId: UserId(context.userId),
        title: args.input.title,
        description: args.input.description,
        startingPrice: args.input.startPrice,
        reservePrice: args.input.reservePrice,
        startTime: args.input.startTime,
        endTime: args.input.endTime,
        fileType: args.input.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | undefined,
      }
    );
  }),

  /**
   * Activate an auction
   * Requires authentication and ownership
   * Transitions auction from 'pending' to 'active' status
   */
  // @ts-ignore - DAL Auction type differs from GraphQL Auction type (seller/winner field resolvers handle missing fields)
  activateAuction: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('activateAuction'),
      {
        auctionId: args.id,
        userId: UserId(context.userId),
      }
    );
  }),

  /**
   * Place a bid on an auction
   * Requires authentication
   * Returns the created bid and updated auction
   *
   * Note: Validation moved to PlaceBid use case (business logic layer)
   *
   * Returns a PlaceBidPayloadParent with partial Auction data.
   * Auction field resolvers (seller, winner) will complete the Auction object.
   */
  placeBid: withAuth(async (_parent, args, context) => {
    const result = await executeUseCase(
      context.container.resolve('placeBid'),
      {
        userId: UserId(context.userId),
        auctionId: args.input.auctionId,
        amount: args.input.amount,
      }
    );

    // Type assertion: Use case returns AuctionParent (without field resolver fields).
    // GraphQL will invoke Auction field resolvers to add seller and winner.
    return result as PlaceBidPayloadParent;
  }),
};
