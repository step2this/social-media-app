/* eslint-disable max-lines-per-function */
import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { FeedService } from '@social-media-app/dal';
import { createStreamLogger } from '../../infrastructure/middleware/streamLogger.js';

/**
 * Stream processor for feed cleanup on post deletion
 *
 * Listens to DynamoDB Streams and:
 * - Detects POST entity REMOVE events
 * - Removes all materialized feed items for the deleted post
 * - Provides eventual consistency for feed cleanup
 *
 * Architecture:
 * - Part of hybrid feed cleanup system
 * - Async cleanup with eventual consistency
 * - Graceful error handling (no stream poisoning)
 *
 * Performance:
 * - Uses FeedService.deleteFeedItemsByPost (table SCAN)
 * - Cost scales with total feed items, not post followers
 * - TODO: Will benefit from GSI4 optimization (99% cost reduction)
 * 
 * Features structured logging with batch metrics and performance tracking
 *
 * @see FeedService.deleteFeedItemsByPost for deletion logic
 */

// Initialize services at container scope for reuse across warm invocations
const dynamoClient = createDynamoDBClient();
const tableName = getTableName();
const feedService = new FeedService(dynamoClient, tableName);
const logger = createStreamLogger('FeedCleanupPostDelete');

export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  const context = logger.startBatch(event.Records.length);

  // Process all records in parallel
  const results = await Promise.all(
    event.Records.map((record) =>
      logger.processRecord(record, async () => {
        // Only process REMOVE events
        if (record.eventName !== 'REMOVE') {
          return;
        }

        // Only process POST entities (check Keys SK)
        // SK must be exactly 'POST' (primary post entity)
        // Ignore timeline copies with SK='POST#<timestamp>#<postId>'
        const skValue = record.dynamodb?.Keys?.SK?.S;
        if (skValue !== 'POST') {
          return;
        }

        // Get the old image (deleted post data)
        const oldImage = record.dynamodb?.OldImage;
        if (!oldImage) {
          logger.logError('No OldImage in stream record');
          return;
        }

        // Filter out undefined values before unmarshalling
        const filteredImage = Object.fromEntries(
          Object.entries(oldImage).filter(([, value]) => value !== undefined)
        );

        // Unmarshall DynamoDB AttributeValue to JS object
        const postData = unmarshall(filteredImage as any);

        // Extract postId (note: Post entity uses 'id' not 'postId')
        const postId = postData.id as string;
        if (!postId) {
          logger.logError('Missing id in deleted post', undefined, { postData });
          return;
        }

        // Delete all feed items for this post
        const result = await feedService.deleteFeedItemsByPost({ postId });

        logger.logInfo('Successfully cleaned up feed items', {
          postId,
          deletedCount: result.deletedCount
        });
      })
    )
  );

  logger.endBatch(context, results);
};
