/**
 * CommentAdapter
 *
 * Adapter that bridges the gap between DAL services (domain types) and
 * GraphQL resolvers (GraphQL types). This adapter:
 *
 * 1. Calls DAL comment service methods
 * 2. Transforms domain types to GraphQL types using TypeMapper
 * 3. Handles errors and converts them to GraphQLErrors
 * 4. Validates input parameters
 *
 * This follows the Adapter pattern in hexagonal architecture, keeping
 * the domain layer (DAL) independent of the interface layer (GraphQL).
 *
 * @example
 * ```typescript
 * const adapter = new CommentAdapter(commentService);
 *
 * const connection = await adapter.getCommentsByPostId({
 *   postId: 'post-123',
 *   first: 20,
 *   after: 'cursor-abc',
 * });
 * ```
 */

import type { CommentService } from '@social-media-app/dal';
import type { CommentConnection } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';
import { GraphQLError } from 'graphql';

/**
 * Arguments for getCommentsByPostId
 */
interface GetCommentsArgs {
  postId: string;
  first?: number;
  after?: string;
}

/**
 * CommentAdapter - Transforms DAL responses to GraphQL types
 *
 * This adapter sits between the DAL service layer and the GraphQL resolver
 * layer, handling:
 * - Type transformations (domain → GraphQL)
 * - Error handling and conversion
 * - Input validation
 * - Pagination metadata mapping
 */
export class CommentAdapter {
  constructor(private readonly commentService: CommentService) {}

  /**
   * Get paginated comments for a post
   *
   * Fetches comments from the DAL service and transforms them to GraphQL
   * Connection format with proper cursors and pageInfo.
   *
   * @param args - Query arguments
   * @param args.postId - ID of the post to get comments for
   * @param args.first - Number of comments to fetch (1-100, default: 20)
   * @param args.after - Cursor for pagination (optional)
   * @returns GraphQL CommentConnection with edges and pageInfo
   * @throws GraphQLError if validation fails or service errors occur
   *
   * @example
   * ```typescript
   * const connection = await adapter.getCommentsByPostId({
   *   postId: 'post-123',
   *   first: 10,
   * });
   *
   * console.log(connection.edges.length); // 10
   * console.log(connection.pageInfo.hasNextPage); // true/false
   * ```
   */
  async getCommentsByPostId(args: GetCommentsArgs): Promise<CommentConnection> {
    // Validate postId
    if (!args.postId || args.postId.trim() === '') {
      throw new GraphQLError('postId is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Validate and apply default for first
    const first = args.first ?? 20;
    if (first < 1 || first > 100) {
      throw new GraphQLError('first must be between 1 and 100', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    try {
      // Call DAL service to fetch comments
      const dalResponse = await this.commentService.getCommentsByPost(
        args.postId,
        first,
        args.after
      );

      // Transform domain comments to GraphQL Connection
      const connection: CommentConnection = TypeMapper.toGraphQLConnection(
        dalResponse.comments,
        TypeMapper.toGraphQLComment,
        {
          first,
          after: args.after,
          hasNextPage: dalResponse.hasMore,
          hasPreviousPage: false, // We don't support backward pagination yet
        }
      ) as CommentConnection;

      return connection;
    } catch (error) {
      // Convert service errors to GraphQLErrors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      throw new GraphQLError(errorMessage, {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          originalError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
