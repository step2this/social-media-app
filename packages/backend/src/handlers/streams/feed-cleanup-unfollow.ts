/* eslint-disable max-lines-per-function */
import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { FeedService } from '@social-media-app/dal';
import { createStreamLogger } from '../../infrastructure/middleware/streamLogger.js';

/**
 * Stream processor for feed cleanup on unfollow
 *
 * Listens to DynamoDB Streams and:
 * - Detects FOLLOW entity REMOVE events (unfollows)
 * - Removes all materialized feed items from the unfollowed user
 * - Provides eventual consistency for feed cleanup
 *
 * Architecture:
 * - Part of hybrid feed cleanup system
 * - Async cleanup with eventual consistency
 * - Graceful error handling (no stream poisoning)
 *
 * Performance:
 * - Uses FeedService.deleteFeedItemsForUser (query + filter)
 * - Cost scales with user's feed size, not total feed items
 * - O(m) where m = number of feed items in user's feed
 *
 * Stream Record Structure:
 * - PK: USER#<followerId>
 * - SK: FOLLOW#<followingId>#<timestamp>
 * - Extract both IDs to delete feed items
 *
 * Features structured logging with batch metrics and performance tracking
 *
 * @see FeedService.deleteFeedItemsForUser for deletion logic
 */

// Initialize services at container scope for reuse across warm invocations
const dynamoClient = createDynamoDBClient();
const tableName = getTableName();
const feedService = new FeedService(dynamoClient, tableName);
const logger = createStreamLogger('FeedCleanupUnfollow');

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

        // Only process FOLLOW entities (check Keys SK starts with "FOLLOW#")
        const skValue = record.dynamodb?.Keys?.SK?.S;
        if (!skValue || !skValue.startsWith('FOLLOW#')) {
          return;
        }

        // Extract followerId from PK: USER#<followerId>
        const pkValue = record.dynamodb?.Keys?.PK?.S;
        if (!pkValue || !pkValue.startsWith('USER#')) {
          logger.logError('Invalid PK format', undefined, { pkValue });
          return;
        }
        const followerId = pkValue.substring(5); // Remove "USER#" prefix

        // Extract followingId from SK: FOLLOW#<followingId>#<timestamp>
        // Handle both formats: FOLLOW#<id>#<timestamp> and FOLLOW#<id>
        const skParts = skValue.split('#');
        if (skParts.length < 2) {
          logger.logError('Invalid SK format', undefined, { skValue });
          return;
        }
        const followingId = skParts[1]; // Get ID from FOLLOW#<id>#...

        if (!followerId || !followingId) {
          logger.logError('Missing followerId or followingId', undefined, {
            followerId,
            followingId,
            pkValue,
            skValue
          });
          return;
        }

        // Delete all feed items from this author in the follower's feed
        const result = await feedService.deleteFeedItemsForUser({
          userId: followerId,
          authorId: followingId
        });

        logger.logInfo('Successfully cleaned up feed items', {
          followerId,
          followingId,
          deletedCount: result.deletedCount
        });
      })
    )
  );

  logger.endBatch(context, results);
};
