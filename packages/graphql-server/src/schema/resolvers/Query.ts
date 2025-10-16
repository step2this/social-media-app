/**
 * Query Resolvers
 *
 * Implements all root-level Query resolvers for the GraphQL schema.
 * Handles read operations for profiles, posts, comments, and feeds.
 */

import { GraphQLError } from 'graphql';
import type { QueryResolvers } from '../generated/types.js';

/**
 * Query resolvers
 *
 * Implements:
 * - me: Get current authenticated user's profile
 * - profile(handle): Get profile by handle
 * - post(id): Get post by ID
 * - userPosts(handle, limit, cursor): Get paginated posts for a user
 * - feed(limit, cursor): Get paginated feed items for authenticated user
 * - comments(postId, limit, cursor): Get paginated comments for a post
 * - followStatus(userId): Get follow status between authenticated user and target user
 * - postLikeStatus(postId): Get like status for a post by authenticated user
 */
export const Query: QueryResolvers = {
  /**
   * Get current authenticated user's profile
   * Requires authentication
   */
  me: async (_parent, _args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to access your profile', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Get profile by user ID
    const profile = await context.services.profileService.getProfileById(context.userId);

    if (!profile) {
      throw new GraphQLError('Profile not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return profile;
  },

  /**
   * Get profile by handle
   * Public - no authentication required
   */
  // @ts-ignore - DAL PublicProfile type differs from GraphQL Profile type (field resolvers handle missing fields)
  profile: async (_parent, args, context) => {
    // Get profile by handle
    const profile = await context.services.profileService.getProfileByHandle(args.handle);

    // Return null if not found (not an error - user may not exist)
    return profile || null;
  },

  /**
   * Get post by ID
   * Public - no authentication required
   */
  // @ts-ignore - DAL Post type differs from GraphQL Post type (author field resolver handles missing field)
  post: async (_parent, args, context) => {
    // Get post by ID
    const post = await context.services.postService.getPostById(args.id);

    // Return null if not found (not an error)
    return post || null;
  },

  /**
   * Get paginated posts for a user
   * Public - no authentication required
   */
  // @ts-ignore - DAL Post type differs from GraphQL Post type (author field resolver handles missing field)
  userPosts: async (_parent, args, context) => {
    // First, get the user's profile to get their userId
    const profile = await context.services.profileService.getProfileByHandle(args.handle);

    if (!profile) {
      throw new GraphQLError(`User not found: ${args.handle}`, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Parse cursor if provided
    let cursor: string | undefined;
    if (args.cursor) {
      try {
        // Validate cursor is valid base64-encoded JSON
        const decoded = Buffer.from(args.cursor, 'base64').toString('utf-8');
        JSON.parse(decoded); // Should parse as valid JSON
        cursor = args.cursor;
      } catch (error) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    // Get posts for the user (cursor is passed directly to service)
    const result = await context.services.postService.getUserPosts(
      profile.id,
      args.limit || 10,
      cursor
    );

    // Build connection response (Relay-style pagination)
    const edges = result.posts.map((post) => ({
      node: post,
      cursor: Buffer.from(
        JSON.stringify({
          PK: `USER#${post.userId}`,
          SK: `POST#${post.createdAt}#${post.id}`,
        })
      ).toString('base64'),
    }));

    const pageInfo = {
      hasNextPage: result.hasMore,
      hasPreviousPage: false, // Not supported yet
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
    };
  },

  /**
   * Get paginated feed items for authenticated user
   * Requires authentication
   */
  // @ts-ignore - DAL Post type differs from GraphQL Post type (author field resolver handles missing field)
  feed: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to access your feed', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Parse cursor if provided
    let cursor: string | undefined;
    if (args.cursor) {
      try {
        // Validate cursor is valid base64
        Buffer.from(args.cursor, 'base64').toString('utf-8');
        cursor = args.cursor;
      } catch (error) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    // Get feed items from service
    const result = await context.services.feedService.getMaterializedFeedItems({
      userId: context.userId,
      limit: args.limit || 20,
      cursor,
    });

    // Transform to Relay connection
    // FeedPostItem contains post data flattened - need to nest it as Post for GraphQL schema
    const edges = result.items.map((item) => {
      // Map FeedPostItem to FeedItem { id, post, readAt, createdAt }
      // The post field needs to be constructed from flattened data
      const feedItem = {
        id: item.id,
        post: {
          id: item.id,
          userId: item.userId,
          caption: item.caption || '',
          imageUrl: item.imageUrl,
          thumbnailUrl: item.imageUrl, // FeedPostItem doesn't have thumbnailUrl, use imageUrl
          likesCount: item.likesCount || 0,
          commentsCount: item.commentsCount || 0,
          isLiked: item.isLiked || false,
          createdAt: item.createdAt,
          updatedAt: item.createdAt, // FeedPostItem doesn't have updatedAt, use createdAt
          // author field will be resolved by Post.author field resolver
        },
        readAt: item.readAt || null,
        createdAt: item.createdAt,
      };

      // Build cursor for this edge (feed items use USER#userId + FEED#createdAt#postId pattern)
      return {
        node: feedItem,
        cursor: Buffer.from(
          JSON.stringify({
            PK: `USER#${context.userId}`,
            SK: `FEED#${item.createdAt}#${item.id}`,
          })
        ).toString('base64'),
      };
    });

    const pageInfo = {
      hasNextPage: !!result.nextCursor,
      hasPreviousPage: false, // Not supported yet
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
    };
  },

  /**
   * Get paginated comments for a post
   * Public - no authentication required
   */
  // @ts-ignore - DAL Comment type differs from GraphQL Comment type (author field resolver handles missing field)
  comments: async (_parent, args, context) => {
    // Parse cursor if provided
    let cursor: string | undefined;
    if (args.cursor) {
      try {
        // Validate cursor is valid base64
        Buffer.from(args.cursor, 'base64').toString('utf-8');
        cursor = args.cursor;
      } catch (error) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    // Get comments from service
    const result = await context.services.commentService.getCommentsByPost(
      args.postId,
      args.limit || 20,
      cursor
    );

    // Transform to Relay connection
    const edges = result.comments.map((comment) => ({
      node: comment,
      // Build cursor for this edge (comments use POST#postId + COMMENT#createdAt#commentId pattern)
      cursor: Buffer.from(
        JSON.stringify({
          PK: `POST#${args.postId}`,
          SK: `COMMENT#${comment.createdAt}#${comment.id}`,
        })
      ).toString('base64'),
    }));

    const pageInfo = {
      hasNextPage: result.hasMore,
      hasPreviousPage: false, // Not supported yet
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
    };
  },

  /**
   * Get follow status between authenticated user and target user
   * Requires authentication
   */
  followStatus: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to check follow status', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Get follow status from service
    const status = await context.services.followService.getFollowStatus(
      context.userId,
      args.userId
    );

    return {
      isFollowing: status.isFollowing,
      followersCount: status.followersCount,
      followingCount: status.followingCount,
    };
  },

  /**
   * Get like status for a post by authenticated user
   * Requires authentication
   */
  postLikeStatus: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to check like status', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // LikeService has getLikeStatusesByPostIds (batch), use it for single post
    const statusMap = await context.services.likeService.getLikeStatusesByPostIds(
      context.userId,
      [args.postId]
    );

    const status = statusMap.get(args.postId) || { isLiked: false, likesCount: 0 };

    // However, likesCount from getLikeStatusesByPostIds is always 0 (see DAL docs)
    // Need to get actual likesCount from Post entity
    const post = await context.services.postService.getPostById(args.postId);

    return {
      isLiked: status.isLiked,
      likesCount: post?.likesCount || 0,
    };
  },

  /**
   * Get paginated notifications for authenticated user
   * Requires authentication
   */
  // @ts-ignore - DAL Notification type differs from GraphQL Notification type (status enum values differ)
  notifications: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to access notifications', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Parse cursor if provided
    let cursor: string | undefined;
    if (args.cursor) {
      try {
        // Validate cursor is valid base64
        Buffer.from(args.cursor, 'base64').toString('utf-8');
        cursor = args.cursor;
      } catch (error) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    try {
      // Get notifications from service
      const result = await context.services.notificationService.getNotifications({
        userId: context.userId,
        limit: args.limit || 20,
        cursor,
      });

      // Transform to Relay connection
      const edges = result.notifications.map((notification) => ({
        node: notification,
        cursor: Buffer.from(
          JSON.stringify({
            PK: `USER#${context.userId}`,
            SK: `NOTIFICATION#${notification.createdAt}#${notification.id}`,
          })
        ).toString('base64'),
      }));

      const pageInfo = {
        hasNextPage: result.hasMore,
        hasPreviousPage: false, // Not supported yet
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 && result.hasMore ? edges[edges.length - 1].cursor : null,
      };

      return {
        edges,
        pageInfo,
      };
    } catch (error) {
      // Handle specific errors
      if (error instanceof GraphQLError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes('Invalid cursor')) {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_REQUEST' },
          });
        }
      }
      // Re-throw as internal server error
      throw new GraphQLError('Failed to fetch notifications', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  },

  /**
   * Get count of unread notifications for authenticated user
   * Requires authentication
   */
  unreadNotificationsCount: async (_parent, _args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to access notifications', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Get unread count from service
    const count = await context.services.notificationService.getUnreadCount(context.userId);

    return count;
  },

  /**
   * Get auction by ID
   * Public - no authentication required
   */
  // @ts-ignore - DAL Auction type differs from GraphQL Auction type (seller/winner field resolvers handle missing fields)
  auction: async (_parent, args, context) => {
    // Get auction by ID
    const auction = await context.services.auctionService.getAuction(args.id);

    // Return null if not found (not an error)
    return auction || null;
  },

  /**
   * Get paginated auctions
   * Public - no authentication required
   * Supports filtering by status and userId
   */
  // @ts-ignore - DAL Auction type differs from GraphQL Auction type (seller/winner field resolvers handle missing fields)
  auctions: async (_parent, args, context) => {
    // Get auctions from service
    const result = await context.services.auctionService.listAuctions({
      limit: args.limit || 20,
      cursor: args.cursor,
      status: args.status,
      userId: args.userId,
    });

    // Transform to Relay connection
    const edges = result.auctions.map((auction) => ({
      node: auction,
      cursor: Buffer.from(JSON.stringify({ id: auction.id, createdAt: auction.createdAt })).toString('base64'),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: result.hasMore,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor || null,
        endCursor: edges[edges.length - 1]?.cursor || null,
      },
    };
  },

  /**
   * Get bid history for an auction
   * Public - no authentication required
   */
  bids: async (_parent, args, context) => {
    // Get bid history from service
    const result = await context.services.auctionService.getBidHistory(
      args.auctionId,
      { limit: args.limit || 50, offset: args.offset || 0 }
    );

    return {
      bids: result.bids,
      total: result.total,
    };
  },
};
