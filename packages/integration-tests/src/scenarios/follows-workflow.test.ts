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
import { randomUUID } from 'crypto';
import {
  RegisterResponseSchema,
  ProfileResponseSchema,
  FollowUserResponseSchema,
  UnfollowUserResponseSchema,
  GetFollowStatusResponseSchema,
  type RegisterResponse,
  type Profile,
  type FollowUserResponse,
  type UnfollowUserResponse,
  type GetFollowStatusResponse
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
  createRegisterRequest
} from '../fixtures/index.js';

describe('Follows Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users
  let user1Token: string;
  let user1Id: string;
  let user1Handle: string;
  let user2Token: string;
  let user2Id: string;
  let user2Handle: string;
  let user3Token: string;
  let user3Id: string;
  let user3Handle: string;

  beforeAll(async () => {
    testLogger.info('Starting Follows Workflow Integration Tests');

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

    // Setup: Create three test users
    const uniqueId1 = randomUUID().slice(0, 8);
    const uniqueId2 = randomUUID().slice(0, 8);
    const uniqueId3 = randomUUID().slice(0, 8);

    // Register user 1
    const user1RegisterRequest = createRegisterRequest()
      .withEmail(`follow-test-user1-${uniqueId1}@tamafriends.local`)
      .withUsername(`followuser1_${uniqueId1}`)
      .withPassword('TestPassword123!')
      .build();

    const user1RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user1RegisterRequest);
    const user1RegisterData = await parseResponse(user1RegisterResponse, RegisterResponseSchema);
    user1Token = user1RegisterData.tokens!.accessToken;
    user1Id = user1RegisterData.user.id;

    // Get user 1 profile to get handle
    const user1ProfileResponse = await httpClient.get<{ profile: Profile }>(
      '/profile/me',
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    const user1ProfileData = await parseResponse(user1ProfileResponse, ProfileResponseSchema);
    user1Handle = user1ProfileData.profile.handle;

    // Register user 2
    const user2RegisterRequest = createRegisterRequest()
      .withEmail(`follow-test-user2-${uniqueId2}@tamafriends.local`)
      .withUsername(`followuser2_${uniqueId2}`)
      .withPassword('TestPassword123!')
      .build();

    const user2RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user2RegisterRequest);
    const user2RegisterData = await parseResponse(user2RegisterResponse, RegisterResponseSchema);
    user2Token = user2RegisterData.tokens!.accessToken;
    user2Id = user2RegisterData.user.id;

    // Get user 2 profile to get handle
    const user2ProfileResponse = await httpClient.get<{ profile: Profile }>(
      '/profile/me',
      { headers: { Authorization: `Bearer ${user2Token}` } }
    );
    const user2ProfileData = await parseResponse(user2ProfileResponse, ProfileResponseSchema);
    user2Handle = user2ProfileData.profile.handle;

    // Register user 3
    const user3RegisterRequest = createRegisterRequest()
      .withEmail(`follow-test-user3-${uniqueId3}@tamafriends.local`)
      .withUsername(`followuser3_${uniqueId3}`)
      .withPassword('TestPassword123!')
      .build();

    const user3RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user3RegisterRequest);
    const user3RegisterData = await parseResponse(user3RegisterResponse, RegisterResponseSchema);
    user3Token = user3RegisterData.tokens!.accessToken;
    user3Id = user3RegisterData.user.id;

    // Get user 3 profile to get handle
    const user3ProfileResponse = await httpClient.get<{ profile: Profile }>(
      '/profile/me',
      { headers: { Authorization: `Bearer ${user3Token}` } }
    );
    const user3ProfileData = await parseResponse(user3ProfileResponse, ProfileResponseSchema);
    user3Handle = user3ProfileData.profile.handle;

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
        { headers: { Authorization: `Bearer ${user1Token}` } }
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
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const followData = await parseResponse(followResponse, FollowUserResponseSchema);

      expect(followData.success).toBe(true);
      expect(followData.isFollowing).toBe(true);
    });

    it('should get follow status for a user', async () => {
      testLogger.debug('Testing get follow status');

      const statusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user2Id}/status`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const statusData = await parseResponse(statusResponse, GetFollowStatusResponseSchema);

      expect(statusData.isFollowing).toBe(true);
    });

    it('should unfollow a user successfully', async () => {
      testLogger.debug('Testing unfollow user operation');

      const unfollowResponse = await httpClient.delete<UnfollowUserResponse>(
        '/follows',
        { userId: user2Id },
        { headers: { Authorization: `Bearer ${user1Token}` } }
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
        { headers: { Authorization: `Bearer ${user1Token}` } }
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
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const user1FollowsUser2Data = await parseResponse(user1FollowsUser2Response, FollowUserResponseSchema);
      expect(user1FollowsUser2Data.isFollowing).toBe(true);

      // User 2 follows User 1 (mutual follow)
      const user2FollowsUser1Response = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user1Id },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );
      const user2FollowsUser1Data = await parseResponse(user2FollowsUser1Response, FollowUserResponseSchema);
      expect(user2FollowsUser1Data.isFollowing).toBe(true);

      // Verify mutual follow status
      const user1StatusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user2Id}/status`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const user1Status = await parseResponse(user1StatusResponse, GetFollowStatusResponseSchema);
      expect(user1Status.isFollowing).toBe(true);

      const user2StatusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user1Id}/status`,
        { headers: { Authorization: `Bearer ${user2Token}` } }
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
        { headers: { Authorization: `Bearer ${user3Token}` } }
      );
      const user3FollowsUser2Data = await parseResponse(user3FollowsUser2Response, FollowUserResponseSchema);
      expect(user3FollowsUser2Data.isFollowing).toBe(true);

      // Verify User 3's follow status
      const user3StatusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${user2Id}/status`,
        { headers: { Authorization: `Bearer ${user3Token}` } }
      );
      const user3Status = await parseResponse(user3StatusResponse, GetFollowStatusResponseSchema);
      expect(user3Status.isFollowing).toBe(true);
    });
  });

  describe('Stream Processor Verification', () => {
    it('should update followersCount and followingCount via stream processor (eventual consistency)', async () => {
      testLogger.debug('Testing stream processor updates follow counts');

      // Wait for stream processor to update counts (~1-2 seconds)
      await delay(3000);

      // Fetch User 2's profile to verify followersCount
      // User 2 should have 2 followers (User 1 and User 3)
      const user2ProfileResponse = await httpClient.get<{ profile: Profile }>(
        `/profile/${user2Handle}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const user2ProfileData = await parseResponse(user2ProfileResponse, ProfileResponseSchema);
      expect(user2ProfileData.profile.followersCount).toBe(2);

      // User 2 should have 1 following (User 1)
      expect(user2ProfileData.profile.followingCount).toBe(1);

      // Fetch User 1's profile to verify counts
      // User 1 should have 1 follower (User 2)
      const user1ProfileResponse = await httpClient.get<{ profile: Profile }>(
        `/profile/${user1Handle}`,
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );
      const user1ProfileData = await parseResponse(user1ProfileResponse, ProfileResponseSchema);
      expect(user1ProfileData.profile.followersCount).toBe(1);

      // User 1 should have 1 following (User 2)
      expect(user1ProfileData.profile.followingCount).toBe(1);

      testLogger.info('Stream processor verification complete', {
        user2FollowersCount: user2ProfileData.profile.followersCount,
        user2FollowingCount: user2ProfileData.profile.followingCount,
        user1FollowersCount: user1ProfileData.profile.followersCount,
        user1FollowingCount: user1ProfileData.profile.followingCount
      });
    }, 10000); // Longer timeout for stream processing
  });

  describe('Error Handling', () => {
    it('should return 401 when following without authentication', async () => {
      testLogger.debug('Testing unauthorized follow attempt');

      try {
        await httpClient.post<FollowUserResponse>('/follows', { userId: user2Id });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should return 400 when following with invalid userId', async () => {
      testLogger.debug('Testing follow with invalid userId');

      try {
        await httpClient.post<FollowUserResponse>(
          '/follows',
          { userId: 'not-a-uuid' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should return false when checking follow status for user not followed', async () => {
      testLogger.debug('Testing follow status for unfollowed user');

      // Create a new user that nobody follows
      const uniqueId = randomUUID().slice(0, 8);
      const newUserRegisterRequest = createRegisterRequest()
        .withEmail(`follow-test-new-${uniqueId}@tamafriends.local`)
        .withUsername(`newuser_${uniqueId}`)
        .withPassword('TestPassword123!')
        .build();

      const newUserRegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', newUserRegisterRequest);
      const newUserRegisterData = await parseResponse(newUserRegisterResponse, RegisterResponseSchema);
      const newUserId = newUserRegisterData.user.id;

      // Check if user 1 follows new user (should be false)
      const statusResponse = await httpClient.get<GetFollowStatusResponse>(
        `/follows/${newUserId}/status`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const statusData = await parseResponse(statusResponse, GetFollowStatusResponseSchema);
      expect(statusData.isFollowing).toBe(false);
    });
  });
});
