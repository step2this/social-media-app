/**
 * PostAdapter
 *
 * Adapter that bridges PostService (DAL) and GraphQL post resolvers.
 * Transforms domain Post types to GraphQL Post types using TypeMapper.
 *
 * Following hexagonal architecture adapter pattern.
 */

import { GraphQLError } from 'graphql';
import type { PostService } from '@social-media-app/dal';
import type { Post as GraphQLPost, PostConnection } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';
import type { PostGridItem } from '@social-media-app/shared';

interface GetUserPostsArgs {
  handle: string;
  first?: number;
  after?: string;
}

/**
 * PostAdapter - Adapts PostService to GraphQL post queries
 */
export class PostAdapter {
  constructor(private readonly postService: PostService) {}

  /**
   * Get a single post by ID
   *
   * @param postId - The post ID to fetch
   * @returns GraphQL Post or null if not found
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getPostById(postId: string): Promise<GraphQLPost | null> {
    if (!postId) {
      throw new GraphQLError('postId is required');
    }

    try {
      const post = await this.postService.getPostById(postId);
      if (!post) {
        return null;
      }

      return TypeMapper.toGraphQLPost(post);
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }

  /**
   * Get paginated posts for a user
   *
   * Uses PostService.getUserPostsByHandle() to fetch user's posts.
   *
   * @param args - Query arguments including handle
   * @returns GraphQL PostConnection with edges and pageInfo
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getUserPosts(args: GetUserPostsArgs): Promise<PostConnection> {
    if (!args.handle) {
      throw new GraphQLError('handle is required');
    }

    try {
      const limit = args.first ?? 24; // Default to 24 for grid view
      const cursor = args.after;

      const response = await this.postService.getUserPostsByHandle({
        handle: args.handle,
        limit,
        cursor,
      });

      return TypeMapper.toGraphQLConnection<PostGridItem, any, PostConnection>(
        response.posts,
        TypeMapper.toGraphQLPostGridItem,
        {
          hasNextPage: response.hasMore,
          after: cursor,
        }
      );
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }
}
