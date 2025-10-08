/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LikeService, type LikeEntity } from './like.service';
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
      throw new Error('ConditionalCheckFailedException');
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

  const send = vi.fn((command: MockDynamoCommand) => {
    const commandName = command.constructor.name;

    switch (commandName) {
      case 'PutCommand':
        return Promise.resolve(handlePutCommand(command));
      case 'GetCommand':
        return Promise.resolve(handleGetCommand(command));
      case 'DeleteCommand':
        return Promise.resolve(handleDeleteCommand(command));
      default:
        return Promise.resolve({ $metadata: {} });
    }
  });

  return {
    send,
    _items: items  // For test inspection
  } as unknown as DynamoDBDocumentClient & { _items: Map<string, Record<string, unknown>> };
};

describe('LikeService', () => {
  let likeService: LikeService;
  let mockDynamoClient: ReturnType<typeof createMockDynamoClient>;
  const tableName = 'test-table';
  const userId = 'user-123';
  const postId = 'post-456';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    likeService = new LikeService(mockDynamoClient as unknown as DynamoDBDocumentClient, tableName);
  });

  describe('likePost', () => {
    it('should create like entity with correct DynamoDB keys', async () => {
      const result = await likeService.likePost(userId, postId);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);
      expect(mockDynamoClient.send).toHaveBeenCalledOnce();

      // Verify the like entity structure
      const createdLike = mockDynamoClient._items.get(`POST#${postId}#LIKE#${userId}`);
      expect(createdLike).toBeDefined();
      expect(createdLike?.PK).toBe(`POST#${postId}`);
      expect(createdLike?.SK).toBe(`LIKE#${userId}`);
      expect(createdLike?.GSI2PK).toBe(`USER#${userId}`);
      expect(createdLike?.GSI2SK).toBe(`LIKE#${postId}`);
      expect(createdLike?.entityType).toBe('LIKE');
      expect(createdLike?.userId).toBe(userId);
      expect(createdLike?.postId).toBe(postId);
      expect(createdLike?.createdAt).toBeDefined();
    });

    it('should prevent duplicate likes (idempotent)', async () => {
      // First like should succeed
      await likeService.likePost(userId, postId);

      // Second like should handle gracefully (already liked)
      const result = await likeService.likePost(userId, postId);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);
    });

    it('should use ConditionExpression to prevent race conditions', async () => {
      await likeService.likePost(userId, postId);

      // Verify condition expression was used
      const calls = mockDynamoClient.send.mock.calls;
      const putCall = calls.find(call => call[0].constructor.name === 'PutCommand');
      expect(putCall).toBeDefined();
      expect(putCall![0].input.ConditionExpression).toBe('attribute_not_exists(PK)');
    });
  });

  describe('unlikePost', () => {
    it('should delete like entity', async () => {
      // First like the post
      await likeService.likePost(userId, postId);
      expect(mockDynamoClient._items.has(`POST#${postId}#LIKE#${userId}`)).toBe(true);

      // Then unlike
      const result = await likeService.unlikePost(userId, postId);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(false);
      expect(mockDynamoClient._items.has(`POST#${postId}#LIKE#${userId}`)).toBe(false);
    });

    it('should handle unlike when not liked (idempotent)', async () => {
      // Unlike without liking first
      const result = await likeService.unlikePost(userId, postId);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(false);
    });

    it('should use correct DynamoDB keys for deletion', async () => {
      await likeService.likePost(userId, postId);
      await likeService.unlikePost(userId, postId);

      const calls = mockDynamoClient.send.mock.calls;
      const deleteCall = calls.find(call => call[0].constructor.name === 'DeleteCommand');
      expect(deleteCall).toBeDefined();
      expect(deleteCall![0].input.Key).toEqual({
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      });
    });
  });

  describe('getPostLikeStatus', () => {
    it('should return correct status when user has liked post', async () => {
      await likeService.likePost(userId, postId);

      const status = await likeService.getPostLikeStatus(userId, postId);

      expect(status.isLiked).toBe(true);
    });

    it('should return correct status when user has not liked post', async () => {
      const status = await likeService.getPostLikeStatus(userId, postId);

      expect(status.isLiked).toBe(false);
    });

    it('should query with correct DynamoDB keys', async () => {
      await likeService.getPostLikeStatus(userId, postId);

      const calls = mockDynamoClient.send.mock.calls;
      const getCall = calls.find(call => call[0].constructor.name === 'GetCommand');
      expect(getCall).toBeDefined();
      expect(getCall![0].input.Key).toEqual({
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      });
    });
  });
});
