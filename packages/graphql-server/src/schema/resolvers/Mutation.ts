/**
 * Mutation Resolvers
 *
 * Implements all root-level Mutation resolvers for the GraphQL schema.
 * Handles write operations for auth, posts, comments, likes, and follows.
 *
 * Phase 3 Migration (COMPLETE) + Auth Use Cases:
 * - ALL mutations (including auth) now use the use case pattern
 * - Full type safety with branded types
 * - Consistent error handling via ErrorFactory and use case Result types
 * - Zod validation preserved for createAuction and placeBid
 *
 * Benefits:
 * - 100% testable business logic (isolated in use cases)
 * - Type-safe with branded types (UserId, PostId, etc.)
 * - Consistent error handling across all mutations
 * - Clean separation of concerns
 * - Auth logic now reusable across interfaces (GraphQL, REST, etc.)
 */

import { GraphQLError } from 'graphql';
import type { MutationResolvers } from '../generated/types.js';
import {
  CreateAuctionRequestSchema,
  PlaceBidRequestSchema,
} from '@social-media-app/shared';
import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { executeUseCase } from '../../infrastructure/resolvers/helpers/useCase.js';
import { UserId, PostId } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

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
  // AUTH MUTATIONS (Use Case Pattern)
  // ============================================================================

  /**
   * Register a new user
   * Returns user profile with auth tokens
   */
  register: async (_parent, args, context) => {
    const result = await executeUseCase(
      context.container.resolve('register'),
      {
        email: args.input.email,
        password: args.input.password,
        username: args.input.username,
      }
    );

    // executeUseCase handles Result type and throws appropriate errors
    return result;
  },

  /**
   * Login existing user
   * Returns user profile with auth tokens
   */
  login: async (_parent, args, context) => {
    const result = await executeUseCase(
      context.container.resolve('login'),
      {
        email: args.input.email,
        password: args.input.password,
      }
    );

    return result;
  },

  /**
   * Refresh access token using refresh token
   * Returns user profile with new auth tokens
   */
  refreshToken: async (_parent, args, context) => {
    const result = await executeUseCase(
      context.container.resolve('refreshToken'),
      {
        refreshToken: args.refreshToken,
      }
    );

    return result;
  },

  /**
   * Logout user (idempotent)
   * Requires authentication
   */
  logout: withAuth(async (_parent, _args, context) => {
    const result = await executeUseCase(
      context.container.resolve('logout'),
      {
        userId: UserId(context.userId),
      }
    );

    return result;
  }),

  // ============================================================================
  // POST MUTATIONS
  // ============================================================================

  /**
   * Create a new post
   * Requires authentication
   */
  createPost: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('createPost'),
      {
        userId: UserId(context.userId),
        fileType: args.input.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        caption: args.input.caption ?? undefined,
      }
    ) as any;
  }),

  /**
   * Update an existing post
   * Requires authentication and ownership
   */
  updatePost: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('updatePost'),
      {
        postId: PostId(args.id),
        userId: UserId(context.userId),
        caption: args.input.caption ?? undefined,
      }
    ) as any;
  }),

  /**
   * Delete a post
   * Requires authentication and ownership
   */
  deletePost: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('deletePost'),
      {
        postId: PostId(args.id),
        userId: UserId(context.userId),
      }
    );
  }),

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
   */
  createComment: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('createComment'),
      {
        userId: UserId(context.userId),
        postId: PostId(args.input.postId),
        content: args.input.content,
      }
    ) as any;
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

  /**
   * Mark feed items as read
   * Requires authentication
   */
  markFeedItemsAsRead: withAuth(async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('markFeedItemsAsRead'),
      {
        userId: UserId(context.userId),
        postIds: args.postIds,
      }
    );
  }),

  // ============================================================================
  // AUCTION MUTATIONS
  // ============================================================================

  /**
   * Create a new auction
   * Requires authentication
   * Returns auction with presigned S3 upload URL for image
   *
   * Validates input with Zod schema to enforce business rules:
   * - Title: 3-200 characters
   * - Description: max 2000 characters
   * - Prices: positive, max 2 decimal places
   * - Times: endTime must be after startTime
   */
  // @ts-ignore - DAL Auction type differs from GraphQL Auction type (seller/winner field resolvers handle missing fields)
  createAuction: withAuth(async (_parent, args, context) => {
    // ✅ Validate input with Zod schema (business rules)
    const validationResult = CreateAuctionRequestSchema.safeParse(args.input);

    if (!validationResult.success) {
      throw new GraphQLError('Validation failed', {
        extensions: {
          code: 'BAD_USER_INPUT',
          validationErrors: validationResult.error.format(),
        },
      });
    }

    // Use validated data (with Zod transformations applied)
    const validatedInput = validationResult.data;

    return executeUseCase(
      context.container.resolve('createAuction'),
      {
        userId: UserId(context.userId),
        title: validatedInput.title,
        description: validatedInput.description,
        startingPrice: validatedInput.startingPrice,
        reservePrice: validatedInput.reservePrice,
        startTime: validatedInput.startTime,
        endTime: validatedInput.endTime,
        fileType: validatedInput.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | undefined,
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
   * Validates input with Zod schema to enforce business rules:
   * - Amount: positive number, max 2 decimal places
   * - AuctionId: valid UUID format
   */
  placeBid: withAuth(async (_parent, args, context) => {
    // ✅ Validate input with Zod schema (business rules)
    const validationResult = PlaceBidRequestSchema.safeParse(args.input);

    if (!validationResult.success) {
      throw new GraphQLError('Validation failed', {
        extensions: {
          code: 'BAD_USER_INPUT',
          validationErrors: validationResult.error.format(),
        },
      });
    }

    // Use validated data (with Zod transformations applied)
    const validatedInput = validationResult.data;

    return executeUseCase(
      context.container.resolve('placeBid'),
      {
        userId: UserId(context.userId),
        auctionId: validatedInput.auctionId,
        amount: validatedInput.amount,
      }
    ) as any;
  }),
};
