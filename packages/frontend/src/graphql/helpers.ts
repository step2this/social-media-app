/**
 * GraphQL Helper Utilities
 *
 * Reusable helper functions for working with GraphQL responses.
 * Encapsulates common patterns like Connection unwrapping and response transformation.
 */

import type { AsyncState } from './types.js';

/**
 * GraphQL Connection edge structure (standard Relay pattern)
 */
export interface Edge<T> {
  readonly node: T;
  readonly cursor: string;
}

/**
 * GraphQL Connection structure (standard Relay pattern)
 * Uses readonly to accept both mutable and readonly arrays
 */
export interface Connection<T> {
  readonly edges: readonly Edge<T>[];
  readonly pageInfo: {
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly startCursor: string | null;
    readonly endCursor: string | null;
  };
  readonly totalCount?: number;
}

/**
 * Unwrap GraphQL Connection to get array of nodes
 *
 * Converts Relay-style Connection (edges/nodes) to simple array.
 * Encapsulates GraphQL implementation detail from consumers.
 * Returns readonly array to prevent accidental mutations.
 *
 * @param connection - GraphQL Connection object
 * @returns Readonly array of nodes
 *
 * @example
 * ```typescript
 * const posts: readonly Post[] = unwrapConnection(postConnection);
 * const notifications: readonly Notification[] = unwrapConnection(notificationConnection);
 * ```
 */
export function unwrapConnection<T>(connection: Connection<T>): readonly T[] {
  return connection.edges.map((edge) => edge.node);
}

/**
 * Extract pagination info from Connection
 *
 * @param connection - GraphQL Connection object
 * @returns PageInfo object
 *
 * @example
 * ```typescript
 * const pageInfo = getPageInfo(postConnection);
 * if (pageInfo.hasNextPage) {
 *   // Load more with pageInfo.endCursor
 * }
 * ```
 */
export function getPageInfo<T>(connection: Connection<T>) {
  return connection.pageInfo;
}

/**
 * Check if Connection has more data to load
 *
 * @param connection - GraphQL Connection object
 * @returns true if there's a next page
 *
 * @example
 * ```typescript
 * if (hasNextPage(notificationConnection)) {
 *   setShowLoadMore(true);
 * }
 * ```
 */
export function hasNextPage<T>(connection: Connection<T>): boolean {
  return connection.pageInfo.hasNextPage;
}

/**
 * Transform AsyncState by applying a function to successful data
 *
 * @param result - AsyncState to transform
 * @param fn - Function to apply to data if status is success
 * @returns Transformed AsyncState
 *
 * @example
 * ```typescript
 * const unwrapped = transformAsyncState(result, unwrapConnection);
 * ```
 */
export function transformAsyncState<TInput, TOutput>(
  result: AsyncState<TInput>,
  fn: (data: TInput) => TOutput
): AsyncState<TOutput> {
  if (result.status === 'success') {
    return {
      status: 'success' as const,
      data: fn(result.data),
    };
  }
  return result;
}

/**
 * ============================================================================
 * Extended Safe Helpers (null/undefined safe variants)
 * Following TypeScript Advanced Types patterns from SKILL.md
 * ============================================================================
 */

/**
 * Type guard to check if value is a valid Connection
 * Follows SKILL.md type guard pattern (lines 622-641)
 *
 * @param value - Value to check
 * @returns true if value is a valid Connection structure
 *
 * @example
 * ```typescript
 * if (isConnection(data.auctions)) {
 *   const items = unwrapConnection(data.auctions);
 * }
 * ```
 */
export function isConnection<T>(
  value: unknown
): value is Connection<T> {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'edges' in value &&
    Array.isArray((value as any).edges) &&
    'pageInfo' in value
  );
}

/**
 * Type guard to check if Connection has edges
 * More specific than isConnection - checks edges array is non-empty
 *
 * @param connection - Connection to check
 * @returns true if connection has at least one edge
 */
export function hasEdges<T>(
  connection: Connection<T> | null | undefined
): connection is Connection<T> & { edges: readonly [Edge<T>, ...Edge<T>[]] } {
  return (
    isConnection(connection) &&
    connection.edges.length > 0
  );
}

/**
 * Safely unwrap Connection, returning empty array if invalid
 * Wraps existing unwrapConnection with null safety
 * Returns readonly array to prevent accidental mutations.
 *
 * @param connection - Potentially null/undefined Connection
 * @returns Readonly array of nodes, or empty array if connection invalid
 *
 * @example
 * ```typescript
 * // Safe - returns [] if data.auctions is undefined
 * const auctions = safeUnwrapConnection(data.auctions);
 *
 * // Compare to existing (crashes on undefined):
 * const auctions = unwrapConnection(data.auctions); // ❌
 * ```
 */
export function safeUnwrapConnection<T>(
  connection: Connection<T> | null | undefined
): readonly T[] {
  if (!isConnection(connection)) {
    return [];
  }
  return unwrapConnection(connection);
}

/**
 * Safely get PageInfo with sensible defaults
 * Wraps existing getPageInfo with null safety
 *
 * @param connection - Potentially null/undefined Connection
 * @returns PageInfo object with defaults if connection invalid
 */
export function safeGetPageInfo<T>(
  connection: Connection<T> | null | undefined
): {
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startCursor: string | null;
  readonly endCursor: string | null;
} {
  if (!isConnection(connection)) {
    return {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    };
  }
  return getPageInfo(connection);
}

/**
 * Safely check if Connection has next page
 * Wraps existing hasNextPage with null safety
 *
 * @param connection - Potentially null/undefined Connection
 * @returns true if connection has next page, false otherwise
 */
export function safeHasNextPage<T>(
  connection: Connection<T> | null | undefined
): boolean {
  if (!isConnection(connection)) {
    return false;
  }
  return hasNextPage(connection);
}

/**
 * Assert that value is a valid Connection (throws if not)
 * Follows SKILL.md assertion function pattern (lines 643-657)
 *
 * Use when connection MUST exist (alternative to type guard)
 *
 * @param value - Value to check
 * @param fieldName - Name of field for error message
 * @throws {Error} If connection is invalid
 *
 * @example
 * ```typescript
 * assertConnection(data.auctions, 'auctions');
 * // TypeScript now knows data.auctions is Connection<Auction>
 * const items = unwrapConnection(data.auctions);
 * ```
 */
export function assertConnection<T>(
  value: unknown,
  fieldName: string = 'connection'
): asserts value is Connection<T> {
  if (!isConnection(value)) {
    throw new Error(
      `GraphQL response missing or invalid connection: ${fieldName}`
    );
  }
}
