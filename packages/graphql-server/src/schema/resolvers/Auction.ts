/**
 * Auction Field Resolvers
 *
 * Implements field-level resolvers for the Auction type.
 * Handles relational fields that require additional data fetching.
 *
 * Uses DataLoaders to solve N+1 query problem by batching profile requests.
 */

import { GraphQLError } from 'graphql';
import type { AuctionResolvers } from '../generated/types.js';

/**
 * Auction field resolvers
 *
 * Implements:
 * - seller: Resolve auction seller profile from userId (batched via DataLoader)
 * - winner: Resolve auction winner profile from winnerId (batched via DataLoader)
 *
 * Note: Type assertion used to align with GraphQL schema definition.
 * Schema specifies PublicProfile (no email) but generated types expect Profile (with email).
 * This is safe because GraphQL schema is source of truth and resolver returns PublicProfile.
 */
export const Auction: AuctionResolvers = {
  /**
   * Resolve seller profile for an auction
   *
   * Uses context.loaders.profileLoader to batch multiple seller requests
   * into a single database call, solving the N+1 query problem.
   *
   * Throws NOT_FOUND if seller profile doesn't exist (deleted user).
   */
  seller: async (parent, _args, context) => {
    // Use DataLoader to batch profile requests
    const profile = await context.loaders.profileLoader.load(parent.userId);

    if (!profile) {
      throw new GraphQLError('Seller profile not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Type assertion: DataLoader returns PublicProfile (correct per schema)
    // Generated types expect Profile due to type generation mismatch
    return profile as any;
  },

  /**
   * Resolve winner profile for an auction
   *
   * Uses context.loaders.profileLoader to batch multiple winner requests
   * into a single database call, solving the N+1 query problem.
   *
   * Returns null if:
   * - winnerId is undefined (auction not completed or no winner)
   * - Winner profile not found (deleted user)
   */
  winner: async (parent, _args, context) => {
    // No winner if winnerId is undefined
    if (!parent.winnerId) {
      return null;
    }

    // Use DataLoader to batch profile requests
    const profile = await context.loaders.profileLoader.load(parent.winnerId);

    // Type assertion: DataLoader returns PublicProfile (correct per schema)
    // Generated types expect Profile due to type generation mismatch
    return (profile as any) || null;
  },
};
