/**
 * GraphQL Query Resolvers
 *
 * Direct resolver implementations leveraging GraphQL Codegen for full type safety.
 * Phase 1 Migration: Starting with 'me' resolver as proof of concept.
 *
 * Architecture:
 * - Container created ONCE per request (in context)
 * - Resolvers directly access context.container
 * - Full type inference from generated types (no manual declarations)
 * - No factory wrappers (eliminated indirection)
 *
 * Benefits:
 * - End-to-end type safety from schema to implementation
 * - Schema changes automatically flow through to resolvers
 * - Zero type assertions needed
 * - Perfect IntelliSense support
 *
 * @module schema/resolvers/Query
 */

import type { QueryResolvers } from '../generated/types.js';
import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { executeUseCase } from '../../infrastructure/resolvers/helpers/useCase.js';
import { createQueryResolvers } from '../../resolvers/createQueryResolvers.js';

/**
 * Query Resolvers
 *
 * PHASE 1 (Proof of Concept):
 * - ✅ me: Refactored to direct implementation
 * - ⏳ All others: Still using factory pattern (to be migrated)
 */

// Extract legacy resolvers, excluding 'me' which we've refactored
const { me: _legacyMe, ...legacyResolvers } = createQueryResolvers();

export const Query: QueryResolvers = {
  // ============================================================================
  // PHASE 1 - Direct Implementation (NEW PATTERN)
  // ============================================================================

  /**
   * Get current user's profile
   *
   * Requires authentication (enforced by withAuth HOC).
   * Returns Profile with all user data including email.
   *
   * Type Safety:
   * - _parent: {} (Query has no parent)
   * - _args: {} (me has no arguments)
   * - context: GraphQLContext & { userId: string } (from withAuth)
   * - return: Profile (from schema - non-nullable)
   *
   * All types are inferred from QueryResolvers - no manual declarations needed!
   */
  me: withAuth(async (_parent, _args, context) => {
    return executeUseCase(
      context.container.resolve('getCurrentUserProfile'),
      { userId: context.userId }
    );
  }),

  // ============================================================================
  // LEGACY - Factory Pattern (TO BE MIGRATED)
  // ============================================================================
  // These will be migrated to direct implementation in Phase 2

  ...legacyResolvers,
};
