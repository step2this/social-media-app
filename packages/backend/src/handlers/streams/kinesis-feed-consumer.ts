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

/**
 * Container scope - initialized once per Lambda warm start
 * Redis client and cache service for feed event processing
 */
let cacheService: RedisCacheService | undefined;

try {
  const redisClient = createRedisClient();
  cacheService = new RedisCacheService(redisClient);
  console.log('[KinesisFeedConsumer] Redis cache initialized');
} catch (error) {
  console.error('[KinesisFeedConsumer] Redis initialization failed', error);
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

  await cacheService!.cachePost(event.postId, cachedPost);
  console.log('[KinesisFeedConsumer] Cached POST_CREATED', { postId: event.postId });
}

/**
 * Handles POST_READ events by marking posts as read for users
 *
 * @param event - The POST_READ feed event
 * @throws Error if cache operation fails
 */
async function handlePostRead(event: PostReadEvent): Promise<void> {
  await cacheService!.markPostAsRead(event.userId, event.postId);
  console.log('[KinesisFeedConsumer] Processed POST_READ', {
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
  // Get cached post to update likes count
  const cachedPost = await cacheService!.getCachedPost(event.postId);

  if (cachedPost) {
    // Update likes count based on liked/unliked
    const updatedPost: CachedPost = {
      ...cachedPost,
      likesCount: event.liked
        ? (cachedPost.likesCount || 0) + 1
        : Math.max((cachedPost.likesCount || 0) - 1, 0)
    };
    await cacheService!.cachePost(event.postId, updatedPost);
    console.log('[KinesisFeedConsumer] Updated POST_LIKED', {
      postId: event.postId,
      liked: event.liked,
      newLikesCount: updatedPost.likesCount
    });
  } else {
    // Cache miss is okay - post might not be in cache
    console.log('[KinesisFeedConsumer] Processed POST_LIKED (cache miss)', {
      postId: event.postId,
      liked: event.liked
    });
  }
}

/**
 * Handles POST_DELETED events by invalidating posts from cache
 *
 * @param event - The POST_DELETED feed event
 * @throws Error if cache operation fails
 */
async function handlePostDeleted(event: PostDeletedEvent): Promise<void> {
  await cacheService!.invalidatePost(event.postId);
  console.log('[KinesisFeedConsumer] Invalidated POST_DELETED', { postId: event.postId });
}

/**
 * Routes feed events to appropriate handlers based on event type
 *
 * @param event - The validated feed event
 * @throws Error if event type is unknown
 */
async function processEvent(event: FeedEvent): Promise<void> {
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
 * Kinesis consumer Lambda that processes feed events and updates Redis cache
 *
 * Event processing:
 * - POST_CREATED: Cache post metadata for future reads
 * - POST_READ: Remove post from user's unread feed cache
 * - POST_LIKED: Update post likesCount in cache (optional)
 * - POST_DELETED: Invalidate post from all caches
 *
 * Error Handling:
 * - Validates events with Zod schema
 * - Handles partial batch failures
 * - Returns failed record IDs for DLQ routing
 * - Logs all errors with context
 *
 * @param event - Kinesis stream event with batch of records
 * @returns Batch item failures for DLQ routing
 */
export const handler: KinesisStreamHandler = async (event): Promise<KinesisStreamBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = [];

  // Process each record in the batch
  for (const record of event.Records) {
    try {
      // 1. Decode base64 data
      const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');

      // 2. Parse JSON
      let feedEvent: any;
      try {
        feedEvent = JSON.parse(payload);
      } catch (jsonError) {
        console.error('[KinesisFeedConsumer] JSON parsing error', {
          sequenceNumber: record.kinesis.sequenceNumber,
          error: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'
        });
        batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
        continue;
      }

      // 3. Validate with Zod schema
      const validationResult = FeedEventSchema.safeParse(feedEvent);
      if (!validationResult.success) {
        console.error('[KinesisFeedConsumer] Invalid event schema', {
          sequenceNumber: record.kinesis.sequenceNumber,
          error: validationResult.error
        });
        batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
        continue;
      }

      // 4. Process the validated event
      await processEvent(validationResult.data);

    } catch (error) {
      // Catch any processing errors
      console.error('[KinesisFeedConsumer] Processing error', {
        sequenceNumber: record.kinesis.sequenceNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      batchItemFailures.push({ itemIdentifier: record.kinesis.sequenceNumber });
    }
  }

  // Return batch item failures for DLQ routing
  return { batchItemFailures };
};