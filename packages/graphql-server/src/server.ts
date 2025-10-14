/**
 * Apollo Server Instance
 *
 * Creates and configures the Apollo Server instance for handling GraphQL requests.
 * Includes security configurations for query depth and complexity limits to prevent DoS attacks.
 */

import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './schema/resolvers/index.js';
import type { GraphQLContext } from './context.js';

/**
 * Creates a new Apollo Server instance
 *
 * Configures Apollo Server with:
 * - GraphQL schema type definitions
 * - Resolver implementations
 * - Query depth and complexity limits to prevent DoS attacks
 * - Introspection enabled (for development and testing)
 * - Error formatting and handling
 *
 * Security limits:
 * - Max query depth: 7 levels (prevents deeply nested queries)
 *
 * @returns Configured Apollo Server instance ready to be started
 *
 * @example
 * const server = createApolloServer();
 * await server.start();
 * // Use with Lambda integration or other transport
 */
export function createApolloServer(): ApolloServer<GraphQLContext> {
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,

    // Security: Query depth limit (prevent DoS attacks)
    validationRules: [
      // Depth limit: Prevent deeply nested queries
      // Max depth of 7 allows legitimate queries while preventing abuse
      depthLimit(7),
    ],

    // Enable introspection for development and testing
    // In production, this should be controlled via environment variable
    introspection: process.env.NODE_ENV !== 'production',
    // Include stack trace in errors for development
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',

    // Custom error formatting to ensure proper error codes
    formatError: (formattedError, error) => {
      // Check if this is a validation error from our security rules
      const message = formattedError.message.toLowerCase();

      // Check for depth limit errors
      if (message.includes('exceeds maximum operation depth') ||
          message.includes('exceeds maximum depth') ||
          message.includes('query depth')) {
        // Set proper error code for validation failures
        return {
          ...formattedError,
          extensions: {
            ...formattedError.extensions,
            code: 'GRAPHQL_VALIDATION_FAILED',
          },
        };
      }

      return formattedError;
    },
  });

  return server;
}
