/**
 * Posts Types - Pothos Implementation
 *
 * This file defines all post-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches use case return types
 * - ✅ Autocomplete: Full IntelliSense when defining fields
 * - ✅ Refactoring: Rename a field = schema updates automatically
 *
 * Types Defined:
 * - PublicProfile: Public user profile (used by author field)
 * - PageInfo: Relay-style pagination info
 * - Post: Main post type with author, images, and engagement data
 * - PostEdge: Relay-style edge for pagination
 * - PostConnection: Relay-style paginated posts
 * - CreatePostPayload: Response for post creation with upload URLs
 * - DeleteResponse: Simple success response for delete operations
 * - CommentConnection: Placeholder for comments field (to be implemented in Comments migration)
 */

import { builder } from '../builder.js';

/**
 * PublicProfile Type (DAL)
 *
 * Public profile information visible to all users.
 * This is different from Profile which includes private fields (email, emailVerified).
 */
type PublicProfileFromDAL = {
  id: string;
  username: string;
  handle: string;
  fullName?: string;
  bio?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  createdAt: string;
};

/**
 * PageInfo Type (DAL)
 *
 * Relay-style pagination information.
 */
type PageInfoFromDAL = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
};

/**
 * Post Type (DAL)
 *
 * Represents a social media post with images, caption, and engagement data.
 * Author and isLiked will be resolved via field resolvers.
 */
type PostFromDAL = {
  id: string;
  userId: string;
  caption?: string;
  imageUrl: string;
  thumbnailUrl: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * PostEdge Type (DAL)
 *
 * Relay-style edge for Post pagination.
 */
type PostEdgeFromDAL = {
  cursor: string;
  node: PostFromDAL;
};

/**
 * PostConnection Type (DAL)
 *
 * Relay-style paginated posts.
 */
type PostConnectionFromDAL = {
  edges: PostEdgeFromDAL[];
  pageInfo: PageInfoFromDAL;
};

/**
 * CreatePostPayload Type (DAL)
 *
 * Response from createPost mutation.
 * Includes the created post and S3 presigned URLs for image uploads.
 */
type CreatePostPayloadFromDAL = {
  post: PostFromDAL;
  uploadUrl: string;
  thumbnailUploadUrl: string;
};

/**
 * DeleteResponse Type (DAL)
 *
 * Simple success response for delete operations.
 */
type DeleteResponseFromDAL = {
  success: boolean;
};

/**
 * CommentEdge Type (DAL) - Placeholder for comments field
 */
type CommentEdgeFromDAL = {
  cursor: string;
  node: {
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: string;
  };
};

/**
 * CommentConnection Type (DAL) - Placeholder for comments field
 */
type CommentConnectionFromDAL = {
  edges: CommentEdgeFromDAL[];
  pageInfo: PageInfoFromDAL;
};

// ============================================================================
// GraphQL Type Definitions
// ============================================================================

/**
 * PublicProfile GraphQL Type
 *
 * Public-facing user profile information.
 */
export const PublicProfileType = builder.objectRef<PublicProfileFromDAL>('PublicProfile');

PublicProfileType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the user',
    }),
    username: t.exposeString('username', {
      description: 'Unique username',
    }),
    handle: t.exposeString('handle', {
      description: 'Public handle (e.g., @johndoe)',
    }),
    fullName: t.exposeString('fullName', {
      nullable: true,
      description: 'Full display name',
    }),
    bio: t.exposeString('bio', {
      nullable: true,
      description: 'User biography',
    }),
    profilePictureUrl: t.exposeString('profilePictureUrl', {
      nullable: true,
      description: 'URL to profile picture',
    }),
    followersCount: t.exposeInt('followersCount', {
      description: 'Total number of followers',
    }),
    followingCount: t.exposeInt('followingCount', {
      description: 'Total number of users being followed',
    }),
    postsCount: t.exposeInt('postsCount', {
      description: 'Total number of posts',
    }),
    isFollowing: t.exposeBoolean('isFollowing', {
      nullable: true,
      description: 'Whether the current user follows this user',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Account creation timestamp (ISO 8601)',
    }),
  }),
});

/**
 * PageInfo GraphQL Type
 *
 * Relay-style pagination information for cursor-based pagination.
 */
export const PageInfoType = builder.objectRef<PageInfoFromDAL>('PageInfo');

PageInfoType.implement({
  fields: (t) => ({
    hasNextPage: t.exposeBoolean('hasNextPage', {
      description: 'Whether there are more items after the current page',
    }),
    hasPreviousPage: t.exposeBoolean('hasPreviousPage', {
      description: 'Whether there are items before the current page',
    }),
    startCursor: t.exposeString('startCursor', {
      nullable: true,
      description: 'Cursor for the first item in the page',
    }),
    endCursor: t.exposeString('endCursor', {
      nullable: true,
      description: 'Cursor for the last item in the page',
    }),
  }),
});

/**
 * Comment GraphQL Type
 *
 * Placeholder implementation for the Post.comments field.
 * Will be fully implemented during Comments module migration.
 */
export const CommentType = builder.objectRef<CommentEdgeFromDAL['node']>('Comment');

CommentType.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    postId: t.exposeID('postId'),
    userId: t.exposeID('userId'),
    content: t.exposeString('content'),
    createdAt: t.exposeString('createdAt'),
    // author field will be added during Comments migration
  }),
});

