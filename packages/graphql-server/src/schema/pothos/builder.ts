/**
 * Pothos Schema Builder Configuration
 *
 * This is the central configuration for the Pothos GraphQL schema builder.
 * It defines the context type, auth scopes, and plugins used across the schema.
 */

import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import ValidationPlugin from '@pothos/plugin-validation';
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
  plugins: [ScopeAuthPlugin, ValidationPlugin],
  scopeAuth: {
    authScopes: (context: GraphQLContext) => ({
      authenticated: !!context.userId,
    }),
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
