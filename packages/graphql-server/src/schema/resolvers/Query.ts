/**
 * GraphQL Query Resolvers
 *
 * ⚠️ CRITICAL: DO NOT DELETE THIS FILE
 *
 * These resolvers are the backend GraphQL API that serves data to the frontend.
 * Even though the frontend now uses Relay instead of handrolled GraphQL services,
 * Relay STILL makes GraphQL queries that hit these resolvers.
 *
 * Migration Status:
 * - ✅ Frontend: Migrated to Relay (packages/frontend/src/pages/*.relay.tsx)
 * - ✅ Backend: These resolvers serve Relay queries (MUST KEEP)
 *
 * What was deleted:
 * - Frontend handrolled GraphQL services (FeedService.graphql.ts, etc.)
 *
 * What must stay:
 * - This file (Query.ts) - Backend resolvers for GraphQL API
 * - All other resolver files (Post.ts, User.ts, etc.)
 * - GraphQL schema (schema.graphql)
 *
 * How it works now:
 * 1. Relay (frontend) makes GraphQL query: `query HomePageRelayQuery { followingFeed(...) }`
 * 2. Query hits this resolver: `Query.followingFeed()`
 * 3. Resolver fetches data from backend/dal
 * 4. Relay receives data and updates cache
 *
 * Implements all root-level Query resolvers for the GraphQL schema.
 * Handles read operations for profiles, posts, comments, and feeds.
 */

import { GraphQLError } from 'graphql';
import type { QueryResolvers } from '../generated/types.js';

/**
 * Helper: Parse and validate cursor
 * Reusable cursor validation logic (DRY principle)
 */
function parseCursor(cursor?: string | null): string | undefined {
  if (!cursor) {
    return undefined;
  }

  try {
    // Validate cursor is valid base64-encoded JSON
    Buffer.from(cursor, 'base64').toString('utf-8');
    return cursor;
  } catch (error) {
    throw new GraphQLError('Invalid cursor', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
}

/**
 * Helper: Build edge cursor for post
 * Reusable cursor generation for posts (DRY principle)
 */
interface PostCursorData {
  id: string;
  createdAt: string;
}

function buildPostCursor(post: PostCursorData): string {
  return Buffer.from(
    JSON.stringify({
      id: post.id,
      createdAt: post.createdAt,
    })
  ).toString('base64');
}

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
   * Get explore feed (all public posts)
   * Public - no authentication required
   * Returns posts from all users in chronological order
   *
   * Supports both old (limit/cursor) and Relay spec (first/after) pagination args
   */
  // @ts-ignore - PostGridItem differs from Post (author field resolver handles missing field)
  exploreFeed: async (_parent, args, context) => {
    // Support both pagination styles for backward compatibility
    // Relay spec uses 'first' and 'after', old style uses 'limit' and 'cursor'
    const limit = args.first || args.limit || 24;
    const cursorArg = args.after || args.cursor;

    // Parse and validate cursor
    const cursor = parseCursor(cursorArg);

    // Get explore feed from PostService (returns PostGridResponse with PostGridItem[])
    const result = await context.services.postService.getFeedPosts(
      limit,
      cursor
    );

    // Transform PostGridItem to Post edges
    // PostGridItem has: id, userId, userHandle, thumbnailUrl, caption, likesCount, commentsCount, createdAt
    // Post needs: id, userId, imageUrl, caption, likesCount, commentsCount, createdAt, updatedAt
    // author field will be resolved by Post.author field resolver
    const edges = result.posts.map((post: { id: string; userId: string; userHandle: string; thumbnailUrl: string; caption: string | null; likesCount: number; commentsCount: number; createdAt: string }) => ({
      node: {
        id: post.id,
        userId: post.userId,
        caption: post.caption ?? '',
        imageUrl: post.thumbnailUrl, // Explore feed uses thumbnails
        thumbnailUrl: post.thumbnailUrl,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt,
        updatedAt: post.createdAt, // PostGridItem doesn't have updatedAt
        // author field resolved by Post.author field resolver via DataLoader
      },
      cursor: buildPostCursor(post),
    }));

    const pageInfo = {
      hasNextPage: result.hasMore,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
    };

    return {
      edges,
      pageInfo,
    };
  },

  /**
   * Get following feed (posts from followed users)
   * Requires authentication
   * Returns posts from users that the authenticated user follows
   *
   * Supports both old (limit/cursor) and Relay spec (first/after) pagination args
   */
  // @ts-ignore - PostWithAuthor differs from Post (mapping handles denormalized fields)
  followingFeed: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to access your feed', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Support both pagination styles for backward compatibility
    // Relay spec uses 'first' and 'after', old style uses 'limit' and 'cursor'
    const limit = args.first || args.limit || 24;
    const cursorArg = args.after || args.cursor;

    // Parse and validate cursor
    const cursor = parseCursor(cursorArg);

    // Get following feed from PostService
    // This returns FeedResponse with PostWithAuthor[] (denormalized author fields)
    const result = await context.services.postService.getFollowingFeedPosts(
      context.userId,
      context.services.followService,
      limit,
      cursor
    );

    // Transform PostWithAuthor to Post edges
    // PostWithAuthor has denormalized fields: authorId, authorHandle, authorFullName, authorProfilePictureUrl
    // We map these to nested Post structure for GraphQL (author field resolved by field resolver)
    const edges = result.posts.map((postWithAuthor: { id: string; userId: string; caption: string | null; imageUrl: string; likesCount: number; commentsCount: number; isLiked?: boolean; createdAt: string }) => ({
      node: {
        id: postWithAuthor.id,
        userId: postWithAuthor.userId,
        caption: postWithAuthor.caption ?? '',
        imageUrl: postWithAuthor.imageUrl,
        thumbnailUrl: postWithAuthor.imageUrl, // Use full image as thumbnail
        likesCount: postWithAuthor.likesCount,
        commentsCount: postWithAuthor.commentsCount,
        isLiked: postWithAuthor.isLiked ?? false,
        createdAt: postWithAuthor.createdAt,
        updatedAt: postWithAuthor.createdAt, // PostWithAuthor doesn't have updatedAt
        // author field resolved by Post.author field resolver via DataLoader
      },
      cursor: buildPostCursor(postWithAuthor),
    }));

    const pageInfo = {
      hasNextPage: result.hasMore,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
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
    // Convert nullable GraphQL args to undefined for service (InputMaybe -> undefined)
    const result = await context.services.auctionService.listAuctions({
      limit: args.limit || 20,
      cursor: args.cursor ?? undefined,
      status: args.status ?? undefined,
      userId: args.userId ?? undefined,
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
  // @ts-expect-error - bidder field resolved by Bid.bidder field resolver (not in DAL Bid type)
  bids: async (_parent, args, context) => {
    // Get bid history from service
    // Service expects single request object with auctionId, limit, offset
    const result = await context.services.auctionService.getBidHistory({
      auctionId: args.auctionId,
      limit: args.limit || 50,
      offset: args.offset || 0,
    });

    // Note: bidder field will be resolved by Bid.bidder field resolver
    return {
      bids: result.bids,
      total: result.total,
    };
  },
};
