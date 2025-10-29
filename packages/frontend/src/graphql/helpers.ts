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
  node: T;
  cursor: string;
}

/**
 * GraphQL Connection structure (standard Relay pattern)
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount?: number;
}

/**
 * Unwrap GraphQL Connection to get array of nodes
 *
 * Converts Relay-style Connection (edges/nodes) to simple array.
 * Encapsulates GraphQL implementation detail from consumers.
 *
 * @param connection - GraphQL Connection object
 * @returns Array of nodes
 *
 * @example
 * ```typescript
 * const posts: Post[] = unwrapConnection(postConnection);
 * const notifications: Notification[] = unwrapConnection(notificationConnection);
 * ```
 */
export function unwrapConnection<T>(connection: Connection<T>): T[] {
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
