/**
 * Profile Field Resolvers (Option B: Field Resolver Pattern)
 *
 * Implements field-level resolvers for Profile and PublicProfile types.
 *
 * Architecture Pattern:
 * - Root resolvers return domain Profile objects (from IProfileRepository)
 * - Field resolvers compute/fetch missing GraphQL fields
 * - This solves type mismatch: Domain Profile ≠ GraphQL Profile
 *
 * Why This Pattern:
 * - Domain types stay simple (id, handle, bio, etc.)
 * - GraphQL schema exposes richer types (counts, email, etc.)
 * - Field resolvers bridge the gap by fetching computed fields
 * - Follows GraphQL best practices (field resolvers for relationships/computed data)
 *
 * Type Safety:
 * - Uses generated ProfileResolvers/PublicProfileResolvers types
 * - TypeScript validates all field resolver implementations
 * - Changes to schema automatically flow to these resolvers
 *
 * @module schema/resolvers/Profile
 */

import type { ProfileResolvers, PublicProfileResolvers } from '../generated/types.js';

/**
 * Profile field resolvers (authenticated user's own profile)
 *
 * The domain Profile type only has:
 * - id, handle, fullName, bio, profilePictureUrl, createdAt
 *
 * These field resolvers add GraphQL-specific fields:
 * - username (computed from handle)
 * - email (from user entity)
 * - emailVerified (from user entity)
 * - followersCount (aggregated count)
 * - followingCount (aggregated count)
 * - postsCount (aggregated count)
 * - profilePictureThumbnailUrl (derived from profilePictureUrl)
 * - updatedAt (from user entity)
 */
export const Profile: ProfileResolvers = {
  /**
   * Map handle to username for GraphQL schema compatibility
   * GraphQL schema has 'username' field, domain has 'handle'
   */
  username: (parent) => parent.handle,

  /**
   * Email - fetch from user entity
   * TODO: Implement once user repository is available
   */
  email: async (_parent, _args, _context) => {
    // Temporary: Return placeholder until user repository exists
    // Will be: context.loaders.userLoader.load(parent.id).then(user => user.email)
    return '[email protected]';
  },

  /**
   * Email verification status - fetch from user entity
   * TODO: Implement once user repository is available
   */
  emailVerified: async (_parent, _args, _context) => {
    // Temporary: Return placeholder until user repository exists
    // Will be: context.loaders.userLoader.load(parent.id).then(user => user.emailVerified)
    return false;
  },

  /**
   * Followers count - aggregated count from follows table
   * Uses follow service to get count efficiently
   */
  followersCount: async (parent, _args, context) => {
    const status = await context.services.followService.getFollowStatus(parent.id, parent.id);
    return status.followersCount || 0;
  },

  /**
   * Following count - aggregated count from follows table
   * Uses follow service to get count efficiently
   */
  followingCount: async (parent, _args, context) => {
    const status = await context.services.followService.getFollowStatus(parent.id, parent.id);
    return status.followingCount || 0;
  },

  /**
   * Posts count - aggregated count from profile entity
   * This is stored in the profile entity and incremented/decremented
   */
  postsCount: async (_parent, _args, _context) => {
    // Temporary: Return placeholder
    // TODO: This should come from profile entity once it's updated to include postsCount
    return 0;
  },

  /**
   * Profile picture thumbnail URL
   * Derived from profilePictureUrl by convention
   */
  profilePictureThumbnailUrl: (parent) => {
    if (!parent.profilePictureUrl) {
      return null;
    }
    // Thumbnail convention: replace extension with _thumb.extension
    return parent.profilePictureUrl.replace(/(\.[^.]+)$/, '_thumb$1');
  },

  /**
   * Updated timestamp
   * TODO: Implement once profile entity includes updatedAt
   */
  updatedAt: (parent) => {
    // Temporary: Use createdAt as fallback
    return parent.createdAt;
  },
};

/**
 * PublicProfile field resolvers (viewing other users)
 *
 * Extends Profile fields with:
 * - isFollowing: Whether current user follows this profile
 */
export const PublicProfile: PublicProfileResolvers = {
  // Inherit all Profile field resolvers (except profilePictureThumbnailUrl which doesn't exist in PublicProfile schema)
  username: Profile.username,
  followersCount: Profile.followersCount,
  followingCount: Profile.followingCount,
  postsCount: Profile.postsCount,

  /**
   * Check if the current authenticated user follows this profile
   * Returns null if:
   * - User is not authenticated
   * - User is viewing their own profile
   */
  isFollowing: async (parent, _args, context) => {
    // Cannot follow yourself
    if (!context.userId || context.userId === parent.id) {
      return null;
    }

    // Get follow status
    const status = await context.services.followService.getFollowStatus(context.userId, parent.id);

    return status.isFollowing;
  },
};
