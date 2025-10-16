/**
 * Comment Field Resolvers
 *
 * Implements field-level resolvers for the Comment type.
 * Handles computed/relational fields that require additional data fetching.
 *
 * Uses DataLoaders to solve N+1 query problem by batching and caching requests.
 */

import type { CommentResolvers } from '../generated/types.js';

/**
 * Comment field resolvers
 *
 * Implements:
 * - author: Resolve comment author profile from userId (batched via DataLoader)
 */
export const Comment: CommentResolvers = {
  /**
   * Resolve author profile for a comment
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
};
