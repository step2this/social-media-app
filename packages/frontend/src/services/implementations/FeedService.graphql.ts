/**
 * GraphQL Feed Service Implementation
 *
 * Implements IFeedService using GraphQL operations.
 * Uses dependency injection for easy testing and swapping.
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
import type {
    IFeedService,
    FeedQueryOptions,
    FeedResult,
    MarkPostsAsReadInput,
    MarkPostsAsReadResult,
} from '../interfaces/IFeedService';
import type { Post, PostConnection } from '../interfaces/IPostService';
import type { PostWithAuthor } from '@social-media-app/shared';
import {
    GET_EXPLORE_FEED_QUERY,
    GET_FOLLOWING_FEED_QUERY,
    MARK_POSTS_AS_READ_MUTATION,
} from '../../graphql/operations/feeds';
import { unwrapConnection, getPageInfo } from '../../graphql/helpers.js';

/**
 * GraphQL response types
 */
interface GetExploreFeedResponse {
    exploreFeed: PostConnection;
}

interface GetFollowingFeedResponse {
    followingFeed: PostConnection;
}

interface MarkPostsAsReadResponse {
    markPostsAsRead: MarkPostsAsReadResult;
}

/**
 * Transform GraphQL Post to PostWithAuthor
 * Maps the nested author object to flat fields for feed display
 */
function transformPostToPostWithAuthor(post: Post): PostWithAuthor {
    return {
        id: post.id,
        userId: post.userId,
        userHandle: post.author.handle,
        imageUrl: post.imageUrl,
        caption: post.caption ?? undefined,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt,
        authorId: post.author.id,
        authorHandle: post.author.handle,
        authorFullName: post.author.fullName ?? undefined,
        authorProfilePictureUrl: post.author.profilePictureUrl ?? undefined,
        isLiked: post.isLiked ?? undefined,
    };
}

/**
 * Transform PostConnection to FeedResult
 * Flattens the GraphQL edges/nodes structure to a cleaner interface
 */
function transformPostConnection(connection: PostConnection): FeedResult {
    const posts = unwrapConnection(connection);
    const pageInfo = getPageInfo(connection);

    return {
        items: posts.map(transformPostToPostWithAuthor),
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
    };
}

/**
 * Helper to transform successful GraphQL responses
 * Reduces boilerplate in service methods
 */
function transformResponse<TResponse, TData>(
    result: AsyncState<TResponse>,
    transformer: (response: TResponse) => TData
): AsyncState<TData> {
    if (result.status === 'success') {
        return {
            status: 'success' as const,
            data: transformer(result.data),
        };
    }
    return result;
}

/**
 * FeedServiceGraphQL
 *
 * GraphQL implementation of the feed service.
 * Handles all feed-related operations via GraphQL API.
 */
export class FeedServiceGraphQL implements IFeedService {
    private readonly DEFAULT_LIMIT = 24;

    constructor(private readonly client: IGraphQLClient) { }

    async getExploreFeed(
        options: FeedQueryOptions = {}
    ): Promise<AsyncState<FeedResult>> {
        const { limit = this.DEFAULT_LIMIT, cursor } = options;

        const result = await this.client.query<GetExploreFeedResponse>(
            GET_EXPLORE_FEED_QUERY,
            {
                limit,
                cursor,
            }
        );

        return transformResponse(result, (data) => transformPostConnection(data.exploreFeed));
    }

    async getFollowingFeed(
        options: FeedQueryOptions = {}
    ): Promise<AsyncState<FeedResult>> {
        const { limit = this.DEFAULT_LIMIT, cursor } = options;

        const result = await this.client.query<GetFollowingFeedResponse>(
            GET_FOLLOWING_FEED_QUERY,
            {
                limit,
                cursor,
            }
        );

        return transformResponse(result, (data) => transformPostConnection(data.followingFeed));
    }

    async markPostsAsRead(
        input: MarkPostsAsReadInput
    ): Promise<AsyncState<MarkPostsAsReadResult>> {
        const result = await this.client.mutate<MarkPostsAsReadResponse>(
            MARK_POSTS_AS_READ_MUTATION,
            { input }
        );

        return transformResponse(result, (data) => data.markPostsAsRead);
    }
}
