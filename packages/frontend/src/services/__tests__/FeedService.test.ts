/**
 * Feed Service Tests
 *
 * Comprehensive tests for GraphQL-based Feed service.
 * Uses dependency injection and factory pattern for DRY testing.
 * Tests behavior, not implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { IFeedService, FeedResult } from '../interfaces/IFeedService';
import { FeedServiceGraphQL } from '../implementations/FeedService.graphql';
import { MockGraphQLClient } from '../../graphql/client.mock';
import type { PostConnection } from '../interfaces/IPostService';
import type { AsyncState } from '../../graphql/types';
import {
    createMockExploreFeed,
    createMockFollowingFeed,
    createMockEmptyFeed,
    createMockMarkPostsAsReadInput,
    createMockMarkPostsAsReadResult,
} from './fixtures/feedFixtures';
import { wrapInGraphQLSuccess } from './fixtures/graphqlFixtures';
import {
    expectServiceError,
    errorScenarios,
    expectQueryCalledWith,
    expectMutationCalledWith,
} from './helpers/serviceTestHelpers';

// Type definitions for mock client generic calls
interface GetExploreFeedVariables {
    limit?: number;
    cursor?: string;
}

interface GetFollowingFeedVariables {
    limit?: number;
    cursor?: string;
}

interface MarkPostsAsReadVariables {
    input: {
        postIds: readonly string[];
    };
}

/**
 * Helper to setup and test feed query success scenarios
 */
async function expectFeedQuerySuccess(
    mockClient: MockGraphQLClient,
    feed: PostConnection,
    feedType: 'exploreFeed' | 'followingFeed',
    serviceCall: () => Promise<AsyncState<FeedResult>>,
    assertions: (data: FeedResult) => void
): Promise<void> {
    mockClient.setQueryResponse(wrapInGraphQLSuccess({ [feedType]: feed }));

    const result = await serviceCall();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
        assertions(result.data);
    }
}

/**
 * Helper to test markPostsAsRead mutation success
 */
async function expectMarkPostsAsReadSuccess(
    mockClient: MockGraphQLClient,
    input: { postIds: readonly string[] },
    expectedResult: { success: boolean; markedCount: number },
    serviceCall: () => Promise<AsyncState<any>>,
    additionalAssertions?: (data: any) => void
): Promise<void> {
    mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ markPostsAsRead: expectedResult })
    );

    const result = await serviceCall();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
        expect(result.data.success).toBe(expectedResult.success);
        expect(result.data.markedCount).toBe(expectedResult.markedCount);
        additionalAssertions?.(result.data);
    }
}

