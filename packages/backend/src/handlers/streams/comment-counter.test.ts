/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { handler } from './comment-counter.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK
vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => mockDynamoClient),
  getTableName: vi.fn(() => 'test-table')
}));

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);
      return { $metadata: {} };
    })
  } as unknown as DynamoDBDocumentClient;
});

/**
 * Helper to create a DynamoDB Stream record
 */
const createStreamRecord = (
  eventName: 'INSERT' | 'REMOVE',
  newImage?: Record<string, any>,
  oldImage?: Record<string, any>
): DynamoDBRecord => ({
  eventID: 'test-event-id',
  eventName,
  eventVersion: '1.1',
  eventSource: 'aws:dynamodb',
  awsRegion: 'us-east-1',
  dynamodb: {
    Keys: {
      PK: { S: 'POST#post-123' },
      SK: { S: 'COMMENT#comment-456' }
    },
    NewImage: newImage ? convertToAttributeValue(newImage) : undefined,
    OldImage: oldImage ? convertToAttributeValue(oldImage) : undefined,
    SequenceNumber: '123',
    SizeBytes: 100,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  }
});

/**
 * Convert plain object to DynamoDB AttributeValue format
 */
const convertToAttributeValue = (obj: Record<string, any>): any => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = { S: value };
    } else if (typeof value === 'number') {
      result[key] = { N: String(value) };
    } else if (typeof value === 'boolean') {
      result[key] = { BOOL: value };
    }
  }
  return result;
};

