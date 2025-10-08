/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { handler } from './follow-counter.js';
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
      PK: { S: 'USER#follower-123' },
      SK: { S: 'FOLLOW#followee-456' }
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

describe('follow-counter stream processor', () => {
  describe('INSERT events (follow added)', () => {
    it('should increment followingCount and followersCount when FOLLOW entity is inserted', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should send 2 update commands (one for follower, one for followee)
      expect(sentCommands).toHaveLength(2);

      // First command: Update follower's followingCount
      const followerUpdate = sentCommands[0];
      expect(followerUpdate.constructor.name).toBe('UpdateCommand');
      expect(followerUpdate.input.TableName).toBe('test-table');
      expect(followerUpdate.input.Key).toEqual({
        PK: 'USER#follower-123',
        SK: 'PROFILE'
      });
      expect(followerUpdate.input.UpdateExpression).toBe('ADD followingCount :inc');
      expect(followerUpdate.input.ExpressionAttributeValues).toEqual({
        ':inc': 1
      });

      // Second command: Update followee's followersCount
      const followeeUpdate = sentCommands[1];
      expect(followeeUpdate.constructor.name).toBe('UpdateCommand');
      expect(followeeUpdate.input.TableName).toBe('test-table');
      expect(followeeUpdate.input.Key).toEqual({
        PK: 'USER#followee-456',
        SK: 'PROFILE'
      });
      expect(followeeUpdate.input.UpdateExpression).toBe('ADD followersCount :inc');
      expect(followeeUpdate.input.ExpressionAttributeValues).toEqual({
        ':inc': 1
      });
    });

    it('should process multiple INSERT events in batch', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-1',
            SK: 'FOLLOW#user-2',
            GSI2PK: 'USER#user-2',
            GSI2SK: 'FOLLOWER#user-1',
            entityType: 'FOLLOW',
            followerId: 'user-1',
            followeeId: 'user-2',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#user-3',
            SK: 'FOLLOW#user-2',
            GSI2PK: 'USER#user-2',
            GSI2SK: 'FOLLOWER#user-3',
            entityType: 'FOLLOW',
            followerId: 'user-3',
            followeeId: 'user-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          })
        ]
      };

      await handler(event);

      // Should send 4 update commands (2 records × 2 updates each)
      expect(sentCommands).toHaveLength(4);
    });
  });

  describe('REMOVE events (follow removed)', () => {
    it('should decrement followingCount and followersCount when FOLLOW entity is removed', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('REMOVE', undefined, {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should send 2 update commands
      expect(sentCommands).toHaveLength(2);

      // First command: Decrement follower's followingCount
      const followerUpdate = sentCommands[0];
      expect(followerUpdate.input.UpdateExpression).toBe('ADD followingCount :dec');
      expect(followerUpdate.input.ExpressionAttributeValues).toEqual({
        ':dec': -1
      });

      // Second command: Decrement followee's followersCount
      const followeeUpdate = sentCommands[1];
      expect(followeeUpdate.input.UpdateExpression).toBe('ADD followersCount :dec');
      expect(followeeUpdate.input.ExpressionAttributeValues).toEqual({
        ':dec': -1
      });
    });
  });

  describe('filtering and error handling', () => {
    it('should only process FOLLOW entities', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-123',
            SK: 'POST',
            entityType: 'POST',
            title: 'My Post'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#user-1',
            SK: 'FOLLOW#user-2',
            GSI2PK: 'USER#user-2',
            GSI2SK: 'FOLLOWER#user-1',
            entityType: 'FOLLOW',
            followerId: 'user-1',
            followeeId: 'user-2'
          })
        ]
      };

      await handler(event);

      // Should only process the FOLLOW entity (2 updates)
      expect(sentCommands).toHaveLength(2);
    });

    it('should handle events without entityType gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'PROFILE'
          })
        ]
      };

      await handler(event);

      // Should not process records without entityType
      expect(sentCommands).toHaveLength(0);
    });

    it('should continue processing if one update fails', async () => {
      mockDynamoClient.send = vi.fn()
        .mockRejectedValueOnce(new Error('DynamoDB error'))
        .mockResolvedValueOnce({ $metadata: {} });

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-1',
            SK: 'FOLLOW#user-2',
            GSI2PK: 'USER#user-2',
            GSI2SK: 'FOLLOWER#user-1',
            entityType: 'FOLLOW',
            followerId: 'user-1',
            followeeId: 'user-2'
          })
        ]
      };

      await handler(event);

      // Should attempt both updates despite first one failing
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('extracting follower and followee IDs from PK and GSI2PK', () => {
    it('should correctly extract follower and followee IDs', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#abc-123-def',
            SK: 'FOLLOW#xyz-789-ghi',
            GSI2PK: 'USER#xyz-789-ghi',
            GSI2SK: 'FOLLOWER#abc-123-def',
            entityType: 'FOLLOW',
            followerId: 'abc-123-def',
            followeeId: 'xyz-789-ghi'
          })
        ]
      };

      await handler(event);

      const followerUpdate = sentCommands[0];
      expect(followerUpdate.input.Key.PK).toBe('USER#abc-123-def');

      const followeeUpdate = sentCommands[1];
      expect(followeeUpdate.input.Key.PK).toBe('USER#xyz-789-ghi');
    });
  });
});
