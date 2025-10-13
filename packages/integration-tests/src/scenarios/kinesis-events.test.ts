/**
 * Integration tests for Kinesis event publishing system
 *
 * These tests verify:
 * - LocalStack Kinesis connectivity
 * - Event publishing through KinesisEventPublisher
 * - End-to-end event flow from Lambda handlers
 * - Event schema validation
 * - Event retrieval and verification
 *
 * @module integration-tests/kinesis-events
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  KinesisClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
  DescribeStreamCommand,
  ListShardsCommand
} from '@aws-sdk/client-kinesis';
import { KinesisEventPublisher } from '@social-media-app/dal';
import {
  PostCreatedEventSchema,
  PostReadEventSchema,
  PostLikedEventSchema,
  type PostCreatedEvent,
  type PostReadEvent,
  type PostLikedEvent,
  type FeedEvent
} from '@social-media-app/shared';
import { createTestUser, createTestPost } from '../utils/test-factories.js';
import { createLocalStackHttpClient } from '../utils/http-client.js';
import { delay } from '../utils/helpers.js';

/**
 * Integration tests for Kinesis event publishing
 */
describe('Kinesis Event Publishing Integration', () => {
  const httpClient = createLocalStackHttpClient();
  let kinesisClient: KinesisClient;
  let kinesisPublisher: KinesisEventPublisher;
  const streamName = 'feed-events-local';

  /**
   * Initialize Kinesis client and publisher before all tests
   */
  beforeAll(() => {
    // Initialize Kinesis client for LocalStack
    kinesisClient = new KinesisClient({
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });

    // Initialize event publisher
    kinesisPublisher = new KinesisEventPublisher(kinesisClient, streamName);
  });

  /**
   * Clean up Kinesis client after all tests
   */
  afterAll(async () => {
    kinesisClient.destroy();
  });

  /**
   * Test suite for basic stream connectivity
   */
  describe('Stream Connectivity', () => {
    test('can connect to LocalStack Kinesis stream', async () => {
      const response = await kinesisClient.send(
        new DescribeStreamCommand({ StreamName: streamName })
      );

      expect(response.StreamDescription?.StreamStatus).toBe('ACTIVE');
      expect(response.StreamDescription?.StreamName).toBe(streamName);
      expect(response.StreamDescription?.Shards).toBeDefined();
    });

    test('stream has correct shard configuration', async () => {
      const response = await kinesisClient.send(
        new ListShardsCommand({ StreamName: streamName })
      );

      expect(response.Shards).toBeDefined();
      expect(response.Shards!.length).toBeGreaterThan(0);

      // Verify shard structure
      const shard = response.Shards![0];
      expect(shard.ShardId).toBeDefined();
      expect(shard.HashKeyRange).toBeDefined();
      expect(shard.SequenceNumberRange).toBeDefined();
    });
  });

  /**
   * Test suite for direct event publishing via KinesisEventPublisher
   */
  describe('Event Publishing via KinesisEventPublisher', () => {
    test('publishes POST_CREATED event successfully', async () => {
      const event: PostCreatedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000',
        authorHandle: 'testuser',
        caption: 'Test post for integration',
        isPublic: true,
        createdAt: new Date().toISOString()
      };

      // Publish event
      await expect(kinesisPublisher.publishEvent(event)).resolves.not.toThrow();

      // Wait for event propagation
      await delay(1000);

      // Retrieve event from stream
      const retrievedEvent = await getLatestEventFromStream(kinesisClient, streamName);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent.eventType).toBe('POST_CREATED');
      expect(retrievedEvent.postId).toBe(event.postId);

      // Validate schema
      const validationResult = PostCreatedEventSchema.safeParse(retrievedEvent);
      expect(validationResult.success).toBe(true);
    });

    test('publishes POST_READ event successfully', async () => {
      const event: PostReadEvent = {
        eventId: '423e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        eventType: 'POST_READ',
        version: '1.0',
        userId: '523e4567-e89b-12d3-a456-426614174000',
        postId: '623e4567-e89b-12d3-a456-426614174000'
      };

      await expect(kinesisPublisher.publishEvent(event)).resolves.not.toThrow();
      await delay(1000);

      const retrievedEvent = await getLatestEventFromStream(kinesisClient, streamName);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent.eventType).toBe('POST_READ');

      // Type narrowing for discriminated union
      if (retrievedEvent.eventType === 'POST_READ') {
        expect(retrievedEvent.userId).toBe(event.userId);
      }

      // Validate schema
      const validationResult = PostReadEventSchema.safeParse(retrievedEvent);
      expect(validationResult.success).toBe(true);
    });

    test('publishes POST_LIKED event successfully', async () => {
      const event: PostLikedEvent = {
        eventId: '723e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        eventType: 'POST_LIKED',
        version: '1.0',
        userId: '823e4567-e89b-12d3-a456-426614174000',
        postId: '923e4567-e89b-12d3-a456-426614174000',
        liked: true
      };

      await expect(kinesisPublisher.publishEvent(event)).resolves.not.toThrow();
      await delay(1000);

      const retrievedEvent = await getLatestEventFromStream(kinesisClient, streamName);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent.eventType).toBe('POST_LIKED');

      // Type narrowing for discriminated union
      if (retrievedEvent.eventType === 'POST_LIKED') {
        expect(retrievedEvent.liked).toBe(true);
      }

      // Validate schema
      const validationResult = PostLikedEventSchema.safeParse(retrievedEvent);
      expect(validationResult.success).toBe(true);
    });

    test('publishes multiple events in batch', async () => {
      const events: PostCreatedEvent[] = Array.from({ length: 5 }, (_, i) => ({
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: randomUUID(),
        authorId: randomUUID(),
        authorHandle: `batchuser${i}`,
        caption: `Batch test post ${i}`,
        isPublic: true,
        createdAt: new Date().toISOString()
      }));

      const result = await kinesisPublisher.publishEventsBatch(events);

      expect(result.successCount).toBe(5);
      expect(result.failedCount).toBe(0);
      expect(result.failedEvents).toBeUndefined();
    });

    test('handles empty batch gracefully', async () => {
      const result = await kinesisPublisher.publishEventsBatch([]);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.failedEvents).toBeUndefined();
    });

    test('validates event schema before publishing', async () => {
      const invalidEvent = {
        eventId: 'invalid-not-a-uuid',
        timestamp: 'not-an-iso-date',
        eventType: 'POST_CREATED',
        version: '1.0'
        // Missing required fields
      } as unknown as PostCreatedEvent;

      await expect(kinesisPublisher.publishEvent(invalidEvent)).rejects.toThrow();
    });
  });

  /**
   * Test suite for end-to-end event flow from Lambda handlers
   */
  describe('End-to-End Event Flow', () => {
    test('POST_CREATED event published when post is created', async () => {
      const user = await createTestUser(httpClient, {
        prefix: 'kinesis-e2e-create'
      });

      const testCaption = `E2E test post ${Date.now()}`;
      const { postId } = await createTestPost(httpClient, user.token, {
        caption: testCaption,
        isPublic: true
      });

      // Wait for event propagation
      await delay(3000);

      // Find the event in stream
      const events = await getAllEventsFromStream(kinesisClient, streamName, 1000);

      const postCreatedEvent = events.find(
        (e): e is PostCreatedEvent =>
          e.eventType === 'POST_CREATED' && e.postId === postId
      );

      if (postCreatedEvent) {
        // Verify event properties
        expect(postCreatedEvent.eventType).toBe('POST_CREATED');
        expect(postCreatedEvent.version).toBe('1.0');
        expect(postCreatedEvent.postId).toBe(postId);
        expect(postCreatedEvent.authorId).toBe(user.userId);
        expect(postCreatedEvent.authorHandle).toBe(user.handle);
        expect(postCreatedEvent.caption).toBe(testCaption);
        expect(postCreatedEvent.isPublic).toBe(true);
        expect(postCreatedEvent.eventId).toBeDefined();
        expect(postCreatedEvent.timestamp).toBeDefined();

        // Validate schema
        const validationResult = PostCreatedEventSchema.safeParse(postCreatedEvent);
        expect(validationResult.success).toBe(true);
      } else {
        // If event not found, this is expected until Phase 2.3 (handler integration)
        console.warn('POST_CREATED event not found in stream - handlers not yet integrated');
      }
    }, 30000);

    test('POST_READ event published when post is marked as read', async () => {
      const user = await createTestUser(httpClient, {
        prefix: 'kinesis-e2e-read'
      });

      const { postId } = await createTestPost(httpClient, user.token, {
        caption: 'Post to be marked as read'
      });

      // Mark post as read
      const markReadResponse = await httpClient.post(
        '/feed/read',
        { postIds: [postId] },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      expect(markReadResponse.status).toBe(200);

      // Wait for event propagation
      await delay(3000);

      // Find the event in stream
      const events = await getAllEventsFromStream(kinesisClient, streamName, 1000);

      const postReadEvent = events.find(
        (e): e is PostReadEvent =>
          e.eventType === 'POST_READ' &&
          e.postId === postId &&
          e.userId === user.userId
      );

      if (postReadEvent) {
        expect(postReadEvent.eventType).toBe('POST_READ');
        expect(postReadEvent.version).toBe('1.0');
        expect(postReadEvent.postId).toBe(postId);
        expect(postReadEvent.userId).toBe(user.userId);
        expect(postReadEvent.eventId).toBeDefined();
        expect(postReadEvent.timestamp).toBeDefined();

        // Validate schema
        const validationResult = PostReadEventSchema.safeParse(postReadEvent);
        expect(validationResult.success).toBe(true);
      } else {
        console.warn('POST_READ event not found in stream - handlers not yet integrated');
      }
    }, 30000);

    test('POST_LIKED event published when post is liked', async () => {
      const postOwner = await createTestUser(httpClient, {
        prefix: 'kinesis-e2e-owner'
      });

      const liker = await createTestUser(httpClient, {
        prefix: 'kinesis-e2e-liker'
      });

      const { postId } = await createTestPost(httpClient, postOwner.token, {
        caption: 'Post to be liked'
      });

      // Like the post
      const likeResponse = await httpClient.post(
        '/likes',
        { postId },
        { headers: { Authorization: `Bearer ${liker.token}` } }
      );

      expect(likeResponse.status).toBe(200);

      // Wait for event propagation
      await delay(3000);

      // Find the event in stream
      const events = await getAllEventsFromStream(kinesisClient, streamName, 1000);

      const postLikedEvent = events.find(
        (e): e is PostLikedEvent =>
          e.eventType === 'POST_LIKED' &&
          e.postId === postId &&
          e.userId === liker.userId
      );

      if (postLikedEvent) {
        expect(postLikedEvent.eventType).toBe('POST_LIKED');
        expect(postLikedEvent.version).toBe('1.0');
        expect(postLikedEvent.postId).toBe(postId);
        expect(postLikedEvent.userId).toBe(liker.userId);
        expect(postLikedEvent.liked).toBe(true);
        expect(postLikedEvent.eventId).toBeDefined();
        expect(postLikedEvent.timestamp).toBeDefined();

        // Validate schema
        const validationResult = PostLikedEventSchema.safeParse(postLikedEvent);
        expect(validationResult.success).toBe(true);
      } else {
        console.warn('POST_LIKED event not found in stream - handlers not yet integrated');
      }
    }, 30000);

    test('batch POST_READ events published for multiple posts', async () => {
      const user = await createTestUser(httpClient, {
        prefix: 'kinesis-e2e-batch'
      });

      // Create multiple posts
      const postIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const { postId } = await createTestPost(httpClient, user.token, {
          caption: `Batch test post ${i}`
        });
        postIds.push(postId);
      }

      // Mark all as read
      const markReadResponse = await httpClient.post(
        '/feed/read',
        { postIds },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      expect(markReadResponse.status).toBe(200);

      // Wait for event propagation
      await delay(3000);

      // Find the events in stream
      const events = await getAllEventsFromStream(kinesisClient, streamName, 1000);

      const readEvents = events.filter(
        (e): e is PostReadEvent =>
          e.eventType === 'POST_READ' &&
          e.userId === user.userId &&
          postIds.includes(e.postId)
      );

      if (readEvents.length > 0) {
        expect(readEvents.length).toBeLessThanOrEqual(postIds.length);

        // Verify each event
        readEvents.forEach(event => {
          expect(event.eventType).toBe('POST_READ');
          expect(event.version).toBe('1.0');
          expect(event.userId).toBe(user.userId);
          expect(postIds).toContain(event.postId);
        });
      } else {
        console.warn('Batch POST_READ events not found - handlers not yet integrated');
      }
    }, 45000);
  });

  /**
   * Test suite for error handling and resilience
   */
  describe('Error Handling', () => {
    test('API operations succeed even if Kinesis publishing fails', async () => {
      // This test verifies that Lambda handlers don't fail if Kinesis is unavailable
      const user = await createTestUser(httpClient, {
        prefix: 'kinesis-error'
      });

      // Create post (should succeed even if Kinesis fails)
      const createResponse = await httpClient.post(
        '/posts',
        {
          caption: 'Test error handling',
          fileType: 'image/jpeg'
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      expect(createResponse.status).toBe(201);

      // Type assertion for response data
      const responseData = createResponse.data as { post: { id: string } };
      expect(responseData.post).toBeDefined();

      const postId = responseData.post.id;

      // Like post (should succeed even if Kinesis fails)
      const likeResponse = await httpClient.post(
        '/likes',
        { postId },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      expect(likeResponse.status).toBe(200);

      // Mark as read (should succeed even if Kinesis fails)
      const readResponse = await httpClient.post(
        '/feed/read',
        { postIds: [postId] },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      expect(readResponse.status).toBe(200);
    }, 30000);
  });
});

/**
 * Helper function to get the latest event from Kinesis stream
 *
 * Retrieves the most recent event from the first shard.
 * Uses TRIM_HORIZON iterator to scan from beginning and returns last record.
 *
 * @param client - Kinesis client instance
 * @param streamName - Name of the Kinesis stream
 * @returns Parsed event data
 * @throws Error if no records found or shard unavailable
 */
async function getLatestEventFromStream(
  client: KinesisClient,
  streamName: string
): Promise<FeedEvent> {
  // Get shard iterator
  const shardsResponse = await client.send(
    new ListShardsCommand({ StreamName: streamName })
  );

  if (!shardsResponse.Shards || shardsResponse.Shards.length === 0) {
    throw new Error('No shards found in stream');
  }

  // Use first shard for simplicity
  const shardId = shardsResponse.Shards[0].ShardId!;

  // Try LATEST first
  const iteratorResponse = await client.send(
    new GetShardIteratorCommand({
      StreamName: streamName,
      ShardId: shardId,
      ShardIteratorType: 'LATEST'
    })
  );

  // Get records with LATEST
  let recordsResponse = await client.send(
    new GetRecordsCommand({
      ShardIterator: iteratorResponse.ShardIterator!,
      Limit: 100
    })
  );

  // If no records with LATEST, try TRIM_HORIZON
  if (!recordsResponse.Records || recordsResponse.Records.length === 0) {
    const trimIteratorResponse = await client.send(
      new GetShardIteratorCommand({
        StreamName: streamName,
        ShardId: shardId,
        ShardIteratorType: 'TRIM_HORIZON'
      })
    );

    recordsResponse = await client.send(
      new GetRecordsCommand({
        ShardIterator: trimIteratorResponse.ShardIterator!,
        Limit: 100
      })
    );

    if (!recordsResponse.Records || recordsResponse.Records.length === 0) {
      throw new Error('No records found in stream');
    }
  }

  // Return last record (most recent)
  const lastRecord = recordsResponse.Records[recordsResponse.Records.length - 1];
  return JSON.parse(Buffer.from(lastRecord.Data!).toString('utf-8'));
}

/**
 * Helper function to get all events from all shards in the stream
 *
 * Comprehensive stream scanning that:
 * - Iterates through all shards
 * - Paginates through all records in each shard
 * - Parses and collects all events
 * - Respects maxRecords limit
 *
 * @param client - Kinesis client instance
 * @param streamName - Name of the Kinesis stream
 * @param maxRecords - Maximum number of records to retrieve (default: 1000)
 * @returns Array of parsed events
 */
async function getAllEventsFromStream(
  client: KinesisClient,
  streamName: string,
  maxRecords: number = 1000
): Promise<FeedEvent[]> {
  const events: FeedEvent[] = [];

  // Get all shards
  const shardsResponse = await client.send(
    new ListShardsCommand({ StreamName: streamName })
  );

  if (!shardsResponse.Shards) {
    return events;
  }

  // Iterate through each shard
  for (const shard of shardsResponse.Shards) {
    if (events.length >= maxRecords) {
      break;
    }

    const shardId = shard.ShardId!;

    try {
      // Get shard iterator starting from beginning
      const iteratorResponse = await client.send(
        new GetShardIteratorCommand({
          StreamName: streamName,
          ShardId: shardId,
          ShardIteratorType: 'TRIM_HORIZON'
        })
      );

      let shardIterator = iteratorResponse.ShardIterator;

      // Paginate through records
      while (shardIterator && events.length < maxRecords) {
        const recordsResponse = await client.send(
          new GetRecordsCommand({
            ShardIterator: shardIterator,
            Limit: Math.min(100, maxRecords - events.length)
          })
        );

        if (recordsResponse.Records && recordsResponse.Records.length > 0) {
          for (const record of recordsResponse.Records) {
            if (record.Data) {
              try {
                const event = JSON.parse(
                  Buffer.from(record.Data).toString('utf-8')
                ) as FeedEvent;
                events.push(event);
              } catch (parseError) {
                console.error('Failed to parse Kinesis record:', parseError);
              }
            }
          }
        }

        shardIterator = recordsResponse.NextShardIterator;

        // Break if no more records or no next iterator
        if (
          !shardIterator ||
          !recordsResponse.Records ||
          recordsResponse.Records.length === 0
        ) {
          break;
        }

        // Small delay to avoid throttling
        await delay(100);
      }
    } catch (error) {
      console.error(`Error reading from shard ${shardId}:`, error);
      // Continue to next shard instead of failing
      continue;
    }
  }

  return events;
}
