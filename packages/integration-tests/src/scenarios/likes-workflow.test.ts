/**
 * Likes Workflow Integration Test
 *
 * This test demonstrates the complete likes workflow:
 * 1. Like/unlike posts
 * 2. Multiple users liking the same post
 * 3. Like status queries
 * 4. Stream processor verification (eventual consistency)
 *
 * Tests event-driven architecture with DynamoDB Streams.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  RegisterResponseSchema,
  CreatePostResponseSchema,
  LikePostResponseSchema,
  UnlikePostResponseSchema,
  GetPostLikeStatusResponseSchema,
  GetPostResponseSchema,
  type RegisterResponse,
  type CreatePostResponse,
  type LikePostResponse,
  type UnlikePostResponse,
  type GetPostLikeStatusResponse,
  type Post
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  testEnvironment,
  environmentDetector,
  testLogger,
  delay
} from '../utils/index.js';
import {
  createRegisterRequest,
  createPostRequest
} from '../fixtures/index.js';

describe('Likes Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users and posts
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let testPostId: string;

  beforeAll(async () => {
    testLogger.info('Starting Likes Workflow Integration Tests');

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
      .withEmail(`likes-test-user1-${uniqueId1}@tamafriends.local`)
      .withUsername(`likesuser1_${uniqueId1}`)
      .withPassword('TestPassword123!')
      .build();

    const user1RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user1RegisterRequest);
    const user1RegisterData = await parseResponse(user1RegisterResponse, RegisterResponseSchema);
    user1Token = user1RegisterData.tokens!.accessToken;
    user1Id = user1RegisterData.user.id;

    // Register user 2
    const user2RegisterRequest = createRegisterRequest()
      .withEmail(`likes-test-user2-${uniqueId2}@tamafriends.local`)
      .withUsername(`likesuser2_${uniqueId2}`)
      .withPassword('TestPassword123!')
      .build();

    const user2RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user2RegisterRequest);
    const user2RegisterData = await parseResponse(user2RegisterResponse, RegisterResponseSchema);
    user2Token = user2RegisterData.tokens!.accessToken;
    user2Id = user2RegisterData.user.id;

    // Create a test post
    const postRequest = createPostRequest()
      .withCaption('Test post for likes integration')
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
    testLogger.info('Likes Workflow Integration Tests completed');
  });

  describe('Like and Unlike Operations', () => {
    it('should like a post successfully', async () => {
      testLogger.debug('Testing like post operation');

      const likeResponse = await httpClient.post<LikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const likeData = await parseResponse(likeResponse, LikePostResponseSchema);

      expect(likeData.success).toBe(true);
      expect(likeData.isLiked).toBe(true);
      // Note: likesCount is 0 from handler because stream processor updates it async
      expect(likeData.likesCount).toBe(0);
    });

    it('should be idempotent when liking the same post twice', async () => {
      testLogger.debug('Testing like idempotency');

      // Like again
      const likeResponse = await httpClient.post<LikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const likeData = await parseResponse(likeResponse, LikePostResponseSchema);

      expect(likeData.success).toBe(true);
      expect(likeData.isLiked).toBe(true);
    });

    it('should get like status for a post', async () => {
      testLogger.debug('Testing get like status');

      const statusResponse = await httpClient.get<GetPostLikeStatusResponse>(
        `/likes/${testPostId}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const statusData = await parseResponse(statusResponse, GetPostLikeStatusResponseSchema);

      expect(statusData.isLiked).toBe(true);
    });

    it('should unlike a post successfully', async () => {
      testLogger.debug('Testing unlike post operation');

      const unlikeResponse = await httpClient.delete<UnlikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const unlikeData = await parseResponse(unlikeResponse, UnlikePostResponseSchema);

      expect(unlikeData.success).toBe(true);
      expect(unlikeData.isLiked).toBe(false);
    });

    it('should be idempotent when unliking a post not liked', async () => {
      testLogger.debug('Testing unlike idempotency');

      // Unlike again
      const unlikeResponse = await httpClient.delete<UnlikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const unlikeData = await parseResponse(unlikeResponse, UnlikePostResponseSchema);

      expect(unlikeData.success).toBe(true);
      expect(unlikeData.isLiked).toBe(false);
    });
  });

  describe('Multiple Users Liking', () => {
    it('should allow multiple users to like the same post', async () => {
      testLogger.debug('Testing multiple users liking same post');

      // User 1 likes
      const user1LikeResponse = await httpClient.post<LikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const user1LikeData = await parseResponse(user1LikeResponse, LikePostResponseSchema);
      expect(user1LikeData.isLiked).toBe(true);

      // User 2 likes
      const user2LikeResponse = await httpClient.post<LikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );
      const user2LikeData = await parseResponse(user2LikeResponse, LikePostResponseSchema);
      expect(user2LikeData.isLiked).toBe(true);

      // Verify both users see they liked it
      const user1StatusResponse = await httpClient.get<GetPostLikeStatusResponse>(
        `/likes/${testPostId}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const user1Status = await parseResponse(user1StatusResponse, GetPostLikeStatusResponseSchema);
      expect(user1Status.isLiked).toBe(true);

      const user2StatusResponse = await httpClient.get<GetPostLikeStatusResponse>(
        `/likes/${testPostId}`,
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );
      const user2Status = await parseResponse(user2StatusResponse, GetPostLikeStatusResponseSchema);
      expect(user2Status.isLiked).toBe(true);
    });
  });

  describe('Stream Processor Verification', () => {
    it('should update likesCount via stream processor (eventual consistency)', async () => {
      testLogger.debug('Testing stream processor updates likesCount');

      // Wait for stream processor to update counts (~1-2 seconds)
      await delay(3000);

      // Fetch the post to verify likesCount
      const getPostResponse = await httpClient.get<{ post: Post }>(
        `/post/${testPostId}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const getPostData = await parseResponse(getPostResponse, GetPostResponseSchema);

      // Should have 2 likes (user1 and user2)
      expect(getPostData.post.likesCount).toBe(2);

      testLogger.info('Stream processor verification complete', {
        likesCount: getPostData.post.likesCount
      });
    }, 10000); // Longer timeout for stream processing
  });

  describe('Error Handling', () => {
    it('should return 401 when liking without authentication', async () => {
      testLogger.debug('Testing unauthorized like attempt');

      try {
        await httpClient.post<LikePostResponse>('/likes', { postId: testPostId });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should return 400 when liking with invalid postId', async () => {
      testLogger.debug('Testing like with invalid postId');

      try {
        await httpClient.post<LikePostResponse>(
          '/likes',
          { postId: 'not-a-uuid' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });
});
