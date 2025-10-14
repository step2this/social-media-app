/**
 * Profile Field Resolvers
 *
 * Implements field-level resolvers for the Profile type.
 * Handles computed/relational fields that require additional data fetching.
 */

import type { ProfileResolvers } from '../generated/types.js';

/**
 * Profile field resolvers
 *
 * Implements:
 * - isFollowing: Whether the current user follows this profile
 */
export const Profile: ProfileResolvers = {
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
