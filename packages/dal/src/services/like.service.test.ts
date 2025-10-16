/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach } from 'vitest';
import { LikeService, type LikeEntity } from './like.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createMockDynamoClient, type MockDynamoClient } from '@social-media-app/shared/test-utils';

describe('LikeService', () => {
  let likeService: LikeService;
  let mockDynamoClient: MockDynamoClient;
  const tableName = 'test-table';
  const userId = 'user-123';
  const postId = 'post-456';
  const postUserId = 'post-owner-789';
  const postSK = 'POST#2024-01-01T00:00:00.000Z#post-456';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    likeService = new LikeService(mockDynamoClient as unknown as DynamoDBDocumentClient, tableName);
  });

  describe('likePost', () => {
    it('should create like entity with correct DynamoDB keys', async () => {
      const result = await likeService.likePost(userId, postId, postUserId, postSK);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);
      expect(mockDynamoClient.send).toHaveBeenCalledOnce();

      // Verify the like entity structure
      const createdLike = mockDynamoClient._getItems().get(`POST#${postId}#LIKE#${userId}`);
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
      await likeService.likePost(userId, postId, postUserId, postSK);

      // Second like should handle gracefully (already liked)
      const result = await likeService.likePost(userId, postId, postUserId, postSK);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);
    });

    it('should use ConditionExpression to prevent race conditions', async () => {
      await likeService.likePost(userId, postId, postUserId, postSK);

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
      await likeService.likePost(userId, postId, postUserId, postSK);
      expect(mockDynamoClient._getItems().has(`POST#${postId}#LIKE#${userId}`)).toBe(true);

      // Then unlike
      const result = await likeService.unlikePost(userId, postId);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(false);
      expect(mockDynamoClient._getItems().has(`POST#${postId}#LIKE#${userId}`)).toBe(false);
    });

    it('should handle unlike when not liked (idempotent)', async () => {
      // Unlike without liking first
      const result = await likeService.unlikePost(userId, postId);

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(false);
    });

    it('should use correct DynamoDB keys for deletion', async () => {
      await likeService.likePost(userId, postId, postUserId, postSK);
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
      await likeService.likePost(userId, postId, postUserId, postSK);

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

  describe('likePost with post metadata', () => {
    it('should store postUserId in like entity', async () => {
      const result = await likeService.likePost(
        userId,
        postId,
        postUserId,
        postSK
      );

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);

      // Verify postUserId is stored in DynamoDB entity
      const createdLike = mockDynamoClient._getItems().get(`POST#${postId}#LIKE#${userId}`);
      expect(createdLike).toBeDefined();
      expect(createdLike?.postUserId).toBe(postUserId);
    });

    it('should store postSK in like entity', async () => {
      const result = await likeService.likePost(
        userId,
        postId,
        postUserId,
        postSK
      );

      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);

      // Verify postSK is stored in DynamoDB entity
      const createdLike = mockDynamoClient._getItems().get(`POST#${postId}#LIKE#${userId}`);
      expect(createdLike).toBeDefined();
      expect(createdLike?.postSK).toBe(postSK);
    });

    it('should store both postUserId and postSK together', async () => {
      const result = await likeService.likePost(
        userId,
        postId,
        postUserId,
        postSK
      );

      expect(result.success).toBe(true);

      // Verify both fields are stored correctly
      const createdLike = mockDynamoClient._getItems().get(`POST#${postId}#LIKE#${userId}`);
      expect(createdLike).toBeDefined();
      expect(createdLike?.postUserId).toBe(postUserId);
      expect(createdLike?.postSK).toBe(postSK);
    });
  });
});
