/**
 * withAuth - Higher-Order Component for Authentication
 *
 * Wraps a resolver with authentication logic, ensuring that only authenticated
 * users can access the wrapped resolver. Provides type-safe context transformation.
 *
 * This HOC pattern enables:
 * - Composition: Mix and match authentication with other concerns
 * - Type Safety: Wrapped resolver knows userId is guaranteed
 * - Reusability: Single authentication logic for all protected resolvers
 * - Testability: Easy to test authentication separately
 *
 * @example
 * ```typescript
 * // Before (manual auth check in every resolver)
 * const meResolver: QueryResolvers['me'] = async (_parent, _args, context) => {
 *   if (!context.userId) {
 *     throw new GraphQLError('You must be authenticated');
 *   }
 *   return profileService.getById(context.userId);
 * };
 *
 * // After (authentication is composed)
 * const meResolver = withAuth<any, GraphQLContext, any, Profile>(
 *   async (_parent, _args, context) => {
 *     // TypeScript knows context.userId exists (non-optional)
 *     return profileService.getById(context.userId);
 *   }
 * );
 * ```
 */

import type { GraphQLFieldResolver } from 'graphql';
import { AuthGuard, type AuthContext } from '../auth/AuthGuard.js';
import { ErrorFactory } from '../errors/ErrorFactory.js';
import { UserId } from '../../shared/types/index.js';

/**
 * Wraps a resolver with authentication logic.
 *
 * The wrapped resolver receives a context where `userId` is guaranteed to exist
 * (non-optional), providing type safety for authenticated operations.
 *
 * This version preserves all context properties, making it compatible with
 * GraphQLContext and other extended context types.
 *
 * @param resolver - The resolver function to wrap (requires authenticated context)
 * @returns A new resolver that enforces authentication before calling the original
 *
 * @template TSource - The parent object type
 * @template TContext - The context type (must have userId property)
 * @template TArgs - The arguments type
 * @template TReturn - The return type
 *
 * @throws {GraphQLError} UNAUTHENTICATED error if userId is not present
 *
 * @example
 * ```typescript
 * import { withAuth } from './withAuth.js';
 * import { QueryResolvers } from '../generated/types.js';
 *
 * const meResolver = withAuth(
 *   async (_parent, _args, context) => {
 *     // context.userId is string (non-null)
 *     // context.container is available (preserved from GraphQLContext)
 *     const profile = await profileRepository.findById(context.userId);
 *     if (!profile.success) {
 *       throw new Error('Profile not found');
 *     }
 *     return profile.data;
 *   }
 * );
 * ```
 */
export function withAuth<TSource, TContext extends { userId: string | null }, TArgs, TReturn>(
  resolver: GraphQLFieldResolver<TSource, Omit<TContext, 'userId'> & { userId: string }, TArgs, TReturn>
): GraphQLFieldResolver<TSource, TContext, TArgs, TReturn> {
  return async (source, args, context, info) => {
    const authGuard = new AuthGuard();
    const authResult = authGuard.requireAuth(context);

    if (!authResult.success) {
      throw ErrorFactory.unauthenticated(authResult.error.message);
    }

    // Create new context with guaranteed userId
    // This provides type safety for the wrapped resolver
    // userId is now non-null string (not string | null)
    const authenticatedContext = {
      ...context,
      userId: authResult.data,
    } as Omit<TContext, 'userId'> & { userId: string };

    return resolver(source, args, authenticatedContext, info);
  };
}
