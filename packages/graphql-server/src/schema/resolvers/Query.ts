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
  userPosts: async (_parent, args, context) => {
    // First, get the user's profile to get their userId
    const profile = await context.services.profileService.getProfileByHandle(args.handle);

    if (!profile) {
      throw new GraphQLError(`User not found: ${args.handle}`, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Parse cursor if provided
    let exclusiveStartKey: Record<string, any> | undefined;
    if (args.cursor) {
      try {
        const cursorData = Buffer.from(args.cursor, 'base64').toString('utf-8');
        exclusiveStartKey = JSON.parse(cursorData);
      } catch (error) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    // Get posts for the user
    const result = await context.services.postService.getUserPosts({
      userId: profile.id,
      limit: args.limit || 10,
      exclusiveStartKey,
    });

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
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
    };
  },
};
