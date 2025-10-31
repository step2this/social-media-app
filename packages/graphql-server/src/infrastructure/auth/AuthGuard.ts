/**
 * AuthGuard
 *
 * Authentication guard for GraphQL resolvers.
 * Enforces authentication requirements with type-safe error handling.
 *
 * This replaces scattered authentication checks across resolvers:
 *
 * Before:
 * ```typescript
 * if (!context.userId) {
 *   throw new GraphQLError('You must be authenticated', {
 *     extensions: { code: 'UNAUTHENTICATED' }
 *   });
 * }
 * ```
 *
 * After:
 * ```typescript
 * const authResult = authGuard.requireAuth(context);
 * if (!authResult.success) {
 *   throw ErrorFactory.create(authResult.error.message);
 * }
 * const userId: UserId = authResult.data; // Type-safe!
 * ```
 *
 * Benefits:
 * - Single responsibility (authentication only)
 * - Type-safe error handling (Result type)
 * - Reusable across resolvers
 * - Testable in isolation
 * - No GraphQL dependencies
 */

import { UserId, Result } from '../../shared/types/index.js';

/**
 * AuthContext - Minimal context interface for authentication
 *
 * This interface defines the minimum context required for authentication.
 * Resolvers can pass their full context object as long as it has userId.
 */
export interface AuthContext {
  /**
   * User ID from JWT token or session.
   * Undefined if the request is not authenticated.
   */
  userId?: UserId;
}

/**
 * AuthGuard - Authentication enforcement
 *
 * Provides two methods for different authentication requirements:
 * - `requireAuth()` - Requires authentication (returns error if not authenticated)
 * - `optionalAuth()` - Optional authentication (returns null if not authenticated)
 *
 * Features:
 * - Type-safe error handling (Result type)
 * - Stateless (no side effects)
 * - Zero dependencies
 * - Framework-agnostic (no GraphQL dependencies)
 * - 100% unit testable
 *
 * @example
 * ```typescript
 * // Protected resolver (authentication required)
 * const meResolver = async (_parent, _args, context) => {
 *   const authGuard = new AuthGuard();
 *   const authResult = authGuard.requireAuth(context);
 *
 *   if (!authResult.success) {
 *     throw new GraphQLError(authResult.error.message);
 *   }
 *
 *   // TypeScript knows authResult.data is UserId
 *   const userId = authResult.data;
 *   return profileService.getById(userId);
 * };
 *
 * // Public resolver with optional personalization
 * const feedResolver = async (_parent, _args, context) => {
 *   const authGuard = new AuthGuard();
 *   const userId = authGuard.optionalAuth(context);
 *
 *   // userId is UserId | null
 *   const feed = await feedService.getExplore({ userId });
 *   return feed;
 * };
 * ```
 */
export class AuthGuard {
  /**
   * Require authentication.
   *
   * Returns success with UserId if authenticated, or error if not.
   * Use this for protected resolvers that require authentication.
   *
   * @param context - The resolver context containing userId
   * @returns Result with UserId if authenticated, or Error if not
   *
   * @example
   * ```typescript
   * const authGuard = new AuthGuard();
   * const result = authGuard.requireAuth(context);
   *
   * if (!result.success) {
   *   throw new GraphQLError(result.error.message);
   * }
   *
   * // TypeScript knows result.data is UserId (not undefined)
   * const userId: UserId = result.data;
   * ```
   */
  requireAuth(context: AuthContext): Result<UserId> {
    // Check if userId exists
    if (!context.userId) {
      return {
        success: false,
        error: new Error('You must be authenticated to access this resource'),
      };
    }

    // Return success with userId
    return {
      success: true,
      data: context.userId,
    };
  }

  /**
   * Optional authentication.
   *
   * Returns UserId if authenticated, or null if not.
   * Use this for public resolvers that can personalize for authenticated users.
   *
   * @param context - The resolver context containing userId
   * @returns UserId if authenticated, or null if not
   *
   * @example
   * ```typescript
   * const authGuard = new AuthGuard();
   * const userId = authGuard.optionalAuth(context);
   *
   * // userId is UserId | null
   * if (userId) {
   *   // Show personalized content
   *   const feed = await feedService.getFollowing(userId);
   * } else {
   *   // Show public content
   *   const feed = await feedService.getExplore();
   * }
   * ```
   */
  optionalAuth(context: AuthContext): UserId | null {
    // Return userId if exists, otherwise null
    return context.userId ?? null;
  }
}
