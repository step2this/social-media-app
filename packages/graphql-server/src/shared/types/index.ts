/**
 * Shared Types Barrel Export
 *
 * Central export point for all shared types in the GraphQL server.
 * Import all types from this file instead of individual modules.
 *
 * @example
 * ```typescript
 * import { UserId, Result, Connection } from '../shared/types/index.js';
 * ```
 */

// Branded types - export everything (types and constructor functions)
export * from './branded.js';

// Result type for error handling - export everything (types and functions)
export * from './result.js';

// Pagination types (Relay Cursor Connections) - export everything
export * from './pagination.js';
