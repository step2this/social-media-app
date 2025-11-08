/**
 * Use Case Execution Helpers
 *
 * Provides consistent error handling for use case execution in GraphQL resolvers.
 * These helpers convert domain Result types to GraphQL errors automatically.
 *
 * Benefits:
 * - DRY: Eliminates repeated error handling boilerplate
 * - Type-safe: Preserves use case return types
 * - Consistent: All resolvers handle errors the same way
 * - Clean: Resolvers focus on business logic, not error transformation
 *
 * @example
 * ```typescript
 * // In a resolver:
 * export const Query: QueryResolvers = {
 *   me: withAuth(async (_parent, _args, context) => {
 *     return executeUseCase(
 *       context.container.resolve('getCurrentUserProfile'),
 *       { userId: context.userId }
 *     );
 *   }),
 * };
 * ```
 */

import { ErrorFactory } from '../../errors/ErrorFactory.js';
import type { Result } from '../../../shared/types/result.js';

/**
 * Execute a use case and handle errors consistently.
 *
 * This is the primary helper for resolver implementations. It executes
 * a use case, and if successful, returns the data. If the use case fails,
 * it converts the error to a GraphQL error using ErrorFactory.
 *
 * Use this for queries/mutations that always return data or throw an error.
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type from the use case
 *
 * @param useCase - The use case to execute
 * @param input - The input parameters for the use case
 * @returns The use case data on success
 * @throws GraphQLError if the use case fails or returns no data
 *
 * @example
 * ```typescript
 * // Simple query resolver:
 * me: withAuth(async (_parent, _args, context) => {
 *   return executeUseCase(
 *     context.container.resolve('getCurrentUserProfile'),
 *     { userId: context.userId }
 *   );
 * }),
 *
 * // Mutation resolver:
 * createPost: withAuth(async (_parent, args, context) => {
 *   return executeUseCase(
 *     context.container.resolve('createPost'),
 *     {
 *       userId: context.userId,
 *       content: args.input.content,
 *       mediaUrls: args.input.mediaUrls
 *     }
 *   );
 * }),
 * ```
 */
export async function executeUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput> {
  const result = await useCase.execute(input);

  if (!result.success) {
    throw ErrorFactory.internalServerError(result.error.message);
  }

  if (result.data === undefined || result.data === null) {
    throw ErrorFactory.notFound('Resource', 'unknown');
  }

  return result.data;
}

/**
 * Execute use case that may legitimately return null.
 *
 * Similar to executeUseCase, but allows null as a valid result.
 * Use this for optional fields or "get by id" queries where the
 * resource might not exist.
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type from the use case
 *
 * @param useCase - The use case to execute
 * @param input - The input parameters for the use case
 * @returns The use case data on success, or null if not found or error
 *
 * @example
 * ```typescript
 * // Optional query (resource might not exist):
 * profile: async (_parent, args, context) => {
 *   return executeOptionalUseCase(
 *     context.container.resolve('getProfileByHandle'),
 *     { handle: args.handle }
 *   );
 * },
 *
 * // "Get by ID" query:
 * post: async (_parent, args, context) => {
 *   return executeOptionalUseCase(
 *     context.container.resolve('getPostById'),
 *     { id: args.id }
 *   );
 * },
 * ```
 */
export async function executeOptionalUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput | null> {
  const result = await useCase.execute(input);

  if (!result.success) {
    // For optional queries, log the error but return null
    // This allows the GraphQL resolver to return null instead of throwing
    console.warn('[executeOptionalUseCase] Use case failed:', result.error);
    return null;
  }

  return result.data ?? null;
}
