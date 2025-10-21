/**
 * GraphQL client interface for dependency injection
 *
 * This interface defines the contract for GraphQL client implementations.
 * Components and services depend on THIS interface, not concrete implementations.
 *
 * Benefits of this approach:
 * ✅ Easy testing - inject MockGraphQLClient in tests
 * ✅ Easy swapping - change implementation without changing consumers
 * ✅ No framework lock-in - wrap any GraphQL library
 * ✅ Future-proof - migrate to Relay/Apollo later by implementing this interface
 *
 * @example
 * ```typescript
 * // Service depends on interface
 * class AuctionService {
 *   constructor(private readonly client: IGraphQLClient) {}
 *
 *   async getAuction(id: string) {
 *     const result = await this.client.query<AuctionData>(QUERY, { id });
 *     if (isSuccess(result)) {
 *       return result.data;
 *     }
 *     throw new Error(result.error.message);
 *   }
 * }
 *
 * // Production: inject real client
 * const service = new AuctionService(createGraphQLClient());
 *
 * // Testing: inject mock client
 * const mockClient = new MockGraphQLClient();
 * const service = new AuctionService(mockClient);
 * ```
 */

import type { AsyncState } from '../types.js';

export interface IGraphQLClient {
  /**
   * Execute GraphQL query
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @returns Promise resolving to AsyncState with typed data
   *
   * @example
   * ```typescript
   * const result = await client.query<{ user: User }>(
   *   'query GetUser($id: ID!) { user(id: $id) { id name } }',
   *   { id: '123' }
   * );
   *
   * if (isSuccess(result)) {
   *   console.log(result.data.user.name);
   * }
   * ```
   */
  query<TData>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<AsyncState<TData>>;

  /**
   * Execute GraphQL mutation
   *
   * @param mutation - GraphQL mutation string
   * @param variables - Mutation variables
   * @returns Promise resolving to AsyncState with typed data
   *
   * @example
   * ```typescript
   * const result = await client.mutate<{ createUser: User }>(
   *   'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }',
   *   { input: { name: 'John' } }
   * );
   *
   * if (isSuccess(result)) {
   *   console.log(result.data.createUser.id);
   * }
   * ```
   */
  mutate<TData>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<AsyncState<TData>>;

  /**
   * Set authentication token for subsequent requests
   *
   * @param token - JWT or Bearer token
   *
   * @example
   * ```typescript
   * client.setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * // All subsequent queries/mutations will include: Authorization: Bearer <token>
   * ```
   */
  setAuthToken(token: string): void;

  /**
   * Clear authentication token
   *
   * @example
   * ```typescript
   * client.clearAuthToken();
   * // Subsequent requests will not include Authorization header
   * ```
   */
  clearAuthToken(): void;
}
