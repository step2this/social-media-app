/**
 * Posts Queries - Pothos Implementation
 *
 * This file defines all post-related queries using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth where needed via authScopes
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { PostType, PostConnectionType } from '../types/posts.js';
import { executeUseCase, executeOptionalUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { Handle, PostId, UserId, Cursor } from '../../../shared/types/index.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Post Queries
 */
builder.queryFields((t) => ({
  /**
   * Get Post by ID Query
   *
   * Fetches a single post by its ID.
   * Public query - no authentication required.
   *
   * Returns null if post not found.
   */
  post: t.field({
    type: PostType,
    nullable: true,
    description: 'Get a post by ID',

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the post to fetch',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      const result = await executeOptionalUseCase(
        context.container.resolve('getPostById'),
        { postId: PostId(args.id) }
      );

      return result as any;
    },
  }),

  /**
   * Get User Posts Query
   *
   * Fetches paginated posts for a user by their handle.
   * Public query - no authentication required.
   *
   * Complex resolver: Composes two use cases:
   * 1. Lookup profile by handle to get userId
   * 2. Fetch posts for that userId
   */
  userPosts: t.field({
    type: PostConnectionType,
    description: 'Get paginated posts for a user',

    args: {
      handle: t.arg.string({
        required: true,
        description: 'User handle (e.g., @johndoe)',
      }),
      limit: t.arg.int({
        required: false,
        description: 'Number of posts to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Cursor for pagination',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // Step 1: Look up profile by handle to get userId
      const profileResult = await context.container
        .resolve('getProfileByHandle')
        .execute({ handle: Handle(args.handle) });

      if (!profileResult.success) {
        throw ErrorFactory.fromUseCaseError((profileResult as { success: false; error: Error }).error);
      }

      if (!profileResult.data) {
        throw ErrorFactory.notFound('Profile', args.handle);
      }

      // Step 2: Fetch posts for that user with pagination
      const limit = args.limit ?? 20;
      const cursor = args.cursor ?? undefined;

      // Validate pagination parameters
      if (limit <= 0) {
        throw ErrorFactory.badRequest('limit must be greater than 0');
      }

      const result = await executeUseCase(
        context.container.resolve('getUserPosts'),
        {
          userId: UserId(profileResult.data.id),
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
