/**
 * Posts Types - Pothos Implementation
 *
 * This file defines all post-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Field resolvers co-located with type definition
 * - ✅ DataLoader integration for N+1 prevention
 * - ✅ Refactoring: Rename a field = schema updates automatically
 */

import { builder } from '../builder.js';
import { PublicProfileType, PageInfoType } from './comments.js';
import { CommentConnectionType } from './comments.js';
import type { PostParent, CreatePostPayloadParent } from '../../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * Post GraphQL Type
 *
 * Represents a social media post with image/video content.
 * Includes field resolvers for:
 * - author: Resolved via DataLoader (batched profile lookups)
 * - isLiked: Resolved via DataLoader (batched like status checks)
 * - comments: Nested query with pagination
 */
export const PostType = builder.objectRef<PostParent>('Post');

PostType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the post',
    }),
    userId: t.exposeID('userId', {
      description: 'ID of the user who created the post',
    }),
    caption: t.exposeString('caption', {
      nullable: true,
      description: 'Optional caption text for the post',
    }),
    imageUrl: t.exposeString('imageUrl', {
      description: 'URL to the full-size image',
    }),
    thumbnailUrl: t.exposeString('thumbnailUrl', {
      description: 'URL to the thumbnail image',
    }),
    likesCount: t.exposeInt('likesCount', {
      description: 'Total number of likes on the post',
    }),
    commentsCount: t.exposeInt('commentsCount', {
      description: 'Total number of comments on the post',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Post creation timestamp (ISO 8601)',
    }),
    updatedAt: t.exposeString('updatedAt', {
      description: 'Last update timestamp (ISO 8601)',
    }),

    // Field resolver: author profile loaded via DataLoader
    author: t.field({
      type: PublicProfileType,
      description: 'Author profile information',
      resolve: async (parent, _args, context) => {
        // Use DataLoader to batch profile requests (N+1 prevention)
        const profile = await context.loaders.profileLoader.load(parent.userId);
        if (!profile) {
          throw new Error(`Profile not found for user ${parent.userId}`);
        }
        return profile as any;
      },
    }),

    // Field resolver: check if current user liked this post
    isLiked: t.boolean({
      nullable: true,
      description: 'Whether the current user has liked this post (null if not authenticated)',
      resolve: async (parent, _args, context) => {
        // Cannot check like status without authentication
        if (!context.userId) {
          return null;
        }

        // Use DataLoader to batch like status requests (N+1 prevention)
        const status = await context.loaders.likeStatusLoader.load(parent.id);

        // Return isLiked boolean from status object (or null if status not found)
        return status?.isLiked ?? null;
      },
    }),

    // Nested query: comments with pagination
    comments: t.field({
      type: CommentConnectionType,
      description: 'Paginated comments for this post',
      args: {
        first: t.arg.int({
          required: false,
          description: 'Number of comments to fetch (default: 20)',
        }),
        after: t.arg.string({
          required: false,
          description: 'Cursor for pagination',
        }),
      },
      resolve: async (parent, args, context) => {
        // Fetch comments for this post with pagination
        const result = await context.container
          .resolve('getCommentsByPost')
          .execute(parent.id, args.first ?? 20, args.after ?? undefined);

        if (!result.success) {
          throw new Error(`Failed to fetch comments: ${(result as any).error.message}`);
        }

        if (!result.data) {
          throw new Error('Use case returned no data');
        }

        return result.data as any;
      },
    }),
  }),
});

/**
 * PostEdge Type
 *
 * Edge type for Relay-style cursor pagination.
 */
export const PostEdgeType = builder.objectType('PostEdge', {
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: PostType,
      description: 'The post node',
      resolve: (parent: any) => parent.node,
    }),
  }),
});

/**
 * PostConnection Type
 *
 * Relay-style connection for paginated posts.
 */
export const PostConnectionType = builder.objectType('PostConnection', {
  fields: (t) => ({
    edges: t.field({
      type: [PostEdgeType],
      description: 'List of post edges',
      resolve: (parent: any) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent: any) => parent.pageInfo,
    }),
  }),
});

/**
 * CreatePostPayload Type
 *
 * Response payload for createPost mutation.
 * Includes the created post and presigned URLs for uploading images.
 */
export const CreatePostPayloadType = builder.objectType('CreatePostPayload', {
  fields: (t) => ({
    post: t.field({
      type: PostType,
      description: 'The newly created post',
      resolve: (parent: CreatePostPayloadParent) => parent.post,
    }),
    uploadUrl: t.exposeString('uploadUrl', {
      description: 'Presigned S3 URL for uploading the full-size image',
    }),
    thumbnailUploadUrl: t.exposeString('thumbnailUploadUrl', {
      description: 'Presigned S3 URL for uploading the thumbnail image',
    }),
  }),
});
