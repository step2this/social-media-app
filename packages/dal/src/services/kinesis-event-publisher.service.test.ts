/**
 * @fileoverview Tests for KinesisEventPublisher service
 * @module services/kinesis-event-publisher.test
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { KinesisClient, PutRecordCommand, PutRecordsCommand } from '@aws-sdk/client-kinesis';
import { KinesisEventPublisher } from './kinesis-event-publisher.service.js';
import type { PostCreatedEvent, PostReadEvent, PostLikedEvent, PostDeletedEvent } from '@social-media-app/shared';

const kinesisClientMock = mockClient(KinesisClient);

describe('KinesisEventPublisher', () => {
  let publisher: KinesisEventPublisher;

  beforeEach(() => {
    kinesisClientMock.reset();
    publisher = new KinesisEventPublisher(
      kinesisClientMock as any,
      'test-stream'
    );
  });

  describe('publishEvent - Single Event Publishing', () => {
    test('publishes POST_CREATED event successfully', async () => {
      const event: PostCreatedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000',
        authorHandle: 'testuser',
        caption: 'Test post',
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      };

      kinesisClientMock.on(PutRecordCommand).resolves({
        SequenceNumber: '123',
        ShardId: 'shardId-000000000001'
      });

      await publisher.publishEvent(event);

      expect(kinesisClientMock.calls()).toHaveLength(1);
      const call = kinesisClientMock.call(0);
      expect(call.args[0].input).toMatchObject({
        StreamName: 'test-stream',
        PartitionKey: event.eventId
      });
    });

    test('publishes POST_READ event successfully', async () => {
      const event: PostReadEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_READ',
        version: '1.0',
        userId: '223e4567-e89b-12d3-a456-426614174000',
        postId: '323e4567-e89b-12d3-a456-426614174000'
      };

      kinesisClientMock.on(PutRecordCommand).resolves({
        SequenceNumber: '124',
        ShardId: 'shardId-000000000002'
      });

      await publisher.publishEvent(event);

      expect(kinesisClientMock.calls()).toHaveLength(1);
      const call = kinesisClientMock.call(0);
      expect(call.args[0].input).toMatchObject({
        StreamName: 'test-stream',
        PartitionKey: event.eventId
      });
    });

    test('publishes POST_LIKED event successfully', async () => {
      const event: PostLikedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_LIKED',
        version: '1.0',
        userId: '223e4567-e89b-12d3-a456-426614174000',
        postId: '323e4567-e89b-12d3-a456-426614174000',
        liked: true
      };

      kinesisClientMock.on(PutRecordCommand).resolves({
        SequenceNumber: '125',
        ShardId: 'shardId-000000000003'
      });

      await publisher.publishEvent(event);

      expect(kinesisClientMock.calls()).toHaveLength(1);
    });

    test('publishes POST_DELETED event successfully', async () => {
      const event: PostDeletedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_DELETED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000'
      };

      kinesisClientMock.on(PutRecordCommand).resolves({
        SequenceNumber: '126',
        ShardId: 'shardId-000000000004'
      });

      await publisher.publishEvent(event);

      expect(kinesisClientMock.calls()).toHaveLength(1);
    });

    test('validates event schema before publishing', async () => {
      const invalidEvent = {
        eventType: 'POST_CREATED',
        // Missing required fields
      };

      await expect(
        publisher.publishEvent(invalidEvent as any)
      ).rejects.toThrow();
    });

    test('uses eventId as partition key for even distribution', async () => {
      const event: PostCreatedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000',
        authorHandle: 'testuser',
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      };

      kinesisClientMock.on(PutRecordCommand).resolves({
        SequenceNumber: '125',
        ShardId: 'shardId-000000000001'
      });

      await publisher.publishEvent(event);

      const call = kinesisClientMock.call(0);
      expect(call.args[0].input.PartitionKey).toBe(event.eventId);
    });

    test('serializes event data correctly as JSON', async () => {
      const event: PostCreatedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000',
        authorHandle: 'testuser',
        caption: 'Test post',
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      };

      kinesisClientMock.on(PutRecordCommand).resolves({
        SequenceNumber: '127',
        ShardId: 'shardId-000000000001'
      });

      await publisher.publishEvent(event);

      const call = kinesisClientMock.call(0);
      const data = call.args[0].input.Data;

      // Decode the data and verify it's valid JSON
      const decoded = Buffer.from(data).toString('utf-8');
      const parsed = JSON.parse(decoded);
      expect(parsed).toEqual(event);
    });

    test('handles Kinesis errors gracefully', async () => {
      const event: PostCreatedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000',
        authorHandle: 'testuser',
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      };

      kinesisClientMock.on(PutRecordCommand).rejects(
        new Error('Kinesis service unavailable')
      );

      await expect(
        publisher.publishEvent(event)
      ).rejects.toThrow('Failed to publish event');
    });

    test('includes error details in thrown error', async () => {
      const event: PostCreatedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: '223e4567-e89b-12d3-a456-426614174000',
        authorId: '323e4567-e89b-12d3-a456-426614174000',
        authorHandle: 'testuser',
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      };

      kinesisClientMock.on(PutRecordCommand).rejects(
        new Error('ProvisionedThroughputExceededException')
      );

      await expect(
        publisher.publishEvent(event)
      ).rejects.toThrow(/ProvisionedThroughputExceededException/);
    });
  });

  describe('publishEventsBatch - Batch Publishing', () => {
    test('publishes multiple events in batch', async () => {
      const events: PostCreatedEvent[] = [
        {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: '2025-01-01T00:00:00Z',
          eventType: 'POST_CREATED',
          version: '1.0',
          postId: '223e4567-e89b-12d3-a456-426614174000',
          authorId: '323e4567-e89b-12d3-a456-426614174000',
          authorHandle: 'user1',
          isPublic: true,
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          eventId: '223e4567-e89b-12d3-a456-426614174000',
          timestamp: '2025-01-01T00:01:00Z',
          eventType: 'POST_CREATED',
          version: '1.0',
          postId: '323e4567-e89b-12d3-a456-426614174000',
          authorId: '423e4567-e89b-12d3-a456-426614174000',
          authorHandle: 'user2',
          isPublic: true,
          createdAt: '2025-01-01T00:01:00Z'
        }
      ];

      kinesisClientMock.on(PutRecordsCommand).resolves({
        Records: [
          { SequenceNumber: '126', ShardId: 'shardId-000000000001' },
          { SequenceNumber: '127', ShardId: 'shardId-000000000002' }
        ],
        FailedRecordCount: 0
      });

      const result = await publisher.publishEventsBatch(events);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(kinesisClientMock.calls()).toHaveLength(1);
    });

    test('handles batch with some failures', async () => {
      const events: PostCreatedEvent[] = Array.from({ length: 3 }, (_, i) => ({
        eventId: `${i}23e4567-e89b-12d3-a456-426614174000`,
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: `${i}33e4567-e89b-12d3-a456-426614174000`,
        authorId: `${i}43e4567-e89b-12d3-a456-426614174000`,
        authorHandle: `user${i}`,
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      }));

      kinesisClientMock.on(PutRecordsCommand).resolves({
        Records: [
          { SequenceNumber: '128', ShardId: 'shardId-000000000001' },
          { ErrorCode: 'ProvisionedThroughputExceededException', ErrorMessage: 'Rate exceeded' },
          { SequenceNumber: '129', ShardId: 'shardId-000000000003' }
        ],
        FailedRecordCount: 1
      });

      const result = await publisher.publishEventsBatch(events);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.failedEvents).toHaveLength(1);
    });

    test('returns failed events for retry', async () => {
      const events: PostCreatedEvent[] = Array.from({ length: 3 }, (_, i) => ({
        eventId: `${i}23e4567-e89b-12d3-a456-426614174000`,
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: `${i}33e4567-e89b-12d3-a456-426614174000`,
        authorId: `${i}43e4567-e89b-12d3-a456-426614174000`,
        authorHandle: `user${i}`,
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      }));

      kinesisClientMock.on(PutRecordsCommand).resolves({
        Records: [
          { SequenceNumber: '130', ShardId: 'shardId-000000000001' },
          { ErrorCode: 'ProvisionedThroughputExceededException', ErrorMessage: 'Rate exceeded' },
          { SequenceNumber: '131', ShardId: 'shardId-000000000003' }
        ],
        FailedRecordCount: 1
      });

      const result = await publisher.publishEventsBatch(events);

      expect(result.failedEvents).toHaveLength(1);
      expect(result.failedEvents![0]).toEqual(events[1]);
    });

    test('chunks large batches to 500 records max', async () => {
      const events: PostCreatedEvent[] = Array.from({ length: 600 }, (_, i) => ({
        eventId: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174000`,
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174001`,
        authorId: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174002`,
        authorHandle: `user${i}`,
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      }));

      kinesisClientMock.on(PutRecordsCommand).resolves({
        Records: [],
        FailedRecordCount: 0
      });

      await publisher.publishEventsBatch(events);

      // Should make 2 calls: 500 + 100
      expect(kinesisClientMock.calls()).toHaveLength(2);

      // Verify first batch has 500 records
      const firstCall = kinesisClientMock.call(0);
      expect(firstCall.args[0].input.Records).toHaveLength(500);

      // Verify second batch has 100 records
      const secondCall = kinesisClientMock.call(1);
      expect(secondCall.args[0].input.Records).toHaveLength(100);
    });

    test('validates all events in batch before publishing', async () => {
      const events = [
        {
          eventType: 'POST_CREATED',
          // Missing required fields
        }
      ];

      await expect(
        publisher.publishEventsBatch(events as any)
      ).rejects.toThrow();
    });

    test('handles empty batch gracefully', async () => {
      const result = await publisher.publishEventsBatch([]);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(kinesisClientMock.calls()).toHaveLength(0);
    });

    test('aggregates results across multiple chunks', async () => {
      const events: PostCreatedEvent[] = Array.from({ length: 600 }, (_, i) => ({
        eventId: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174000`,
        timestamp: '2025-01-01T00:00:00Z',
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174001`,
        authorId: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174002`,
        authorHandle: `user${i}`,
        isPublic: true,
        createdAt: '2025-01-01T00:00:00Z'
      }));

      // First chunk: 2 failures
      kinesisClientMock
        .on(PutRecordsCommand)
        .resolvesOnce({
          Records: Array(498).fill({ SequenceNumber: '132', ShardId: 'shardId-000000000001' })
            .concat([
              { ErrorCode: 'ProvisionedThroughputExceededException', ErrorMessage: 'Rate exceeded' },
              { ErrorCode: 'InternalFailure', ErrorMessage: 'Internal error' }
            ]),
          FailedRecordCount: 2
        })
        // Second chunk: 1 failure
        .resolvesOnce({
          Records: Array(99).fill({ SequenceNumber: '133', ShardId: 'shardId-000000000002' })
            .concat([{ ErrorCode: 'ProvisionedThroughputExceededException', ErrorMessage: 'Rate exceeded' }]),
          FailedRecordCount: 1
        });

      const result = await publisher.publishEventsBatch(events);

      expect(result.successCount).toBe(597);
      expect(result.failedCount).toBe(3);
      expect(result.failedEvents).toHaveLength(3);
    });
  });
});
