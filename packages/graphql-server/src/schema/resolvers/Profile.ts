/**
 * Profile Field Resolvers
 *
 * Implements field-level resolvers for Profile and PublicProfile types.
 * Profile: For authenticated user's own profile (no isFollowing field)
 * PublicProfile: For viewing other users (includes isFollowing field)
 */

import type { ProfileResolvers, PublicProfileResolvers } from '../generated/types.js';

/**
 * Profile field resolvers (authenticated user's own profile)
 * All fields are direct mappings from data source, no custom resolvers needed
 */
export const Profile: ProfileResolvers = {
  // All fields are direct mappings - TypeScript ensures type safety
};

/**
 * PublicProfile field resolvers (viewing other users)
 * Implements:
 * - isFollowing: Whether the current user follows this profile
 */
export const PublicProfile: PublicProfileResolvers = {
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
