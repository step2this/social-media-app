/**
 * Generic Connection Builder - Type-Safe Relay-Style Pagination
 *
 * Patterns from SKILL.md:
 * - Generics with Constraints (Section 1)
 * - Utility Types (Section 5)
 *
 * Builds Relay-style connections (edges + pageInfo) in a type-safe,
 * reusable way. Works with any node type using generics.
 *
 * This eliminates repeated pagination logic across resolvers.
 *
 * @example
 * ```typescript
 * // In a feed resolver
 * const connection = buildConnection({
 *   items: feedItems,
 *   hasMore: !!result.nextCursor,
 *   getCursorKeys: (item) => ({
 *     PK: `USER#${userId}`,
 *     SK: `FEED#${item.createdAt}#${item.id}`,
 *   }),
 * });
 *
 * return connection; // Type: Connection<FeedItem>
 * ```
 */

/**
 * Single edge in a connection
 * Contains the node and its cursor for pagination
 */
interface Edge<TNode> {
  node: TNode;
  cursor: string;
}

/**
 * Pagination information for a connection
 * Follows Relay pagination spec
 */
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

/**
 * Relay-style connection
 * Contains edges (items) and pagination info
 */
interface Connection<TNode> {
  edges: ReadonlyArray<Edge<TNode>>;
  pageInfo: PageInfo;
}

/**
 * DynamoDB cursor keys
 * PK = Partition Key, SK = Sort Key
 */
interface CursorKeys {
  PK: string;
  SK: string;
}

/**
 * Configuration for building a connection
 */
interface ConnectionConfig<TNode> {
  /**
   * Items to convert to edges
   */
  items: ReadonlyArray<TNode>;

  /**
   * Whether there are more items after this page
   * Used to set pageInfo.hasNextPage
   */
  hasMore: boolean;

  /**
   * Function to generate cursor keys from a node
   * These keys uniquely identify the node's position
   *
   * @example
   * ```typescript
   * getCursorKeys: (post) => ({
   *   PK: `USER#${userId}`,
   *   SK: `POST#${post.createdAt}#${post.id}`,
   * })
   * ```
   */
  getCursorKeys: (node: TNode) => CursorKeys;
}

/**
 * Builds a Relay-style connection from items.
 *
 * Uses generics to work with any node type while maintaining type safety.
 * The connection includes edges (items with cursors) and pagination info.
 *
 * Pattern: Generic function with constraint (TNode can be any type)
 *
 * @param config - Configuration with items, hasMore flag, and cursor generator
 * @returns Type-safe connection with edges and pageInfo
 *
 * @example
 * ```typescript
 * // Build a connection for posts
 * const connection = buildConnection({
 *   items: posts,
 *   hasMore: true,
 *   getCursorKeys: (post) => ({
 *     PK: `USER#${userId}`,
 *     SK: `POST#${post.createdAt}#${post.id}`,
 *   }),
 * });
 *
 * console.log(connection.edges.length); // Number of posts
 * console.log(connection.pageInfo.hasNextPage); // true
 * ```
 */
export function buildConnection<TNode>(
  config: ConnectionConfig<TNode>
): Connection<TNode> {
  const { items, hasMore, getCursorKeys } = config;

  // Convert items to edges with cursors
  const edges: Edge<TNode>[] = items.map((node) => ({
    node,
    cursor: encodeCursor(getCursorKeys(node)),
  }));

  // Build pagination info
  const pageInfo: PageInfo = {
    hasNextPage: hasMore,
    hasPreviousPage: false, // We don't support backwards pagination yet
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
  };

  return {
    edges,
    pageInfo,
  };
}

/**
 * Encodes cursor keys to base64 string.
 *
 * Cursors are base64-encoded JSON strings containing the DynamoDB keys.
 * This makes them opaque to clients while preserving position information.
 *
 * @param keys - DynamoDB partition and sort keys
 * @returns Base64-encoded cursor string
 *
 * @example
 * ```typescript
 * const cursor = encodeCursor({
 *   PK: 'USER#123',
 *   SK: 'POST#2024-01-01#abc',
 * });
 * // Returns: "eyJQSyI6IlVTRVIjMTIzIiwiU0siOiJQT1NUIzIwMjQtMDEtMDEjYWJjIn0="
 * ```
 */
function encodeCursor(keys: CursorKeys): string {
  return Buffer.from(JSON.stringify(keys)).toString('base64');
}

/**
 * Decodes a base64 cursor back to keys.
 *
 * Reverses the encoding process to extract the original DynamoDB keys.
 * Used when processing pagination arguments.
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded DynamoDB keys
 * @throws Error if cursor is not valid base64 or JSON
 *
 * @example
 * ```typescript
 * const keys = decodeCursor(cursor);
 * console.log(keys.PK); // "USER#123"
 * console.log(keys.SK); // "POST#2024-01-01#abc"
 * ```
 */
export function decodeCursor(cursor: string): CursorKeys {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
}
