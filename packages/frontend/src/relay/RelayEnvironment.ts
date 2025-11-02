/**
 * Relay Environment Configuration
 *
 * Creates the Relay Environment that manages GraphQL queries, mutations, and cache.
 * Handles authentication via JWT tokens from authStore.
 *
 * TDD Note: This is infrastructure setup - tested via integration tests in Phase 1.3
 */

import {
  Environment,
  Network,
  RecordSource,
  Store
} from 'relay-runtime';
import type { RequestParameters, Variables ,
  FetchFunction,
  GraphQLResponse} from 'relay-runtime';
import { useAuthStore } from '../stores/authStore';

/**
 * Fetch function for Relay Network layer
 *
 * This function is called by Relay for all GraphQL operations.
 * Handles authentication by reading JWT tokens from authStore.
 */
const fetchQuery: FetchFunction = async (
  operation: RequestParameters,
  variables: Variables
): Promise<GraphQLResponse> => {
  // Get auth token from store
  const tokens = useAuthStore.getState().tokens;
  const accessToken = tokens?.accessToken;

  // Build request headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    // Make GraphQL request
    const response = await fetch(import.meta.env.VITE_GRAPHQL_URL || '/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: operation.text,
        variables,
      }),
    });

    // Handle HTTP errors
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON response
    const json = await response.json();

    // Return GraphQL response
    return json;
  } catch (error) {
    // Relay expects errors to be thrown
    throw error instanceof Error ? error : new Error('Unknown GraphQL error');
  }
};

/**
 * Create the Relay Environment
 *
 * The Environment is the central object that manages:
 * - Network layer (GraphQL requests)
 * - Store (normalized cache)
 * - Record source (cache data storage)
 */
function createRelayEnvironment(): Environment {
  const network = Network.create(fetchQuery);
  const store = new Store(new RecordSource());

  return new Environment({
    network,
    store,
  });
}

/**
 * Singleton Relay Environment instance
 *
 * We export a single instance to ensure:
 * - Consistent cache across the application
 * - No duplicate network requests
 * - Proper garbage collection
 */
export const RelayEnvironment = createRelayEnvironment();

/**
 * Export for testing purposes
 *
 * Allows creating a fresh environment in tests
 */
export { createRelayEnvironment };
