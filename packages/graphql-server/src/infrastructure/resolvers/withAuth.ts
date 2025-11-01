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
 * @param resolver - The resolver function to wrap (requires authenticated context)
 * @returns A new resolver that enforces authentication before calling the original
 *
 * @template TSource - The parent object type
 * @template TContext - The context type (must extend AuthContext)
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
 * const meResolver = withAuth<any, GraphQLContext, any, Profile>(
 *   async (_parent, _args, context) => {
 *     // context.userId is UserId (not UserId | undefined)
 *     const profile = await profileRepository.findById(context.userId);
 *     if (!profile.success) {
 *       throw new Error('Profile not found');
 *     }
 *     return profile.data;
 *   }
 * );
 * ```
 */
export function withAuth<TSource, TContext extends AuthContext, TArgs, TReturn>(
  resolver: GraphQLFieldResolver<TSource, TContext & { userId: UserId }, TArgs, TReturn>
): GraphQLFieldResolver<TSource, TContext, TArgs, TReturn> {
  return async (source, args, context, info) => {
    const authGuard = new AuthGuard();
    const authResult = authGuard.requireAuth(context);

    if (!authResult.success) {
      throw ErrorFactory.unauthenticated(authResult.error.message);
    }

    // Create new context with guaranteed userId
    // This provides type safety for the wrapped resolver
    const authenticatedContext = {
      ...context,
      userId: authResult.data,
    } as TContext & { userId: UserId };

    return resolver(source, args, authenticatedContext, info);
  };
}
