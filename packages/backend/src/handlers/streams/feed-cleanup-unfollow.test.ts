/**
 * Test suite for feed-cleanup-unfollow stream processor
 *
 * Purpose: When a user unfollows another user, remove all feed items
 * from that author from the follower's feed
 *
 * @module feed-cleanup-unfollow.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { handler } from './feed-cleanup-unfollow.js';

// Hoist mocks for container-scope services
const mockFeedService = vi.hoisted(() => ({
  deleteFeedItemsForUser: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  FeedService: vi.fn(() => mockFeedService),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: mockLogger,
}));

/**
 * Helper function to create a DynamoDB stream record
 *
 * @param eventName - The type of stream event
 * @param pk - Primary key value
 * @param sk - Sort key value
 * @param oldImage - The old image data
 * @returns A DynamoDB record
 */
function createStreamRecord(
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE',
  pk: string,
  sk: string,
  oldImage?: Record<string, any>
): DynamoDBRecord {
  const record: DynamoDBRecord = {
    eventID: 'test-event-id',
    eventName,
    eventVersion: '1.1',
    eventSource: 'aws:dynamodb',
    awsRegion: 'us-east-1',
    dynamodb: {
      Keys: {
        PK: { S: pk },
        SK: { S: sk },
      },
      SequenceNumber: '1234567890',
      SizeBytes: 1000,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable/stream/2024-01-01T00:00:00.000',
  };

  if (oldImage && record.dynamodb) {
    record.dynamodb.OldImage = oldImage;
  }

  return record;
}

/**
 * Helper function to create a stream event
 *
 * @param records - Array of DynamoDB records
 * @returns A DynamoDB stream event
 */
function createStreamEvent(records: DynamoDBRecord[]): DynamoDBStreamEvent {
  return {
    Records: records,
  };
}

describe('feed-cleanup-unfollow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedService.deleteFeedItemsForUser.mockResolvedValue({ deletedCount: 0 });
  });

  describe('Event Filtering', () => {
    it('should process REMOVE events with SK starting with "FOLLOW#"', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#following-456#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456#2025-10-12T10:00:00Z' },
          followerId: { S: 'follower-123' },
          followingId: { S: 'following-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(
        'follower-123',
        'following-456'
      );
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(1);
    });

    it('should ignore INSERT events', async () => {
      const record = createStreamRecord(
        'INSERT',
        'USER#follower-123',
        'FOLLOW#following-456#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456#2025-10-12T10:00:00Z' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should ignore MODIFY events', async () => {
      const record = createStreamRecord(
        'MODIFY',
        'USER#follower-123',
        'FOLLOW#following-456#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456#2025-10-12T10:00:00Z' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should ignore REMOVE events with SK="POST"', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'POST#post-123',
        'POST',
        {
          PK: { S: 'POST#post-123' },
          SK: { S: 'POST' },
          postId: { S: 'post-123' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should ignore REMOVE events with SK="PROFILE"', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#user-123',
        'PROFILE',
        {
          PK: { S: 'USER#user-123' },
          SK: { S: 'PROFILE' },
          userId: { S: 'user-123' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should ignore REMOVE events with SK starting with "POST#"', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#author-123',
        'POST#2025-10-12T10:00:00Z#post-456',
        {
          PK: { S: 'USER#author-123' },
          SK: { S: 'POST#2025-10-12T10:00:00Z#post-456' },
          postId: { S: 'post-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should process multiple REMOVE events in a batch', async () => {
      const records = [
        createStreamRecord(
          'REMOVE',
          'USER#follower-1',
          'FOLLOW#following-a#2025-01-01T00:00:00Z',
          {
            PK: { S: 'USER#follower-1' },
            SK: { S: 'FOLLOW#following-a#2025-01-01T00:00:00Z' },
            followerId: { S: 'follower-1' },
            followingId: { S: 'following-a' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#follower-2',
          'FOLLOW#following-b#2025-01-02T00:00:00Z',
          {
            PK: { S: 'USER#follower-2' },
            SK: { S: 'FOLLOW#following-b#2025-01-02T00:00:00Z' },
            followerId: { S: 'follower-2' },
            followingId: { S: 'following-b' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#follower-3',
          'FOLLOW#following-c#2025-01-03T00:00:00Z',
          {
            PK: { S: 'USER#follower-3' },
            SK: { S: 'FOLLOW#following-c#2025-01-03T00:00:00Z' },
            followerId: { S: 'follower-3' },
            followingId: { S: 'following-c' },
          }
        ),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(3);
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenNthCalledWith(1, 'follower-1', 'following-a');
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenNthCalledWith(2, 'follower-2', 'following-b');
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenNthCalledWith(3, 'follower-3', 'following-c');
    });

    it('should filter mixed event types correctly', async () => {
      const records = [
        createStreamRecord('INSERT', 'USER#follower-1', 'FOLLOW#following-a#2025-01-01T00:00:00Z'),
        createStreamRecord(
          'REMOVE',
          'USER#follower-2',
          'FOLLOW#following-b#2025-01-02T00:00:00Z',
          {
            PK: { S: 'USER#follower-2' },
            SK: { S: 'FOLLOW#following-b#2025-01-02T00:00:00Z' },
            followerId: { S: 'follower-2' },
            followingId: { S: 'following-b' },
          }
        ),
        createStreamRecord('MODIFY', 'USER#follower-3', 'FOLLOW#following-c#2025-01-03T00:00:00Z'),
        createStreamRecord('REMOVE', 'POST#post-1', 'POST'),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(1);
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith('follower-2', 'following-b');
    });
  });

  describe('Unfollow Cleanup', () => {
    it('should call deleteFeedItemsForUser when user unfollows', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#alice',
        'FOLLOW#bob#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#alice' },
          SK: { S: 'FOLLOW#bob#2025-10-12T10:00:00Z' },
          followerId: { S: 'alice' },
          followingId: { S: 'bob' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith('alice', 'bob');
    });

    it('should extract followerId from PK correctly', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#unique-follower-id',
        'FOLLOW#some-following#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#unique-follower-id' },
          SK: { S: 'FOLLOW#some-following#2025-10-12T10:00:00Z' },
          followerId: { S: 'unique-follower-id' },
          followingId: { S: 'some-following' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(
        'unique-follower-id',
        'some-following'
      );
    });

    it('should extract followingId from SK correctly', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#unique-following-id#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#unique-following-id#2025-10-12T10:00:00Z' },
          followerId: { S: 'follower-123' },
          followingId: { S: 'unique-following-id' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(
        'follower-123',
        'unique-following-id'
      );
    });

    it('should handle SK format: FOLLOW#<userId>#<timestamp>', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#user-a',
        'FOLLOW#user-b#2025-10-12T15:30:45.123Z',
        {
          PK: { S: 'USER#user-a' },
          SK: { S: 'FOLLOW#user-b#2025-10-12T15:30:45.123Z' },
          followerId: { S: 'user-a' },
          followingId: { S: 'user-b' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith('user-a', 'user-b');
    });

    it('should log deletion statistics (deletedCount)', async () => {
      mockFeedService.deleteFeedItemsForUser.mockResolvedValueOnce({ deletedCount: 25 });

      const record = createStreamRecord(
        'REMOVE',
        'USER#active-follower',
        'FOLLOW#popular-user#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#active-follower' },
          SK: { S: 'FOLLOW#popular-user#2025-10-12T10:00:00Z' },
          followerId: { S: 'active-follower' },
          followingId: { S: 'popular-user' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleted feed items for unfollow',
        expect.objectContaining({
          userId: 'active-follower',
          authorId: 'popular-user',
          deletedCount: 25,
        })
      );
    });

    it('should handle unfollows with no feed items to delete', async () => {
      mockFeedService.deleteFeedItemsForUser.mockResolvedValueOnce({ deletedCount: 0 });

      const record = createStreamRecord(
        'REMOVE',
        'USER#follower',
        'FOLLOW#following#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower' },
          SK: { S: 'FOLLOW#following#2025-10-12T10:00:00Z' },
          followerId: { S: 'follower' },
          followingId: { S: 'following' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith('follower', 'following');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleted feed items for unfollow',
        expect.objectContaining({
          userId: 'follower',
          authorId: 'following',
          deletedCount: 0,
        })
      );
    });

    it('should handle missing followerId gracefully', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#following-456#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456#2025-10-12T10:00:00Z' },
          // Missing followerId field
          followingId: { S: 'following-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Missing followerId or followingId in unfollow record',
        expect.any(Object)
      );
    });

    it('should handle missing followingId gracefully', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#following-456#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456#2025-10-12T10:00:00Z' },
          followerId: { S: 'follower-123' },
          // Missing followingId field
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Missing followerId or followingId in unfollow record',
        expect.any(Object)
      );
    });

    it('should handle malformed OldImage gracefully', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#following-456#2025-10-12T10:00:00Z'
      );
      // No OldImage provided

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should handle SK with multiple hash separators', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower',
        'FOLLOW#user-with-hash#in-name#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#follower' },
          SK: { S: 'FOLLOW#user-with-hash#in-name#2025-10-12T10:00:00Z' },
          followerId: { S: 'follower' },
          followingId: { S: 'user-with-hash#in-name' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(
        'follower',
        'user-with-hash#in-name'
      );
    });
  });

  describe('Error Handling', () => {
    it('should continue processing if deleteFeedItemsForUser fails', async () => {
      mockFeedService.deleteFeedItemsForUser
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce({ deletedCount: 5 });

      const records = [
        createStreamRecord(
          'REMOVE',
          'USER#follower-1',
          'FOLLOW#following-1#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#follower-1' },
            SK: { S: 'FOLLOW#following-1#2025-10-12T10:00:00Z' },
            followerId: { S: 'follower-1' },
            followingId: { S: 'following-1' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#follower-2',
          'FOLLOW#following-2#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#follower-2' },
            SK: { S: 'FOLLOW#following-2#2025-10-12T10:00:00Z' },
            followerId: { S: 'follower-2' },
            followingId: { S: 'following-2' },
          }
        ),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting feed items for unfollow',
        expect.objectContaining({
          userId: 'follower-1',
          authorId: 'following-1',
          error: expect.any(Error),
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleted feed items for unfollow',
        expect.objectContaining({
          userId: 'follower-2',
          authorId: 'following-2',
          deletedCount: 5,
        })
      );
    });

    it('should not throw errors (prevent stream poisoning)', async () => {
      mockFeedService.deleteFeedItemsForUser.mockRejectedValue(new Error('Critical error'));

      const record = createStreamRecord(
        'REMOVE',
        'USER#error-follower',
        'FOLLOW#error-following#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#error-follower' },
          SK: { S: 'FOLLOW#error-following#2025-10-12T10:00:00Z' },
          followerId: { S: 'error-follower' },
          followingId: { S: 'error-following' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log errors with context', async () => {
      const error = new Error('Database connection failed');
      mockFeedService.deleteFeedItemsForUser.mockRejectedValue(error);

      const record = createStreamRecord(
        'REMOVE',
        'USER#context-follower',
        'FOLLOW#context-following#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#context-follower' },
          SK: { S: 'FOLLOW#context-following#2025-10-12T10:00:00Z' },
          followerId: { S: 'context-follower' },
          followingId: { S: 'context-following' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting feed items for unfollow',
        expect.objectContaining({
          userId: 'context-follower',
          authorId: 'context-following',
          error,
          record: expect.objectContaining({
            eventName: 'REMOVE',
          }),
        })
      );
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockFeedService.deleteFeedItemsForUser.mockRejectedValue(timeoutError);

      const record = createStreamRecord(
        'REMOVE',
        'USER#timeout-follower',
        'FOLLOW#timeout-following#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#timeout-follower' },
          SK: { S: 'FOLLOW#timeout-following#2025-10-12T10:00:00Z' },
          followerId: { S: 'timeout-follower' },
          followingId: { S: 'timeout-following' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting feed items for unfollow',
        expect.objectContaining({
          userId: 'timeout-follower',
          authorId: 'timeout-following',
          error: timeoutError,
        })
      );
    });

    it('should handle validation errors gracefully', async () => {
      const validationError = new Error('Invalid userId format');
      validationError.name = 'ValidationError';
      mockFeedService.deleteFeedItemsForUser.mockRejectedValue(validationError);

      const record = createStreamRecord(
        'REMOVE',
        'USER#invalid',
        'FOLLOW#invalid#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#invalid' },
          SK: { S: 'FOLLOW#invalid#2025-10-12T10:00:00Z' },
          followerId: { S: 'invalid' },
          followingId: { S: 'invalid' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting feed items for unfollow',
        expect.objectContaining({
          userId: 'invalid',
          authorId: 'invalid',
          error: validationError,
        })
      );
    });

    it('should handle partial batch failures', async () => {
      mockFeedService.deleteFeedItemsForUser
        .mockResolvedValueOnce({ deletedCount: 10 })
        .mockRejectedValueOnce(new Error('Middle error'))
        .mockResolvedValueOnce({ deletedCount: 15 });

      const records = [
        createStreamRecord(
          'REMOVE',
          'USER#success-1',
          'FOLLOW#author-1#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#success-1' },
            SK: { S: 'FOLLOW#author-1#2025-10-12T10:00:00Z' },
            followerId: { S: 'success-1' },
            followingId: { S: 'author-1' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#failure',
          'FOLLOW#author-2#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#failure' },
            SK: { S: 'FOLLOW#author-2#2025-10-12T10:00:00Z' },
            followerId: { S: 'failure' },
            followingId: { S: 'author-2' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#success-2',
          'FOLLOW#author-3#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#success-2' },
            SK: { S: 'FOLLOW#author-3#2025-10-12T10:00:00Z' },
            followerId: { S: 'success-2' },
            followingId: { S: 'author-3' },
          }
        ),
      ];

      await expect(handler(createStreamEvent(records))).resolves.not.toThrow();
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledTimes(2); // Two successes
      expect(mockLogger.error).toHaveBeenCalledTimes(1); // One failure
    });
  });

  describe('FeedService Integration', () => {
    it('should call FeedService.deleteFeedItemsForUser with correct userId and authorId', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#integration-follower',
        'FOLLOW#integration-author#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#integration-follower' },
          SK: { S: 'FOLLOW#integration-author#2025-10-12T10:00:00Z' },
          followerId: { S: 'integration-follower' },
          followingId: { S: 'integration-author' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(
        'integration-follower',
        'integration-author'
      );
      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      mockFeedService.deleteFeedItemsForUser.mockRejectedValue(
        new Error('DynamoDB service unavailable')
      );

      const record = createStreamRecord(
        'REMOVE',
        'USER#service-error-follower',
        'FOLLOW#service-error-author#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#service-error-follower' },
          SK: { S: 'FOLLOW#service-error-author#2025-10-12T10:00:00Z' },
          followerId: { S: 'service-error-follower' },
          followingId: { S: 'service-error-author' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should process service response correctly', async () => {
      mockFeedService.deleteFeedItemsForUser.mockResolvedValue({
        deletedCount: 35,
        processingTime: 300,
      });

      const record = createStreamRecord(
        'REMOVE',
        'USER#response-test-follower',
        'FOLLOW#response-test-author#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#response-test-follower' },
          SK: { S: 'FOLLOW#response-test-author#2025-10-12T10:00:00Z' },
          followerId: { S: 'response-test-follower' },
          followingId: { S: 'response-test-author' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleted feed items for unfollow',
        expect.objectContaining({
          userId: 'response-test-follower',
          authorId: 'response-test-author',
          deletedCount: 35,
        })
      );
    });

    it('should handle concurrent deletions', async () => {
      mockFeedService.deleteFeedItemsForUser
        .mockResolvedValueOnce({ deletedCount: 10 })
        .mockResolvedValueOnce({ deletedCount: 20 })
        .mockResolvedValueOnce({ deletedCount: 30 });

      const records = [
        createStreamRecord(
          'REMOVE',
          'USER#concurrent-1',
          'FOLLOW#author-1#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#concurrent-1' },
            SK: { S: 'FOLLOW#author-1#2025-10-12T10:00:00Z' },
            followerId: { S: 'concurrent-1' },
            followingId: { S: 'author-1' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#concurrent-2',
          'FOLLOW#author-2#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#concurrent-2' },
            SK: { S: 'FOLLOW#author-2#2025-10-12T10:00:00Z' },
            followerId: { S: 'concurrent-2' },
            followingId: { S: 'author-2' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'USER#concurrent-3',
          'FOLLOW#author-3#2025-10-12T10:00:00Z',
          {
            PK: { S: 'USER#concurrent-3' },
            SK: { S: 'FOLLOW#author-3#2025-10-12T10:00:00Z' },
            followerId: { S: 'concurrent-3' },
            followingId: { S: 'author-3' },
          }
        ),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });

    it('should maintain correct parameter order (userId, authorId)', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#the-follower',
        'FOLLOW#the-author#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#the-follower' },
          SK: { S: 'FOLLOW#the-author#2025-10-12T10:00:00Z' },
          followerId: { S: 'the-follower' },
          followingId: { S: 'the-author' },
        }
      );

      await handler(createStreamEvent([record]));

      const call = mockFeedService.deleteFeedItemsForUser.mock.calls[0];
      expect(call[0]).toBe('the-follower'); // First param is userId (follower)
      expect(call[1]).toBe('the-author'); // Second param is authorId (following)
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stream event', async () => {
      await expect(handler(createStreamEvent([]))).resolves.not.toThrow();
      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should handle records without dynamodb property', async () => {
      const record: DynamoDBRecord = {
        eventID: 'test-event-id',
        eventName: 'REMOVE',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable/stream/2024-01-01T00:00:00.000',
        // Missing dynamodb property
      };

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should handle records without Keys', async () => {
      const record: DynamoDBRecord = {
        eventID: 'test-event-id',
        eventName: 'REMOVE',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          SequenceNumber: '1234567890',
          SizeBytes: 1000,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
          // Missing Keys property
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable/stream/2024-01-01T00:00:00.000',
      };

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(mockFeedService.deleteFeedItemsForUser).not.toHaveBeenCalled();
    });

    it('should handle extremely long userId values', async () => {
      const longUserId = 'user-' + 'x'.repeat(1000);
      const record = createStreamRecord(
        'REMOVE',
        `USER#${longUserId}`,
        'FOLLOW#following-123#2025-10-12T10:00:00Z',
        {
          PK: { S: `USER#${longUserId}` },
          SK: { S: 'FOLLOW#following-123#2025-10-12T10:00:00Z' },
          followerId: { S: longUserId },
          followingId: { S: 'following-123' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(longUserId, 'following-123');
    });

    it('should handle special characters in userId', async () => {
      const specialUserId = 'user-123!@#$%^&*()_+-=[]{}|;:,.<>?';
      const record = createStreamRecord(
        'REMOVE',
        `USER#${specialUserId}`,
        'FOLLOW#following-456#2025-10-12T10:00:00Z',
        {
          PK: { S: `USER#${specialUserId}` },
          SK: { S: 'FOLLOW#following-456#2025-10-12T10:00:00Z' },
          followerId: { S: specialUserId },
          followingId: { S: 'following-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(specialUserId, 'following-456');
    });

    it('should handle SK without timestamp', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#following-456',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456' },
          followerId: { S: 'follower-123' },
          followingId: { S: 'following-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith('follower-123', 'following-456');
    });

    it('should handle numeric user IDs', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#123456',
        'FOLLOW#789012#2025-10-12T10:00:00Z',
        {
          PK: { S: 'USER#123456' },
          SK: { S: 'FOLLOW#789012#2025-10-12T10:00:00Z' },
          followerId: { S: '123456' },
          followingId: { S: '789012' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith('123456', '789012');
    });

    it('should handle UUID-format user IDs', async () => {
      const uuidFollower = '550e8400-e29b-41d4-a716-446655440000';
      const uuidFollowing = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const record = createStreamRecord(
        'REMOVE',
        `USER#${uuidFollower}`,
        `FOLLOW#${uuidFollowing}#2025-10-12T10:00:00Z`,
        {
          PK: { S: `USER#${uuidFollower}` },
          SK: { S: `FOLLOW#${uuidFollowing}#2025-10-12T10:00:00Z` },
          followerId: { S: uuidFollower },
          followingId: { S: uuidFollowing },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsForUser).toHaveBeenCalledWith(uuidFollower, uuidFollowing);
    });
  });
});