import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest';
import type { KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import type { FeedEvent } from '@social-media-app/shared';
import { handler } from './kinesis-feed-consumer.js';

// Mock RedisCacheService
const mockCachePost = vi.fn();
const mockMarkPostAsRead = vi.fn();
const mockInvalidatePost = vi.fn();
const mockGetCachedPost = vi.fn();

vi.mock('@social-media-app/dal', () => ({
  RedisCacheService: vi.fn().mockImplementation(() => ({
    cachePost: mockCachePost,
    markPostAsRead: mockMarkPostAsRead,
    invalidatePost: mockInvalidatePost,
    getCachedPost: mockGetCachedPost
  }))
}));

// Mock aws-config
vi.mock('../../utils/aws-config.js', () => ({
  createRedisClient: vi.fn().mockReturnValue({})
}));

// Suppress console logs during tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Reset all mocks
  mockCachePost.mockReset().mockResolvedValue(undefined);
  mockMarkPostAsRead.mockReset().mockResolvedValue(undefined);
  mockInvalidatePost.mockReset().mockResolvedValue(undefined);
  mockGetCachedPost.mockReset().mockResolvedValue(null);
});

/**
 * Helper to create a Kinesis event from feed events
 */
function createKinesisEvent(events: FeedEvent[]): KinesisStreamEvent {
  return {
    Records: events.map((event, i) => ({
      kinesis: {
        sequenceNumber: `seq-${i}`,
        data: Buffer.from(JSON.stringify(event)).toString('base64'),
        partitionKey: event.eventId,
        approximateArrivalTimestamp: Date.now() / 1000,
        kinesisSchemaVersion: '1.0'
      },
      eventID: `event-${i}`,
      eventName: 'aws:kinesis:record',
      eventVersion: '1.0',
      eventSource: 'aws:kinesis',
      awsRegion: 'us-east-1',
      eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/feed-stream',
      invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-role'
    }))
  };
}

/**
 * Helper to create a single Kinesis record
 */
function createKinesisRecord(event: any, sequenceNumber: string = 'seq-1'): KinesisStreamRecord {
  return {
    kinesis: {
      sequenceNumber,
      data: Buffer.from(JSON.stringify(event)).toString('base64'),
      partitionKey: event.eventId || 'partition-key',
      approximateArrivalTimestamp: Date.now() / 1000,
      kinesisSchemaVersion: '1.0'
    },
    eventID: 'event-1',
    eventName: 'aws:kinesis:record',
    eventVersion: '1.0',
    eventSource: 'aws:kinesis',
    awsRegion: 'us-east-1',
    eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/feed-stream',
    invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-role'
  };
}

