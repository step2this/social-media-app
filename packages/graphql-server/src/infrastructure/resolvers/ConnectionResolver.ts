/**
 * ConnectionResolver - Generic Pagination Helper
 *
 * Generic resolver for handling paginated GraphQL connections.
 * Provides consistent pagination validation and error handling.
 *
 * This utility enables:
 * - Reusability: Single implementation for all paginated queries
 * - Type Safety: Generic over entity type
 * - Consistency: Same validation for all pagination
 * - Testability: Easy to test with mocked fetch functions
 *
 * @example
 * ```typescript
 * // In a resolver:
 * const userPostsResolver = async (_parent, args, context) => {
 *   const resolver = new ConnectionResolver(
 *     (paginationArgs) => getUserPostsUseCase.execute({
 *       userId: context.userId,
 *       pagination: paginationArgs
 *     })
 *   );
 *   return resolver.resolve(args);
 * };
 *
 * // With explore feed:
 * const exploreFeedResolver = async (_parent, args, _context) => {
 *   const resolver = new ConnectionResolver(
 *     (paginationArgs) => getExploreFeedUseCase.execute({
 *       pagination: paginationArgs
 *     })
 *   );
 *   return resolver.resolve(args);
 * };
 * ```
 */

import { ErrorFactory } from '../errors/ErrorFactory.js';
import { AsyncResult, Connection, PaginationArgs } from '../../shared/types/index.js';

/**
 * Fetch function type for retrieving paginated data.
 *
 * This function is responsible for fetching the actual data.
 * It can be a use case, repository method, or any async function.
 *
 * @template T - The entity type in the connection
 */
export type FetchConnectionFn<T> = (
  args: PaginationArgs
) => AsyncResult<Connection<T>>;

/**
 * Generic resolver for paginated connections.
 *
 * Handles:
 * - Pagination validation (first > 0, etc.)
 * - Error handling (converts Result errors to GraphQL errors)
 * - Type safety (generic over entity type)
 *
 * @template T - The entity type in the connection
 *
 * @example
 * ```typescript
 * interface Post {
 *   id: string;
 *   caption: string;
 * }
 *
 * const fetchPosts = async (args: PaginationArgs): AsyncResult<Connection<Post>> => {
 *   return postRepository.findByUser(userId, args);
 * };
 *
 * const resolver = new ConnectionResolver(fetchPosts);
 * const connection = await resolver.resolve({ first: 10 });
 * ```
 */
export class ConnectionResolver<T> {
  constructor(private readonly fetchFn: FetchConnectionFn<T>) {}

  /**
   * Resolve the connection.
   *
   * Validates pagination arguments, calls the fetch function,
   * and handles errors by converting them to GraphQL errors.
   *
   * @param args - Pagination arguments (first, after, etc.)
   * @returns Promise resolving to Connection
   * @throws {GraphQLError} BAD_REQUEST for invalid pagination args
   * @throws {GraphQLError} For fetch function errors
   *
   * @example
   * ```typescript
   * const resolver = new ConnectionResolver(fetchFn);
   *
   * // Successful resolution
   * const connection = await resolver.resolve({ first: 10 });
   * console.log(connection.edges.length); // 10
   *
   * // Validation error
   * await resolver.resolve({ first: 0 }); // Throws BAD_REQUEST
   * ```
   */
  async resolve(args: PaginationArgs): Promise<Connection<T>> {
    if (!args.first || args.first <= 0) {
      throw ErrorFactory.badRequest('Pagination first must be greater than 0');
    }

    const result = await this.fetchFn(args);

    if (!result.success) {
      throw ErrorFactory.internalServerError((result as { success: false; error: Error }).error.message);
    }

    return result.data;
  }
}
