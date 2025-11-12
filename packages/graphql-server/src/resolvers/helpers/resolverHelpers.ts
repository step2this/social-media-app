// @ts-nocheck - TODO: Fix type compatibility issues with GraphQL resolvers
/**
 * Resolver Helper Utilities
 *
 * Provides reusable utilities for GraphQL resolvers to reduce boilerplate
 * and standardize error handling patterns.
 *
 * Key Functions:
 * - executeUseCase: Execute a use case from the Awilix container with standardized error handling
 *
 * Benefits:
 * - DRY: Eliminates repetitive error handling code
 * - Type-safe: Full TypeScript inference for use case names and arguments
 * - Consistent: Standardizes success/error handling across all resolvers
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Execute use case and handle common error patterns
 *
 * This helper standardizes the pattern of:
 * 1. Resolving use case from Awilix container
 * 2. Executing the use case with arguments
 * 3. Checking result.success
 * 4. Throwing appropriate errors
 * 5. Returning result.data
 *
 * @template TUseCaseName - The use case name from GraphQLContainer (autocompleted)
 * @template TUseCase - The use case type (inferred from container)
 * @template TArgs - The use case arguments type (inferred from execute method)
 *
 * @param container - Awilix container for resolving dependencies
 * @param useCaseName - Name of the use case to execute (e.g., 'getCurrentUserProfile')
 * @param args - Arguments to pass to the use case execute method
 * @param options - Optional configuration for error handling
 * @param options.notFoundEntity - Entity name for NOT_FOUND errors (e.g., 'Profile', 'Post')
 * @param options.notFoundId - Entity ID for NOT_FOUND error message
 *
 * @returns The use case result data
 *
 * @throws {GraphQLError} INTERNAL_SERVER_ERROR if result.success is false
 * @throws {GraphQLError} NOT_FOUND if result.data is null/undefined and notFoundEntity is provided
 *
 * @example
 * ```typescript
 * // In a resolver:
 * const profile = await executeUseCase(
 *   container,
 *   'getCurrentUserProfile',
 *   { userId: UserId(context.userId!) },
 *   { notFoundEntity: 'Profile', notFoundId: context.userId! }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // For queries that return connections (no NOT_FOUND):
 * const posts = await executeUseCase(
 *   container,
 *   'getUserPosts',
 *   { handle: args.handle, first: 10 }
 * );
 * ```
 */
export async function executeUseCase<
  TUseCaseName extends keyof GraphQLContainer,
  TUseCase extends GraphQLContainer[TUseCaseName],
  TArgs extends Parameters<TUseCase['execute']>[0],
>(
  container: AwilixContainer<GraphQLContainer>,
  useCaseName: TUseCaseName,
  args: TArgs,
  options?: {
    notFoundEntity?: string;
    notFoundId?: string;
  }
) {
  // Resolve use case from Awilix container
  const useCase = container.resolve(useCaseName) as TUseCase;

  // Execute use case
  const result = await useCase.execute(args);

  // Handle error result
  if (!result.success) {
    throw ErrorFactory.internalServerError(result.error.message);
  }

  // Handle NOT_FOUND cases (optional)
  if (!result.data && options?.notFoundEntity) {
    throw ErrorFactory.notFound(options.notFoundEntity, options.notFoundId ?? 'unknown');
  }

  // Return successful result data
  return result.data;
}

/**
 * Execute use case for optional results (nullable queries)
 *
 * Similar to executeUseCase, but for queries where null is a valid result
 * (e.g., getting a single entity by ID that might not exist).
 *
 * Does not throw NOT_FOUND errors - returns null instead.
 *
 * @template TUseCaseName - The use case name from GraphQLContainer
 * @template TUseCase - The use case type (inferred from container)
 * @template TArgs - The use case arguments type (inferred from execute method)
 *
 * @param container - Awilix container for resolving dependencies
 * @param useCaseName - Name of the use case to execute
 * @param args - Arguments to pass to the use case execute method
 *
 * @returns The use case result data (can be null)
 *
 * @throws {GraphQLError} INTERNAL_SERVER_ERROR if result.success is false
 *
 * @example
 * ```typescript
 * // In a resolver for nullable query:
 * const post = await executeOptionalUseCase(
 *   container,
 *   'getPostById',
 *   { postId: PostId(args.id) }
 * );
 * return post; // Can be null
 * ```
 */
export async function executeOptionalUseCase<
  TUseCaseName extends keyof GraphQLContainer,
  TUseCase extends GraphQLContainer[TUseCaseName],
  TArgs extends Parameters<TUseCase['execute']>[0],
>(
  container: AwilixContainer<GraphQLContainer>,
  useCaseName: TUseCaseName,
  args: TArgs
) {
  // Resolve use case from Awilix container
  const useCase = container.resolve(useCaseName) as TUseCase;

  // Execute use case
  const result = await useCase.execute(args);

  // Handle error result
  if (!result.success) {
    throw ErrorFactory.internalServerError(result.error.message);
  }

  // Return result data (can be null)
  return result.data;
}
