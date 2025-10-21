/**
 * Production GraphQL client implementation
 *
 * Wraps graphql-request library with our DI interface and AsyncState pattern
 *
 * Benefits:
 * ✅ Battle-tested HTTP layer (graphql-request handles edge cases)
 * ✅ Our custom AsyncState error handling
 * ✅ DI-friendly interface (easy to swap implementations)
 * ✅ Type-safe with excellent TypeScript inference
 * ✅ Only ~70 lines vs ~150+ for custom fetch implementation
 */

import { GraphQLClient as GQLRequestClient, ClientError } from 'graphql-request';
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState, GraphQLError } from './types.js';

/**
 * Production GraphQL client
 *
 * @example
 * ```typescript
 * const client = new GraphQLClient('http://localhost:4000/graphql');
 * client.setAuthToken('jwt-token');
 *
 * const result = await client.query<{ user: User }>(
 *   'query GetUser($id: ID!) { user(id: $id) { id name } }',
 *   { id: '123' }
 * );
 * ```
 */
export class GraphQLClient implements IGraphQLClient {
  private gqlClient: GQLRequestClient;
  private authToken: string | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly defaultHeaders: Record<string, string> = {}
  ) {
    this.gqlClient = new GQLRequestClient(endpoint, {
      headers: defaultHeaders,
    });
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    this.updateHeaders();
  }

  clearAuthToken(): void {
    this.authToken = null;
    this.updateHeaders();
  }

  async query<TData>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<AsyncState<TData>> {
    return this.request<TData>(query, variables);
  }

  async mutate<TData>(
    mutation: string,
    variables: Record<string, unknown> = {}
  ): Promise<AsyncState<TData>> {
    return this.request<TData>(mutation, variables);
  }

  /**
   * Internal request handler that wraps graphql-request errors in AsyncState
   */
  private async request<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    try {
      // graphql-request handles the HTTP request
      const data = await this.gqlClient.request<TData>(query, variables);

      return { status: 'success', data };
    } catch (error) {
      // Transform graphql-request errors to our GraphQLError format
      if (error instanceof ClientError) {
        // GraphQL errors (e.g., validation, resolver errors)
        const gqlError = error.response.errors?.[0];

        const graphqlError: GraphQLError = {
          message: gqlError?.message || error.message,
          extensions: gqlError?.extensions || { code: 'GRAPHQL_ERROR' },
          path: gqlError?.path,
        };

        return { status: 'error', error: graphqlError };
      }

      // Network errors or other exceptions
      const graphqlError: GraphQLError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        extensions: { code: 'NETWORK_ERROR' },
      };

      return { status: 'error', error: graphqlError };
    }
  }

  /**
   * Update graphql-request client headers when auth token changes
   */
  private updateHeaders(): void {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Recreate client with updated headers
    this.gqlClient = new GQLRequestClient(this.endpoint, { headers });
  }
}

/**
 * Factory for creating production GraphQL client
 *
 * @param endpoint - GraphQL endpoint URL (defaults to VITE_GRAPHQL_URL env var)
 * @returns IGraphQLClient instance
 *
 * @example
 * ```typescript
 * // Use default endpoint from environment
 * const client = createGraphQLClient();
 *
 * // Or specify custom endpoint
 * const client = createGraphQLClient('https://api.example.com/graphql');
 * ```
 */
export function createGraphQLClient(endpoint?: string): IGraphQLClient {
  return new GraphQLClient(
    endpoint ||
      import.meta.env.VITE_GRAPHQL_URL ||
      'http://localhost:4000/graphql'
  );
}
