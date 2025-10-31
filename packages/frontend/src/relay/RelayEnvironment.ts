/**
 * Relay Environment Configuration
 *
 * Creates the Relay Environment that manages GraphQL queries, mutations, and cache.
 * Integrates with our existing GraphQL client for network requests.
 *
 * TDD Note: This is infrastructure setup - tested via integration tests in Phase 1.3
 */

import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
  GraphQLResponse,
} from 'relay-runtime';
import type { RequestParameters, Variables } from 'relay-runtime';
import { createGraphQLClient } from '../graphql/client.js';
import type { IGraphQLClient } from '../graphql/interfaces/IGraphQLClient.js';

/**
 * Fetch function for Relay Network layer
 *
 * This function is called by Relay for all GraphQL operations.
 * It uses our existing GraphQL client to maintain consistency
 * with current authentication and error handling.
 */
const fetchQuery: FetchFunction = async (
  operation: RequestParameters,
  variables: Variables
): Promise<GraphQLResponse> => {
  // Use the existing GraphQL client (singleton pattern)
  const graphqlClient: IGraphQLClient = createGraphQLClient();

  try {
    // Execute the GraphQL query using our existing client
    const result = await graphqlClient.query(operation.text || '', variables);

    // Transform AsyncState response to Relay's expected format
    if (result.status === 'success') {
      return result.data as GraphQLResponse;
    }

    // Handle error state
    if (result.status === 'error') {
      throw new Error(result.error.message);
    }

    // Handle other states (idle, loading - should not happen in practice)
    throw new Error('Unexpected query state');
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
