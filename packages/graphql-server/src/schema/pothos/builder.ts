/**
 * Pothos Schema Builder Configuration
 *
 * This is the central configuration for the Pothos GraphQL schema builder.
 * It defines the context type, auth scopes, and plugins used across the schema.
 */

import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import ValidationPlugin from '@pothos/plugin-validation';
import ComplexityPlugin from '@pothos/plugin-complexity';
import RelayPlugin from '@pothos/plugin-relay';
import type { GraphQLContext } from '../../context.js';

/**
 * Auth Scopes
 *
 * Define what authentication scopes are available in the schema.
 */
export type AuthScopes = {
  authenticated: boolean;
};

/**
 * Schema Builder Instance
 *
 * This is the main builder used throughout the schema.
 */
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: AuthScopes;
}>({
  plugins: [ScopeAuthPlugin, ValidationPlugin, ComplexityPlugin, RelayPlugin],
  scopeAuth: {
    authScopes: (context: GraphQLContext) => ({
      authenticated: !!context.userId,
    }),
  },
  complexity: {
    // Default complexity for any field (if not specified)
    defaultComplexity: 1,

    // Multiplier for list fields
    defaultListMultiplier: 10,

    // Global limits
    limit: {
      // Max total complexity for entire query
      complexity: 1000,

      // Max query depth (replaces graphql-depth-limit)
      depth: 10,

      // Max query breadth (fields per level)
      breadth: 50,
    },
  },
  relay: {
    // Relay plugin configuration
    // Use clientMutationId: 'optional' for flexibility (not required in all mutations)
    clientMutationId: 'omit',

    // Cursor encoding (default is base64 JSON)
    cursorType: 'String',

    // Enable branded types for node IDs
    brandLoadedObjects: false,
  },
} as any); // Type assertion needed for Pothos plugin config

/**
 * Base Query Type
 */
builder.queryType({});

/**
 * Base Mutation Type
 */
builder.mutationType({});
