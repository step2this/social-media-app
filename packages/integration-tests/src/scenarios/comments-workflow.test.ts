/**
 * Comments Workflow Integration Test
 *
 * This test demonstrates the complete comments workflow:
 * 1. Create comments on posts
 * 2. Retrieve comments for a post
 * 3. Delete comments (owner only)
 * 4. Authorization and validation
 * 5. Stream processor verification (eventual consistency)
 *
 * Tests event-driven architecture with DynamoDB Streams for commentsCount updates.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  CreateCommentResponseSchema,
  DeleteCommentResponseSchema,
  CommentsListResponseSchema,
  PostResponseSchema,
  type CreateCommentResponse,
  type DeleteCommentResponse,
  type CommentsListResponse,
  type PostResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  testLogger,
  delay,
  ensureServicesReady,
  createTestUsers,
  createTestPost,
  authHeader,
  expectUnauthorized,
  expectValidationError,
  STREAM_DELAY
} from '../utils/index.js';

describe('Comments Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users and posts
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let testPostId: string;
  let comment1Id: string;
  let comment2Id: string;

  beforeAll(async () => {
    testLogger.info('Starting Comments Workflow Integration Tests');

    // Service readiness check
    await ensureServicesReady();

    // Create two test users
    const [user1, user2] = await createTestUsers(httpClient, {
      prefix: 'comments-test',
      count: 2
    });
    user1Token = user1.token;
    user1Id = user1.userId;
    user2Token = user2.token;
    user2Id = user2.userId;

    // Create a test post
    const { postId } = await createTestPost(httpClient, user1.token, {
      caption: 'Test post for comments integration'
    });
    testPostId = postId;

    testLogger.info('Setup complete', { user1Id, user2Id, testPostId });
  }, 30000);

  afterAll(() => {
    testLogger.info('Comments Workflow Integration Tests completed');
  });

  describe('Create and Retrieve Comments', () => {
    it('should create a comment on a post successfully', async () => {
      testLogger.debug('Testing create comment operation');

      const createResponse = await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: 'This is a great post!' },
        authHeader(user1Token)
      );

      const createData = await parseResponse(createResponse, CreateCommentResponseSchema);

      expect(createData.comment).toBeDefined();
      expect(createData.comment.postId).toBe(testPostId);
      expect(createData.comment.userId).toBe(user1Id);
      expect(createData.comment.content).toBe('This is a great post!');
      expect(createData.comment.id).toBeDefined();
      expect(createData.comment.createdAt).toBeDefined();
      // Note: commentsCount is 0 from handler because stream processor updates it async
      expect(createData.commentsCount).toBe(0);

      // Save for later tests
      comment1Id = createData.comment.id;
    });

    it('should create a second comment by different user', async () => {
      testLogger.debug('Testing second comment creation by different user');

      const createResponse = await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: 'I agree, amazing content!' },
        authHeader(user2Token)
      );

      const createData = await parseResponse(createResponse, CreateCommentResponseSchema);

      expect(createData.comment).toBeDefined();
      expect(createData.comment.postId).toBe(testPostId);
      expect(createData.comment.userId).toBe(user2Id);
      expect(createData.comment.content).toBe('I agree, amazing content!');
      expect(createData.comment.id).toBeDefined();

      // Save for later tests
      comment2Id = createData.comment.id;
    });

    it('should retrieve all comments for a post', async () => {
      testLogger.debug('Testing get comments operation');

      const getResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${testPostId}`
      );

      const getData = await parseResponse(getResponse, CommentsListResponseSchema);

      expect(getData.comments).toBeDefined();
      expect(getData.comments.length).toBe(2);
      expect(getData.totalCount).toBe(2);

      // Verify comments are returned in correct order (newest first)
      expect(getData.comments[0].id).toBe(comment2Id);
      expect(getData.comments[1].id).toBe(comment1Id);

      // Verify comment data
      expect(getData.comments[0].content).toBe('I agree, amazing content!');
      expect(getData.comments[1].content).toBe('This is a great post!');
    });

    it('should respect pagination limit', async () => {
      testLogger.debug('Testing pagination limit');

      const getResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${testPostId}&limit=1`
      );

      const getData = await parseResponse(getResponse, CommentsListResponseSchema);

      expect(getData.comments).toBeDefined();
      expect(getData.comments.length).toBe(1);
      expect(getData.totalCount).toBe(2); // comment1 + comment2 (validation tests haven't run yet)

      // Should return newest comment first
      expect(getData.comments[0].id).toBe(comment2Id);

      // Verify pagination metadata
      expect(getData.hasMore).toBe(true);
      expect(getData.nextCursor).toBeDefined();
    });

    it('should support pagination with cursor', async () => {
      testLogger.debug('Testing pagination with cursor');

      // Get first page
      const firstPageResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${testPostId}&limit=1`
      );
      const firstPageData = await parseResponse(firstPageResponse, CommentsListResponseSchema);

      expect(firstPageData.hasMore).toBe(true);
      expect(firstPageData.nextCursor).toBeDefined();

      // Get second page
      const secondPageResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${testPostId}&limit=1&cursor=${firstPageData.nextCursor}`
      );
      const secondPageData = await parseResponse(secondPageResponse, CommentsListResponseSchema);

      expect(secondPageData.comments.length).toBe(1);
      expect(secondPageData.comments[0].id).toBe(comment1Id);
      expect(secondPageData.hasMore).toBe(false); // No more comments at this point (validation tests haven't run yet)
    });

    it('should return empty array for post with no comments', async () => {
      testLogger.debug('Testing get comments for post with no comments');

      // Create new post without comments
      const { postId: emptyPostId } = await createTestPost(httpClient, user1Token, {
        caption: 'Post without comments'
      });

      // Get comments
      const getResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${emptyPostId}`
      );

      const getData = await parseResponse(getResponse, CommentsListResponseSchema);

      expect(getData.comments).toBeDefined();
      expect(getData.comments.length).toBe(0);
      expect(getData.totalCount).toBe(0);
      expect(getData.hasMore).toBe(false);
    });
  });

  describe('Comment Validation', () => {
    it('should reject empty comment content', async () => {
      testLogger.debug('Testing empty comment content validation');

      await expectValidationError(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: '' },
          authHeader(user1Token)
        );
      });
    });

    it('should reject comment exceeding 500 characters', async () => {
      testLogger.debug('Testing comment length validation');

      const longContent = 'a'.repeat(501);

      await expectValidationError(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: longContent },
          authHeader(user1Token)
        );
      });
    });

    it('should trim whitespace from comment content', async () => {
      testLogger.debug('Testing whitespace trimming');

      const createResponse = await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: '  hello  ' },
        authHeader(user1Token)
      );

      const createData = await parseResponse(createResponse, CreateCommentResponseSchema);

      expect(createData.comment.content).toBe('hello');
    });

    it('should reject comment with only whitespace', async () => {
      testLogger.debug('Testing whitespace-only comment validation');

      await expectValidationError(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: '   ' },
          authHeader(user1Token)
        );
      });
    });

    it('should reject comment with invalid postId', async () => {
      testLogger.debug('Testing invalid postId validation');

      await expectValidationError(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: 'not-a-uuid', content: 'Test comment' },
          authHeader(user1Token)
        );
      });
    });
  });

  describe('Delete Comments', () => {
    it('should delete own comment successfully', async () => {
      testLogger.debug('Testing delete own comment');

      const deleteResponse = await httpClient.delete<DeleteCommentResponse>(
        '/comments',
        { commentId: comment1Id },
        authHeader(user1Token)
      );

      const deleteData = await parseResponse(deleteResponse, DeleteCommentResponseSchema);

      expect(deleteData.success).toBe(true);
    });

    it('should return 403 when non-owner tries to delete', async () => {
      testLogger.debug('Testing delete non-owned comment');

      try {
        await httpClient.delete<DeleteCommentResponse>(
          '/comments',
          { commentId: comment2Id },
          authHeader(user1Token)
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });

    it('should be idempotent when deleting non-existent comment', async () => {
      testLogger.debug('Testing delete idempotency');

      // Delete comment1 again (already deleted)
      const deleteResponse = await httpClient.delete<DeleteCommentResponse>(
        '/comments',
        { commentId: comment1Id },
        authHeader(user1Token)
      );

      const deleteData = await parseResponse(deleteResponse, DeleteCommentResponseSchema);

      // Should still return success (idempotent)
      expect(deleteData.success).toBe(true);
    });

    it('should verify comment is removed from list', async () => {
      testLogger.debug('Testing comment removed from list');

      const getResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${testPostId}`
      );

      const getData = await parseResponse(getResponse, CommentsListResponseSchema);

      expect(getData.comments).toBeDefined();
      expect(getData.comments.length).toBe(2); // comment2 + 'hello' from validation tests
      expect(getData.totalCount).toBe(2); // correct total count

      // comment1 should not be in list (deleted)
      expect(getData.comments.find(c => c.id === comment1Id)).toBeUndefined();

      // comment2 should still be there
      expect(getData.comments.find(c => c.id === comment2Id)).toBeDefined();

      // 'hello' comment from validation tests should also be there
      expect(getData.comments.find(c => c.content === 'hello')).toBeDefined();
    });

    it('should return 400 when deleting with invalid commentId', async () => {
      testLogger.debug('Testing delete with invalid commentId');

      await expectValidationError(async () => {
        await httpClient.delete<DeleteCommentResponse>(
          '/comments',
          { commentId: 'not-a-uuid' },
          authHeader(user1Token)
        );
      });
    });
  });

  describe('Stream Processor Verification', () => {
    it('should increment commentsCount after creating comment', async () => {
      testLogger.debug('Testing stream processor increment');

      // Create a new comment
      await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: 'Testing count increment' },
        authHeader(user1Token)
      );

      // Wait for stream processor to update the count
      testLogger.info('Waiting 3 seconds for stream processor to update commentsCount');
      await delay(STREAM_DELAY);

      // Get post and verify commentsCount increased
      const getPostResponse = await httpClient.get<PostResponse>(
        `/posts/${testPostId}`,
        authHeader(user1Token)
      );

      const postData = await parseResponse(getPostResponse, PostResponseSchema);

      // Should have 2 comments now (comment2 + new comment)
      expect(postData.post.commentsCount).toBeGreaterThanOrEqual(2);
    });

    it('should decrement commentsCount after deleting comment', async () => {
      testLogger.debug('Testing stream processor decrement');

      // Get initial count
      const initialPostResponse = await httpClient.get<PostResponse>(
        `/posts/${testPostId}`,
        authHeader(user1Token)
      );
      const initialPostData = await parseResponse(initialPostResponse, PostResponseSchema);
      const initialCount = initialPostData.post.commentsCount ?? 0;

      // Delete comment2
      await httpClient.delete<DeleteCommentResponse>(
        '/comments',
        { commentId: comment2Id },
        authHeader(user2Token)
      );

      // Wait for stream processor to update the count
      testLogger.info('Waiting 3 seconds for stream processor to update commentsCount');
      await delay(STREAM_DELAY);

      // Get post and verify commentsCount decreased
      const finalPostResponse = await httpClient.get<PostResponse>(
        `/posts/${testPostId}`,
        authHeader(user1Token)
      );

      const finalPostData = await parseResponse(finalPostResponse, PostResponseSchema);

      // Count should have decreased
      expect(finalPostData.post.commentsCount ?? 0).toBeLessThan(initialCount);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for creating comments', async () => {
      testLogger.debug('Testing authentication requirement for create');

      await expectUnauthorized(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: 'Unauthorized comment' }
        );
      });
    });

    it('should require authentication for deleting comments', async () => {
      testLogger.debug('Testing authentication requirement for delete');

      await expectUnauthorized(async () => {
        await httpClient.delete<DeleteCommentResponse>(
          '/comments',
          { commentId: comment1Id }
        );
      });
    });

    it('should allow unauthenticated access to get comments', async () => {
      testLogger.debug('Testing public access to get comments');

      // Should succeed without authentication
      const getResponse = await httpClient.get<CommentsListResponse>(
        `/comments?postId=${testPostId}`
      );

      const getData = await parseResponse(getResponse, CommentsListResponseSchema);

      expect(getData.comments).toBeDefined();
      expect(getResponse.status).toBe(200);
    });

    it('should reject invalid Bearer token', async () => {
      testLogger.debug('Testing invalid Bearer token');

      await expectUnauthorized(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: 'Test comment' },
          { headers: { Authorization: 'Bearer invalid-token' } }
        );
      });
    });

    it('should reject malformed Authorization header', async () => {
      testLogger.debug('Testing malformed Authorization header');

      await expectUnauthorized(async () => {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: 'Test comment' },
          { headers: { Authorization: 'NotBearer token' } }
        );
      });
    });
  });
});
