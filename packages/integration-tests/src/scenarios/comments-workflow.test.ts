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
import { randomUUID } from 'crypto';
import {
  RegisterResponseSchema,
  CreatePostResponseSchema,
  CreateCommentResponseSchema,
  DeleteCommentResponseSchema,
  CommentsListResponseSchema,
  PostResponseSchema,
  type RegisterResponse,
  type CreatePostResponse,
  type CreateCommentResponse,
  type DeleteCommentResponse,
  type CommentsListResponse,
  type PostResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  environmentDetector,
  testLogger,
  delay
} from '../utils/index.js';
import {
  createRegisterRequest,
  createPostRequest
} from '../fixtures/index.js';

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

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify environment configuration
    const serviceUrls = environmentDetector.getServiceUrls();
    testLogger.debug('Service URLs:', serviceUrls);

    // Verify services are available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady) {
      throw new Error('LocalStack is not available. Please start LocalStack before running integration tests.');
    }

    if (!apiReady) {
      throw new Error('API server is not available. Please start the backend server before running integration tests.');
    }

    testLogger.info('All required services are ready');

    // Setup: Create two test users and a post
    const uniqueId1 = randomUUID().slice(0, 8);
    const uniqueId2 = randomUUID().slice(0, 8);

    // Register user 1
    const user1RegisterRequest = createRegisterRequest()
      .withEmail(`comments-test-user1-${uniqueId1}@tamafriends.local`)
      .withUsername(`commentsuser1_${uniqueId1}`)
      .withPassword('TestPassword123!')
      .build();

    const user1RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user1RegisterRequest);
    const user1RegisterData = await parseResponse(user1RegisterResponse, RegisterResponseSchema);
    user1Token = user1RegisterData.tokens!.accessToken;
    user1Id = user1RegisterData.user.id;

    // Register user 2
    const user2RegisterRequest = createRegisterRequest()
      .withEmail(`comments-test-user2-${uniqueId2}@tamafriends.local`)
      .withUsername(`commentsuser2_${uniqueId2}`)
      .withPassword('TestPassword123!')
      .build();

    const user2RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user2RegisterRequest);
    const user2RegisterData = await parseResponse(user2RegisterResponse, RegisterResponseSchema);
    user2Token = user2RegisterData.tokens!.accessToken;
    user2Id = user2RegisterData.user.id;

    // Create a test post
    const postRequest = createPostRequest()
      .withCaption('Test post for comments integration')
      .build();

    const createPostResponse = await httpClient.post<CreatePostResponse>(
      '/posts',
      postRequest,
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    const createPostData = await parseResponse(createPostResponse, CreatePostResponseSchema);
    testPostId = createPostData.post.id;

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
        { headers: { Authorization: `Bearer ${user1Token}` } }
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
        { headers: { Authorization: `Bearer ${user2Token}` } }
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
      const postRequest = createPostRequest()
        .withCaption('Post without comments')
        .build();

      const createPostResponse = await httpClient.post<CreatePostResponse>(
        '/posts',
        postRequest,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const createPostData = await parseResponse(createPostResponse, CreatePostResponseSchema);
      const emptyPostId = createPostData.post.id;

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

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: '' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should reject comment exceeding 500 characters', async () => {
      testLogger.debug('Testing comment length validation');

      const longContent = 'a'.repeat(501);

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: longContent },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should trim whitespace from comment content', async () => {
      testLogger.debug('Testing whitespace trimming');

      const createResponse = await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: '  hello  ' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const createData = await parseResponse(createResponse, CreateCommentResponseSchema);

      expect(createData.comment.content).toBe('hello');
    });

    it('should reject comment with only whitespace', async () => {
      testLogger.debug('Testing whitespace-only comment validation');

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: '   ' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should reject comment with invalid postId', async () => {
      testLogger.debug('Testing invalid postId validation');

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: 'not-a-uuid', content: 'Test comment' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('Delete Comments', () => {
    it('should delete own comment successfully', async () => {
      testLogger.debug('Testing delete own comment');

      const deleteResponse = await httpClient.delete<DeleteCommentResponse>(
        '/comments',
        { commentId: comment1Id },
        { headers: { Authorization: `Bearer ${user1Token}` } }
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
          { headers: { Authorization: `Bearer ${user1Token}` } }
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
        { headers: { Authorization: `Bearer ${user1Token}` } }
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

      try {
        await httpClient.delete<DeleteCommentResponse>(
          '/comments',
          { commentId: 'not-a-uuid' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('Stream Processor Verification', () => {
    it('should increment commentsCount after creating comment', async () => {
      testLogger.debug('Testing stream processor increment');

      // Create a new comment
      await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: 'Testing count increment' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      // Wait for stream processor to update the count
      testLogger.info('Waiting 3 seconds for stream processor to update commentsCount');
      await delay(3000);

      // Get post and verify commentsCount increased
      const getPostResponse = await httpClient.get<PostResponse>(
        `/posts/${testPostId}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
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
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const initialPostData = await parseResponse(initialPostResponse, PostResponseSchema);
      const initialCount = initialPostData.post.commentsCount ?? 0;

      // Delete comment2
      await httpClient.delete<DeleteCommentResponse>(
        '/comments',
        { commentId: comment2Id },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      // Wait for stream processor to update the count
      testLogger.info('Waiting 3 seconds for stream processor to update commentsCount');
      await delay(3000);

      // Get post and verify commentsCount decreased
      const finalPostResponse = await httpClient.get<PostResponse>(
        `/posts/${testPostId}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const finalPostData = await parseResponse(finalPostResponse, PostResponseSchema);

      // Count should have decreased
      expect(finalPostData.post.commentsCount ?? 0).toBeLessThan(initialCount);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for creating comments', async () => {
      testLogger.debug('Testing authentication requirement for create');

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: 'Unauthorized comment' }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should require authentication for deleting comments', async () => {
      testLogger.debug('Testing authentication requirement for delete');

      try {
        await httpClient.delete<DeleteCommentResponse>(
          '/comments',
          { commentId: comment1Id }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
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

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: 'Test comment' },
          { headers: { Authorization: 'Bearer invalid-token' } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should reject malformed Authorization header', async () => {
      testLogger.debug('Testing malformed Authorization header');

      try {
        await httpClient.post<CreateCommentResponse>(
          '/comments',
          { postId: testPostId, content: 'Test comment' },
          { headers: { Authorization: 'NotBearer token' } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });
  });
});
