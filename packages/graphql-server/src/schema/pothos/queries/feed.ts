/**
 * Feed Queries - Pothos Implementation
 *
 * This file defines all feed-related queries using Pothos.
 *
 * Queries:
 * - exploreFeed: Get public posts for discovery (public, optionally personalized)
 * - followingFeed: Get posts from followed users (requires auth)
 *
 * Note: The "feed" query exists in SDL but has no resolver implementation,
 * so it's not migrated here.
 */

import { builder } from '../builder.js';
import { PostConnectionType } from '../types/posts.js';
import { executeUseCase } from '../../../infrastructure/resolvers/helpers/useCase.js';
import { UserId, Cursor } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

builder.queryFields((t) => ({
  /**
   * ExploreFeed Query
   *
   * Returns public posts for discovery.
   * Public query - no authentication required.
   * Optionally personalized if user is authenticated.
   */
  exploreFeed: t.field({
    type: PostConnectionType,
    description: 'Get public posts for discovery',
    args: {
      limit: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Pagination cursor',
      }),
      first: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (Relay-style, alias for limit)',
      }),
      after: t.arg.string({
        required: false,
        description: 'Pagination cursor (Relay-style, alias for cursor)',
      }),
    },
    resolve: async (parent, args, context: GraphQLContext) => {
      // Support both limit/cursor and first/after parameter names
      const first = args.first ?? args.limit ?? 20;
      const after = args.after ?? args.cursor ?? undefined;

      const result = await executeUseCase(
        context.container.resolve('getExploreFeed'),
        {
          pagination: {
            first,
            after: after ? Cursor(after) : undefined,
          },
          viewerId: context.userId ? UserId(context.userId) : undefined,
        }
      );

      return result as any;
    },
  }),

  /**
   * FollowingFeed Query
   *
   * Returns posts from users the current user follows.
   * Requires authentication.
   */
  followingFeed: t.field({
    type: PostConnectionType,
    description: 'Get posts from followed users',

    // ✨ Built-in auth requirement
    authScopes: {
      authenticated: true,
    },

    args: {
      limit: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Pagination cursor',
      }),
      first: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (Relay-style, alias for limit)',
      }),
      after: t.arg.string({
        required: false,
        description: 'Pagination cursor (Relay-style, alias for cursor)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // Support both limit/cursor and first/after parameter names
      const first = args.first ?? args.limit ?? 20;
      const after = args.after ?? args.cursor ?? undefined;

      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container.resolve('getFollowingFeed'),
        {
          userId: UserId(context.userId!),
          pagination: {
            first,
            after: after ? Cursor(after) : undefined,
          },
        }
      );

      return result as any;
    },
  }),
}));
