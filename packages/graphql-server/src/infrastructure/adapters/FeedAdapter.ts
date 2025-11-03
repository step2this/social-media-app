/**
 * FeedAdapter
 *
 * Adapter that bridges PostService (DAL) and GraphQL feed resolvers.
 * Transforms domain Post types to GraphQL PostConnection using TypeMapper.
 *
 * Following hexagonal architecture adapter pattern.
 * Uses PostService for query-time feeds (NOT FeedService which is for materialized cache).
 */

import { GraphQLError } from 'graphql';
import type { PostService } from '@social-media-app/dal';
import type { FollowService } from '@social-media-app/dal';
import type { PostConnection } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';
import type { PostGridItem, PostWithAuthor } from '@social-media-app/shared';

interface GetExploreFeedArgs {
  first?: number;
  after?: string;
}

interface GetFollowingFeedArgs {
  userId: string;
  first?: number;
  after?: string;
}

/**
 * FeedAdapter - Adapts PostService to GraphQL feed queries
 */
export class FeedAdapter {
  constructor(
    private readonly postService: PostService,
    private readonly followService: FollowService
  ) {}

  /**
   * Get paginated explore feed (all public posts)
   *
   * Uses PostService.getFeedPosts() for query-time feed generation.
   *
   * @param args - Query arguments
   * @returns GraphQL PostConnection with edges and pageInfo
   * @throws GraphQLError if service errors occur
   */
  async getExploreFeed(args: GetExploreFeedArgs): Promise<PostConnection> {
    try {
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.postService.getFeedPosts(limit, cursor);

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

  /**
   * Get paginated following feed (posts from followed users)
   *
   * Uses PostService.getFollowingFeedPosts() for query-time feed generation.
   *
   * @param args - Query arguments including userId
   * @returns GraphQL PostConnection with edges and pageInfo
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getFollowingFeed(args: GetFollowingFeedArgs): Promise<PostConnection> {
    if (!args.userId) {
      throw new GraphQLError('userId is required');
    }

    try {
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.postService.getFollowingFeedPosts(
        args.userId,
        this.followService,
        limit,
        cursor
      );

      return TypeMapper.toGraphQLConnection<PostWithAuthor, any, PostConnection>(
        response.posts,
        TypeMapper.toGraphQLFeedPost,
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