describe('comment-counter stream processor', () => {
  describe('INSERT events (comment added)', () => {
    it('should increment commentsCount when COMMENT entity is inserted', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            commentId: 'comment-456',
            content: 'Great post!',
            createdAt: '2024-01-01T00:00:00.000Z',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];
      expect(updateCommand.constructor.name).toBe('UpdateCommand');
      expect(updateCommand.input.TableName).toBe('test-table');
      expect(updateCommand.input.Key).toEqual({
        PK: 'USER#user-owner-123',
        SK: 'POST#2024-01-01T00:00:00.000Z#post-123'
      });
      expect(updateCommand.input.UpdateExpression).toBe('ADD commentsCount :delta');
      expect(updateCommand.input.ExpressionAttributeValues).toEqual({
        ':delta': 1
      });
    });

    it('should process multiple INSERT events in batch', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-1',
            entityType: 'COMMENT',
            userId: 'user-1',
            postId: 'post-123',
            commentId: 'comment-1',
            content: 'First comment',
            createdAt: '2024-01-01T00:00:00.000Z',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-2',
            entityType: 'COMMENT',
            userId: 'user-2',
            postId: 'post-123',
            commentId: 'comment-2',
            content: 'Second comment',
            createdAt: '2024-01-01T00:00:01.000Z',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(2);
      sentCommands.forEach(command => {
        expect(command.constructor.name).toBe('UpdateCommand');
        expect(command.input.UpdateExpression).toBe('ADD commentsCount :delta');
        expect(command.input.ExpressionAttributeValues).toEqual({ ':delta': 1 });
      });
    });
  });

  describe('REMOVE events (comment deleted)', () => {
    it('should decrement commentsCount when COMMENT entity is removed', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('REMOVE', undefined, {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            commentId: 'comment-456',
            content: 'Great post!',
            createdAt: '2024-01-01T00:00:00.000Z',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];
      expect(updateCommand.constructor.name).toBe('UpdateCommand');
      expect(updateCommand.input.UpdateExpression).toBe('ADD commentsCount :delta');
      expect(updateCommand.input.ExpressionAttributeValues).toEqual({
        ':delta': -1
      });
    });
  });

  describe('filtering and error handling', () => {
    it('should only process COMMENT entities', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'POST',
            entityType: 'POST',
            title: 'My Post'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'LIKE#user-456',
            entityType: 'LIKE',
            userId: 'user-456'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-789',
            entityType: 'COMMENT',
            userId: 'user-789',
            content: 'Nice!',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      // Should only process the COMMENT entity
      expect(sentCommands).toHaveLength(1);
    });

    it('should handle events without entityType gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-1'
          })
        ]
      };

      await handler(event);

      // Should not process records without entityType
      expect(sentCommands).toHaveLength(0);
    });

    it('should continue processing if one record fails', async () => {
      mockDynamoClient.send = vi.fn()
        .mockRejectedValueOnce(new Error('DynamoDB error'))
        .mockResolvedValueOnce({ $metadata: {} });

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-1',
            entityType: 'COMMENT',
            userId: 'user-1',
            content: 'First',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#comment-2',
            entityType: 'COMMENT',
            userId: 'user-2',
            content: 'Second',
            postUserId: 'user-owner-456',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-456'
          })
        ]
      };

      await handler(event);

      // Should attempt to process both records
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('extracting postId from PK', () => {
    it('should correctly extract postId from PK', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#abc-123-def-456',
            SK: 'COMMENT#comment-789',
            entityType: 'COMMENT',
            userId: 'user-789',
            content: 'Comment on complex post ID',
            postUserId: 'user-owner-789',
            postSK: 'POST#2024-01-01T00:00:00.000Z#abc-123-def-456'
          })
        ]
      };

      await handler(event);

      const updateCommand = sentCommands[0];
      expect(updateCommand.input.Key.PK).toBe('USER#user-owner-789');
      expect(updateCommand.input.Key.SK).toBe('POST#2024-01-01T00:00:00.000Z#abc-123-def-456');
    });
  });

  describe('post metadata extraction (event-driven design)', () => {
    it('should extract post metadata from COMMENT entity and update actual post', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            commentId: 'comment-456',
            content: 'Great post!',
            createdAt: '2024-01-01T00:00:00.000Z',
            postUserId: 'user-owner-123',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];
      expect(updateCommand.constructor.name).toBe('UpdateCommand');
      expect(updateCommand.input.Key).toEqual({
        PK: 'USER#user-owner-123',
        SK: 'POST#2024-01-01T00:00:00.000Z#post-123'
      });
      expect(updateCommand.input.UpdateExpression).toBe('ADD commentsCount :delta');
      expect(updateCommand.input.ExpressionAttributeValues).toEqual({
        ':delta': 1
      });
    });

    it('should NOT update zombie counter entity', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            commentId: 'comment-456',
            content: 'Great post!',
            createdAt: '2024-01-01T00:00:00.000Z',
            postUserId: 'user-owner-456',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];

      // Should NOT be updating zombie counter entity
      expect(updateCommand.input.Key).not.toEqual({
        PK: 'POST#post-123',
        SK: 'POST'
      });

      // Should be updating actual post entity
      expect(updateCommand.input.Key.PK).toBe('USER#user-owner-456');
      expect(updateCommand.input.Key.SK).toBe('POST#2024-01-01T00:00:00.000Z#post-123');
    });

    it('should handle missing postUserId gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            content: 'Great post!',
            // Missing postUserId and postSK
          })
        ]
      };

      await handler(event);

      // Should not send any update commands
      expect(sentCommands).toHaveLength(0);

      // Should log error about missing metadata
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing post metadata'),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing postSK gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            content: 'Great post!',
            postUserId: 'user-owner-123'
            // Missing postSK
          })
        ]
      };

      await handler(event);

      // Should not send any update commands
      expect(sentCommands).toHaveLength(0);

      // Should log error about missing metadata
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing post metadata'),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should update actual post entity for REMOVE events', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('REMOVE', undefined, {
            PK: 'POST#post-123',
            SK: 'COMMENT#comment-456',
            entityType: 'COMMENT',
            userId: 'user-789',
            postId: 'post-123',
            commentId: 'comment-456',
            content: 'Great post!',
            createdAt: '2024-01-01T00:00:00.000Z',
            postUserId: 'user-owner-789',
            postSK: 'POST#2024-01-01T00:00:00.000Z#post-123'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];
      expect(updateCommand.input.Key).toEqual({
        PK: 'USER#user-owner-789',
        SK: 'POST#2024-01-01T00:00:00.000Z#post-123'
      });
      expect(updateCommand.input.ExpressionAttributeValues).toEqual({
        ':delta': -1
      });
    });
  });
});
