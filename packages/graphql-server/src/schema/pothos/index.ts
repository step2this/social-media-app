/**
 * Pothos Schema Entry Point
 *
 * This file imports all Pothos schema definitions and exports the built schema.
 *
 * Import Order:
 * 1. Builder (must be first)
 * 2. Types (must be before mutations/queries that use them)
 * 3. Queries
 * 4. Mutations
 */

// Import builder to initialize Query and Mutation types
import { builder } from './builder.js';

// Import types (these define the GraphQL types)
import './types/auth.js';

// Import queries (these add fields to the Query type)
import './queries/auth.js';

// Import mutations (these add fields to the Mutation type)
import './mutations/auth.js';

/**
 * Build the GraphQL schema
 *
 * This converts the Pothos builder definitions into a GraphQL schema.
 * The schema can then be merged with the existing SDL schema or used standalone.
 */
export const pothosSchema = builder.toSchema();

/**
 * Export builder for testing or extending
 */
export { builder };
