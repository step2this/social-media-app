/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentService } from './comment.service.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Comment } from '@social-media-app/shared';

interface MockDynamoCommand {
  readonly constructor: { readonly name: string };
  readonly input: {
    readonly TableName?: string;
    readonly IndexName?: string;
    readonly Item?: Record<string, unknown>;
    readonly Key?: Record<string, unknown>;
    readonly KeyConditionExpression?: string;
    readonly ExpressionAttributeNames?: Record<string, string>;
    readonly ExpressionAttributeValues?: Record<string, unknown>;
    readonly ScanIndexForward?: boolean;
    readonly Limit?: number;
    readonly ExclusiveStartKey?: Record<string, unknown>;
    readonly ConditionExpression?: string;
    readonly Select?: string;
  };
}

// Mock DynamoDB client with Query support
const createMockDynamoClient = () => {
  const items = new Map<string, Record<string, unknown>>();

  const handlePutCommand = (command: MockDynamoCommand) => {
    const item = command.input.Item!;
    const key = `${item.PK}#${item.SK}`;
    items.set(key, item);
    return { $metadata: {} };
  };

  const handleQueryCommand = (command: MockDynamoCommand) => {
    const allItems = Array.from(items.values());
    const values = command.input.ExpressionAttributeValues || {};
    const indexName = command.input.IndexName;

    // Filter items based on key condition and index
    const filtered = allItems.filter(item => {
      // Handle GSI1 queries (for comment lookup by ID)
      if (indexName === 'GSI1') {
        const gsi1PkValue = values[':pk'] as string;
        return item.GSI1PK === gsi1PkValue;
      }

      // Handle base table queries
      const pkValue = values[':pk'] as string;
      const skPrefix = values[':skPrefix'] as string | undefined;

      if (item.PK !== pkValue) return false;
      if (skPrefix && !String(item.SK).startsWith(skPrefix)) return false;

      return true;
    });

    // Sort by SK (descending by default for comments)
    const sorted = filtered.sort((a, b) => {
      const skA = String(a.SK);
      const skB = String(b.SK);
      return command.input.ScanIndexForward ? skA.localeCompare(skB) : skB.localeCompare(skA);
    });

    // Handle COUNT queries (for totalCount)
    if (command.input.Select === 'COUNT') {
      return {
        Count: sorted.length,
        $metadata: {}
      };
    }

    // Handle pagination with ExclusiveStartKey
    let startIndex = 0;
    if (command.input.ExclusiveStartKey) {
      const exclusiveKey = command.input.ExclusiveStartKey;
      startIndex = sorted.findIndex(item =>
        item.PK === exclusiveKey.PK && item.SK === exclusiveKey.SK
      ) + 1;
    }

    // Apply limit
    const limit = command.input.Limit || sorted.length;
    const result = sorted.slice(startIndex, startIndex + limit);

    return {
      Items: result,
      Count: result.length,
      $metadata: {}
    };
  };

  const handleGetCommand = (command: MockDynamoCommand) => {
    const key = `${command.input.Key!.PK}#${command.input.Key!.SK}`;
    const item = items.get(key);
    return { Item: item, $metadata: {} };
  };

  const handleDeleteCommand = (command: MockDynamoCommand) => {
    const key = `${command.input.Key!.PK}#${command.input.Key!.SK}`;
    const deleted = items.has(key);
    items.delete(key);
    return { $metadata: {}, deleted };
  };

  const send = vi.fn((command: MockDynamoCommand) => {
    const commandName = command.constructor.name;

    switch (commandName) {
      case 'PutCommand':
        return Promise.resolve(handlePutCommand(command));
      case 'QueryCommand':
        return Promise.resolve(handleQueryCommand(command));
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

describe('CommentService', () => {
  let commentService: CommentService;
  let mockDynamoClient: ReturnType<typeof createMockDynamoClient>;
  const tableName = 'test-table';
  const userId = 'user-123';
  const postId = 'post-456';
  const userHandle = 'testuser';
  const content = 'This is a test comment';
  const postUserId = 'post-owner-789';
  const postSK = 'POST#2024-01-01T00:00:00.000Z#post-456';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    commentService = new CommentService(mockDynamoClient as unknown as DynamoDBDocumentClient, tableName);
  });

  describe('createComment', () => {
    it('should create comment entity with correct DynamoDB keys', async () => {
      const result = await commentService.createComment(userId, postId, userHandle, content, postUserId, postSK);

      expect(result.comment).toBeDefined();
      expect(result.comment.userId).toBe(userId);
      expect(result.comment.postId).toBe(postId);
      expect(result.comment.userHandle).toBe(userHandle);
      expect(result.comment.content).toBe(content);
      expect(result.comment.id).toBeDefined();
      expect(result.comment.createdAt).toBeDefined();
      expect(result.comment.updatedAt).toBe(result.comment.createdAt);
      expect(result.commentsCount).toBe(0); // Will be updated by stream processor

      // Verify the comment entity structure in DynamoDB
      const allItems = Array.from(mockDynamoClient._items.values());
      const commentEntity = allItems.find(item => item.postId === postId && item.userId === userId);

      expect(commentEntity).toBeDefined();
      expect(commentEntity?.PK).toBe(`POST#${postId}`);
      expect(commentEntity?.SK).toMatch(/^COMMENT#\d{4}-\d{2}-\d{2}T.*#.+$/);
      expect(commentEntity?.GSI1PK).toBe(`COMMENT#${result.comment.id}`);
      expect(commentEntity?.GSI1SK).toBe(`POST#${postId}`);
      expect(commentEntity?.GSI2PK).toBe(`USER#${userId}`);
      expect(commentEntity?.GSI2SK).toMatch(/^COMMENT#\d{4}-\d{2}-\d{2}T.*#.+$/);
      expect(commentEntity?.entityType).toBe('COMMENT');
    });

    it('should store postUserId in comment entity', async () => {
      const postUserId = 'post-owner-789';
      const postSK = 'POST#2024-01-01T00:00:00.000Z#post-456';

      const result = await commentService.createComment(
        userId,
        postId,
        userHandle,
        content,
        postUserId,
        postSK
      );

      // Verify the comment was created
      expect(result.comment).toBeDefined();

      // Verify postUserId is stored in DynamoDB entity
      const allItems = Array.from(mockDynamoClient._items.values());
      const commentEntity = allItems.find(item => item.id === result.comment.id);

      expect(commentEntity).toBeDefined();
      expect(commentEntity?.postUserId).toBe(postUserId);
    });

    it('should store postSK in comment entity', async () => {
      const postUserId = 'post-owner-789';
      const postSK = 'POST#2024-01-01T00:00:00.000Z#post-456';

      const result = await commentService.createComment(
        userId,
        postId,
        userHandle,
        content,
        postUserId,
        postSK
      );

      // Verify the comment was created
      expect(result.comment).toBeDefined();

      // Verify postSK is stored in DynamoDB entity
      const allItems = Array.from(mockDynamoClient._items.values());
      const commentEntity = allItems.find(item => item.id === result.comment.id);

      expect(commentEntity).toBeDefined();
      expect(commentEntity?.postSK).toBe(postSK);
    });

    it('should store both postUserId and postSK together', async () => {
      const postUserId = 'post-owner-789';
      const postSK = 'POST#2024-01-01T00:00:00.000Z#post-456';

      const result = await commentService.createComment(
        userId,
        postId,
        userHandle,
        content,
        postUserId,
        postSK
      );

      // Verify both fields are stored correctly
      const allItems = Array.from(mockDynamoClient._items.values());
      const commentEntity = allItems.find(item => item.id === result.comment.id);

      expect(commentEntity).toBeDefined();
      expect(commentEntity?.postUserId).toBe(postUserId);
      expect(commentEntity?.postSK).toBe(postSK);
    });

    it('should generate unique comment IDs', async () => {
      const result1 = await commentService.createComment(userId, postId, userHandle, 'Comment 1', postUserId, postSK);
      const result2 = await commentService.createComment(userId, postId, userHandle, 'Comment 2', postUserId, postSK);

      expect(result1.comment.id).not.toBe(result2.comment.id);
    });

    it('should handle empty content validation', async () => {
      await expect(commentService.createComment(userId, postId, userHandle, '', postUserId, postSK)).rejects.toThrow();
    });

    it('should handle content exceeding 500 characters', async () => {
      const longContent = 'a'.repeat(501);
      await expect(commentService.createComment(userId, postId, userHandle, longContent, postUserId, postSK)).rejects.toThrow();
    });

    it('should allow content exactly 500 characters', async () => {
      const maxContent = 'a'.repeat(500);
      const result = await commentService.createComment(userId, postId, userHandle, maxContent, postUserId, postSK);

      expect(result.comment.content).toBe(maxContent);
    });

    it('should handle special characters and emojis', async () => {
      const specialContent = 'Great post! 👍 @user #tag <html> & "quotes"';
      const result = await commentService.createComment(userId, postId, userHandle, specialContent, postUserId, postSK);

      expect(result.comment.content).toBe(specialContent);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment entity', async () => {
      // Create a comment first
      const created = await commentService.createComment(userId, postId, userHandle, content, postUserId, postSK);
      const commentId = created.comment.id;

      // Verify it exists
      expect(mockDynamoClient._items.size).toBeGreaterThan(0);

      // Delete it
      const result = await commentService.deleteComment(userId, commentId);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should return success even if comment does not exist (idempotent)', async () => {
      const result = await commentService.deleteComment(userId, 'non-existent-id');

      expect(result.success).toBe(true);
    });

    it('should prevent deletion by non-owner', async () => {
      const created = await commentService.createComment(userId, postId, userHandle, content, postUserId, postSK);
      const commentId = created.comment.id;

      // Try to delete with different user
      await expect(commentService.deleteComment('different-user', commentId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getCommentsByPost', () => {
    beforeEach(async () => {
      // Create multiple comments for testing with small delays to ensure ordering
      await commentService.createComment('user1', postId, 'user1handle', 'First comment', postUserId, postSK);
      await new Promise(resolve => setTimeout(resolve, 10));
      await commentService.createComment('user2', postId, 'user2handle', 'Second comment', postUserId, postSK);
      await new Promise(resolve => setTimeout(resolve, 10));
      await commentService.createComment('user3', postId, 'user3handle', 'Third comment', postUserId, postSK);
    });

    it('should retrieve all comments for a post', async () => {
      const result = await commentService.getCommentsByPost(postId);

      expect(result.comments).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should return comments in descending order (newest first)', async () => {
      const result = await commentService.getCommentsByPost(postId);

      // Comments should be ordered newest first
      expect(result.comments[0].content).toBe('Third comment');
      expect(result.comments[1].content).toBe('Second comment');
      expect(result.comments[2].content).toBe('First comment');
    });

    it('should respect limit parameter', async () => {
      const result = await commentService.getCommentsByPost(postId, 2);

      expect(result.comments).toHaveLength(2);
    });

    it('should return empty array for post with no comments', async () => {
      const result = await commentService.getCommentsByPost('post-with-no-comments');

      expect(result.comments).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should use correct DynamoDB keys for query', async () => {
      await commentService.getCommentsByPost(postId);

      const calls = mockDynamoClient.send.mock.calls;
      const queryCall = calls.find(call => call[0].constructor.name === 'QueryCommand');

      expect(queryCall).toBeDefined();
      expect(queryCall![0].input.KeyConditionExpression).toContain('PK = :pk');
      expect(queryCall![0].input.KeyConditionExpression).toContain('begins_with(SK, :skPrefix)');
      expect(queryCall![0].input.ExpressionAttributeValues).toEqual({
        ':pk': `POST#${postId}`,
        ':skPrefix': 'COMMENT#'
      });
    });

    describe('Pagination', () => {
      // Reset mock client for pagination tests
      let paginationPostId: string;

      beforeEach(async () => {
        // Use a different post ID for pagination tests to avoid interference
        paginationPostId = 'post-pagination-test';
        mockDynamoClient = createMockDynamoClient();
        commentService = new CommentService(mockDynamoClient as unknown as DynamoDBDocumentClient, tableName);
      });

      it('should return accurate totalCount even with limit (5 total, limit 2)', async () => {
        // Create 5 comments
        for (let i = 1; i <= 5; i++) {
          await commentService.createComment(
            `user${i}`,
            paginationPostId,
            `user${i}handle`,
            `Comment ${i}`,
            postUserId,
            postSK
          );
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Query with limit 2
        const result = await commentService.getCommentsByPost(paginationPostId, 2);

        // Should return 2 comments but totalCount should be 5
        expect(result.comments).toHaveLength(2);
        expect(result.totalCount).toBe(5);
      });

      it('should return hasMore=true when more results exist (5 total, limit 2)', async () => {
        // Create 5 comments
        for (let i = 1; i <= 5; i++) {
          await commentService.createComment(
            `user${i}`,
            paginationPostId,
            `user${i}handle`,
            `Comment ${i}`,
            postUserId,
            postSK
          );
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Query with limit 2
        const result = await commentService.getCommentsByPost(paginationPostId, 2);

        expect(result.hasMore).toBe(true);
      });

      it('should return hasMore=false when no more results exist (2 total, limit 10)', async () => {
        // Create 2 comments
        await commentService.createComment('user1', paginationPostId, 'user1handle', 'Comment 1', postUserId, postSK);
        await new Promise(resolve => setTimeout(resolve, 10));
        await commentService.createComment('user2', paginationPostId, 'user2handle', 'Comment 2', postUserId, postSK);

        // Query with limit 10
        const result = await commentService.getCommentsByPost(paginationPostId, 10);

        expect(result.comments).toHaveLength(2);
        expect(result.hasMore).toBe(false);
      });

      it('should return nextCursor when hasMore=true', async () => {
        // Create 5 comments
        for (let i = 1; i <= 5; i++) {
          await commentService.createComment(
            `user${i}`,
            paginationPostId,
            `user${i}handle`,
            `Comment ${i}`,
            postUserId,
            postSK
          );
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Query with limit 2
        const result = await commentService.getCommentsByPost(paginationPostId, 2);

        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).toBeDefined();
        expect(typeof result.nextCursor).toBe('string');
      });

      it('should use cursor to get next page of results', async () => {
        // Create 5 comments
        for (let i = 1; i <= 5; i++) {
          await commentService.createComment(
            `user${i}`,
            paginationPostId,
            `user${i}handle`,
            `Comment ${i}`,
            postUserId,
            postSK
          );
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Get first page
        const firstPage = await commentService.getCommentsByPost(paginationPostId, 2);
        expect(firstPage.comments).toHaveLength(2);
        expect(firstPage.nextCursor).toBeDefined();

        // Get second page using cursor
        const secondPage = await commentService.getCommentsByPost(paginationPostId, 2, firstPage.nextCursor);
        expect(secondPage.comments).toHaveLength(2);

        // Verify different results
        expect(firstPage.comments[0].id).not.toBe(secondPage.comments[0].id);
        expect(firstPage.comments[1].id).not.toBe(secondPage.comments[1].id);
      });

      it('should return nextCursor=undefined when hasMore=false on last page', async () => {
        // Create 5 comments
        for (let i = 1; i <= 5; i++) {
          await commentService.createComment(
            `user${i}`,
            paginationPostId,
            `user${i}handle`,
            `Comment ${i}`,
            postUserId,
            postSK
          );
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Get first page (2 items)
        const firstPage = await commentService.getCommentsByPost(paginationPostId, 2);

        // Get second page (2 items)
        const secondPage = await commentService.getCommentsByPost(paginationPostId, 2, firstPage.nextCursor);

        // Get third page (1 item remaining)
        const thirdPage = await commentService.getCommentsByPost(paginationPostId, 2, secondPage.nextCursor);

        expect(thirdPage.comments).toHaveLength(1);
        expect(thirdPage.hasMore).toBe(false);
        expect(thirdPage.nextCursor).toBeUndefined();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle comment with single character', async () => {
      const result = await commentService.createComment(userId, postId, userHandle, '!', postUserId, postSK);

      expect(result.comment.content).toBe('!');
    });

    it('should handle comment with unicode characters', async () => {
      const unicodeContent = 'Hello 世界 🌍 مرحبا';
      const result = await commentService.createComment(userId, postId, userHandle, unicodeContent, postUserId, postSK);

      expect(result.comment.content).toBe(unicodeContent);
    });

    it('should handle comment with newlines', async () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      const result = await commentService.createComment(userId, postId, userHandle, multilineContent, postUserId, postSK);

      expect(result.comment.content).toBe(multilineContent);
    });

    it('should handle very long userHandle', async () => {
      const longHandle = 'a'.repeat(30);
      const result = await commentService.createComment(userId, postId, longHandle, content, postUserId, postSK);

      expect(result.comment.userHandle).toBe(longHandle);
    });
  });
});
