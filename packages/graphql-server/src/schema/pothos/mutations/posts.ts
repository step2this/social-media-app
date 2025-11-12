/**
 * Posts Mutations - Pothos Implementation
 *
 * This file defines all post-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { PostType, CreatePostPayloadType } from '../types/posts.js';
import { DeleteResponseType } from '../types/comments.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId, PostId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';
import type { PostParent, CreatePostPayloadParent } from '../../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * Post Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Create Post Mutation
   *
   * Creates a new post with image upload.
   * Returns presigned URLs for uploading the image and thumbnail.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  createPost: t.field({
    type: CreatePostPayloadType,
    description: 'Create a new post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      fileType: t.arg.string({
        required: true,
        description: 'MIME type of the image (e.g., image/jpeg, image/png)',
      }),
      caption: t.arg.string({
        required: false,
        description: 'Optional caption text for the post',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'createPost',
        {
          userId: UserId(context.userId!),
          fileType: args.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          caption: args.caption ?? undefined,
        }
      );

      // Type assertion: Use case returns CreatePostPayloadParent with PostParent.
      // GraphQL will invoke Post field resolvers to add author and isLiked.
      return result as CreatePostPayloadParent;
    },
  }),

  /**
   * Update Post Mutation
   *
   * Updates an existing post's caption.
   * User must be the post owner.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated and post owner
   */
  updatePost: t.field({
    type: PostType,
    description: 'Update an existing post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the post to update',
      }),
      caption: t.arg.string({
        required: false,
        description: 'Updated caption text',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'updatePost',
        {
          postId: PostId(args.id),
          userId: UserId(context.userId!),
          caption: args.caption ?? undefined,
        }
      );

      // Type assertion: Use case returns PostParent (without field resolver fields).
      // GraphQL will invoke Post field resolvers to add author and isLiked.
      return result as PostParent;
    },
  }),

  /**
   * Delete Post Mutation
   *
   * Deletes a post. User must be the post owner.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated and post owner
   */
  deletePost: t.field({
    type: DeleteResponseType,
    description: 'Delete a post',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the post to delete',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'deletePost',
        {
          postId: PostId(args.id),
          userId: UserId(context.userId!),
        }
      );

      return result;
    },
  }),
}));
