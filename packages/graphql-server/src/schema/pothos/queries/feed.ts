/**
 * Feed Queries - Pothos Implementation
 *
 * This file defines all feed-related queries using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth where needed via authScopes
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { FeedConnectionType } from '../types/feed.js';
import { PostConnectionType } from '../types/posts.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId, Cursor } from '../../../shared/types/index.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Feed Queries
 */
builder.queryFields((t) => ({
  /**
   * Get Personalized Feed Query
   *
   * Fetches the authenticated user's personalized feed.
   * Includes posts from followed users and recommended content.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   *
   * Supports two pagination styles:
   * - limit + cursor (legacy)
   * - first + after (Relay-style)
   */
  feed: t.field({
    type: FeedConnectionType,
    description: 'Get personalized feed for the authenticated user',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      limit: t.arg.int({
        required: false,
        description: 'Number of items to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Cursor for pagination',
      }),
      first: t.arg.int({
        required: false,
        description: 'Number of items to fetch (Relay-style, default: 20)',
      }),
      after: t.arg.string({
        required: false,
        description: 'Cursor for pagination (Relay-style)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes

      // Support both pagination styles (limit+cursor or first+after)
      const limit = args.first ?? args.limit ?? 20;
      const cursor = args.after ?? args.cursor ?? undefined;

      // Validate pagination parameters
      if (limit <= 0) {
        throw ErrorFactory.badRequest('limit/first must be greater than 0');
      }

      const result = await executeUseCase(
        context.container,
        'getFeed',
        {
          userId: UserId(context.userId!),
          pagination: {
            first: limit,
            after: cursor ? Cursor(cursor) : undefined,
          },
        }
      );

      // Type assertion: use case returns Connection<FeedItem> which is structurally compatible
      return result as any;
    },
  }),

  /**
   * Get Explore Feed Query
   *
   * Fetches public posts for discovery/exploration.
   * Does not require authentication.
   *
   * **Auth**: ⚪ OPTIONAL - Can be used by anonymous or authenticated users
   *
   * Supports two pagination styles:
   * - limit + cursor (legacy)
   * - first + after (Relay-style)
   */
  exploreFeed: t.field({
    type: PostConnectionType,
    description: 'Get explore feed with public posts for discovery',

    args: {
      limit: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Cursor for pagination',
      }),
      first: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (Relay-style, default: 20)',
      }),
      after: t.arg.string({
        required: false,
        description: 'Cursor for pagination (Relay-style)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // Support both pagination styles (limit+cursor or first+after)
      const limit = args.first ?? args.limit ?? 20;
      const cursor = args.after ?? args.cursor ?? undefined;

      // Validate pagination parameters
      if (limit <= 0) {
        throw ErrorFactory.badRequest('limit/first must be greater than 0');
      }

      const result = await executeUseCase(
        context.container,
        'getExploreFeed',
        {
          pagination: {
            first: limit,
            after: cursor ? Cursor(cursor) : undefined,
          },
        }
      );

      // Type assertion: use case returns Connection<Post> which is structurally compatible
      return result as any;
    },
  }),

  /**
   * Get Following Feed Query
   *
   * Fetches posts from users that the authenticated user follows.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   *
   * Supports two pagination styles:
   * - limit + cursor (legacy)
   * - first + after (Relay-style)
   */
  followingFeed: t.field({
    type: PostConnectionType,
    description: 'Get posts from users that the current user follows',

    // ✨ Built-in auth! No manual withAuth HOC needed
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
        description: 'Cursor for pagination',
      }),
      first: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (Relay-style, default: 20)',
      }),
      after: t.arg.string({
        required: false,
        description: 'Cursor for pagination (Relay-style)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes

      // Support both pagination styles (limit+cursor or first+after)
      const limit = args.first ?? args.limit ?? 20;
      const cursor = args.after ?? args.cursor ?? undefined;

      // Validate pagination parameters
      if (limit <= 0) {
        throw ErrorFactory.badRequest('limit/first must be greater than 0');
      }

      const result = await executeUseCase(
        context.container,
        'getFollowingFeed',
        {
          userId: UserId(context.userId!),
          pagination: {
            first: limit,
            after: cursor ? Cursor(cursor) : undefined,
          },
        }
      );

      // Type assertion: use case returns Connection<Post> which is structurally compatible
      return result as any;
    },
  }),
}));
