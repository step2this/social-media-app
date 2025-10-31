/**
 * ConnectionBuilder
 * 
 * Transforms raw data into Relay Connection format.
 * Builds edges with cursors and page information for cursor-based pagination.
 * 
 * This class is responsible for:
 * - Creating Edge objects (node + cursor pairs)
 * - Building PageInfo metadata (hasNextPage, hasPreviousPage, cursors)
 * - Using CursorCodec to encode cursor data
 * 
 * @example
 * ```typescript
 * const codec = new CursorCodec();
 * const builder = new ConnectionBuilder(codec);
 * 
 * const connection = builder.build({
 *   nodes: posts,
 *   hasMore: true,
 *   getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt })
 * });
 * 
 * // Returns:
 * // {
 * //   edges: [
 * //     { node: post1, cursor: 'base64...' },
 * //     { node: post2, cursor: 'base64...' }
 * //   ],
 * //   pageInfo: {
 * //     hasNextPage: true,
 * //     hasPreviousPage: false,
 * //     startCursor: 'base64...',
 * //     endCursor: 'base64...'
 * //   }
 * // }
 * ```
 */

import { Connection, Edge, PageInfo, CursorData } from '../../shared/types/index.js';
import { ICursorCodec } from './CursorCodec.js';

/**
 * Options for building a connection
 * 
 * @template T - The type of nodes in the connection
 */
export interface ConnectionBuilderOptions<T> {
  /**
   * Array of data items to include in this page.
   * Can be empty if no results match the query.
   */
  nodes: T[];

  /**
   * Whether more items exist after this page.
   * Used to set pageInfo.hasNextPage.
   * 
   * Typically determined by fetching limit + 1 items and checking if
   * the extra item exists.
   */
  hasMore: boolean;

  /**
   * Function to extract cursor data from a node.
   * Returns the ID and sort key used for cursor encoding.
   * 
   * @param node - The node to extract cursor data from
   * @returns Cursor data containing id and sortKey
   * 
   * @example
   * ```typescript
   * // Time-based sorting
   * getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt })
   * 
   * // Score-based sorting
   * getCursorData: (item) => ({ id: item.id, sortKey: item.score })
   * 
   * // Composite sorting
   * getCursorData: (task) => ({
   *   id: task.id,
   *   sortKey: { priority: task.priority, createdAt: task.createdAt }
   * })
   * ```
   */
  getCursorData: (node: T) => CursorData;
}

/**
 * ConnectionBuilder - Builds Relay Connections from raw data
 * 
 * Transforms an array of nodes into a Relay Connection structure with:
 * - Edges (nodes with cursors)
 * - PageInfo (pagination metadata)
 * 
 * This class handles the mechanical work of building connections,
 * allowing resolvers to focus on business logic.
 * 
 * Features:
 * - Type-safe generic implementation
 * - Automatic cursor encoding via CursorCodec
 * - Handles empty results gracefully
 * - Forward pagination support (hasPreviousPage always false)
 * - Stateless (no side effects)
 * 
 * @example
 * ```typescript
 * // In a GraphQL resolver
 * const posts = await postService.getFollowingFeed(userId, { first: 10, after });
 * 
 * const connection = connectionBuilder.build({
 *   nodes: posts.items,
 *   hasMore: posts.hasMore,
 *   getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt })
 * });
 * 
 * return connection; // Returns Connection<Post>
 * ```
 */
export class ConnectionBuilder {
  /**
   * Creates a ConnectionBuilder instance.
   * 
   * @param cursorCodec - The cursor codec to use for encoding/decoding cursors
   */
  constructor(private readonly cursorCodec: ICursorCodec) {}

  /**
   * Build a Connection from nodes and pagination info.
   * 
   * This is the main method that transforms raw data into Relay Connection format.
   * 
   * Process:
   * 1. Create edges by mapping nodes to { node, cursor } pairs
   * 2. Encode cursors using getCursorData and cursorCodec
   * 3. Build pageInfo with hasNextPage and cursor positions
   * 4. Return complete Connection<T>
   * 
   * @param options - The build options
   * @returns A complete Relay Connection with edges and pageInfo
   * 
   * @example
   * ```typescript
   * const connection = builder.build({
   *   nodes: [post1, post2, post3],
   *   hasMore: true,
   *   getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt })
   * });
   * 
   * console.log(connection.edges.length); // 3
   * console.log(connection.pageInfo.hasNextPage); // true
   * ```
   */
  build<T>(options: ConnectionBuilderOptions<T>): Connection<T> {
    const { nodes, hasMore, getCursorData } = options;

    // Handle empty nodes array
    if (nodes.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };
    }

    // Create edges by mapping nodes to { node, cursor } pairs
    const edges: Edge<T>[] = nodes.map((node) => {
      // Extract cursor data from node (id + sortKey)
      const cursorData = getCursorData(node);

      // Encode cursor data to opaque cursor string
      const cursor = this.cursorCodec.encode(cursorData);

      return {
        node,
        cursor,
      };
    });

    // Build pageInfo with pagination metadata
    const pageInfo: PageInfo = {
      // hasNextPage indicates if more items exist after this page
      hasNextPage: hasMore,

      // hasPreviousPage is always false (forward pagination only)
      // Backward pagination (last/before) is not yet implemented
      hasPreviousPage: false,

      // startCursor is the cursor of the first edge
      startCursor: edges[0].cursor,

      // endCursor is the cursor of the last edge
      endCursor: edges[edges.length - 1].cursor,
    };

    return {
      edges,
      pageInfo,
    };
  }
}
