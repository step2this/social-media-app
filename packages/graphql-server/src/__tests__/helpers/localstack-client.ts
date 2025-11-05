/**
 * LocalStack GraphQL Test Client
 *
 * GraphQL-specific test utilities for testing against LocalStack.
 * For user/post creation, use test factories from @social-media-app/integration-tests.
 *
 * This module provides:
 * - GraphQL query/mutation execution
 * - GraphQL health checks
 * - Server readiness polling
 */

/**
 * Configuration for LocalStack test environment
 */
export const LOCALSTACK_CONFIG = {
  graphqlUrl: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql',
  backendUrl: process.env.BACKEND_API_URL || 'http://localhost:3001',
  healthUrl: process.env.GRAPHQL_URL?.replace('/graphql', '/health') || 'http://localhost:4000/health',
};

/**
 * GraphQL Response Type
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
      [key: string]: any;
    };
  }>;
}

/**
 * Execute a GraphQL query/mutation against the LocalStack GraphQL server
 *
 * @param query - GraphQL query/mutation string
 * @param variables - Variables for the query
 * @param token - Optional JWT access token for authentication
 * @returns GraphQL response with data or errors
 *
 * @example
 * const response = await executeGraphQL(
 *   '{ me { id handle } }',
 *   {},
 *   token
 * );
 */
export async function executeGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>,
  token?: string
): Promise<GraphQLResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(LOCALSTACK_CONFIG.graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: variables || {},
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as GraphQLResponse<T>;
}

/**
 * Check if GraphQL server is healthy
 *
 * @returns true if server is healthy, false otherwise
 */
export async function checkGraphQLHealth(): Promise<boolean> {
  try {
    const response = await fetch(LOCALSTACK_CONFIG.healthUrl);
    if (!response.ok) return false;

    const health = (await response.json()) as { status: string };
    return health.status === 'healthy';
  } catch {
    return false;
  }
}


/**
 * Wait for server to be ready (with retry logic)
 *
 * @param maxAttempts - Maximum number of health check attempts
 * @param delayMs - Delay between attempts in milliseconds
 * @returns true if server is ready, false if timeout
 */
export async function waitForServer(
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isHealthy = await checkGraphQLHealth();
    if (isHealthy) {
      return true;
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return false;
}
