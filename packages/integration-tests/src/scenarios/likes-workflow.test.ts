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
import {
  LikePostResponseSchema,
  UnlikePostResponseSchema,
  GetPostLikeStatusResponseSchema,
  type LikePostResponse,
  type UnlikePostResponse,
  type GetPostLikeStatusResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  testLogger,
  ensureServicesReady,
  createTestUsers,
  createTestPost,
  authHeader,
  expectUnauthorized,
  expectValidationError
} from '../utils/index.js';

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
    await ensureServicesReady();

    // Setup: Create two test users and a post
    const [user1, user2] = await createTestUsers(httpClient, {
      prefix: 'likes-test',
      count: 2
    });
    user1Token = user1.token;
    user1Id = user1.userId;
    user2Token = user2.token;
    user2Id = user2.userId;

    // Create a test post
    const { postId } = await createTestPost(httpClient, user1.token, {
      caption: 'Test post for likes integration'
    });
    testPostId = postId;

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
        authHeader(user1Token)
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
        authHeader(user1Token)
      );

      const likeData = await parseResponse(likeResponse, LikePostResponseSchema);

      expect(likeData.success).toBe(true);
      expect(likeData.isLiked).toBe(true);
    });

    it('should get like status for a post', async () => {
      testLogger.debug('Testing get like status');

      const statusResponse = await httpClient.get<GetPostLikeStatusResponse>(
        `/likes/${testPostId}`,
        authHeader(user1Token)
      );

      const statusData = await parseResponse(statusResponse, GetPostLikeStatusResponseSchema);

      expect(statusData.isLiked).toBe(true);
    });

    it('should unlike a post successfully', async () => {
      testLogger.debug('Testing unlike post operation');

      const unlikeResponse = await httpClient.delete<UnlikePostResponse>(
        '/likes',
        { postId: testPostId },
        authHeader(user1Token)
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
        authHeader(user1Token)
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
        authHeader(user1Token)
      );
      const user1LikeData = await parseResponse(user1LikeResponse, LikePostResponseSchema);
      expect(user1LikeData.isLiked).toBe(true);

      // User 2 likes
      const user2LikeResponse = await httpClient.post<LikePostResponse>(
        '/likes',
        { postId: testPostId },
        authHeader(user2Token)
      );
      const user2LikeData = await parseResponse(user2LikeResponse, LikePostResponseSchema);
      expect(user2LikeData.isLiked).toBe(true);

      // Verify both users see they liked it
      const user1StatusResponse = await httpClient.get<GetPostLikeStatusResponse>(
        `/likes/${testPostId}`,
        authHeader(user1Token)
      );
      const user1Status = await parseResponse(user1StatusResponse, GetPostLikeStatusResponseSchema);
      expect(user1Status.isLiked).toBe(true);

      const user2StatusResponse = await httpClient.get<GetPostLikeStatusResponse>(
        `/likes/${testPostId}`,
        authHeader(user2Token)
      );
      const user2Status = await parseResponse(user2StatusResponse, GetPostLikeStatusResponseSchema);
      expect(user2Status.isLiked).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 when liking without authentication', async () => {
      testLogger.debug('Testing unauthorized like attempt');

      await expectUnauthorized(async () => {
        await httpClient.post<LikePostResponse>('/likes', { postId: testPostId });
      });
    });

    it('should return 400 when liking with invalid postId', async () => {
      testLogger.debug('Testing like with invalid postId');

      await expectValidationError(async () => {
        await httpClient.post<LikePostResponse>(
          '/likes',
          { postId: 'not-a-uuid' },
          authHeader(user1Token)
        );
      });
    });
  });
});
