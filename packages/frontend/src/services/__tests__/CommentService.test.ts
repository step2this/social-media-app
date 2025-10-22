/**
 * Comment Service Tests
 *
 * Comprehensive tests for GraphQL-based Comment service.
 * Uses dependency injection and factory pattern for DRY testing.
 * Tests behavior, not implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { ICommentService } from '../interfaces/ICommentService';
import { CommentServiceGraphQL } from '../implementations/CommentService.graphql';
import { MockGraphQLClient } from '../../graphql/client.mock';
import {
    createMockComment,
    createMockComments,
    createMockCommentByUser,
    createMockCreateCommentInput,
    createMockCreateCommentResponse,
    createMockCommentsListResponse,
} from './fixtures/commentFixtures';
import { wrapInGraphQLSuccess } from './fixtures/graphqlFixtures';
import {
    expectServiceError,
    expectServiceSuccess,
    expectMutationCalledWith,
    expectQueryCalledWith,
    errorScenarios,
    type CreateCommentVariables,
    type GetCommentsVariables,
    type DeleteCommentVariables,
} from './helpers/commentTestHelpers';

describe('CommentService.graphql', () => {
    let service: ICommentService;
    let mockClient: MockGraphQLClient;

    beforeEach(() => {
        mockClient = new MockGraphQLClient();
        service = new CommentServiceGraphQL(mockClient);
    });

    describe('createComment', () => {
        it('should create a comment successfully', async () => {
            const input = createMockCreateCommentInput();
            const response = createMockCreateCommentResponse({
                comment: { content: input.content },
            });

            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ createComment: response })
            );

            const result = await service.createComment(input.postId, input.content);

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.comment.id).toBe('comment-1');
                expect(result.data.comment.content).toBe(input.content);
                expect(result.data.commentsCount).toBe(1);
            }
        });

        it('should pass postId and content to mutation', async () => {
            const response = createMockCreateCommentResponse();
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ createComment: response })
            );

            await service.createComment('post-456', 'Great post!');

            const lastCall = mockClient.lastMutationCall<CreateCommentVariables>();
            expect(lastCall).toBeDefined();
            expect(lastCall?.variables.input.postId).toBe('post-456');
            expect(lastCall?.variables.input.content).toBe('Great post!');
        });

        it('should handle long comments (up to 500 chars)', async () => {
            const longComment = 'A'.repeat(500);
            const response = createMockCreateCommentResponse({
                comment: { content: longComment },
            });
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ createComment: response })
            );

            const result = await service.createComment('post-1', longComment);

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.comment.content).toBe(longComment);
                expect(result.data.comment.content.length).toBe(500);
            }
        });

        it('should increment comments count', async () => {
            const response = createMockCreateCommentResponse({
                commentsCount: 15,
            });
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ createComment: response })
            );

            const result = await service.createComment('post-1', 'Nice!');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.commentsCount).toBe(15);
            }
        });

        it('should handle errors during comment creation', async () => {
            await expectServiceError(
                mockClient,
                () => service.createComment('post-1', 'Test comment'),
                errorScenarios.server.createComment.message,
                errorScenarios.server.createComment.code
            );
        });

        it('should handle validation errors (empty comment)', async () => {
            await expectServiceError(
                mockClient,
                () => service.createComment('post-1', ''),
                errorScenarios.validation.emptyComment.message,
                errorScenarios.validation.emptyComment.code
            );
        });

        it('should handle validation errors (comment too long)', async () => {
            const tooLongComment = 'A'.repeat(501);
            await expectServiceError(
                mockClient,
                () => service.createComment('post-1', tooLongComment),
                errorScenarios.validation.commentTooLong.message,
                errorScenarios.validation.commentTooLong.code
            );
        });

        it('should handle post not found', async () => {
            await expectServiceError(
                mockClient,
                () => service.createComment('nonexistent', 'Comment'),
                errorScenarios.notFound.post.message,
                errorScenarios.notFound.post.code
            );
        });

        it('should handle authentication errors', async () => {
            await expectServiceError(
                mockClient,
                () => service.createComment('post-1', 'Comment'),
                errorScenarios.authentication.notAuthenticated.message,
                errorScenarios.authentication.notAuthenticated.code
            );
        });
    });

    describe('getComments', () => {
        it('should fetch comments for a post', async () => {
            const comments = createMockComments(5);
            const response = createMockCommentsListResponse(comments);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            const result = await service.getComments('post-1');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.comments).toHaveLength(5);
                expect(result.data.totalCount).toBe(5);
                expect(result.data.hasMore).toBe(false);
            }
        });

        it('should pass postId to query', async () => {
            const comments = createMockComments(3);
            const response = createMockCommentsListResponse(comments);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            await service.getComments('post-789');

            const lastCall = mockClient.lastQueryCall<GetCommentsVariables>();
            expect(lastCall).toBeDefined();
            expect(lastCall?.variables.postId).toBe('post-789');
        });

        it('should use default limit of 50 if not provided', async () => {
            const comments = createMockComments(10);
            const response = createMockCommentsListResponse(comments);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            await service.getComments('post-1');

            const lastCall = mockClient.lastQueryCall<GetCommentsVariables>();
            expect(lastCall?.variables.limit).toBe(50);
        });

        it('should pass custom limit to query', async () => {
            const comments = createMockComments(20);
            const response = createMockCommentsListResponse(comments);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            await service.getComments('post-1', 20);

            const lastCall = mockClient.lastQueryCall<GetCommentsVariables>();
            expect(lastCall?.variables.limit).toBe(20);
        });

        it('should handle pagination with cursor', async () => {
            const comments = createMockComments(50);
            const response = createMockCommentsListResponse(comments, true, 100);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            const result = await service.getComments('post-1', 50, 'cursor-50');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.hasMore).toBe(true);
                expect(result.data.nextCursor).toBe('cursor-50');
                expect(result.data.totalCount).toBe(100);
            }

            const lastCall = mockClient.lastQueryCall<GetCommentsVariables>();
            expect(lastCall?.variables.cursor).toBe('cursor-50');
        });

        it('should handle empty comments list', async () => {
            const response = createMockCommentsListResponse([]);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            const result = await service.getComments('post-1');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.comments).toHaveLength(0);
                expect(result.data.hasMore).toBe(false);
                expect(result.data.nextCursor).toBeNull();
                expect(result.data.totalCount).toBe(0);
            }
        });

        it('should return comments in order (newest first)', async () => {
            const comments = createMockComments(3);
            const response = createMockCommentsListResponse(comments);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: response })
            );

            const result = await service.getComments('post-1');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data.comments[0].id).toBe('comment-1');
                expect(result.data.comments[1].id).toBe('comment-2');
                expect(result.data.comments[2].id).toBe('comment-3');
            }
        });

        it('should handle post not found', async () => {
            await expectServiceError(
                mockClient,
                () => service.getComments('nonexistent'),
                errorScenarios.notFound.post.message,
                errorScenarios.notFound.post.code,
                'query'
            );
        });

        it('should handle errors fetching comments', async () => {
            await expectServiceError(
                mockClient,
                () => service.getComments('post-1'),
                errorScenarios.server.fetchComments.message,
                errorScenarios.server.fetchComments.code,
                'query'
            );
        });
    });

    describe('deleteComment', () => {
        it('should delete a comment successfully', async () => {
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ deleteComment: { success: true } })
            );

            const result = await service.deleteComment('comment-123');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data).toBe(true);
            }
        });

        it('should pass commentId to mutation', async () => {
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ deleteComment: { success: true } })
            );

            await service.deleteComment('comment-789');

            const lastCall = mockClient.lastMutationCall<DeleteCommentVariables>();
            expect(lastCall).toBeDefined();
            expect(lastCall?.variables.commentId).toBe('comment-789');
        });

        it('should handle deletion failures', async () => {
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ deleteComment: { success: false } })
            );

            const result = await service.deleteComment('comment-123');

            expect(result.status).toBe('success');
            if (result.status === 'success') {
                expect(result.data).toBe(false);
            }
        });

        it('should handle permission errors', async () => {
            await expectServiceError(
                mockClient,
                () => service.deleteComment('comment-123'),
                errorScenarios.permission.forbidden.message,
                errorScenarios.permission.forbidden.code
            );
        });

        it('should handle comment not found', async () => {
            await expectServiceError(
                mockClient,
                () => service.deleteComment('nonexistent'),
                errorScenarios.notFound.comment.message,
                errorScenarios.notFound.comment.code
            );
        });

        it('should handle authentication errors', async () => {
            await expectServiceError(
                mockClient,
                () => service.deleteComment('comment-123'),
                errorScenarios.authentication.notAuthenticated.message,
                errorScenarios.authentication.notAuthenticated.code
            );
        });

        it('should handle errors during deletion', async () => {
            await expectServiceError(
                mockClient,
                () => service.deleteComment('comment-123'),
                errorScenarios.server.deleteComment.message,
                errorScenarios.server.deleteComment.code
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle creating and fetching comments', async () => {
            const input = createMockCreateCommentInput();
            const createResponse = createMockCreateCommentResponse();
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ createComment: createResponse })
            );

            const createResult = await service.createComment(
                input.postId,
                input.content
            );
            expect(createResult.status).toBe('success');

            const comments = createMockComments(1);
            const listResponse = createMockCommentsListResponse(comments);
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: listResponse })
            );

            const fetchResult = await service.getComments('post-1');
            expect(fetchResult.status).toBe('success');
            if (createResult.status === 'success' && fetchResult.status === 'success') {
                expect(fetchResult.data.comments[0].id).toBe(
                    createResult.data.comment.id
                );
            }
        });

        it('should handle creating and deleting a comment', async () => {
            const createResponse = createMockCreateCommentResponse();
            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ createComment: createResponse })
            );

            const createResult = await service.createComment('post-1', 'Test');
            expect(createResult.status).toBe('success');

            mockClient.setMutationResponse(
                wrapInGraphQLSuccess({ deleteComment: { success: true } })
            );

            const deleteResult = await service.deleteComment('comment-1');
            expect(deleteResult.status).toBe('success');
            if (deleteResult.status === 'success') {
                expect(deleteResult.data).toBe(true);
            }
        });

        it('should handle pagination workflow', async () => {
            const firstBatch = createMockComments(50);
            const firstResponse = createMockCommentsListResponse(
                firstBatch,
                true,
                100
            );
            mockClient.setQueryResponse(
                wrapInGraphQLSuccess({ comments: firstResponse })
            );

            const firstResult = await service.getComments('post-1', 50);
            expect(firstResult.status).toBe('success');
            if (firstResult.status === 'success') {
                expect(firstResult.data.hasMore).toBe(true);
                expect(firstResult.data.nextCursor).toBe('cursor-50');

                const secondBatch = createMockComments(50);
                const secondResponse = createMockCommentsListResponse(
                    secondBatch,
                    false,
                    100
                );
                mockClient.setQueryResponse(
                    wrapInGraphQLSuccess({ comments: secondResponse })
                );

                const secondResult = await service.getComments(
                    'post-1',
                    50,
                    firstResult.data.nextCursor!
                );
                expect(secondResult.status).toBe('success');
                if (secondResult.status === 'success') {
                    expect(secondResult.data.hasMore).toBe(false);
                    expect(secondResult.data.comments).toHaveLength(50);
                }
            }
        });
    });
});
