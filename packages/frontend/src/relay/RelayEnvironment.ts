/**
 * Relay Environment Configuration
 *
 * This module sets up the Relay environment with:
 * - Network layer for GraphQL communication
 * - Store for caching
 * - JWT token authentication
 */

import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
  RequestParameters,
  Variables,
  GraphQLResponse,
} from 'relay-runtime';

// Read GraphQL URL from environment variable, fallback to port 4000
const HTTP_ENDPOINT = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
import { useAuthStore } from '../stores/authStore.js';

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
    const response = await fetch(HTTP_ENDPOINT, {
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
