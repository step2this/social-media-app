/**
 * TypeMapper
 *
 * Utility class for transforming domain types from @social-media-app/shared
 * to GraphQL schema types. This isolates type transformation logic and makes
 * it easy to test.
 *
 * Key responsibilities:
 * - Transform domain entities to GraphQL types
 * - Build GraphQL Connection structures (edges, pageInfo, cursors)
 * - Generate stable cursors for pagination
 *
 * @example
 * ```typescript
 * // Transform a single comment
 * const graphqlComment = TypeMapper.toGraphQLComment(domainComment);
 *
 * // Transform paginated comments
 * const connection = TypeMapper.toGraphQLConnection(
 *   domainComments,
 *   TypeMapper.toGraphQLComment,
 *   { first: 10, hasNextPage: true }
 * );
 * ```
 */

import type { Comment as DomainComment } from '@social-media-app/shared';
import type {
  Comment as GraphQLComment,
  CommentConnection,
  CommentEdge,
  PageInfo,
  Profile,
} from '../../../schema/generated/types';
import { CursorCodec } from '../../pagination/CursorCodec';

/**
 * TypeMapper - Static utility class for type transformations
 *
 * This class provides methods to transform domain types to GraphQL types.
 * All methods are static, making it easy to use without instantiation.
 */
export class TypeMapper {
  /**
   * Transform domain Comment to GraphQL Comment
   *
   * Domain Comment has a flat structure with userHandle, while GraphQL Comment
   * requires a nested author object with id, handle, and username.
   *
   * @param domain - The domain Comment from @social-media-app/shared
   * @returns GraphQL Comment type compatible with schema
   *
   * @example
   * ```typescript
   * const domainComment = {
   *   id: 'comment-1',
   *   userId: 'user-1',
   *   userHandle: 'johndoe',
   *   content: 'Great post!',
   *   ...
   * };
   *
   * const graphqlComment = TypeMapper.toGraphQLComment(domainComment);
   * // {
   * //   id: 'comment-1',
   * //   userId: 'user-1',
   * //   author: { id: 'user-1', handle: 'johndoe', username: 'johndoe' },
   * //   content: 'Great post!',
   * //   ...
   * // }
   * ```
   */
  static toGraphQLComment(domain: DomainComment): GraphQLComment {
    // Build the author object from flat domain fields
    const author: Profile = {
      id: domain.userId,
      handle: domain.userHandle,
      username: domain.userHandle, // Use handle as fallback for username
    } as Profile; // Type assertion needed because Profile has more required fields

    return {
      id: domain.id,
      postId: domain.postId,
      userId: domain.userId,
      content: domain.content,
      createdAt: domain.createdAt,
      author,
    };
  }

  /**
   * Transform array of domain items to GraphQL Connection
   *
   * This is a generic method that works with any domain/GraphQL type pair.
   * It builds the standard GraphQL Connection structure with edges, cursors,
   * and pageInfo.
   *
   * Cursors are generated using CursorCodec with { id, timestamp } for stable
   * pagination across requests.
   *
   * @param items - Array of domain items to transform
   * @param transformer - Function to transform each domain item to GraphQL type
   * @param options - Pagination metadata
   * @param options.first - Number of items requested
   * @param options.after - Cursor for pagination (optional)
   * @param options.hasNextPage - Whether there are more items
   * @param options.hasPreviousPage - Whether there are previous items
   * @returns GraphQL Connection with edges and pageInfo
   *
   * @example
   * ```typescript
   * const connection = TypeMapper.toGraphQLConnection(
   *   domainComments,
   *   TypeMapper.toGraphQLComment,
   *   {
   *     first: 20,
   *     hasNextPage: true,
   *     hasPreviousPage: false
   *   }
   * );
   * ```
   */
  static toGraphQLConnection<TDomain, TGraphQL>(
    items: TDomain[],
    transformer: (item: TDomain) => TGraphQL,
    options: {
      first?: number;
      after?: string;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
    }
  ): CommentConnection {
    // Transform each item and create edges with cursors
    const edges: CommentEdge[] = items.map((item) => {
      // Transform domain item to GraphQL type
      const node = transformer(item);

      // Generate stable cursor using id and timestamp
      // Type assertion: we know the node has id and createdAt
      const nodeWithCursor = node as any;
      const cursorData = {
        id: nodeWithCursor.id,
        sortKey: nodeWithCursor.createdAt,
      };

      const codec = new CursorCodec();
      const cursor = codec.encode(cursorData);

      return {
        node: node as GraphQLComment,
        cursor,
      };
    });

    // Build PageInfo
    const pageInfo: PageInfo = {
      hasNextPage: options.hasNextPage ?? false,
      hasPreviousPage: options.hasPreviousPage ?? false,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
    };
  }
}
