/**
 * Test suite for feed-cleanup-post-delete stream processor
 *
 * Purpose: When a post is deleted, remove all feed items for that post
 * from all followers' feeds
 *
 * @module feed-cleanup-post-delete.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { handler } from './feed-cleanup-post-delete.js';

// Hoist mocks for container-scope services
const mockFeedService = vi.hoisted(() => ({
  deleteFeedItemsByPost: vi.fn(),
}));

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  FeedService: vi.fn(() => mockFeedService),
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

describe('feed-cleanup-post-delete', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedService.deleteFeedItemsByPost.mockResolvedValue({ deletedCount: 0 });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Event Filtering', () => {
    it('should process DELETE events with SK="POST"', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'POST#post-123',
        'POST',
        {
          PK: { S: 'POST#post-123' },
          SK: { S: 'POST' },
          id: { S: 'post-123' },
          userId: { S: 'author-456' },
          content: { S: 'Test post content' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: 'post-123' });
      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledTimes(1);
    });

    it('should ignore INSERT events', async () => {
      const record = createStreamRecord(
        'INSERT',
        'POST#post-123',
        'POST',
        {
          PK: { S: 'POST#post-123' },
          SK: { S: 'POST' },
          id: { S: 'post-123' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });

    it('should ignore MODIFY events', async () => {
      const record = createStreamRecord(
        'MODIFY',
        'POST#post-123',
        'POST',
        {
          PK: { S: 'POST#post-123' },
          SK: { S: 'POST' },
          id: { S: 'post-123' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });

    it('should ignore DELETE events with SK="PROFILE"', async () => {
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

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });

    it('should ignore DELETE events with SK starting with "FOLLOW#"', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#follower-123',
        'FOLLOW#following-456#2025-01-01T00:00:00Z',
        {
          PK: { S: 'USER#follower-123' },
          SK: { S: 'FOLLOW#following-456#2025-01-01T00:00:00Z' },
          followerId: { S: 'follower-123' },
          followingId: { S: 'following-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });

    it('should ignore DELETE events with SK starting with "POST#" (timestamped posts)', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'USER#author-123',
        'POST#2025-01-01T00:00:00Z#post-456',
        {
          PK: { S: 'USER#author-123' },
          SK: { S: 'POST#2025-01-01T00:00:00Z#post-456' },
          id: { S: 'post-456' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });

    it('should process multiple DELETE events in a batch', async () => {
      const records = [
        createStreamRecord(
          'REMOVE',
          'POST#post-1',
          'POST',
          {
            PK: { S: 'POST#post-1' },
            SK: { S: 'POST' },
            id: { S: 'post-1' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'POST#post-2',
          'POST',
          {
            PK: { S: 'POST#post-2' },
            SK: { S: 'POST' },
            id: { S: 'post-2' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'POST#post-3',
          'POST',
          {
            PK: { S: 'POST#post-3' },
            SK: { S: 'POST' },
            id: { S: 'post-3' },
          }
        ),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledTimes(3);
      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenNthCalledWith(1, { postId: 'post-1' });
      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenNthCalledWith(2, { postId: 'post-2' });
      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenNthCalledWith(3, { postId: 'post-3' });
    });

    it('should filter mixed event types correctly', async () => {
      const records = [
        createStreamRecord('INSERT', 'POST#post-1', 'POST'),
        createStreamRecord(
          'REMOVE',
          'POST#post-2',
          'POST',
          {
            PK: { S: 'POST#post-2' },
            SK: { S: 'POST' },
            id: { S: 'post-2' },
          }
        ),
        createStreamRecord('MODIFY', 'POST#post-3', 'POST'),
        createStreamRecord('REMOVE', 'USER#user-1', 'PROFILE'),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledTimes(1);
      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: 'post-2' });
    });
  });

  describe('Post Deletion Cleanup', () => {
    it('should call deleteFeedItemsByPost when post is deleted', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'POST#post-abc-123',
        'POST',
        {
          PK: { S: 'POST#post-abc-123' },
          SK: { S: 'POST' },
          id: { S: 'post-abc-123' },
          userId: { S: 'author-789' },
          content: { S: 'Content to be deleted' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: 'post-abc-123' });
    });

    it('should extract postId from deleted post entity', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'POST#unique-post-id',
        'POST',
        {
          PK: { S: 'POST#unique-post-id' },
          SK: { S: 'POST' },
          id: { S: 'unique-post-id' },
          userId: { S: 'user-123' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: 'unique-post-id' });
    });

    it('should handle posts with no feed items (no followers)', async () => {
      mockFeedService.deleteFeedItemsByPost.mockResolvedValueOnce({ deletedCount: 0 });

      const record = createStreamRecord(
        'REMOVE',
        'POST#lonely-post',
        'POST',
        {
          PK: { S: 'POST#lonely-post' },
          SK: { S: 'POST' },
          id: { S: 'lonely-post' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: 'lonely-post' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Cleaned up feed items',
        expect.objectContaining({
          postId: 'lonely-post',
          deletedCount: 0,
        })
      );
    });

    it('should log deletion statistics (deletedCount)', async () => {
      mockFeedService.deleteFeedItemsByPost.mockResolvedValueOnce({ deletedCount: 42 });

      const record = createStreamRecord(
        'REMOVE',
        'POST#popular-post',
        'POST',
        {
          PK: { S: 'POST#popular-post' },
          SK: { S: 'POST' },
          id: { S: 'popular-post' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Cleaned up feed items',
        expect.objectContaining({
          postId: 'popular-post',
          deletedCount: 42,
        })
      );
    });

    it('should handle missing postId gracefully', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'POST#post-123',
        'POST',
        {
          PK: { S: 'POST#post-123' },
          SK: { S: 'POST' },
          // Missing postId field
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Missing id in deleted post',
        expect.any(Object)
      );
    });

    it('should handle malformed OldImage gracefully', async () => {
      const record = createStreamRecord('REMOVE', 'POST#post-123', 'POST');
      // No OldImage provided

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing if deleteFeedItemsByPost fails', async () => {
      mockFeedService.deleteFeedItemsByPost
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce({ deletedCount: 5 });

      const records = [
        createStreamRecord(
          'REMOVE',
          'POST#failing-post',
          'POST',
          {
            PK: { S: 'POST#failing-post' },
            SK: { S: 'POST' },
            id: { S: 'failing-post' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'POST#success-post',
          'POST',
          {
            PK: { S: 'POST#success-post' },
            SK: { S: 'POST' },
            id: { S: 'success-post' },
          }
        ),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Error processing stream record:',
        expect.objectContaining({
          error: 'Service error',
          eventId: 'test-event-id',
          eventName: 'REMOVE'
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Cleaned up feed items',
        expect.objectContaining({
          postId: 'success-post',
          deletedCount: 5,
        })
      );
    });

    it('should not throw errors (prevent stream poisoning)', async () => {
      mockFeedService.deleteFeedItemsByPost.mockRejectedValue(new Error('Critical error'));

      const record = createStreamRecord(
        'REMOVE',
        'POST#error-post',
        'POST',
        {
          PK: { S: 'POST#error-post' },
          SK: { S: 'POST' },
          id: { S: 'error-post' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log errors with context', async () => {
      const error = new Error('Database connection failed');
      mockFeedService.deleteFeedItemsByPost.mockRejectedValue(error);

      const record = createStreamRecord(
        'REMOVE',
        'POST#context-post',
        'POST',
        {
          PK: { S: 'POST#context-post' },
          SK: { S: 'POST' },
          id: { S: 'context-post' },
          userId: { S: 'author-999' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Error processing stream record:',
        expect.objectContaining({
          error: 'Database connection failed',
          eventId: 'test-event-id',
          eventName: 'REMOVE'
        })
      );
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockFeedService.deleteFeedItemsByPost.mockRejectedValue(timeoutError);

      const record = createStreamRecord(
        'REMOVE',
        'POST#timeout-post',
        'POST',
        {
          PK: { S: 'POST#timeout-post' },
          SK: { S: 'POST' },
          id: { S: 'timeout-post' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Error processing stream record:',
        expect.objectContaining({
          error: 'Request timeout',
          eventId: 'test-event-id',
          eventName: 'REMOVE'
        })
      );
    });

    it('should handle validation errors gracefully', async () => {
      const validationError = new Error('Invalid postId format');
      validationError.name = 'ValidationError';
      mockFeedService.deleteFeedItemsByPost.mockRejectedValue(validationError);

      const record = createStreamRecord(
        'REMOVE',
        'POST#invalid',
        'POST',
        {
          PK: { S: 'POST#invalid' },
          SK: { S: 'POST' },
          id: { S: 'invalid' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Error processing stream record:',
        expect.objectContaining({
          error: 'Invalid postId format',
          eventId: 'test-event-id',
          eventName: 'REMOVE'
        })
      );
    });
  });

  describe('FeedService Integration', () => {
    it('should call FeedService.deleteFeedItemsByPost with correct postId', async () => {
      const record = createStreamRecord(
        'REMOVE',
        'POST#integration-test-post',
        'POST',
        {
          PK: { S: 'POST#integration-test-post' },
          SK: { S: 'POST' },
          id: { S: 'integration-test-post' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: 'integration-test-post' });
      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      mockFeedService.deleteFeedItemsByPost.mockRejectedValue(
        new Error('DynamoDB service unavailable')
      );

      const record = createStreamRecord(
        'REMOVE',
        'POST#service-error-post',
        'POST',
        {
          PK: { S: 'POST#service-error-post' },
          SK: { S: 'POST' },
          id: { S: 'service-error-post' },
        }
      );

      await expect(handler(createStreamEvent([record]))).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should process service response correctly', async () => {
      mockFeedService.deleteFeedItemsByPost.mockResolvedValue({
        deletedCount: 15,
        processingTime: 250,
      });

      const record = createStreamRecord(
        'REMOVE',
        'POST#response-test-post',
        'POST',
        {
          PK: { S: 'POST#response-test-post' },
          SK: { S: 'POST' },
          id: { S: 'response-test-post' },
        }
      );

      await handler(createStreamEvent([record]));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FeedCleanupPostDelete] Cleaned up feed items',
        expect.objectContaining({
          postId: 'response-test-post',
          deletedCount: 15,
        })
      );
    });

    it('should handle concurrent deletions', async () => {
      mockFeedService.deleteFeedItemsByPost
        .mockResolvedValueOnce({ deletedCount: 10 })
        .mockResolvedValueOnce({ deletedCount: 20 })
        .mockResolvedValueOnce({ deletedCount: 30 });

      const records = [
        createStreamRecord(
          'REMOVE',
          'POST#concurrent-1',
          'POST',
          {
            PK: { S: 'POST#concurrent-1' },
            SK: { S: 'POST' },
            id: { S: 'concurrent-1' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'POST#concurrent-2',
          'POST',
          {
            PK: { S: 'POST#concurrent-2' },
            SK: { S: 'POST' },
            id: { S: 'concurrent-2' },
          }
        ),
        createStreamRecord(
          'REMOVE',
          'POST#concurrent-3',
          'POST',
          {
            PK: { S: 'POST#concurrent-3' },
            SK: { S: 'POST' },
            id: { S: 'concurrent-3' },
          }
        ),
      ];

      await handler(createStreamEvent(records));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stream event', async () => {
      await expect(handler(createStreamEvent([]))).resolves.not.toThrow();
      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
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
      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
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
      expect(mockFeedService.deleteFeedItemsByPost).not.toHaveBeenCalled();
    });

    it('should handle extremely long postId', async () => {
      const longPostId = 'post-' + 'x'.repeat(1000);
      const record = createStreamRecord(
        'REMOVE',
        `POST#${longPostId}`,
        'POST',
        {
          PK: { S: `POST#${longPostId}` },
          SK: { S: 'POST' },
          id: { S: longPostId },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: longPostId });
    });

    it('should handle special characters in postId', async () => {
      const specialPostId = 'post-123!@#$%^&*()_+-=[]{}|;:,.<>?';
      const record = createStreamRecord(
        'REMOVE',
        `POST#${specialPostId}`,
        'POST',
        {
          PK: { S: `POST#${specialPostId}` },
          SK: { S: 'POST' },
          id: { S: specialPostId },
        }
      );

      await handler(createStreamEvent([record]));

      expect(mockFeedService.deleteFeedItemsByPost).toHaveBeenCalledWith({ postId: specialPostId });
    });
  });
});