/**
 * CommentEdge GraphQL Type
 *
 * Placeholder implementation for the Post.comments field.
 * Will be fully implemented during Comments module migration.
 */
export const CommentEdgeType = builder.objectRef<CommentEdgeFromDAL>('CommentEdge');

CommentEdgeType.implement({
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: CommentType,
      description: 'The comment',
      resolve: (parent) => parent.node,
    }),
  }),
});

/**
 * CommentConnection GraphQL Type
 *
 * Relay-style paginated comments.
 * This is a placeholder implementation for the Post.comments field.
 * Will be fully implemented during Comments module migration.
 */
export const CommentConnectionType = builder.objectRef<CommentConnectionFromDAL>('CommentConnection');

CommentConnectionType.implement({
  fields: (t) => ({
    edges: t.field({
      type: [CommentEdgeType],
      description: 'List of comment edges',
      resolve: (parent) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent) => parent.pageInfo,
    }),
  }),
});

/**
 * Post GraphQL Type
 *
 * Main post type with images, caption, and engagement data.
 *
 * Field Resolvers:
 * - author: Resolved via DataLoader (batched profile lookup)
 * - isLiked: Resolved via DataLoader (batched like status check)
 * - comments: Resolved via use case (paginated comments query)
 */
export const PostType = builder.objectRef<PostFromDAL>('Post');

PostType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the post',
    }),
    userId: t.exposeID('userId', {
      description: 'ID of the user who created the post',
    }),
    author: t.field({
      type: PublicProfileType,
      description: 'Author profile (resolved via DataLoader)',
      resolve: async (parent, _args, context) => {
        // Use DataLoader to batch profile requests
        const profile = await context.loaders.profileLoader.load(parent.userId);
        // Type assertion: Profile is non-nullable in GraphQL schema
        return profile as PublicProfileFromDAL;
      },
    }),
    caption: t.exposeString('caption', {
      nullable: true,
      description: 'Post caption text',
    }),
    imageUrl: t.exposeString('imageUrl', {
      description: 'URL to full-size image',
    }),
    thumbnailUrl: t.exposeString('thumbnailUrl', {
      description: 'URL to image thumbnail',
    }),
    likesCount: t.exposeInt('likesCount', {
      description: 'Total number of likes',
    }),
    commentsCount: t.exposeInt('commentsCount', {
      description: 'Total number of comments',
    }),
    isLiked: t.field({
      type: 'Boolean',
      nullable: true,
      description: 'Whether the current user has liked this post',
      resolve: async (parent, _args, context) => {
        // Cannot check like status without authentication
        if (!context.userId) {
          return null;
        }

        // Use DataLoader to batch like status requests
        const status = await context.loaders.likeStatusLoader.load(parent.id);

        // Return isLiked boolean from status object (or null if status not found)
        return status?.isLiked ?? null;
      },
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Creation timestamp (ISO 8601)',
    }),
    updatedAt: t.exposeString('updatedAt', {
      description: 'Last update timestamp (ISO 8601)',
    }),
    comments: t.field({
      type: CommentConnectionType,
      description: 'Paginated comments on this post',
      args: {
        first: t.arg.int({
          required: false,
          description: 'Number of comments to fetch',
        }),
        after: t.arg.string({
          required: false,
          description: 'Cursor for pagination',
        }),
      },
      resolve: async (parent, args, context) => {
        // TODO: Implement during Comments migration
        // For now, return empty connection
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: undefined,
            endCursor: undefined,
          },
        };
      },
    }),
  }),
});

/**
 * PostEdge GraphQL Type
 *
 * Relay-style edge for Post pagination.
 */
export const PostEdgeType = builder.objectRef<PostEdgeFromDAL>('PostEdge');

PostEdgeType.implement({
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: PostType,
      description: 'The post',
      resolve: (parent) => parent.node,
    }),
  }),
});

/**
 * PostConnection GraphQL Type
 *
 * Relay-style paginated posts.
 */
export const PostConnectionType = builder.objectRef<PostConnectionFromDAL>('PostConnection');

PostConnectionType.implement({
  fields: (t) => ({
    edges: t.field({
      type: [PostEdgeType],
      description: 'List of post edges',
      resolve: (parent) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent) => parent.pageInfo,
    }),
  }),
});

/**
 * CreatePostPayload GraphQL Type
 *
 * Response from createPost mutation.
 * Includes the created post and S3 presigned URLs for image uploads.
 */
export const CreatePostPayloadType = builder.objectRef<CreatePostPayloadFromDAL>('CreatePostPayload');

CreatePostPayloadType.implement({
  fields: (t) => ({
    post: t.field({
      type: PostType,
      description: 'The created post',
      resolve: (parent) => parent.post,
    }),
    uploadUrl: t.exposeString('uploadUrl', {
      description: 'S3 presigned URL for uploading the full-size image',
    }),
    thumbnailUploadUrl: t.exposeString('thumbnailUploadUrl', {
      description: 'S3 presigned URL for uploading the thumbnail',
    }),
  }),
});

/**
 * DeleteResponse GraphQL Type
 *
 * Simple success response for delete operations.
 * Shared by deletePost, deleteComment, and other delete mutations.
 */
export const DeleteResponseType = builder.objectRef<DeleteResponseFromDAL>('DeleteResponse');

DeleteResponseType.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success', {
      description: 'Whether the delete operation was successful',
    }),
  }),
});
