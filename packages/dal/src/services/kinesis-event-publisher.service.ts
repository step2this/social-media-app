/**
 * @fileoverview Kinesis event publisher service for feed event streaming
 * @module services/kinesis-event-publisher
 */

import { KinesisClient, PutRecordCommand, PutRecordsCommand } from '@aws-sdk/client-kinesis';
import { FeedEventSchema, type FeedEvent } from '@social-media-app/shared';
import { ZodError } from 'zod';
import { logKinesis, logBatch, logError, logger } from '../infrastructure/logger.js';

/**
 * Result of batch publishing operation
 */
export interface BatchPublishResult {
  /** Number of successfully published events */
  successCount: number;
  /** Number of failed events */
  failedCount: number;
  /** Events that failed to publish (for retry) */
  failedEvents?: FeedEvent[];
}

/**
 * Service for publishing feed events to Kinesis stream
 *
 * Handles:
 * - Single event publishing with validation
 * - Batch event publishing with automatic chunking
 * - Partition key strategy for even shard distribution
 * - Error handling and retry support
 *
 * @example
 * ```typescript
 * const publisher = new KinesisEventPublisher(kinesisClient, 'feed-events-dev');
 *
 * // Publish single event
 * await publisher.publishEvent({
 *   eventId: '123...',
 *   eventType: 'POST_CREATED',
 *   // ... other fields
 * });
 *
 * // Publish batch
 * const result = await publisher.publishEventsBatch(events);
 * if (result.failedCount > 0) {
 *   // Retry failed events
 *   await publisher.publishEventsBatch(result.failedEvents!);
 * }
 * ```
 */
export class KinesisEventPublisher {
  /** Maximum records per Kinesis PutRecords call */
  private static readonly MAX_BATCH_SIZE = 500;

  /**
   * Create a new KinesisEventPublisher instance
   *
   * @param kinesisClient - AWS Kinesis client instance
   * @param streamName - Name of the Kinesis stream
   */
  constructor(
    private readonly kinesisClient: KinesisClient,
    private readonly streamName: string
  ) {}

  /**
   * Publish a single event to Kinesis stream
   *
   * Uses eventId as partition key for even distribution across shards.
   * Validates event schema before publishing.
   *
   * @param event - Feed event to publish
   * @throws {ZodError} If event validation fails
   * @throws {Error} If Kinesis publishing fails
   */
  async publishEvent(event: FeedEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate event schema
      const validatedEvent = FeedEventSchema.parse(event);

      // Serialize event to JSON
      const data = JSON.stringify(validatedEvent);

      // Publish to Kinesis using eventId as partition key
      const command = new PutRecordCommand({
        StreamName: this.streamName,
        PartitionKey: validatedEvent.eventId,
        Data: Buffer.from(data, 'utf-8')
      });

      await this.kinesisClient.send(command);

      const duration = Date.now() - startTime;
      logKinesis('publish', { 
        eventType: validatedEvent.eventType,
        eventId: validatedEvent.eventId,
        partitionKey: validatedEvent.eventId,
        duration 
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw error; // Re-throw validation errors as-is
      }

      logError('KinesisEventPublisher', 'publishEvent', error as Error, {
        eventType: event.eventType,
        eventId: event.eventId
      });

      // Wrap Kinesis errors with context
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to publish event: ${message}`, { cause: error });
    }
  }

  /**
   * Publish multiple events in batch to Kinesis stream
   *
   * Features:
   * - Automatically chunks large batches into 500-record chunks
   * - Validates all events before publishing
   * - Returns failed events for retry
   * - Aggregates results across multiple chunks
   *
   * @param events - Array of feed events to publish
   * @returns Batch publish result with success/failure counts
   * @throws {ZodError} If any event validation fails
   */
  async publishEventsBatch(events: FeedEvent[]): Promise<BatchPublishResult> {
    // Handle empty batch
    if (events.length === 0) {
      return {
        successCount: 0,
        failedCount: 0
      };
    }

    // Validate all events before publishing
    const validatedEvents = events.map(event => FeedEventSchema.parse(event));

    // Chunk into batches of 500
    const chunks = this.chunkEvents(validatedEvents, KinesisEventPublisher.MAX_BATCH_SIZE);

    logBatch('KinesisEventPublisher', 'publishEventsBatch', events.length, 500);

    // Publish each chunk and aggregate results
    let totalSuccess = 0;
    let totalFailed = 0;
    const allFailedEvents: FeedEvent[] = [];

    for (const chunk of chunks) {
      const result = await this.publishChunk(chunk);
      totalSuccess += result.successCount;
      totalFailed += result.failedCount;

      if (result.failedEvents) {
        allFailedEvents.push(...result.failedEvents);
      }
    }

    // Log chunk results
    logger.debug({
      totalEvents: events.length,
      chunks: chunks.length,
      successCount: totalSuccess,
      failedCount: totalFailed,
      hasFailures: totalFailed > 0
    }, '[KinesisEventPublisher] Batch publish completed');

    // Log failures
    if (totalFailed > 0) {
      logger.warn({
        failedCount: totalFailed,
        failedEventIds: allFailedEvents.map(e => e.eventId).slice(0, 10) // First 10
      }, '[KinesisEventPublisher] Some events failed to publish');
    }

    return {
      successCount: totalSuccess,
      failedCount: totalFailed,
      failedEvents: allFailedEvents.length > 0 ? allFailedEvents : undefined
    };
  }

  /**
   * Publish a single chunk of events (max 500)
   *
   * @param events - Chunk of events to publish
   * @returns Result of chunk publishing
   * @private
   */
  private async publishChunk(events: FeedEvent[]): Promise<BatchPublishResult> {
    // Convert events to Kinesis records
    const records = events.map(event => ({
      PartitionKey: event.eventId,
      Data: Buffer.from(JSON.stringify(event), 'utf-8')
    }));

    try {
      const command = new PutRecordsCommand({
        StreamName: this.streamName,
        Records: records
      });

      const response = await this.kinesisClient.send(command);

      // Process results
      const failedCount = response.FailedRecordCount ?? 0;
      const successCount = records.length - failedCount;

      // Collect failed events for retry
      const failedEvents: FeedEvent[] = [];
      if (failedCount > 0 && response.Records) {
        response.Records.forEach((result, index) => {
          if (result.ErrorCode) {
            failedEvents.push(events[index]);
          }
        });
      }

      return {
        successCount,
        failedCount,
        failedEvents: failedEvents.length > 0 ? failedEvents : undefined
      };
    } catch (error) {
      // If entire chunk fails, all events are failed
      return {
        successCount: 0,
        failedCount: events.length,
        failedEvents: events
      };
    }
  }

  /**
   * Chunk array into smaller arrays
   *
   * @param events - Events to chunk
   * @param size - Maximum chunk size
   * @returns Array of event chunks
   * @private
   */
  private chunkEvents(events: FeedEvent[], size: number): FeedEvent[][] {
    const chunks: FeedEvent[][] = [];

    for (let i = 0; i < events.length; i += size) {
      chunks.push(events.slice(i, i + size));
    }

    return chunks;
  }
}
