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

// Branded types
export * from './branded.js';
export type {
  Brand,
  UserId,
  PostId,
  CommentId,
  Cursor,
  Handle,
} from './branded.js';

// Result type for error handling
export * from './result.js';
export type {
  Result,
  AsyncResult,
} from './result.js';

// Pagination types (Relay Cursor Connections)
export * from './pagination.js';
export type {
  PageInfo,
  Edge,
  Connection,
  PaginationArgs,
  CursorData,
} from './pagination.js';
