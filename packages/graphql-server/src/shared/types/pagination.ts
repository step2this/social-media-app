/**
 * Pagination Types
 *
 * Type definitions for Relay-style cursor-based pagination.
 * Implements the Relay Cursor Connections Specification.
 *
 * These types provide a standardized way to paginate through collections
 * using opaque cursors instead of offset/limit pagination.
 *
 * Benefits:
 * - Stable pagination (items can be added/removed without affecting page consistency)
 * - Efficient for large datasets (no need to count total items)
 * - Supports bidirectional pagination (forward and backward)
 * - Compatible with GraphQL and Relay
 *
 * @see https://relay.dev/graphql/connections.htm
 * @see https://graphql.org/learn/pagination/
 */

import { Cursor } from './branded.js';

/**
 * PageInfo - Metadata about the current page
 *
 * Provides information about pagination state and cursor positions.
 * Essential for implementing "Load More" and infinite scroll UIs.
 *
 * @example
 * ```typescript
 * const pageInfo: PageInfo = {
 *   hasNextPage: true,  // More items available
 *   hasPreviousPage: false,  // First page
 *   startCursor: Cursor('cursor-1'),  // First item cursor
 *   endCursor: Cursor('cursor-10'),  // Last item cursor
 * };
 * ```
 */
export interface PageInfo {
  /**
   * Indicates whether more items exist after this page.
   * Used to show/hide "Load More" button or trigger infinite scroll.
   */
  hasNextPage: boolean;

  /**
   * Indicates whether more items exist before this page.
   * Used for backward pagination (less common).
   */
  hasPreviousPage: boolean;

  /**
   * Cursor of the first item in this page.
   * Null if the page is empty.
   * Used for backward pagination (fetching previous page).
   */
  startCursor: Cursor | null;

  /**
   * Cursor of the last item in this page.
   * Null if the page is empty.
   * Used for forward pagination (fetching next page).
   */
  endCursor: Cursor | null;
}

/**
 * Edge<T> - A single item in a connection with its cursor
 *
 * Wraps a node (the actual data item) with its cursor position.
 * The cursor is an opaque identifier that marks the item's position in the list.
 *
 * @template T - The type of the node
 *
 * @example
 * ```typescript
 * const edge: Edge<Post> = {
 *   node: { id: 'post-1', title: 'My Post', ... },
 *   cursor: Cursor('base64-encoded-position'),
 * };
 * ```
 */
export interface Edge<T> {
  /**
   * The actual data item.
   */
  node: T;

  /**
   * Opaque cursor identifying this item's position.
   * Used to fetch items before or after this position.
   * Typically base64-encoded JSON containing { id, sortKey }.
   */
  cursor: Cursor;
}

/**
 * Connection<T> - A paginated collection of items
 *
 * Represents a page of items with metadata about pagination state.
 * This is the top-level type returned by paginated GraphQL queries.
 *
 * @template T - The type of items in the connection
 *
 * @example
 * ```typescript
 * const connection: Connection<Post> = {
 *   edges: [
 *     { node: post1, cursor: Cursor('c1') },
 *     { node: post2, cursor: Cursor('c2') },
 *   ],
 *   pageInfo: {
 *     hasNextPage: true,
 *     hasPreviousPage: false,
 *     startCursor: Cursor('c1'),
 *     endCursor: Cursor('c2'),
 *   },
 * };
 * ```
 */
export interface Connection<T> {
  /**
   * Array of edges (items with cursors).
   * Empty array if no items match the query.
   */
  edges: Edge<T>[];

  /**
   * Metadata about pagination state.
   * Indicates whether more pages exist and cursor positions.
   */
  pageInfo: PageInfo;
}

/**
 * PaginationArgs - Arguments for paginated queries
 *
 * Defines the parameters used to request a specific page of results.
 * Supports both forward pagination (first/after) and backward pagination (last/before).
 *
 * Forward pagination (typical):
 * - `first: N` - Fetch the first N items
 * - `after: cursor` - Fetch items after this cursor
 *
 * Backward pagination (less common):
 * - `last: N` - Fetch the last N items
 * - `before: cursor` - Fetch items before this cursor
 *
 * @example
 * ```typescript
 * // Initial page: First 20 items
 * const args1: PaginationArgs = { first: 20 };
 *
 * // Next page: 20 items after last cursor from previous page
 * const args2: PaginationArgs = {
 *   first: 20,
 *   after: lastPageEndCursor,
 * };
 *
 * // Backward pagination: 10 items before a cursor
 * const args3: PaginationArgs = {
 *   last: 10,
 *   before: someCursor,
 * };
 * ```
 *
 * @note Per Relay spec, you should not mix forward and backward pagination
 *       in the same request (don't use first+after with last+before).
 */
export interface PaginationArgs {
  /**
   * Number of items to fetch (forward pagination).
   * Used with `after` to implement "Load More" or infinite scroll.
   *
   * @example `first: 20` - Fetch 20 items
   */
  first?: number;

  /**
   * Cursor to fetch items after (forward pagination).
   * Use the `endCursor` from the previous page's `pageInfo`.
   *
   * @example `after: Cursor('prev-page-end-cursor')`
   */
  after?: Cursor;

  /**
   * Number of items to fetch (backward pagination).
   * Used with `before` to implement backward navigation (less common).
   *
   * @example `last: 10` - Fetch last 10 items before cursor
   */
  last?: number;

  /**
   * Cursor to fetch items before (backward pagination).
   * Use the `startCursor` from the next page's `pageInfo`.
   *
   * @example `before: Cursor('next-page-start-cursor')`
   */
  before?: Cursor;
}

/**
 * CursorData<T> - Data structure encoded in a cursor
 *
 * Defines what information is stored inside an opaque cursor.
 * Typically base64-encoded JSON containing an ID and sort key.
 *
 * The sort key determines the order of items and can be:
 * - A timestamp (for time-ordered feeds)
 * - A score (for ranked content)
 * - Any sortable value
 *
 * @template T - The type of the sort key (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Time-based cursor (feed items sorted by creation time)
 * const cursorData: CursorData<string> = {
 *   id: 'post-123',
 *   sortKey: '2024-01-01T12:00:00Z',
 * };
 *
 * // Encode to opaque cursor
 * const cursor = Cursor(
 *   Buffer.from(JSON.stringify(cursorData)).toString('base64')
 * );
 *
 * // Decode from cursor
 * const decoded = JSON.parse(
 *   Buffer.from(cursor, 'base64').toString('utf-8')
 * ) as CursorData<string>;
 * ```
 *
 * @example
 * ```typescript
 * // Score-based cursor (items sorted by relevance score)
 * const cursorData: CursorData<number> = {
 *   id: 'item-456',
 *   sortKey: 0.95,  // Relevance score
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Composite sort key (multiple sort criteria)
 * const cursorData: CursorData<{ priority: number; createdAt: string }> = {
 *   id: 'task-789',
 *   sortKey: {
 *     priority: 1,
 *     createdAt: '2024-01-01T00:00:00Z',
 *   },
 * };
 * ```
 */
export interface CursorData<T = unknown> {
  /**
   * Unique identifier of the item.
   * Used to find the exact item when decoding the cursor.
   */
  id: string;

  /**
   * Sort key used for ordering.
   * Determines the item's position in the sorted list.
   * Type depends on sort criteria (timestamp, score, etc.).
   */
  sortKey: T;
}
