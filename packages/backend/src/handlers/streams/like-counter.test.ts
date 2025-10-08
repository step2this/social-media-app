/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { handler } from './like-counter.js';
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
      SK: { S: 'LIKE#user-456' }
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

describe('like-counter stream processor', () => {
  describe('INSERT events (like added)', () => {
    it('should increment likesCount when LIKE entity is inserted', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'LIKE#user-456',
            entityType: 'LIKE',
            userId: 'user-456',
            postId: 'post-123',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];
      expect(updateCommand.constructor.name).toBe('UpdateCommand');
      expect(updateCommand.input.TableName).toBe('test-table');
      expect(updateCommand.input.Key).toEqual({
        PK: 'POST#post-123',
        SK: 'POST'
      });
      expect(updateCommand.input.UpdateExpression).toBe('ADD likesCount :inc');
      expect(updateCommand.input.ExpressionAttributeValues).toEqual({
        ':inc': 1
      });
    });

    it('should process multiple INSERT events in batch', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'LIKE#user-1',
            entityType: 'LIKE',
            userId: 'user-1',
            postId: 'post-123',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'LIKE#user-2',
            entityType: 'LIKE',
            userId: 'user-2',
            postId: 'post-123',
            createdAt: '2024-01-01T00:00:01.000Z'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(2);
      sentCommands.forEach(command => {
        expect(command.constructor.name).toBe('UpdateCommand');
        expect(command.input.UpdateExpression).toBe('ADD likesCount :inc');
        expect(command.input.ExpressionAttributeValues).toEqual({ ':inc': 1 });
      });
    });
  });

  describe('REMOVE events (like removed)', () => {
    it('should decrement likesCount when LIKE entity is removed', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('REMOVE', undefined, {
            PK: 'POST#post-123',
            SK: 'LIKE#user-456',
            entityType: 'LIKE',
            userId: 'user-456',
            postId: 'post-123',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(sentCommands).toHaveLength(1);
      const updateCommand = sentCommands[0];
      expect(updateCommand.constructor.name).toBe('UpdateCommand');
      expect(updateCommand.input.UpdateExpression).toBe('ADD likesCount :dec');
      expect(updateCommand.input.ExpressionAttributeValues).toEqual({
        ':dec': -1
      });
    });
  });

  describe('filtering and error handling', () => {
    it('should only process LIKE entities', async () => {
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
          })
        ]
      };

      await handler(event);

      // Should only process the LIKE entity
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
            SK: 'LIKE#user-1',
            entityType: 'LIKE',
            userId: 'user-1'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'LIKE#user-2',
            entityType: 'LIKE',
            userId: 'user-2'
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
            SK: 'LIKE#user-789',
            entityType: 'LIKE',
            userId: 'user-789'
          })
        ]
      };

      await handler(event);

      const updateCommand = sentCommands[0];
      expect(updateCommand.input.Key.PK).toBe('POST#abc-123-def-456');
    });
  });
});