describe('Kinesis Feed Consumer - Handler Tests', () => {
  test('processes batch of records successfully', async () => {
    const events: FeedEvent[] = [
      {
        eventId: 'evt-1',
        eventType: 'POST_CREATED',
        timestamp: '2025-01-13T10:00:00Z',
        userId: 'user-123',
        postId: 'post-456',
        authorId: 'user-123',
        authorHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        isPublic: true,
        createdAt: '2025-01-13T10:00:00Z'
      },
      {
        eventId: 'evt-2',
        eventType: 'POST_READ',
        timestamp: '2025-01-13T10:01:00Z',
        userId: 'user-789',
        postId: 'post-456'
      }
    ];

    const kinesisEvent = createKinesisEvent(events);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result).toEqual({ batchItemFailures: [] });
    expect(mockCachePost).toHaveBeenCalledTimes(1);
    expect(mockMarkPostAsRead).toHaveBeenCalledTimes(1);
  });

  test('returns batch item failures for invalid events', async () => {
    const kinesisEvent: KinesisStreamEvent = {
      Records: [
        createKinesisRecord({ invalid: 'event' }, 'seq-invalid'),
        createKinesisRecord({
          eventId: 'evt-1',
          eventType: 'POST_CREATED',
          timestamp: '2025-01-13T10:00:00Z',
          userId: 'user-123',
          postId: 'post-456',
          authorId: 'user-123',
          authorHandle: 'johndoe',
          isPublic: true,
          createdAt: '2025-01-13T10:00:00Z'
        }, 'seq-valid')
      ]
    };

    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('seq-invalid');
    expect(mockCachePost).toHaveBeenCalledTimes(1); // Valid event processed
  });

  test('handles empty batch', async () => {
    const kinesisEvent: KinesisStreamEvent = { Records: [] };
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result).toEqual({ batchItemFailures: [] });
    expect(mockCachePost).not.toHaveBeenCalled();
    expect(mockMarkPostAsRead).not.toHaveBeenCalled();
  });

  test('handles base64 decoding errors', async () => {
    const kinesisEvent: KinesisStreamEvent = {
      Records: [{
        kinesis: {
          sequenceNumber: 'seq-bad-encoding',
          data: 'not-valid-base64!!!',
          partitionKey: 'partition-key',
          approximateArrivalTimestamp: Date.now() / 1000,
          kinesisSchemaVersion: '1.0'
        },
        eventID: 'event-1',
        eventName: 'aws:kinesis:record',
        eventVersion: '1.0',
        eventSource: 'aws:kinesis',
        awsRegion: 'us-east-1',
        eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/feed-stream',
        invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-role'
      }]
    };

    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('seq-bad-encoding');
    expect(console.error).toHaveBeenCalled();
  });

  test('handles JSON parsing errors', async () => {
    const kinesisEvent: KinesisStreamEvent = {
      Records: [{
        kinesis: {
          sequenceNumber: 'seq-bad-json',
          data: Buffer.from('not-valid-json').toString('base64'),
          partitionKey: 'partition-key',
          approximateArrivalTimestamp: Date.now() / 1000,
          kinesisSchemaVersion: '1.0'
        },
        eventID: 'event-1',
        eventName: 'aws:kinesis:record',
        eventVersion: '1.0',
        eventSource: 'aws:kinesis',
        awsRegion: 'us-east-1',
        eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/feed-stream',
        invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-role'
      }]
    };

    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('seq-bad-json');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('Kinesis Feed Consumer - POST_CREATED Processing', () => {
  test('caches post metadata on POST_CREATED event', async () => {
    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_CREATED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-123',
      postId: 'post-456',
      authorId: 'user-123',
      authorHandle: 'johndoe',
      caption: 'Test post caption',
      imageUrl: 'https://example.com/image.jpg',
      isPublic: true,
      createdAt: '2025-01-13T10:00:00Z'
    };

    const kinesisEvent = createKinesisEvent([event]);
    await handler(kinesisEvent, {} as any, {} as any);

    expect(mockCachePost).toHaveBeenCalledWith('post-456', {
      id: 'post-456',
      authorId: 'user-123',
      authorHandle: 'johndoe',
      caption: 'Test post caption',
      imageUrl: 'https://example.com/image.jpg',
      isPublic: true,
      likesCount: 0,
      commentsCount: 0,
      createdAt: '2025-01-13T10:00:00Z'
    });
  });

  test('handles missing optional fields (caption, imageUrl)', async () => {
    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_CREATED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-123',
      postId: 'post-456',
      authorId: 'user-123',
      authorHandle: 'johndoe',
      isPublic: false,
      createdAt: '2025-01-13T10:00:00Z'
    };

    const kinesisEvent = createKinesisEvent([event]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockCachePost).toHaveBeenCalledWith('post-456', expect.objectContaining({
      id: 'post-456',
      authorId: 'user-123',
      authorHandle: 'johndoe',
      caption: undefined,
      imageUrl: undefined,
      isPublic: false
    }));
  });

  test('handles cache write errors gracefully', async () => {
    mockCachePost.mockRejectedValueOnce(new Error('Redis connection failed'));

    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_CREATED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-123',
      postId: 'post-456',
      authorId: 'user-123',
      authorHandle: 'johndoe',
      isPublic: true,
      createdAt: '2025-01-13T10:00:00Z'
    };

    const kinesisEvent = createKinesisEvent([event]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('seq-0');
    expect(console.error).toHaveBeenCalled();
  });

  test('validates event schema before processing', async () => {
    const invalidEvent = {
      eventId: 'evt-1',
      eventType: 'POST_CREATED',
      timestamp: '2025-01-13T10:00:00Z',
      // Missing required fields: userId, postId, authorId, authorHandle, isPublic, createdAt
    };

    const kinesisEvent = createKinesisEvent([invalidEvent as any]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockCachePost).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('Kinesis Feed Consumer - POST_READ Processing', () => {
  test('marks post as read for user', async () => {
    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_READ',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-789',
      postId: 'post-456'
    };

    const kinesisEvent = createKinesisEvent([event]);
    await handler(kinesisEvent, {} as any, {} as any);

    expect(mockMarkPostAsRead).toHaveBeenCalledWith('user-789', 'post-456');
    expect(console.log).toHaveBeenCalledWith(
      '[KinesisFeedConsumer] Processed POST_READ',
      { userId: 'user-789', postId: 'post-456' }
    );
  });

  test('handles cache errors gracefully', async () => {
    mockMarkPostAsRead.mockRejectedValueOnce(new Error('Redis error'));

    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_READ',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-789',
      postId: 'post-456'
    };

    const kinesisEvent = createKinesisEvent([event]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('seq-0');
  });

  test('validates event schema before processing', async () => {
    const invalidEvent = {
      eventId: 'evt-1',
      eventType: 'POST_READ',
      timestamp: '2025-01-13T10:00:00Z',
      // Missing required fields: userId, postId
    };

    const kinesisEvent = createKinesisEvent([invalidEvent as any]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockMarkPostAsRead).not.toHaveBeenCalled();
  });
});

describe('Kinesis Feed Consumer - POST_DELETED Processing', () => {
  test('invalidates post from cache', async () => {
    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_DELETED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-123',
      postId: 'post-456'
    };

    const kinesisEvent = createKinesisEvent([event]);
    await handler(kinesisEvent, {} as any, {} as any);

    expect(mockInvalidatePost).toHaveBeenCalledWith('post-456');
    expect(console.log).toHaveBeenCalledWith(
      '[KinesisFeedConsumer] Invalidated POST_DELETED',
      { postId: 'post-456' }
    );
  });

  test('handles cache errors gracefully', async () => {
    mockInvalidatePost.mockRejectedValueOnce(new Error('Redis error'));

    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_DELETED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-123',
      postId: 'post-456'
    };

    const kinesisEvent = createKinesisEvent([event]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('seq-0');
  });

  test('validates event schema before processing', async () => {
    const invalidEvent = {
      eventId: 'evt-1',
      eventType: 'POST_DELETED',
      timestamp: '2025-01-13T10:00:00Z',
      // Missing required fields: userId, postId
    };

    const kinesisEvent = createKinesisEvent([invalidEvent as any]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockInvalidatePost).not.toHaveBeenCalled();
  });
});

describe('Kinesis Feed Consumer - POST_LIKED Processing', () => {
  test('updates post likes count (optional)', async () => {
    // Mock getting cached post
    mockGetCachedPost.mockResolvedValueOnce({
      id: 'post-456',
      authorId: 'user-123',
      authorHandle: 'johndoe',
      caption: 'Test post',
      imageUrl: 'https://example.com/image.jpg',
      isPublic: true,
      likesCount: 5,
      commentsCount: 2,
      createdAt: '2025-01-13T10:00:00Z'
    });

    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_LIKED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-789',
      postId: 'post-456',
      likedBy: 'user-789'
    };

    const kinesisEvent = createKinesisEvent([event]);
    await handler(kinesisEvent, {} as any, {} as any);

    expect(mockGetCachedPost).toHaveBeenCalledWith('post-456');
    expect(mockCachePost).toHaveBeenCalledWith('post-456', expect.objectContaining({
      likesCount: 6 // Incremented from 5
    }));
  });

  test('handles cache miss gracefully', async () => {
    mockGetCachedPost.mockResolvedValueOnce(null);

    const event: FeedEvent = {
      eventId: 'evt-1',
      eventType: 'POST_LIKED',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-789',
      postId: 'post-456',
      likedBy: 'user-789'
    };

    const kinesisEvent = createKinesisEvent([event]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(0); // Cache miss is OK
    expect(mockCachePost).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });
});

describe('Kinesis Feed Consumer - Error Handling', () => {
  test('returns sequence number in batch item failures', async () => {
    const invalidEvent = { invalid: 'data' };
    const kinesisEvent = createKinesisEvent([invalidEvent as any]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0]).toEqual({ itemIdentifier: 'seq-0' });
  });

  test('continues processing after single record failure', async () => {
    const events = [
      { invalid: 'event' },
      {
        eventId: 'evt-2',
        eventType: 'POST_READ',
        timestamp: '2025-01-13T10:00:00Z',
        userId: 'user-789',
        postId: 'post-456'
      },
      {
        eventId: 'evt-3',
        eventType: 'POST_DELETED',
        timestamp: '2025-01-13T10:01:00Z',
        userId: 'user-123',
        postId: 'post-789'
      }
    ];

    const kinesisEvent = createKinesisEvent(events as any);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1); // Only the invalid event
    expect(mockMarkPostAsRead).toHaveBeenCalledTimes(1);
    expect(mockInvalidatePost).toHaveBeenCalledTimes(1);
  });

  test('logs errors with full context', async () => {
    const invalidEvent = { invalid: 'event' };
    const kinesisEvent = createKinesisEvent([invalidEvent as any]);

    await handler(kinesisEvent, {} as any, {} as any);

    expect(console.error).toHaveBeenCalledWith(
      '[KinesisFeedConsumer] Invalid event schema',
      expect.objectContaining({
        sequenceNumber: 'seq-0',
        error: expect.any(Object)
      })
    );
  });

  test('handles Zod validation failures', async () => {
    const malformedEvent = {
      eventId: 123, // Should be string
      eventType: 'INVALID_TYPE',
      timestamp: 'not-a-date'
    };

    const kinesisEvent = createKinesisEvent([malformedEvent as any]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[KinesisFeedConsumer]'),
      expect.any(Object)
    );
  });

  test('handles unknown event types', async () => {
    const unknownEvent = {
      eventId: 'evt-1',
      eventType: 'UNKNOWN_EVENT_TYPE',
      timestamp: '2025-01-13T10:00:00Z',
      userId: 'user-123',
      postId: 'post-456'
    };

    const kinesisEvent = createKinesisEvent([unknownEvent as any]);
    const result = await handler(kinesisEvent, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(console.error).toHaveBeenCalled();
  });
});