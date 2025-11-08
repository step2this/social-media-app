/**
 * GraphQL Query Resolvers (Option B: Field Resolver Pattern)
 *
 * Type-safe resolvers using GraphQL Codegen generated types with type mappers.
 *
 * Architecture Pattern:
 * - Root resolvers return domain objects from repositories
 * - Type mappers tell GraphQL Codegen about domain types
 * - Field resolvers compute missing GraphQL fields
 * - This eliminates type assertions while maintaining clean architecture
 *
 * Migration Strategy:
 * - Gradually migrate from createQueryResolvers() to direct implementations
 * - Start with simple resolvers (me, profile, post)
 * - Then tackle complex ones (feeds, auctions, etc.)
 *
 * Benefits:
 * - End-to-end type safety from schema to implementation
 * - No type assertions (as any) needed
 * - Schema changes automatically flow to resolvers  
 * - IntelliSense works perfectly
 * - Compile-time validation
 *
 * @module schema/resolvers/Query
 */

import type { QueryResolvers } from '../generated/types.js';
import { executeUseCase } from '../../infrastructure/resolvers/helpers/executeUseCase.js';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth.js';
import { UserId } from '../../shared/types/index.js';
import { createQueryResolvers } from '../../resolvers/createQueryResolvers.js';

/**
 * GraphQL Query resolvers with hybrid approach:
 * - Migrated resolvers use direct implementation (type-safe)
 * - Remaining resolvers use createQueryResolvers() (temporary)
 *
 * Proof of Concept: `me` resolver
 * - Returns domain Profile from IProfileRepository
 * - Field resolvers in Profile.ts handle computed fields
 * - No type assertions needed!
 */
export const Query: QueryResolvers = {
  /**
   * POC: Get current authenticated user's profile
   *
   * Pattern Demonstrated:
   * 1. Use generated QueryResolvers type for type safety
   * 2. Return domain Profile (has: id, handle, fullName, bio, profilePictureUrl, createdAt)
   * 3. Field resolvers add: username, email, emailVerified, counts, thumbnailUrl, updatedAt
   * 4. Type mapper bridges domain Profile <-> GraphQL Profile
   * 5. Zero type assertions!
   */
  me: async (_parent, _args, context) => {
    // Require authentication
    requireAuth(context, 'view profile');

    // Execute use case - returns domain Profile
    return executeUseCase(
      context.container.resolve('getCurrentUserProfile'),
      { userId: UserId(context.userId) }
    );

    // GraphQL Engine automatically calls field resolvers from Profile.ts:
    // - Profile.username -> maps handle to username
    // - Profile.email -> fetches from user entity
    // - Profile.followersCount -> queries follow service
    // - Profile.followingCount -> queries follow service
    // - Profile.postsCount -> fetches from profile
    // - etc.
  },

  // Temporary: Delegate remaining resolvers to old factory
  // TODO: Migrate these one-by-one using the pattern above
  ...createQueryResolvers(),
};
