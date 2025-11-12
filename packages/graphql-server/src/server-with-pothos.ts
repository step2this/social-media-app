/**
 * Apollo Server Instance with Full Pothos Schema
 *
 * Migration Complete! All modules have been migrated to Pothos:
 * ✅ Phase 1: Auth module (register, login, logout, me, profile queries)
 * ✅ Phase 3: Comments, Social (likes/follows), Notifications
 * ✅ Phase 4 (Big Bang): Posts, Profile, Feed, Auctions
 *
 * Benefits of Pothos:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No SDL/code duplication
 * - ✅ Built-in auth via authScopes (no manual HOC)
 * - ✅ Field resolvers co-located with types
 * - ✅ DataLoader integration for N+1 prevention
 * - ✅ Refactoring support: rename a field = schema updates automatically
 */

import { ApolloServer } from '@apollo/server';
import { pothosSchema } from './schema/pothos/index.js';
import type { GraphQLContext } from './context.js';

/**
 * Creates Apollo Server with complete Pothos schema
 *
 * This is now the primary server instance.
 * All GraphQL operations use the Pothos schema.
 *
 * @returns Configured Apollo Server with Pothos schema
 */
export function createApolloServerWithPothos(): ApolloServer<GraphQLContext> {
  const server = new ApolloServer<GraphQLContext>({
    schema: pothosSchema,

    // Enable introspection for development
    introspection: process.env.NODE_ENV !== 'production',
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',

    // Custom error formatting
    formatError: (formattedError) => {
      const message = formattedError.message.toLowerCase();

      // Check for depth limit errors
      if (message.includes('exceeds maximum operation depth') ||
          message.includes('exceeds maximum depth') ||
          message.includes('query depth')) {
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

/**
 * Alias for backward compatibility
 *
 * This is the same as createApolloServerWithPothos now.
 */
export function createPothosOnlyServer(): ApolloServer<GraphQLContext> {
  return createApolloServerWithPothos();
}
