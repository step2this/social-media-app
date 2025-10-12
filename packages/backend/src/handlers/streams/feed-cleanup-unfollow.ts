/* eslint-disable max-lines-per-function */
import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { FeedService } from '@social-media-app/dal';

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
 * @see FeedService.deleteFeedItemsForUser for deletion logic
 */

// Initialize services at container scope for reuse across warm invocations
const dynamoClient = createDynamoDBClient();
const tableName = getTableName();
const feedService = new FeedService(dynamoClient, tableName);

export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  // Process all records in parallel
  const processPromises = event.Records.map(async (record) => {
    try {
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
        console.error('[FeedCleanupUnfollow] Invalid PK format', { pkValue });
        return;
      }
      const followerId = pkValue.substring(5); // Remove "USER#" prefix

      // Extract followingId from SK: FOLLOW#<followingId>#<timestamp>
      // Handle both formats: FOLLOW#<id>#<timestamp> and FOLLOW#<id>
      const skParts = skValue.split('#');
      if (skParts.length < 2) {
        console.error('[FeedCleanupUnfollow] Invalid SK format', { skValue });
        return;
      }
      const followingId = skParts[1]; // Get ID from FOLLOW#<id>#...

      if (!followerId || !followingId) {
        console.error('[FeedCleanupUnfollow] Missing followerId or followingId', {
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

      console.log('[FeedCleanupUnfollow] Cleaned up feed items', {
        followerId,
        followingId,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      // Log error but don't throw (prevents stream poisoning)
      console.error('[FeedCleanupUnfollow] Error processing stream record:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: record.eventID,
        eventName: record.eventName
      });
    }
  });

  // Wait for all records to be processed
  await Promise.all(processPromises);
};
