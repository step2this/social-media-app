/**
 * Apollo Server Instance with Pothos Integration
 *
 * This version merges the existing SDL schema with the new Pothos schema.
 * This allows gradual migration - old and new schemas run side-by-side.
 *
 * Migration Strategy:
 * 1. Pothos auth module runs alongside existing auth (duplicate for testing)
 * 2. Once validated, remove auth from SDL schema
 * 3. Continue migrating other modules
 * 4. Eventually remove SDL schema entirely
 */

import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { mergeSchemas } from '@graphql-tools/schema';
import { resolvers } from './schema/resolvers/index.js';
import { pothosSchema } from './schema/pothos/index.js';
import type { GraphQLContext } from './context.js';

// Load existing SDL schema
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const typeDefs = readFileSync(
  join(__dirname, '../../../schema.graphql'),
  'utf-8'
);

/**
 * Creates Apollo Server with merged SDL + Pothos schemas
 *
 * Schema Merging Strategy:
 * - SDL schema provides existing types and resolvers
 * - Pothos schema provides new auth types and resolvers
 * - @graphql-tools/merge handles conflicts (Pothos takes precedence)
 *
 * Benefits:
 * - ✅ Gradual migration (no breaking changes)
 * - ✅ Test new schema alongside old
 * - ✅ Rollback easily if issues
 * - ✅ Continue using existing queries while migrating
 *
 * @returns Configured Apollo Server with merged schema
 */
export function createApolloServerWithPothos(): ApolloServer<GraphQLContext> {
  // Create executable schema from SDL
  const sdlSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Merge SDL schema with Pothos schema
  // Pothos will take precedence for duplicate types
  const mergedSchema = mergeSchemas({
    schemas: [sdlSchema, pothosSchema],
  });

  // Create Apollo Server with merged schema
  const server = new ApolloServer<GraphQLContext>({
    schema: mergedSchema,

    // Security: Query depth limit (prevent DoS attacks)
    validationRules: [
      depthLimit(7),
    ],

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
 * Helper: Creates Pothos-only server (for testing/future)
 *
 * This can be used for testing the Pothos schema in isolation,
 * or eventually replace the merged server once migration is complete.
 */
export function createPothosOnlyServer(): ApolloServer<GraphQLContext> {
  const server = new ApolloServer<GraphQLContext>({
    schema: pothosSchema,

    validationRules: [depthLimit(7)],
    introspection: process.env.NODE_ENV !== 'production',
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',

    formatError: (formattedError) => {
      const message = formattedError.message.toLowerCase();

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
