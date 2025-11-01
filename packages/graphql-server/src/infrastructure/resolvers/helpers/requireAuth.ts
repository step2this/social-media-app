/**
 * Authentication Helper - Type-Safe Auth Guards
 *
 * Pattern from SKILL.md - Section 3: Assertion Functions
 * Generics with Constraints (Section 1)
 *
 * Provides type-safe authentication checks using assertion functions.
 * When requireAuth succeeds, TypeScript narrows the userId type from
 * `string | null` to `string`, enabling type-safe access without null checks.
 *
 * @example
 * ```typescript
 * function resolver(parent, args, context) {
 *   requireAuth(context, 'view feed');
 *   // TypeScript now knows context.userId is string, not string | null
 *   const userId: string = context.userId;
 *   // ... rest of resolver logic
 * }
 * ```
 */

import { GraphQLError } from 'graphql';
import { ERROR_CODES, ERROR_MESSAGES } from '../types/ErrorCodes.js';

/**
 * Context interface with userId property
 * Uses generic constraint to ensure context has userId
 */
interface AuthContext {
  userId: string | null;
}

/**
 * Ensures user is authenticated, throws GraphQLError if not.
 *
 * Uses TypeScript assertion function to narrow the userId type.
 * After this function succeeds, TypeScript knows userId is non-null.
 *
 * @param context - GraphQL context containing userId
 * @param action - Optional description of the action requiring auth (for error message)
 * @throws {GraphQLError} with UNAUTHENTICATED code if userId is null
 *
 * @example
 * ```typescript
 * const context = { userId: null };
 * requireAuth(context); // Throws GraphQLError
 *
 * const context2 = { userId: 'user-123' };
 * requireAuth(context2); // Does not throw
 * console.log(context2.userId); // Type: string (not string | null)
 * ```
 */
export function requireAuth<TContext extends AuthContext>(
  context: TContext,
  action?: string
): asserts context is TContext & { userId: string } {
  if (!context.userId) {
    throw new GraphQLError(
      ERROR_MESSAGES.UNAUTHENTICATED(action),
      { extensions: { code: ERROR_CODES.UNAUTHENTICATED } }
    );
  }
}

/**
 * Returns authenticated userId or throws GraphQLError.
 *
 * Convenience function for cases where you need direct access to the userId.
 * This is simpler than requireAuth when you don't need the assertion.
 *
 * @param context - GraphQL context containing userId
 * @param action - Optional description of the action requiring auth (for error message)
 * @returns The authenticated userId
 * @throws {GraphQLError} with UNAUTHENTICATED code if userId is null
 *
 * @example
 * ```typescript
 * const context = { userId: 'user-123' };
 * const userId = getAuthUserId(context); // Returns 'user-123'
 * ```
 */
export function getAuthUserId<TContext extends AuthContext>(
  context: TContext,
  action?: string
): string {
  requireAuth(context, action);
  return context.userId;
}
