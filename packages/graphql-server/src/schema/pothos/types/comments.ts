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
 * CommentConnection Type - Using Relay Plugin
 *
 * Replaces manual CommentEdge, PageInfo, and CommentConnection definitions.
 * The Relay plugin automatically creates Connection, Edge, and PageInfo types
 * with proper Relay spec compliance.
 *
 * Benefits over manual implementation:
 * - ✅ Eliminates ~70 lines of boilerplate
 * - ✅ Automatic cursor encoding/decoding
 * - ✅ Standardized PageInfo structure (Relay spec compliant)
 * - ✅ Type-safe connection handling
 * - ✅ Consistent with other connection types
 *
 * Note: PageInfo is now automatically created by the Relay plugin and shared
 * across all connection types, ensuring consistency.
 */
export const CommentConnectionType = builder.connectionObject({
  type: CommentType,
  name: 'CommentConnection',
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
