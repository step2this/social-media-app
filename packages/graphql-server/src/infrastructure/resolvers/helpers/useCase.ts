/**
 * Use Case Execution Helpers
 *
 * Provides consistent error handling for use case execution in GraphQL resolvers.
 * These helpers eliminate boilerplate and ensure uniform error translation
 * from use case failures to GraphQL errors.
 *
 * @module infrastructure/resolvers/helpers/useCase
 */

import { ErrorFactory } from '../../errors/ErrorFactory.js';
import type { Result } from '../../../shared/types/result.js';

/**
 * Execute a use case and handle errors consistently.
 *
 * This helper:
 * - Executes the use case with provided input
 * - Throws GraphQL errors for failures
 * - Returns data on success
 * - Ensures non-null data (throws if data is missing)
 *
 * Use this for resolvers that must return a value (non-nullable fields).
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type from the use case
 *
 * @param useCase - Use case instance with execute method
 * @param input - Input data for the use case
 * @returns The use case data on success
 * @throws {GraphQLError} If use case fails or data is missing
 *
 * @example
 * ```typescript
 * // In a resolver:
 * me: withAuth(async (_parent, _args, context) => {
 *   return executeUseCase(
 *     context.container.resolve('getCurrentUserProfile'),
 *     { userId: context.userId }
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
    throw ErrorFactory.fromUseCaseError(result.error);
  }

  if (result.data === undefined || result.data === null) {
    throw ErrorFactory.internalServerError('Use case returned no data');
  }

  return result.data;
}

/**
 * Execute a use case that may return null.
 *
 * This helper:
 * - Executes the use case with provided input
 * - Returns null for failures (logged but not thrown)
 * - Returns data or null on success
 *
 * Use this for resolvers that can return null (nullable fields).
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type from the use case
 *
 * @param useCase - Use case instance with execute method
 * @param input - Input data for the use case
 * @returns The use case data on success, null on failure
 *
 * @example
 * ```typescript
 * // In a resolver for a nullable field:
 * profile: async (_parent, args, context) => {
 *   return executeOptionalUseCase(
 *     context.container.resolve('getProfileByHandle'),
 *     { handle: args.handle }
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
    // Log error but return null for optional fields
    console.warn('Use case failed for optional field:', result.error);
    return null;
  }

  return result.data ?? null;
}

/**
 * Execute a use case and throw errors without logging.
 *
 * This is similar to executeUseCase but gives you more control
 * over error handling. Use when you need custom error logic.
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type from the use case
 *
 * @param useCase - Use case instance with execute method
 * @param input - Input data for the use case
 * @returns The use case result (success or failure)
 *
 * @example
 * ```typescript
 * // When you need custom error handling:
 * const result = await executeUseCaseRaw(useCase, input);
 * if (!result.success) {
 *   // Custom error handling
 *   if (result.error.code === 'SPECIFIC_ERROR') {
 *     throw new GraphQLError('Custom message');
 *   }
 *   throw ErrorFactory.fromUseCaseError(result.error);
 * }
 * return result.data;
 * ```
 */
export async function executeUseCaseRaw<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<Result<TOutput>> {
  return useCase.execute(input);
}
