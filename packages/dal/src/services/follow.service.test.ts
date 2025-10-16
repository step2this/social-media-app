/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FollowService, type FollowEntity } from './follow.service';
import { createMockDynamoClient, type MockDynamoClient } from '@social-media-app/shared/test-utils';

describe('FollowService', () => {
  const tableName = 'test-table';
  let mockClient: MockDynamoClient;
  let service: FollowService;

  beforeEach(() => {
    mockClient = createMockDynamoClient();
    service = new FollowService(mockClient, tableName);
  });

  describe('followUser', () => {
    it('should follow a user successfully', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      const result = await service.followUser(followerId, followeeId);

      expect(result).toEqual({
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      });

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: tableName,
            Item: expect.objectContaining({
              PK: `USER#${followerId}`,
              SK: `FOLLOW#${followeeId}`,
              GSI1PK: `USER#${followeeId}`,
              GSI1SK: `FOLLOWER#${followerId}`,
              GSI2PK: `USER#${followeeId}`,
              GSI2SK: `FOLLOW#${followerId}`,
              followerId,
              followeeId,
              entityType: 'FOLLOW'
            }),
            ConditionExpression: 'attribute_not_exists(PK)'
          })
        })
      );
    });

    it('should be idempotent when following the same user twice', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // First follow succeeds
      await service.followUser(followerId, followeeId);

      // Second follow should not throw, returns success
      const result = await service.followUser(followerId, followeeId);

      expect(result).toEqual({
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      });
    });

    it('should handle errors gracefully', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // Mock an error
      vi.spyOn(mockClient, 'send').mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.followUser(followerId, followeeId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user successfully', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // First follow the user
      await service.followUser(followerId, followeeId);

      // Then unfollow
      const result = await service.unfollowUser(followerId, followeeId);

      expect(result).toEqual({
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false
      });

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: tableName,
            Key: {
              PK: `USER#${followerId}`,
              SK: `FOLLOW#${followeeId}`
            }
          })
        })
      );
    });

    it('should be idempotent when unfollowing a user not followed', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // Unfollow without following first
      const result = await service.unfollowUser(followerId, followeeId);

      expect(result).toEqual({
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false
      });
    });

    it('should handle errors gracefully', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // Mock an error
      vi.spyOn(mockClient, 'send').mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.unfollowUser(followerId, followeeId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getFollowStatus', () => {
    it('should return true when user is following', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // Follow the user first
      await service.followUser(followerId, followeeId);

      // Check status
      const result = await service.getFollowStatus(followerId, followeeId);

      expect(result).toEqual({
        isFollowing: true,
        followersCount: 0,
        followingCount: 0
      });
    });

    it('should return false when user is not following', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      const result = await service.getFollowStatus(followerId, followeeId);

      expect(result).toEqual({
        isFollowing: false,
        followersCount: 0,
        followingCount: 0
      });
    });

    it('should handle errors gracefully', async () => {
      const followerId = 'user-123';
      const followeeId = 'user-456';

      // Mock an error
      vi.spyOn(mockClient, 'send').mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.getFollowStatus(followerId, followeeId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getFollowingList', () => {
    it('should return empty array when user is not following anyone', async () => {
      const userId = 'user-123';

      const result = await service.getFollowingList(userId);

      expect(result).toEqual([]);
    });

    it('should return list of followee IDs', async () => {
      const followerId = 'user-123';
      const followeeId1 = 'user-456';
      const followeeId2 = 'user-789';
      const followeeId3 = 'user-abc';

      // Follow multiple users
      await service.followUser(followerId, followeeId1);
      await service.followUser(followerId, followeeId2);
      await service.followUser(followerId, followeeId3);

      // Get following list
      const result = await service.getFollowingList(followerId);

      expect(result).toEqual(
        expect.arrayContaining([followeeId1, followeeId2, followeeId3])
      );
      expect(result).toHaveLength(3);
    });

    it('should only return followees for the specific user', async () => {
      const followerId1 = 'user-123';
      const followerId2 = 'user-999';
      const followeeId1 = 'user-456';
      const followeeId2 = 'user-789';

      // User 1 follows user 456
      await service.followUser(followerId1, followeeId1);
      // User 2 follows user 789
      await service.followUser(followerId2, followeeId2);

      // Get following list for user 1
      const result = await service.getFollowingList(followerId1);

      expect(result).toEqual([followeeId1]);
      expect(result).not.toContain(followeeId2);
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';

      // Mock an error
      vi.spyOn(mockClient, 'send').mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.getFollowingList(userId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getFollowerCount', () => {
    it('should return 0 when user has no followers', async () => {
      const userId = 'user-123';

      const result = await service.getFollowerCount(userId);

      expect(result).toBe(0);
    });

    it('should return correct follower count', async () => {
      const userId = 'user-456';
      const followerId1 = 'user-123';
      const followerId2 = 'user-789';
      const followerId3 = 'user-abc';

      // Create followers
      await service.followUser(followerId1, userId);
      await service.followUser(followerId2, userId);
      await service.followUser(followerId3, userId);

      // Get follower count
      const result = await service.getFollowerCount(userId);

      expect(result).toBe(3);
    });

    it('should only count followers for the specific user', async () => {
      const userId1 = 'user-456';
      const userId2 = 'user-999';
      const followerId1 = 'user-123';
      const followerId2 = 'user-789';

      // User 123 follows user 456
      await service.followUser(followerId1, userId1);
      // User 789 follows user 999
      await service.followUser(followerId2, userId2);

      // Get follower count for user 456
      const result = await service.getFollowerCount(userId1);

      expect(result).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';

      // Mock an error
      vi.spyOn(mockClient, 'send').mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.getFollowerCount(userId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getAllFollowers', () => {
    it('should return empty array when user has no followers', async () => {
      const userId = 'user-123';

      const result = await service.getAllFollowers(userId);

      expect(result).toEqual([]);
    });

    it('should return list of follower IDs', async () => {
      const userId = 'user-456';
      const followerId1 = 'user-123';
      const followerId2 = 'user-789';
      const followerId3 = 'user-abc';

      // Create followers
      await service.followUser(followerId1, userId);
      await service.followUser(followerId2, userId);
      await service.followUser(followerId3, userId);

      // Get all followers
      const result = await service.getAllFollowers(userId);

      expect(result).toEqual(
        expect.arrayContaining([followerId1, followerId2, followerId3])
      );
      expect(result).toHaveLength(3);
    });

    it('should only return followers for the specific user', async () => {
      const userId1 = 'user-456';
      const userId2 = 'user-999';
      const followerId1 = 'user-123';
      const followerId2 = 'user-789';

      // User 123 follows user 456
      await service.followUser(followerId1, userId1);
      // User 789 follows user 999
      await service.followUser(followerId2, userId2);

      // Get followers for user 456
      const result = await service.getAllFollowers(userId1);

      expect(result).toEqual([followerId1]);
      expect(result).not.toContain(followerId2);
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';

      // Mock an error
      vi.spyOn(mockClient, 'send').mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.getAllFollowers(userId)).rejects.toThrow('DynamoDB error');
    });
  });
});
