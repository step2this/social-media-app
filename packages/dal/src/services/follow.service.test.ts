/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FollowService, type FollowEntity } from './follow.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

interface MockDynamoCommand {
  readonly constructor: { readonly name: string };
  readonly input: {
    readonly TableName?: string;
    readonly Item?: Record<string, unknown>;
    readonly Key?: Record<string, unknown>;
    readonly ConditionExpression?: string;
    readonly UpdateExpression?: string;
    readonly ExpressionAttributeValues?: Record<string, unknown>;
    readonly ReturnValues?: string;
  };
}

// Mock DynamoDB client
const createMockDynamoClient = () => {
  const items = new Map<string, Record<string, unknown>>();

  const handlePutCommand = (command: MockDynamoCommand) => {
    const item = command.input.Item!;
    const key = `${item.PK}#${item.SK}`;

    // Check condition expression for duplicate prevention
    if (command.input.ConditionExpression === 'attribute_not_exists(PK)' && items.has(key)) {
      const error: any = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      error.__type = 'ConditionalCheckFailedException';
      throw error;
    }

    items.set(key, item);
    return { $metadata: {} };
  };

  const handleGetCommand = (command: MockDynamoCommand) => {
    const key = `${command.input.Key!.PK}#${command.input.Key!.SK}`;
    const item = items.get(key);
    return { Item: item, $metadata: {} };
  };

  const handleDeleteCommand = (command: MockDynamoCommand) => {
    const key = `${command.input.Key!.PK}#${command.input.Key!.SK}`;
    items.delete(key);
    return { $metadata: {} };
  };

  const handleQueryCommand = (command: MockDynamoCommand) => {
    const results: Record<string, unknown>[] = [];
    const pkValue = command.input.ExpressionAttributeValues?.[':pk'] as string;
    const skPrefix = command.input.ExpressionAttributeValues?.[':sk'] as string;

    // Filter items by PK and SK prefix
    for (const [key, item] of items.entries()) {
      if (item.PK === pkValue && typeof item.SK === 'string' && item.SK.startsWith(skPrefix)) {
        results.push(item);
      }
    }

    return { Items: results, $metadata: {} };
  };

  const send = vi.fn((command: MockDynamoCommand) => {
    const commandName = command.constructor.name;

    switch (commandName) {
      case 'PutCommand':
        return Promise.resolve(handlePutCommand(command));
      case 'GetCommand':
        return Promise.resolve(handleGetCommand(command));
      case 'DeleteCommand':
        return Promise.resolve(handleDeleteCommand(command));
      case 'QueryCommand':
        return Promise.resolve(handleQueryCommand(command));
      default:
        return Promise.resolve({ $metadata: {} });
    }
  });

  return { send } as unknown as DynamoDBDocumentClient;
};

describe('FollowService', () => {
  const tableName = 'test-table';
  let mockClient: DynamoDBDocumentClient;
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
});
