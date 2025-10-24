/**
 * Generalized Test Helpers for Service Tests
 *
 * Provides reusable utilities to DRY up repetitive test patterns across
 * all service tests (Post, Like, Comment, Auction, etc.)
 */

import { expect } from 'vitest';
import type { AsyncState } from '../../../graphql/types';
import type { MockGraphQLClient } from '../../../graphql/client.mock';
import {
    wrapInGraphQLSuccess,
    wrapInGraphQLError,
} from '../fixtures/graphqlFixtures';

/**
 * Helper to test error scenarios with consistent assertions
 *
 * @example
 * await expectServiceError(
 *   mockClient,
 *   () => service.createPost(input),
 *   'Failed to create post',
 *   'INTERNAL_SERVER_ERROR'
 * );
 */
export async function expectServiceError<T>(
    mockClient: MockGraphQLClient,
    serviceCall: () => Promise<AsyncState<T>>,
    expectedMessage: string,
    expectedCode: string,
    setupType: 'query' | 'mutation' = 'mutation'
): Promise<void> {
    const errorResponse = wrapInGraphQLError(expectedMessage, expectedCode);

    if (setupType === 'query') {
        mockClient.setQueryResponse(errorResponse);
    } else {
        mockClient.setMutationResponse(errorResponse);
    }

    const result = await serviceCall();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
        expect(result.error.message).toBe(expectedMessage);
        expect(result.error.extensions?.code).toBe(expectedCode);
    }
}

/**
 * Helper to test success scenarios with custom assertions
 *
 * @example
 * await expectServiceSuccess(
 *   mockClient,
 *   () => service.createPost(input),
 *   { createPost: payload },
 *   (data) => {
 *     expect(data.post.id).toBe('post-1');
 *   }
 * );
 */
export async function expectServiceSuccess<T>(
    mockClient: MockGraphQLClient,
    serviceCall: () => Promise<AsyncState<T>>,
    mockResponse: any,
    assertions: (data: T) => void,
    setupType: 'query' | 'mutation' = 'mutation'
): Promise<void> {
    const successResponse = wrapInGraphQLSuccess(mockResponse);

    if (setupType === 'query') {
        mockClient.setQueryResponse(successResponse);
    } else {
        mockClient.setMutationResponse(successResponse);
    }

    const result = await serviceCall();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
        assertions(result.data);
    }
}

/**
 * Helper to verify mutation call variables
 * Works with generic types for type-safe assertions
 *
 * @example
 * expectMutationCalledWith<{ postId: string }>(
 *   mockClient,
 *   { postId: 'post-123' }
 * );
 */
export function expectMutationCalledWith<T>(
    mockClient: MockGraphQLClient,
    expectedVariables: Partial<T>
): void {
    const lastCall = mockClient.lastMutationCall<T>();
    expect(lastCall).toBeDefined();

    for (const [key, value] of Object.entries(expectedVariables)) {
        expect((lastCall?.variables as any)[key]).toEqual(value);
    }
}

/**
 * Helper to verify query call variables
 * Works with generic types for type-safe assertions
 *
 * @example
 * expectQueryCalledWith<{ id: string }>(
 *   mockClient,
 *   { id: 'post-123' }
 * );
 */
export function expectQueryCalledWith<T>(
    mockClient: MockGraphQLClient,
    expectedVariables: Partial<T>
): void {
    const lastCall = mockClient.lastQueryCall<T>();
    expect(lastCall).toBeDefined();

    for (const [key, value] of Object.entries(expectedVariables)) {
        expect((lastCall?.variables as any)[key]).toEqual(value);
    }
}

/**
 * Centralized error scenario definitions
 * Used across all service tests for consistency
 */
export const errorScenarios = {
    /**
     * Authentication error scenarios
     */
    authentication: {
        notAuthenticated: {
            message: 'Not authenticated',
            code: 'UNAUTHENTICATED',
        },
    },

    /**
     * Validation error scenarios
     */
    validation: {
        emptyComment: {
            message: 'Comment cannot be empty',
            code: 'BAD_USER_INPUT',
        },
        commentTooLong: {
            message: 'Comment must not exceed 500 characters',
            code: 'BAD_USER_INPUT',
        },
    },

    /**
     * Not found error scenarios
     */
    notFound: {
        post: {
            message: 'Post not found',
            code: 'NOT_FOUND',
        },
        comment: {
            message: 'Comment not found',
            code: 'NOT_FOUND',
        },
        user: {
            message: 'User not found',
            code: 'NOT_FOUND',
        },
        auction: {
            message: 'Auction not found',
            code: 'NOT_FOUND',
        },
    },

    /**
     * Permission error scenarios
     */
    permission: {
        forbidden: {
            message: 'Not authorized to delete this comment',
            code: 'FORBIDDEN',
        },
        forbiddenUpdate: {
            message: 'Not authorized to update this post',
            code: 'FORBIDDEN',
        },
        forbiddenDelete: {
            message: 'Not authorized to delete this post',
            code: 'FORBIDDEN',
        },
    },

    /**
     * Server error scenarios
     */
    server: {
        createComment: {
            message: 'Failed to create comment',
            code: 'INTERNAL_SERVER_ERROR',
        },
        fetchComments: {
            message: 'Failed to fetch comments',
            code: 'INTERNAL_SERVER_ERROR',
        },
        deleteComment: {
            message: 'Failed to delete comment',
            code: 'INTERNAL_SERVER_ERROR',
        },
        createPost: {
            message: 'Failed to create post',
            code: 'INTERNAL_SERVER_ERROR',
        },
        fetchPost: {
            message: 'Failed to fetch post',
            code: 'INTERNAL_SERVER_ERROR',
        },
        updatePost: {
            message: 'Failed to update post',
            code: 'INTERNAL_SERVER_ERROR',
        },
        deletePost: {
            message: 'Failed to delete post',
            code: 'INTERNAL_SERVER_ERROR',
        },
        likePost: {
            message: 'Failed to like post',
            code: 'INTERNAL_SERVER_ERROR',
        },
        unlikePost: {
            message: 'Failed to unlike post',
            code: 'INTERNAL_SERVER_ERROR',
        },
        fetchLikeStatus: {
            message: 'Failed to fetch like status',
            code: 'INTERNAL_SERVER_ERROR',
        },
        placeBid: {
            message: 'Failed to place bid',
            code: 'INTERNAL_SERVER_ERROR',
        },
        fetchAuction: {
            message: 'Failed to fetch auction',
            code: 'INTERNAL_SERVER_ERROR',
        },
        fetchExploreFeed: {
            message: 'Failed to fetch explore feed',
            code: 'INTERNAL_SERVER_ERROR',
        },
        fetchFollowingFeed: {
            message: 'Failed to fetch following feed',
            code: 'INTERNAL_SERVER_ERROR',
        },
        markPostsAsRead: {
            message: 'Failed to mark posts as read',
            code: 'INTERNAL_SERVER_ERROR',
        },
    },

    /**
     * Network error scenarios
     */
    network: {
        error: {
            message: 'Network error',
            code: 'NETWORK_ERROR',
        },
    },
};
