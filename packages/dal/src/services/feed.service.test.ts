/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach } from 'vitest';
import { FeedService } from './feed.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { FeedItemEntity } from '../entities/feed-item.entity.js';
import type { FeedPostItem } from '@social-media-app/shared';
import { createMockDynamoClient, type MockDynamoClient } from '@social-media-app/shared/test-utils';

describe('FeedService', () => {
  let feedService: FeedService;
  let mockDynamoClient: MockDynamoClient;
  const tableName = 'test-table';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    feedService = new FeedService(
      mockDynamoClient as unknown as DynamoDBDocumentClient,
      tableName
    );
  });

  describe('writeFeedItem', () => {
    const validFeedItemParams = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      postId: '223e4567-e89b-12d3-a456-426614174001',
      authorId: '323e4567-e89b-12d3-a456-426614174002',
      authorHandle: 'testuser',
      authorFullName: 'Test User',
      authorProfilePictureUrl: 'https://example.com/profile.jpg',
      caption: 'Test caption',
      imageUrl: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      likesCount: 10,
      commentsCount: 5,
      isLiked: true,
      createdAt: '2025-10-12T10:00:00.000Z'
    };

    it('should write feed item with all required fields', async () => {
      await feedService.writeFeedItem(validFeedItemParams);

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      const callArg = mockDynamoClient.send.mock.calls[0][0];
      expect(callArg.constructor.name).toBe('PutCommand');

      const item = callArg.input.Item as FeedItemEntity;
      expect(item.PK).toBe(`USER#${validFeedItemParams.userId}`);
      expect(item.SK).toContain('FEED#');
      expect(item.SK).toContain(validFeedItemParams.postId);
      expect(item.postId).toBe(validFeedItemParams.postId);
      expect(item.authorId).toBe(validFeedItemParams.authorId);
      expect(item.authorHandle).toBe(validFeedItemParams.authorHandle);
      expect(item.isLiked).toBe(true);
      expect(item.createdAt).toBe(validFeedItemParams.createdAt);
    });

    it('should write feed item with optional fields', async () => {
      await feedService.writeFeedItem(validFeedItemParams);

      const callArg = mockDynamoClient.send.mock.calls[0][0];
      const item = callArg.input.Item as FeedItemEntity;

      expect(item.authorFullName).toBe(validFeedItemParams.authorFullName);
      expect(item.authorProfilePictureUrl).toBe(validFeedItemParams.authorProfilePictureUrl);
      expect(item.caption).toBe(validFeedItemParams.caption);
      expect(item.imageUrl).toBe(validFeedItemParams.imageUrl);
      expect(item.thumbnailUrl).toBe(validFeedItemParams.thumbnailUrl);
      expect(item.likesCount).toBe(validFeedItemParams.likesCount);
      expect(item.commentsCount).toBe(validFeedItemParams.commentsCount);
    });

    it('should set TTL to 7 days from now', async () => {
      const beforeWrite = Math.floor(Date.now() / 1000);
      await feedService.writeFeedItem(validFeedItemParams);
      const afterWrite = Math.floor(Date.now() / 1000);

      const callArg = mockDynamoClient.send.mock.calls[0][0];
      const item = callArg.input.Item as FeedItemEntity;

      const expectedTTL = beforeWrite + 7 * 24 * 60 * 60;
      const expectedMaxTTL = afterWrite + 7 * 24 * 60 * 60;

      expect(item.expiresAt).toBeGreaterThanOrEqual(expectedTTL);
      expect(item.expiresAt).toBeLessThanOrEqual(expectedMaxTTL);
    });

    it('should set schemaVersion to 1', async () => {
      await feedService.writeFeedItem(validFeedItemParams);

      const callArg = mockDynamoClient.send.mock.calls[0][0];
      const item = callArg.input.Item as FeedItemEntity;

      expect(item.schemaVersion).toBe(1);
    });

    it('should set entityType to FEED_ITEM', async () => {
      await feedService.writeFeedItem(validFeedItemParams);

      const callArg = mockDynamoClient.send.mock.calls[0][0];
      const item = callArg.input.Item as FeedItemEntity;

      expect(item.entityType).toBe('FEED_ITEM');
    });

    it('should create correct PK and SK format', async () => {
      await feedService.writeFeedItem(validFeedItemParams);

      const callArg = mockDynamoClient.send.mock.calls[0][0];
      const item = callArg.input.Item as FeedItemEntity;

      expect(item.PK).toBe(`USER#${validFeedItemParams.userId}`);
      expect(item.SK).toMatch(/^FEED#\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#[a-f0-9-]+$/);
      expect(item.SK).toContain(`#${validFeedItemParams.postId}`);
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalParams = {
        userId: validFeedItemParams.userId,
        postId: validFeedItemParams.postId,
        authorId: validFeedItemParams.authorId,
        authorHandle: validFeedItemParams.authorHandle,
        isLiked: false,
        createdAt: validFeedItemParams.createdAt
      };

      await feedService.writeFeedItem(minimalParams);

      const callArg = mockDynamoClient.send.mock.calls[0][0];
      const item = callArg.input.Item as FeedItemEntity;

      expect(item.authorFullName).toBeUndefined();
      expect(item.authorProfilePictureUrl).toBeUndefined();
      expect(item.caption).toBeUndefined();
      expect(item.imageUrl).toBeUndefined();
      expect(item.thumbnailUrl).toBeUndefined();
      expect(item.likesCount).toBe(0);
      expect(item.commentsCount).toBe(0);
    });

    it('should reject invalid UUIDs for userId', async () => {
      const invalidParams = {
        ...validFeedItemParams,
        userId: 'not-a-valid-uuid'
      };

      await expect(feedService.writeFeedItem(invalidParams))
        .rejects.toThrow();
    });

    it('should reject invalid UUIDs for postId', async () => {
      const invalidParams = {
        ...validFeedItemParams,
        postId: 'not-a-valid-uuid'
      };

      await expect(feedService.writeFeedItem(invalidParams))
        .rejects.toThrow();
    });

    it('should reject empty required fields', async () => {
      const invalidParams = {
        ...validFeedItemParams,
        authorHandle: ''
      };

      await expect(feedService.writeFeedItem(invalidParams))
        .rejects.toThrow();
    });
  });

  describe('getMaterializedFeedItems', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return empty array when user has no feed items', async () => {
      const result = await feedService.getMaterializedFeedItems({ userId });

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should return feed items sorted by SK descending (latest first)', async () => {
      const feedItem1: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T10:00:00.000Z#post1`,
        postId: 'post1',
        authorId: 'author1',
        authorHandle: 'author1',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      const feedItem2: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T11:00:00.000Z#post2`,
        postId: 'post2',
        authorId: 'author2',
        authorHandle: 'author2',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T11:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T11:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${feedItem1.PK}#${feedItem1.SK}`, feedItem1);
      mockDynamoClient._getItems().set(`${feedItem2.PK}#${feedItem2.SK}`, feedItem2);

      const result = await feedService.getMaterializedFeedItems({ userId });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('post2'); // Newer post first
      expect(result.items[1].id).toBe('post1');
    });

    it('should respect limit parameter (default 20)', async () => {
      // Create 25 feed items
      for (let i = 0; i < 25; i++) {
        const feedItem: FeedItemEntity = {
          PK: `USER#${userId}`,
          SK: `FEED#2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z#post${i}`,
          postId: `post${i}`,
          authorId: `author${i}`,
          authorHandle: `author${i}`,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          feedItemCreatedAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          entityType: 'FEED_ITEM',
          schemaVersion: 1
        };
        mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);
      }

      const result = await feedService.getMaterializedFeedItems({ userId });

      expect(result.items).toHaveLength(20); // Default limit
    });

    it('should return nextCursor when more items available', async () => {
      // Create 25 feed items
      for (let i = 0; i < 25; i++) {
        const feedItem: FeedItemEntity = {
          PK: `USER#${userId}`,
          SK: `FEED#2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z#post${i}`,
          postId: `post${i}`,
          authorId: `author${i}`,
          authorHandle: `author${i}`,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          feedItemCreatedAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          entityType: 'FEED_ITEM',
          schemaVersion: 1
        };
        mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);
      }

      const result = await feedService.getMaterializedFeedItems({ userId, limit: 10 });

      expect(result.items).toHaveLength(10);
      expect(result.nextCursor).toBeDefined();
      expect(typeof result.nextCursor).toBe('string');
    });

    it('should support pagination with cursor', async () => {
      // Create 30 feed items
      for (let i = 0; i < 30; i++) {
        const feedItem: FeedItemEntity = {
          PK: `USER#${userId}`,
          SK: `FEED#2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z#post${i}`,
          postId: `post${i}`,
          authorId: `author${i}`,
          authorHandle: `author${i}`,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          feedItemCreatedAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          entityType: 'FEED_ITEM',
          schemaVersion: 1
        };
        mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);
      }

      // Get first page
      const firstPage = await feedService.getMaterializedFeedItems({ userId, limit: 10 });
      expect(firstPage.items).toHaveLength(10);
      expect(firstPage.nextCursor).toBeDefined();

      // Get second page using cursor
      const secondPage = await feedService.getMaterializedFeedItems({
        userId,
        limit: 10,
        cursor: firstPage.nextCursor
      });
      expect(secondPage.items).toHaveLength(10);
      expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
    });

    it('should map entities to FeedPostItem correctly', async () => {
      const feedItem: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T10:00:00.000Z#post1`,
        postId: 'post1',
        authorId: 'author1',
        authorHandle: 'testauthor',
        authorFullName: 'Test Author',
        authorProfilePictureUrl: 'https://example.com/author.jpg',
        caption: 'Test caption',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 42,
        commentsCount: 10,
        isLiked: true,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);

      const result = await feedService.getMaterializedFeedItems({ userId });

      expect(result.items).toHaveLength(1);
      const item = result.items[0] as FeedPostItem;

      expect(item.id).toBe('post1');
      expect(item.userId).toBe('author1');
      expect(item.userHandle).toBe('testauthor');
      expect(item.authorId).toBe('author1');
      expect(item.authorHandle).toBe('testauthor');
      expect(item.authorFullName).toBe('Test Author');
      expect(item.authorProfilePictureUrl).toBe('https://example.com/author.jpg');
      expect(item.caption).toBe('Test caption');
      expect(item.imageUrl).toBe('https://example.com/image.jpg');
      expect(item.likesCount).toBe(42);
      expect(item.commentsCount).toBe(10);
      expect(item.isLiked).toBe(true);
      expect(item.createdAt).toBe('2025-10-12T10:00:00.000Z');
    });

    it('should set source to materialized', async () => {
      const feedItem: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T10:00:00.000Z#post1`,
        postId: 'post1',
        authorId: 'author1',
        authorHandle: 'author1',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);

      const result = await feedService.getMaterializedFeedItems({ userId });

      expect(result.items[0].source).toBe('materialized');
    });

    it('should handle limit > 100 by capping at 100', async () => {
      const result = await feedService.getMaterializedFeedItems({ userId, limit: 200 });

      // Check that query was called with limit 100
      const callArg = mockDynamoClient.send.mock.calls[0][0];
      expect(callArg.input.Limit).toBe(100);
    });

    it('should handle invalid cursor gracefully', async () => {
      await expect(
        feedService.getMaterializedFeedItems({ userId, cursor: 'invalid-cursor' })
      ).rejects.toThrow();
    });
  });

  describe('deleteFeedItemsByPost', () => {
    const postId = 'post123';

    it('should delete all feed items for a post across all users', async () => {
      // Create feed items for the same post in different users' feeds
      const user1FeedItem: FeedItemEntity = {
        PK: 'USER#user1',
        SK: `FEED#2025-10-12T10:00:00.000Z#${postId}`,
        postId,
        authorId: 'author1',
        authorHandle: 'author1',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      const user2FeedItem: FeedItemEntity = {
        PK: 'USER#user2',
        SK: `FEED#2025-10-12T10:00:00.000Z#${postId}`,
        postId,
        authorId: 'author1',
        authorHandle: 'author1',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${user1FeedItem.PK}#${user1FeedItem.SK}`, user1FeedItem);
      mockDynamoClient._getItems().set(`${user2FeedItem.PK}#${user2FeedItem.SK}`, user2FeedItem);

      const result = await feedService.deleteFeedItemsByPost({ postId });

      expect(result.deletedCount).toBe(2);
      expect(mockDynamoClient._getItems().size).toBe(0);
    });

    it('should return deletedCount', async () => {
      const feedItem: FeedItemEntity = {
        PK: 'USER#user1',
        SK: `FEED#2025-10-12T10:00:00.000Z#${postId}`,
        postId,
        authorId: 'author1',
        authorHandle: 'author1',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);

      const result = await feedService.deleteFeedItemsByPost({ postId });

      expect(result).toHaveProperty('deletedCount');
      expect(typeof result.deletedCount).toBe('number');
      expect(result.deletedCount).toBe(1);
    });

    it('should handle non-existent postId by returning 0', async () => {
      const result = await feedService.deleteFeedItemsByPost({ postId: 'nonexistent' });

      expect(result.deletedCount).toBe(0);
    });

    it('should use batch delete for efficiency', async () => {
      // Create multiple feed items
      for (let i = 0; i < 10; i++) {
        const feedItem: FeedItemEntity = {
          PK: `USER#user${i}`,
          SK: `FEED#2025-10-12T10:00:00.000Z#${postId}`,
          postId,
          authorId: 'author1',
          authorHandle: 'author1',
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: '2025-10-12T10:00:00.000Z',
          feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          entityType: 'FEED_ITEM',
          schemaVersion: 1
        };
        mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);
      }

      await feedService.deleteFeedItemsByPost({ postId });

      // Should have used BatchWriteCommand
      const batchWriteCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'BatchWriteCommand'
      );
      expect(batchWriteCalls.length).toBeGreaterThan(0);
    });

    it('should handle empty results gracefully', async () => {
      const result = await feedService.deleteFeedItemsByPost({ postId: 'nonexistent' });

      expect(result.deletedCount).toBe(0);
      expect(mockDynamoClient._getItems().size).toBe(0);
    });
  });

  describe('deleteFeedItemsForUser', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const authorId = '223e4567-e89b-12d3-a456-426614174001';

    it('should delete feed items where userId=X AND authorId=Y', async () => {
      // Create feed items from the author
      const feedItem1: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T10:00:00.000Z#post1`,
        postId: 'post1',
        authorId,
        authorHandle: 'author',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      const feedItem2: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T11:00:00.000Z#post2`,
        postId: 'post2',
        authorId,
        authorHandle: 'author',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T11:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T11:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${feedItem1.PK}#${feedItem1.SK}`, feedItem1);
      mockDynamoClient._getItems().set(`${feedItem2.PK}#${feedItem2.SK}`, feedItem2);

      const result = await feedService.deleteFeedItemsForUser({ userId, authorId });

      expect(result.deletedCount).toBe(2);
      expect(mockDynamoClient._getItems().size).toBe(0);
    });

    it('should return deletedCount', async () => {
      const feedItem: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T10:00:00.000Z#post1`,
        postId: 'post1',
        authorId,
        authorHandle: 'author',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);

      const result = await feedService.deleteFeedItemsForUser({ userId, authorId });

      expect(result).toHaveProperty('deletedCount');
      expect(typeof result.deletedCount).toBe('number');
    });

    it('should not delete items from other authors', async () => {
      const otherAuthorId = '323e4567-e89b-12d3-a456-426614174002';

      // Feed item from target author
      const targetFeedItem: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T10:00:00.000Z#post1`,
        postId: 'post1',
        authorId,
        authorHandle: 'author',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T10:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      // Feed item from other author (should not be deleted)
      const otherFeedItem: FeedItemEntity = {
        PK: `USER#${userId}`,
        SK: `FEED#2025-10-12T11:00:00.000Z#post2`,
        postId: 'post2',
        authorId: otherAuthorId,
        authorHandle: 'otherauthor',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T11:00:00.000Z',
        feedItemCreatedAt: '2025-10-12T11:00:00.000Z',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        entityType: 'FEED_ITEM',
        schemaVersion: 1
      };

      mockDynamoClient._getItems().set(`${targetFeedItem.PK}#${targetFeedItem.SK}`, targetFeedItem);
      mockDynamoClient._getItems().set(`${otherFeedItem.PK}#${otherFeedItem.SK}`, otherFeedItem);

      const result = await feedService.deleteFeedItemsForUser({ userId, authorId });

      expect(result.deletedCount).toBe(1);
      expect(mockDynamoClient._getItems().size).toBe(1);
      expect(mockDynamoClient._getItems().has(`${otherFeedItem.PK}#${otherFeedItem.SK}`)).toBe(true);
    });

    it('should handle non-existent combinations by returning 0', async () => {
      const result = await feedService.deleteFeedItemsForUser({
        userId: 'nonexistent-user',
        authorId: 'nonexistent-author'
      });

      expect(result.deletedCount).toBe(0);
    });

    it('should use query + batch delete pattern', async () => {
      // Create multiple feed items from the same author
      for (let i = 0; i < 5; i++) {
        const feedItem: FeedItemEntity = {
          PK: `USER#${userId}`,
          SK: `FEED#2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z#post${i}`,
          postId: `post${i}`,
          authorId,
          authorHandle: 'author',
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          feedItemCreatedAt: `2025-10-12T${String(i).padStart(2, '0')}:00:00.000Z`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          entityType: 'FEED_ITEM',
          schemaVersion: 1
        };
        mockDynamoClient._getItems().set(`${feedItem.PK}#${feedItem.SK}`, feedItem);
      }

      await feedService.deleteFeedItemsForUser({ userId, authorId });

      // Should have used QueryCommand first
      const queryCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'QueryCommand'
      );
      expect(queryCalls.length).toBeGreaterThan(0);

      // Should have used BatchWriteCommand for deletion
      const batchWriteCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'BatchWriteCommand'
      );
      expect(batchWriteCalls.length).toBeGreaterThan(0);
    });
  });

  describe('markFeedItemsAsRead (Instagram-like behavior)', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const postId1 = '223e4567-e89b-12d3-a456-426614174001';
    const postId2 = '223e4567-e89b-12d3-a456-426614174002';

    beforeEach(async () => {
      // Setup: Create feed items
      await feedService.writeFeedItem({
        userId,
        postId: postId1,
        authorId: '323e4567-e89b-12d3-a456-426614174002',
        authorHandle: 'author1',
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z'
      });

      await feedService.writeFeedItem({
        userId,
        postId: postId2,
        authorId: '423e4567-e89b-12d3-a456-426614174003',
        authorHandle: 'author2',
        isLiked: false,
        createdAt: '2025-10-12T11:00:00.000Z'
      });
    });

    it('should mark single feed item as read with readAt timestamp', async () => {
      const beforeMark = new Date().toISOString();

      const result = await feedService.markFeedItemsAsRead({
        userId,
        postIds: [postId1]
      });

      const afterMark = new Date().toISOString();

      expect(result.updatedCount).toBe(1);

      // Verify UpdateCommand was called with correct parameters
      const updateCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'UpdateCommand'
      );
      expect(updateCalls.length).toBe(1);

      const updateCommand = updateCalls[0][0];
      expect(updateCommand.input.UpdateExpression).toContain('isRead');
      expect(updateCommand.input.UpdateExpression).toContain('readAt');
      expect(updateCommand.input.ExpressionAttributeValues?.[':isRead']).toBe(true);

      const readAtValue = updateCommand.input.ExpressionAttributeValues?.[':readAt'] as string;
      expect(readAtValue).toBeDefined();
      expect(readAtValue >= beforeMark).toBe(true);
      expect(readAtValue <= afterMark).toBe(true);
    });

    it('should mark multiple feed items as read', async () => {
      const result = await feedService.markFeedItemsAsRead({
        userId,
        postIds: [postId1, postId2]
      });

      expect(result.updatedCount).toBe(2);

      const updateCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'UpdateCommand'
      );
      expect(updateCalls.length).toBe(2);
    });

    it('should handle marking non-existent posts gracefully', async () => {
      const fakePostId = '999e4567-e89b-12d3-a456-426614174999';

      const result = await feedService.markFeedItemsAsRead({
        userId,
        postIds: [fakePostId]
      });

      expect(result.updatedCount).toBe(0);
    });

    it('should handle empty postIds array', async () => {
      const result = await feedService.markFeedItemsAsRead({
        userId,
        postIds: []
      });

      expect(result.updatedCount).toBe(0);

      const updateCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'UpdateCommand'
      );
      expect(updateCalls.length).toBe(0);
    });

    it('should only update feed items for the specified user', async () => {
      const anotherUserId = '999e4567-e89b-12d3-a456-426614174999';

      // Create feed item for another user with same postId
      await feedService.writeFeedItem({
        userId: anotherUserId,
        postId: postId1,
        authorId: '323e4567-e89b-12d3-a456-426614174002',
        authorHandle: 'author1',
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z'
      });

      // Mark as read for first user
      const result = await feedService.markFeedItemsAsRead({
        userId,
        postIds: [postId1]
      });

      expect(result.updatedCount).toBe(1);

      // Verify only the specified user's item was updated
      const updateCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'UpdateCommand'
      );
      expect(updateCalls.length).toBe(1);

      const updateCommand = updateCalls[0][0];
      expect(updateCommand.input.Key?.PK).toBe(`USER#${userId}`);
    });
  });

  describe('getMaterializedFeedItems (Instagram-like filtering)', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const unreadPostId = '223e4567-e89b-12d3-a456-426614174001';
    const readPostId = '223e4567-e89b-12d3-a456-426614174002';

    beforeEach(async () => {
      // Create an unread post
      await feedService.writeFeedItem({
        userId,
        postId: unreadPostId,
        authorId: '323e4567-e89b-12d3-a456-426614174002',
        authorHandle: 'author1',
        isLiked: false,
        createdAt: '2025-10-12T10:00:00.000Z'
      });

      // Create a read post
      await feedService.writeFeedItem({
        userId,
        postId: readPostId,
        authorId: '423e4567-e89b-12d3-a456-426614174003',
        authorHandle: 'author2',
        isLiked: false,
        createdAt: '2025-10-12T11:00:00.000Z'
      });

      // Mark second post as read
      await feedService.markFeedItemsAsRead({
        userId,
        postIds: [readPostId]
      });
    });

    it('should only return unread feed items', async () => {
      const result = await feedService.getMaterializedFeedItems({
        userId,
        limit: 20
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe(unreadPostId);
      expect(result.items.find(item => item.id === readPostId)).toBeUndefined();
    });

    it('should filter with FilterExpression for isRead=false', async () => {
      await feedService.getMaterializedFeedItems({
        userId,
        limit: 20
      });

      const queryCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'QueryCommand'
      );

      expect(queryCalls.length).toBeGreaterThan(0);

      const queryCommand = queryCalls[queryCalls.length - 1][0];
      expect(queryCommand.input.FilterExpression).toContain('isRead');
      expect(
        queryCommand.input.FilterExpression?.includes('attribute_not_exists(isRead)') ||
        queryCommand.input.FilterExpression?.includes('isRead = :false')
      ).toBe(true);
    });

    it('should return all unread posts when no limit specified', async () => {
      // Create more unread posts
      await feedService.writeFeedItem({
        userId,
        postId: '323e4567-e89b-12d3-a456-426614174004',
        authorId: '323e4567-e89b-12d3-a456-426614174002',
        authorHandle: 'author1',
        isLiked: false,
        createdAt: '2025-10-12T12:00:00.000Z'
      });

      const result = await feedService.getMaterializedFeedItems({
        userId
      });

      // Should return 2 unread posts (unreadPostId + newly created)
      // readPostId should be filtered out
      expect(result.items.length).toBe(2);
      expect(result.items.every(item => item.id !== readPostId)).toBe(true);
    });

    it('should handle empty feed gracefully', async () => {
      const emptyUserId = '999e4567-e89b-12d3-a456-426614174999';

      const result = await feedService.getMaterializedFeedItems({
        userId: emptyUserId,
        limit: 20
      });

      expect(result.items.length).toBe(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should support pagination with unread filtering', async () => {
      // Create many unread posts
      for (let i = 0; i < 15; i++) {
        const paddedNum = String(i).padStart(2, '0');
        await feedService.writeFeedItem({
          userId,
          postId: `${paddedNum}3e4567-e89b-12d3-a456-4266141740${paddedNum}`,
          authorId: '323e4567-e89b-12d3-a456-426614174002',
          authorHandle: 'author1',
          isLiked: false,
          createdAt: `2025-10-12T${paddedNum}:00:00.000Z`
        });
      }

      // First page
      const page1 = await feedService.getMaterializedFeedItems({
        userId,
        limit: 10
      });

      expect(page1.items.length).toBe(10);
      expect(page1.nextCursor).toBeDefined();

      // Second page
      const page2 = await feedService.getMaterializedFeedItems({
        userId,
        limit: 10,
        cursor: page1.nextCursor
      });

      expect(page2.items.length).toBeGreaterThan(0);

      // Verify no read posts in either page
      const allPageItems = [...page1.items, ...page2.items];
      expect(allPageItems.every(item => item.id !== readPostId)).toBe(true);
    });
  });
});
