import type { KinesisStreamHandler, KinesisStreamBatchResponse } from 'aws-lambda';
import { RedisCacheService, type CachedPost } from '@social-media-app/dal';
import {
  FeedEventSchema,
  type FeedEvent,
  type PostCreatedEvent,
  type PostReadEvent,
  type PostLikedEvent,
  type PostDeletedEvent
} from '@social-media-app/shared';
import { createRedisClient } from '../../utils/aws-config.js';
import {
  addTraceAnnotation,
  addTraceMetadata,
  captureTraceError,
  tracedOperation,
  traceCacheOperation
} from '../../utils/index.js';
import { createStreamLogger } from '../../infrastructure/middleware/streamLogger.js';

/**
 * Container scope - initialized once per Lambda warm start
 * Redis client and cache service for feed event processing
 */
let cacheService: RedisCacheService | undefined;
const logger = createStreamLogger('KinesisFeedConsumer');

try {
  const redisClient = createRedisClient();
  cacheService = new RedisCacheService(redisClient);
  logger.logInfo('Redis cache initialized');
} catch (error) {
  logger.logError('Redis initialization failed', error instanceof Error ? error : undefined);
  throw error; // Critical failure for consumer
}

/**
 * Handles POST_CREATED events by caching post metadata
 *
 * @param event - The POST_CREATED feed event
 * @throws Error if cache operation fails
 */
async function handlePostCreated(event: PostCreatedEvent): Promise<void> {
  const cachedPost: CachedPost = {
    id: event.postId,
    authorId: event.authorId,
    authorHandle: event.authorHandle,
    caption: event.caption,
    imageUrl: event.imageUrl,
    isPublic: event.isPublic,
    likesCount: 0,
    commentsCount: 0,
    createdAt: event.createdAt
  };

  await tracedOperation('CachePost', async () => {
    traceCacheOperation('set', `post:${event.postId}`, false);
    await cacheService!.cachePost(event.postId, cachedPost);
  });

  logger.logInfo('Cached POST_CREATED', { postId: event.postId });
}

/**
 * Handles POST_READ events by marking posts as read for users
 *
 * @param event - The POST_READ feed event
 * @throws Error if cache operation fails
 */
async function handlePostRead(event: PostReadEvent): Promise<void> {
  await tracedOperation('MarkPostRead', async () => {
    traceCacheOperation('set', `read:${event.userId}:${event.postId}`, false);
    await cacheService!.markPostAsRead(event.userId, event.postId);
  });

  logger.logInfo('Processed POST_READ', {
    userId: event.userId,
    postId: event.postId
  });
}

/**
 * Handles POST_LIKED events by updating like counts in cache (optional enhancement)
 *
 * @param event - The POST_LIKED feed event
 */
async function handlePostLiked(event: PostLikedEvent): Promise<void> {
  await tracedOperation('UpdatePostLikes', async () => {
    // Get cached post to update likes count
    const cachedPost = await cacheService!.getCachedPost(event.postId);
    traceCacheOperation('get', `post:${event.postId}`, !!cachedPost);

    if (cachedPost) {
      // Update likes count based on liked/unliked
      const updatedPost: CachedPost = {
        ...cachedPost,
        likesCount: event.liked
          ? (cachedPost.likesCount || 0) + 1
          : Math.max((cachedPost.likesCount || 0) - 1, 0)
      };

      traceCacheOperation('set', `post:${event.postId}`, false);
      await cacheService!.cachePost(event.postId, updatedPost);

      logger.logInfo('Updated POST_LIKED', {
        postId: event.postId,
        liked: event.liked,
        newLikesCount: updatedPost.likesCount
      });
    } else {
      // Cache miss is okay - post might not be in cache
      logger.logInfo('Processed POST_LIKED (cache miss)', {
        postId: event.postId,
        liked: event.liked
      });
    }
  });
}

/**
 * Handles POST_DELETED events by invalidating posts from cache
 *
 * @param event - The POST_DELETED feed event
 * @throws Error if cache operation fails
 */
async function handlePostDeleted(event: PostDeletedEvent): Promise<void> {
  await tracedOperation('InvalidatePost', async () => {
    traceCacheOperation('delete', `post:${event.postId}`, false);
    await cacheService!.invalidatePost(event.postId);
  });

  logger.logInfo('Invalidated POST_DELETED', { postId: event.postId });
}

/**
 * Routes feed events to appropriate handlers based on event type
 *
 * @param event - The validated feed event
 * @throws Error if event type is unknown
 */
async function processEvent(event: FeedEvent): Promise<void> {
  // Add event context to trace
  addTraceAnnotation('eventType', event.eventType);
  addTraceAnnotation('eventId', event.eventId);
  addTraceMetadata('event', 'details', event);

  switch (event.eventType) {
    case 'POST_CREATED':
      return handlePostCreated(event);
    case 'POST_READ':
      return handlePostRead(event);
    case 'POST_LIKED':
      return handlePostLiked(event);
    case 'POST_DELETED':
      return handlePostDeleted(event);
    default:
      throw new Error(`Unknown event type: ${(event as any).eventType}`);
  }
}

/**
 * Main Kinesis stream handler
 *
 * @description Processes feed events from Kinesis stream and updates Redis cache
 * @trace Captures stream processing with subsegments for each record
 *
 * Features structured logging with batch metrics and performance tracking
 *
 * @param event - The Kinesis stream event
 * @returns Batch item failures for retry
 */
export const handler: KinesisStreamHandler = async (event): Promise<KinesisStreamBatchResponse> => {
  const batchItemFailures: KinesisStreamBatchResponse['batchItemFailures'] = [];
  const context = logger.startBatch(event.Records.length);

  // Add trace annotations for batch context
  addTraceAnnotation('operationType', 'KINESIS_FEED_CONSUMER');
  addTraceAnnotation('recordCount', event.Records.length);
  addTraceAnnotation('eventSourceArn', event.Records[0]?.eventSourceARN || 'unknown');

  const results = await Promise.all(
    event.Records.map((record) =>
      logger.processRecord(record, async () => {
        const sequenceNumber = record.kinesis.sequenceNumber;

        try {
          // Decode and validate Kinesis record data
          const payload = await tracedOperation('DecodeRecord', async () => {
            const decoded = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
            return JSON.parse(decoded);
          });

          // Validate event against schema
          const feedEvent = await tracedOperation('ValidateEvent', async () => {
            return FeedEventSchema.parse(payload);
          });

          // Process the event with tracing
          await tracedOperation(`Process_${feedEvent.eventType}`, async () => {
            await processEvent(feedEvent);
          });

          logger.logInfo('Successfully processed record', {
            sequenceNumber,
            eventType: feedEvent.eventType
          });
        } catch (error) {
          // Capture error in X-Ray trace
          captureTraceError(error, {
            operation: 'processKinesisRecord',
            sequenceNumber,
            partitionKey: record.kinesis.partitionKey
          });

          // Track failed records for retry
          batchItemFailures.push({
            itemIdentifier: sequenceNumber
          });

          // Re-throw to be caught by processRecord
          throw error;
        }
      })
    )
  );

  logger.endBatch(context, results);

  // Add batch processing results to trace
  addTraceAnnotation('successCount', event.Records.length - batchItemFailures.length);
  addTraceAnnotation('failureCount', batchItemFailures.length);

  return { batchItemFailures };
};