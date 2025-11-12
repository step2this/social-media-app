/**
 * Comments Types - Pothos Implementation
 *
 * This file defines all comment-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Autocomplete: Full IntelliSense when defining fields
 * - ✅ Refactoring: Rename a field = schema updates automatically
 */

import { builder } from '../builder.js';
import type { CommentParent } from '../../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * PublicProfile Type Reference
 *
 * We need to reference the PublicProfile type for the Comment.author field.
 * In Pothos, we need to create a forward reference for types defined elsewhere.
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
  isFollowing?: boolean | null;
  createdAt: string;
};

/**
 * PublicProfile GraphQL Type
 *
 * Public profile information for viewing other users.
 * Includes isFollowing field that requires authentication.
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
      description: 'Whether the current user follows this profile',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Account creation timestamp (ISO 8601)',
    }),
  }),
});

/**
 * Comment GraphQL Type
 *
 * Represents a comment on a post.
 * The author field is resolved via DataLoader for efficient batching.
 */
export const CommentType = builder.objectRef<CommentParent>('Comment');

CommentType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the comment',
    }),
    postId: t.exposeID('postId', {
      description: 'ID of the post this comment belongs to',
    }),
    userId: t.exposeID('userId', {
      description: 'ID of the user who created the comment',
    }),
    content: t.exposeString('content', {
      description: 'Comment content/text',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Comment creation timestamp (ISO 8601)',
    }),
    // Field resolver: author profile loaded via DataLoader
    author: t.field({
      type: PublicProfileType,
      description: 'Author profile information',
      resolve: async (parent, _args, context) => {
        // Use DataLoader to batch profile requests
        const profile = await context.loaders.profileLoader.load(parent.userId);
        if (!profile) {
          throw new Error(`Profile not found for user ${parent.userId}`);
        }
        return profile as PublicProfileFromDAL;
      },
    }),
  }),
});

/**
 * CommentEdge Type
 *
 * Edge type for Relay-style cursor pagination.
 */
export const CommentEdgeType = builder.objectRef<any>('CommentEdge');

CommentEdgeType.implement({
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: CommentType,
      description: 'The comment node',
      resolve: (parent: any) => parent.node,
    }),
  }),
});

/**
 * PageInfo Type
 *
 * Pagination information for cursor-based pagination.
 */
export const PageInfoType = builder.objectRef<any>('PageInfo');

PageInfoType.implement({
  fields: (t) => ({
    hasNextPage: t.exposeBoolean('hasNextPage', {
      description: 'Whether there are more items to fetch',
    }),
    hasPreviousPage: t.exposeBoolean('hasPreviousPage', {
      description: 'Whether there are previous items to fetch',
    }),
    startCursor: t.exposeString('startCursor', {
      nullable: true,
      description: 'Cursor pointing to the first item',
    }),
    endCursor: t.exposeString('endCursor', {
      nullable: true,
      description: 'Cursor pointing to the last item',
    }),
  }),
});

/**
 * CommentConnection Type
 *
 * Relay-style connection for paginated comments.
 */
export const CommentConnectionType = builder.objectRef<any>('CommentConnection');

CommentConnectionType.implement({
  fields: (t) => ({
    edges: t.field({
      type: [CommentEdgeType],
      description: 'List of comment edges',
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
 * DeleteResponse Type
 *
 * Simple success response for delete operations.
 */
export const DeleteResponseType = builder.objectRef<any>('DeleteResponse');

DeleteResponseType.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success', {
      description: 'Whether the delete operation was successful',
    }),
  }),
});
