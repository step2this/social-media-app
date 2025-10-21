/**
 * Like Service GraphQL Implementation
 *
 * Implements ILikeService using GraphQL operations.
 * Uses dependency injection for testability and follows AsyncState pattern.
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
import type { ILikeService } from '../interfaces/ILikeService';
import type { LikeResponse, LikeStatus } from '../__tests__/fixtures/likeFixtures';
import {
    LIKE_POST_MUTATION,
    UNLIKE_POST_MUTATION,
    GET_LIKE_STATUS_QUERY,
} from '../../graphql/operations/likes';

/**
 * GraphQL-based Like Service
 *
 * Handles all like operations using GraphQL mutations and queries.
 */
export class LikeServiceGraphQL implements ILikeService {
    constructor(private readonly client: IGraphQLClient) { }

    /**
     * Like a post
     */
    async likePost(postId: string): Promise<AsyncState<LikeResponse>> {
        return this.client
            .mutate<{ likePost: LikeResponse }>(LIKE_POST_MUTATION, { postId })
            .then((result) => {
                if (result.status === 'success') {
                    return {
                        status: 'success' as const,
                        data: result.data.likePost,
                    };
                }
                return result;
            });
    }

    /**
     * Unlike a post
     */
    async unlikePost(postId: string): Promise<AsyncState<LikeResponse>> {
        return this.client
            .mutate<{ unlikePost: LikeResponse }>(UNLIKE_POST_MUTATION, { postId })
            .then((result) => {
                if (result.status === 'success') {
                    return {
                        status: 'success' as const,
                        data: result.data.unlikePost,
                    };
                }
                return result;
            });
    }

    /**
     * Get like status for a post
     */
    async getLikeStatus(postId: string): Promise<AsyncState<LikeStatus>> {
        return this.client
            .query<{ postLikeStatus: LikeStatus }>(GET_LIKE_STATUS_QUERY, { postId })
            .then((result) => {
                if (result.status === 'success') {
                    return {
                        status: 'success' as const,
                        data: result.data.postLikeStatus,
                    };
                }
                return result;
            });
    }
}
