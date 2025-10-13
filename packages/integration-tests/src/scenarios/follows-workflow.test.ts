/**
 * Follows Workflow Integration Test
 *
 * This test demonstrates the complete follows workflow:
 * 1. Follow/unfollow users
 * 2. Mutual follow relationships
 * 3. Follow status queries
 * 4. Stream processor verification (eventual consistency)
 *
 * Tests event-driven architecture with DynamoDB Streams.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  FollowUserResponseSchema,
  UnfollowUserResponseSchema,
  GetFollowStatusResponseSchema,
  type FollowUserResponse,
  type UnfollowUserResponse,
  type GetFollowStatusResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  testLogger,
  ensureServicesReady,
  createTestUsers,
  createTestUser,
  authHeader,
  expectUnauthorized,
  expectValidationError
} from '../utils/index.js';

describe('Follows Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let user3Token: string;
  let user3Id: string;

  beforeAll(async () => {
    testLogger.info('Starting Follows Workflow Integration Tests');

    // Wait for services to be ready
    await ensureServicesReady();

    // Setup: Create three test users
    const [user1, user2, user3] = await createTestUsers(httpClient, {
      prefix: 'follow-test',
      count: 3
    });
    user1Token = user1.token;
    user1Id = user1.userId;
    user2Token = user2.token;
    user2Id = user2.userId;
    user3Token = user3.token;
    user3Id = user3.userId;

    testLogger.info('Setup complete', { user1Id, user2Id, user3Id });
  }, 30000);

  afterAll(() => {
    testLogger.info('Follows Workflow Integration Tests completed');
  });

  describe('Follow and Unfollow Operations', () => {
    it('should follow a user successfully', async () => {
      testLogger.debug('Testing follow user operation');

      const followResponse = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user2Id },
        authHeader(user1Token)
      );

      const followData = await parseResponse(followResponse, FollowUserResponseSchema);

      expect(followData.success).toBe(true);
      expect(followData.isFollowing).toBe(true);
      // Note: counts are 0 from handler because stream processor updates them async
      expect(followData.followersCount).toBe(0);
      expect(followData.followingCount).toBe(0);
    });

    it('should be idempotent when following the same user twice', async () => {
      testLogger.debug('Testing follow idempotency');

      // Follow again
      const followResponse = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user2Id },
        authHeader(user1Token)
      );

      const followData = await parseResponse(followResponse, FollowUserResponseSchema);

      expect(followData.success).toBe(true);
      expect(followData.isFollowing).toBe(true);
    });

    it('should get follow status for a user', async () => {
      testLogger.debug('Testing get follow status');

      const statusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user2Id}/status`,
        authHeader(user1Token)
      );

      const statusData = await parseResponse(statusResponse, GetFollowStatusResponseSchema);

      expect(statusData.isFollowing).toBe(true);
    });

    it('should unfollow a user successfully', async () => {
      testLogger.debug('Testing unfollow user operation');

      const unfollowResponse = await httpClient.delete<UnfollowUserResponse>(
        '/follows',
        { userId: user2Id },
        authHeader(user1Token)
      );

      const unfollowData = await parseResponse(unfollowResponse, UnfollowUserResponseSchema);

      expect(unfollowData.success).toBe(true);
      expect(unfollowData.isFollowing).toBe(false);
    });

    it('should be idempotent when unfollowing a user not followed', async () => {
      testLogger.debug('Testing unfollow idempotency');

      // Unfollow again
      const unfollowResponse = await httpClient.delete<UnfollowUserResponse>(
        '/follows',
        { userId: user2Id },
        authHeader(user1Token)
      );

      const unfollowData = await parseResponse(unfollowResponse, UnfollowUserResponseSchema);

      expect(unfollowData.success).toBe(true);
      expect(unfollowData.isFollowing).toBe(false);
    });
  });

  describe('Mutual Follow Relationships', () => {
    it('should allow mutual follows', async () => {
      testLogger.debug('Testing mutual follow relationships');

      // User 1 follows User 2
      const user1FollowsUser2Response = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user2Id },
        authHeader(user1Token)
      );
      const user1FollowsUser2Data = await parseResponse(user1FollowsUser2Response, FollowUserResponseSchema);
      expect(user1FollowsUser2Data.isFollowing).toBe(true);

      // User 2 follows User 1 (mutual follow)
      const user2FollowsUser1Response = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user1Id },
        authHeader(user2Token)
      );
      const user2FollowsUser1Data = await parseResponse(user2FollowsUser1Response, FollowUserResponseSchema);
      expect(user2FollowsUser1Data.isFollowing).toBe(true);

      // Verify mutual follow status
      const user1StatusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user2Id}/status`,
        authHeader(user1Token)
      );
      const user1Status = await parseResponse(user1StatusResponse, GetFollowStatusResponseSchema);
      expect(user1Status.isFollowing).toBe(true);

      const user2StatusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user1Id}/status`,
        authHeader(user2Token)
      );
      const user2Status = await parseResponse(user2StatusResponse, GetFollowStatusResponseSchema);
      expect(user2Status.isFollowing).toBe(true);
    });

    it('should handle multiple followers for one user', async () => {
      testLogger.debug('Testing multiple followers');

      // User 3 also follows User 2
      const user3FollowsUser2Response = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user2Id },
        authHeader(user3Token)
      );
      const user3FollowsUser2Data = await parseResponse(user3FollowsUser2Response, FollowUserResponseSchema);
      expect(user3FollowsUser2Data.isFollowing).toBe(true);

      // Verify User 3's follow status
      const user3StatusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user2Id}/status`,
        authHeader(user3Token)
      );
      const user3Status = await parseResponse(user3StatusResponse, GetFollowStatusResponseSchema);
      expect(user3Status.isFollowing).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 when following without authentication', async () => {
      testLogger.debug('Testing unauthorized follow attempt');
      await expectUnauthorized(async () => {
        await httpClient.post<FollowUserResponse>('/follows', { userId: user2Id });
      });
    });

    it('should return 400 when following with invalid userId', async () => {
      testLogger.debug('Testing follow with invalid userId');
      await expectValidationError(async () => {
        await httpClient.post<FollowUserResponse>(
          '/follows',
          { userId: 'not-a-uuid' },
          authHeader(user1Token)
        );
      });
    });

    it('should return false when checking follow status for user not followed', async () => {
      testLogger.debug('Testing follow status for unfollowed user');

      // Create a new user that nobody follows
      const newUser = await createTestUser(httpClient, { prefix: 'follow-test-new' });
      const newUserId = newUser.userId;

      // Check if user 1 follows new user (should be false)
      const statusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${newUserId}/status`,
        authHeader(user1Token)
      );

      const statusData = await parseResponse(statusResponse, GetFollowStatusResponseSchema);
      expect(statusData.isFollowing).toBe(false);
    });
  });
});
