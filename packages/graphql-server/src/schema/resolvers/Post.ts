/**
 * Post Field Resolvers
 *
 * Implements field-level resolvers for the Post type in SDL schema.
 * Handles computed/relational fields that require additional data fetching.
 *
 * NOTE: Post queries and mutations have been migrated to Pothos.
 * These field resolvers remain in SDL because Feed queries still use Post type.
 * When Feed module is migrated to Pothos, these resolvers can be removed.
 *
 * Uses DataLoaders to solve N+1 query problem by batching and caching requests.
 */

import type { PostResolvers } from '../generated/types.js';

/**
 * Post field resolvers
 *
 * Implements:
 * - author: Resolve post author profile from userId (batched via DataLoader)
 * - isLiked: Whether the current user has liked this post (batched via DataLoader)
 */
export const Post: PostResolvers = {
  /**
   * Resolve author profile for a post
   *
   * Uses context.loaders.profileLoader to batch multiple author requests
   * into a single database call, solving the N+1 query problem.
   *
   * Returns null if author profile not found (deleted user)
   */
  author: async (parent, _args, context) => {
    // Use DataLoader to batch profile requests
    const profile = await context.loaders.profileLoader.load(parent.userId);
    // Type assertion: Profile is non-nullable in GraphQL schema, loader returns Profile | null
    // If author is null (deleted user), this will return null and cause a GraphQL error
    return profile as any;
  },

  /**
   * Check if the current authenticated user has liked this post
   *
   * Uses context.loaders.likeStatusLoader to batch multiple like status requests
   * into a single database call, solving the N+1 query problem.
   *
   * Returns null if user is not authenticated
   */
  isLiked: async (parent, _args, context) => {
    // Cannot check like status without authentication
    if (!context.userId) {
      return null;
    }

    // Use DataLoader to batch like status requests
    const status = await context.loaders.likeStatusLoader.load(parent.id);

    // Return isLiked boolean from status object (or null if status not found)
    return status?.isLiked ?? null;
  },
};
