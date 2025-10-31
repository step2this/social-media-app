/**
 * GraphQL Client Manager
 * 
 * Manages the singleton GraphQL client and keeps it synchronized with authentication state.
 * This ensures all GraphQL requests include the current auth token.
 */

import { createGraphQLClient, GraphQLClient } from './client.js';
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';

/**
 * Singleton instance of the GraphQL client
 */
let _graphqlClient: IGraphQLClient | null = null;

/**
 * Get the GraphQL client instance (creates if needed)
 */
export function getGraphQLClient(): IGraphQLClient {
  if (!_graphqlClient) {
    _graphqlClient = createGraphQLClient();
  }
  return _graphqlClient;
}

/**
 * Update the GraphQL client's auth token
 * Call this when the user logs in, registers, or the token is refreshed
 * 
 * @param token - The new access token, or null to clear
 */
export function setGraphQLAuthToken(token: string | null): void {
  const client = getGraphQLClient();
  
  if (token) {
    (client as GraphQLClient).setAuthToken(token);
  } else {
    (client as GraphQLClient).clearAuthToken();
  }
}

/**
 * Reset the GraphQL client (for testing)
 */
export function resetGraphQLClient(): void {
  _graphqlClient = null;
}
