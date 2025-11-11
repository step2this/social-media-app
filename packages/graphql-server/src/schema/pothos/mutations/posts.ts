/**
 * Posts Mutations - Pothos Implementation
 *
 * This file defines all post-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline input type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual withAuth HOC needed)
 * - ✅ Arguments are type-checked at compile time
 * - ✅ Resolver return types are validated
 *
 * Mutations:
 * - createPost: Create a new post with image upload URLs (requires auth)
 * - updatePost: Update post caption (requires auth + ownership)
 * - deletePost: Delete a post (requires auth + ownership)
 */

import { builder } from '../builder.js';
import { PostType, CreatePostPayloadType, DeleteResponseType } from '../types/posts.js';
import { executeUseCase } from '../../../infrastructure/resolvers/helpers/useCase.js';
import { UserId, PostId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * CreatePostInput
 *
 * Input type for creating a new post.
 */
const CreatePostInput = builder.inputType('CreatePostInput', {
  fields: (t) => ({
    fileType: t.string({
      required: true,
      description: 'MIME type of the image (e.g., image/jpeg, image/png)',
    }),
    caption: t.string({
      required: false,
      description: 'Optional caption text for the post',
    }),
  }),
});

/**
 * UpdatePostInput
 *
 * Input type for updating a post.
 */
const UpdatePostInput = builder.inputType('UpdatePostInput', {
  fields: (t) => ({
    caption: t.string({
      required: false,
      description: 'Updated caption text (omit to remove caption)',
    }),
  }),
});

builder.mutationFields((t) => ({
  /**
   * CreatePost Mutation
   *
   * Creates a new post and returns presigned S3 URLs for image upload.
   * The client should upload the image and thumbnail to the provided URLs.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  createPost: t.field({
    type: CreatePostPayloadType,
    description: 'Create a new post with image upload URLs',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      input: t.arg({
        type: CreatePostInput,
        required: true,
        description: 'Post creation input',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container.resolve('createPost'),
        {
          userId: UserId(context.userId!),
          fileType: args.input.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          caption: args.input.caption ?? undefined,
        }
      );

      return result as any;
    },
  }),

  /**
   * UpdatePost Mutation
   *
   * Updates an existing post's caption.
   * Only the post owner can update their posts.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   * **Authorization**: Ownership checked in use case
   */
  updatePost: t.field({
    type: PostType,
    description: 'Update post caption',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'Post ID to update',
      }),
      input: t.arg({
        type: UpdatePostInput,
        required: true,
        description: 'Post update input',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container.resolve('updatePost'),
        {
          postId: PostId(args.id as string),
          userId: UserId(context.userId!),
          caption: args.input.caption ?? undefined,
        }
      );

      return result as any;
    },
  }),

  /**
   * DeletePost Mutation
   *
   * Deletes a post.
   * Only the post owner can delete their posts.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   * **Authorization**: Ownership checked in use case
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
        description: 'Post ID to delete',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container.resolve('deletePost'),
        {
          postId: PostId(args.id as string),
          userId: UserId(context.userId!),
        }
      );

      return result as any;
    },
  }),
}));