describe('FeedService.graphql', () => {
    let service: IFeedService;
    let mockClient: MockGraphQLClient;

    beforeEach(() => {
        mockClient = new MockGraphQLClient();
        service = new FeedServiceGraphQL(mockClient);
    });

    describe('getExploreFeed', () => {
        it('should fetch explore feed with default limit', async () => {
            const feed = createMockExploreFeed(3, false);

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'exploreFeed',
                () => service.getExploreFeed(),
                (data) => {
                    expect(data.items).toHaveLength(3);
                    expect(data.hasNextPage).toBe(false);
                }
            );

            expectQueryCalledWith<GetExploreFeedVariables>(mockClient, { limit: 24 });
        });

        it('should fetch explore feed with custom limit', async () => {
            const feed = createMockExploreFeed(12, false);

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'exploreFeed',
                () => service.getExploreFeed({ limit: 12 }),
                (data) => expect(data.items).toHaveLength(12)
            );

            expectQueryCalledWith<GetExploreFeedVariables>(mockClient, { limit: 12 });
        });

        it('should handle pagination with cursor', async () => {
            const feed = createMockExploreFeed(24, true);

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'exploreFeed',
                () => service.getExploreFeed({ limit: 24, cursor: 'encoded-cursor-123' }),
                (data) => {
                    expect(data.hasNextPage).toBe(true);
                    expect(data.items).toHaveLength(24);
                }
            );

            expectQueryCalledWith<GetExploreFeedVariables>(mockClient, {
                cursor: 'encoded-cursor-123',
            });
        });

        it('should handle empty explore feed', async () => {
            const feed = createMockEmptyFeed();

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'exploreFeed',
                () => service.getExploreFeed(),
                (data) => {
                    expect(data.items).toHaveLength(0);
                    expect(data.hasNextPage).toBe(false);
                }
            );
        });

        it('should handle errors fetching explore feed', async () => {
            await expectServiceError(
                mockClient,
                () => service.getExploreFeed(),
                errorScenarios.server.fetchExploreFeed.message,
                errorScenarios.server.fetchExploreFeed.code,
                'query'
            );
        });

        it('should handle network errors', async () => {
            await expectServiceError(
                mockClient,
                () => service.getExploreFeed(),
                errorScenarios.network.error.message,
                errorScenarios.network.error.code,
                'query'
            );
        });
    });

    describe('getFollowingFeed', () => {
        it('should fetch following feed with default limit', async () => {
            const feed = createMockFollowingFeed(3, false);

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'followingFeed',
                () => service.getFollowingFeed(),
                (data) => {
                    expect(data.items).toHaveLength(3);
                    expect(data.hasNextPage).toBe(false);
                }
            );

            expectQueryCalledWith<GetFollowingFeedVariables>(mockClient, { limit: 24 });
        });

        it('should fetch following feed with custom limit', async () => {
            const feed = createMockFollowingFeed(12, false);

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'followingFeed',
                () => service.getFollowingFeed({ limit: 12 }),
                (data) => expect(data.items).toHaveLength(12)
            );

            expectQueryCalledWith<GetFollowingFeedVariables>(mockClient, { limit: 12 });
        });

        it('should handle pagination with cursor', async () => {
            const feed = createMockFollowingFeed(24, true);

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'followingFeed',
                () => service.getFollowingFeed({ limit: 24, cursor: 'following-cursor-abc' }),
                (data) => {
                    expect(data.hasNextPage).toBe(true);
                    expect(data.items).toHaveLength(24);
                }
            );

            expectQueryCalledWith<GetFollowingFeedVariables>(mockClient, {
                cursor: 'following-cursor-abc',
            });
        });

        it('should handle empty following feed', async () => {
            const feed = createMockEmptyFeed();

            await expectFeedQuerySuccess(
                mockClient,
                feed,
                'followingFeed',
                () => service.getFollowingFeed(),
                (data) => {
                    expect(data.items).toHaveLength(0);
                    expect(data.hasNextPage).toBe(false);
                }
            );
        });

        it('should handle authentication errors for following feed', async () => {
            await expectServiceError(
                mockClient,
                () => service.getFollowingFeed(),
                errorScenarios.authentication.notAuthenticated.message,
                errorScenarios.authentication.notAuthenticated.code,
                'query'
            );
        });

        it('should handle errors fetching following feed', async () => {
            await expectServiceError(
                mockClient,
                () => service.getFollowingFeed(),
                errorScenarios.server.fetchFollowingFeed.message,
                errorScenarios.server.fetchFollowingFeed.code,
                'query'
            );
        });
    });

    describe('markPostsAsRead', () => {
        it('should mark posts as read successfully', async () => {
            const input = createMockMarkPostsAsReadInput(['post-1', 'post-2', 'post-3']);

            await expectMarkPostsAsReadSuccess(
                mockClient,
                input,
                { success: true, markedCount: 3 },
                () => service.markPostsAsRead(input)
            );
        });

        it('should pass post IDs to mutation', async () => {
            const input = createMockMarkPostsAsReadInput(['post-a', 'post-b']);

            await expectMarkPostsAsReadSuccess(
                mockClient,
                input,
                { success: true, markedCount: 2 },
                () => service.markPostsAsRead(input)
            );

            expectMutationCalledWith<MarkPostsAsReadVariables>(mockClient, {
                input: { postIds: ['post-a', 'post-b'] },
            });
        });

        it('should handle empty array of post IDs', async () => {
            const input = createMockMarkPostsAsReadInput([]);

            await expectMarkPostsAsReadSuccess(
                mockClient,
                input,
                { success: true, markedCount: 0 },
                () => service.markPostsAsRead(input)
            );
        });

        it('should handle authentication errors', async () => {
            const input = createMockMarkPostsAsReadInput();
            await expectServiceError(
                mockClient,
                () => service.markPostsAsRead(input),
                errorScenarios.authentication.notAuthenticated.message,
                errorScenarios.authentication.notAuthenticated.code
            );
        });

        it('should handle errors marking posts as read', async () => {
            const input = createMockMarkPostsAsReadInput();
            await expectServiceError(
                mockClient,
                () => service.markPostsAsRead(input),
                errorScenarios.server.markPostsAsRead.message,
                errorScenarios.server.markPostsAsRead.code
            );
        });

        it('should handle partial success when some posts not found', async () => {
            const input = createMockMarkPostsAsReadInput(['post-1', 'nonexistent', 'post-2']);

            await expectMarkPostsAsReadSuccess(
                mockClient,
                input,
                { success: true, markedCount: 2 },
                () => service.markPostsAsRead(input)
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle fetching explore feed and marking posts as read', async () => {
            const feed = createMockExploreFeed(3, false);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ exploreFeed: feed }));

            const feedResult = await service.getExploreFeed();
            expect(feedResult.status).toBe('success');

            if (feedResult.status === 'success') {
                const postIds = feedResult.data.items.map((item) => item.id);
                const input = createMockMarkPostsAsReadInput(postIds);
                const result_data = createMockMarkPostsAsReadResult(true, postIds.length);

                mockClient.setMutationResponse(
                    wrapInGraphQLSuccess({ markPostsAsRead: result_data })
                );

                const markResult = await service.markPostsAsRead(input);
                expect(markResult.status).toBe('success');
                if (markResult.status === 'success') {
                    expect(markResult.data.markedCount).toBe(postIds.length);
                }
            }
        });

        it('should handle fetching following feed with pagination', async () => {
            const firstPage = createMockFollowingFeed(24, true);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ followingFeed: firstPage }));

            const firstResult = await service.getFollowingFeed({ limit: 24 });
            expect(firstResult.status).toBe('success');

            if (firstResult.status === 'success' && firstResult.data.endCursor) {
                const secondPage = createMockFollowingFeed(24, false);
                mockClient.setQueryResponse(
                    wrapInGraphQLSuccess({ followingFeed: secondPage })
                );

                const secondResult = await service.getFollowingFeed({
                    limit: 24,
                    cursor: firstResult.data.endCursor,
                });

                expect(secondResult.status).toBe('success');
                if (secondResult.status === 'success') {
                    expect(secondResult.data.hasNextPage).toBe(false);
                }
            }
        });
    });
});
