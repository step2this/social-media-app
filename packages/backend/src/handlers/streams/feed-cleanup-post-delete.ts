/* eslint-disable max-lines-per-function */
import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { FeedService } from '@social-media-app/dal';

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
 * @see FeedService.deleteFeedItemsByPost for deletion logic
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

      // Only process POST entities (check Keys SK)
      const skValue = record.dynamodb?.Keys?.SK?.S;
      if (skValue !== 'POST') {
        return;
      }

      // Get the old image (deleted post data)
      const oldImage = record.dynamodb?.OldImage;
      if (!oldImage) {
        console.error('[FeedCleanupPostDelete] No OldImage in stream record:', record);
        return;
      }

      // Filter out undefined values before unmarshalling
      const filteredImage = Object.fromEntries(
        Object.entries(oldImage).filter(([, value]) => value !== undefined)
      );

      // Unmarshall DynamoDB AttributeValue to JS object
      const postData = unmarshall(filteredImage as any);

      // Extract postId
      const postId = postData.postId as string;
      if (!postId) {
        console.error('[FeedCleanupPostDelete] Missing postId in deleted post', {
          postData
        });
        return;
      }

      // Delete all feed items for this post
      const result = await feedService.deleteFeedItemsByPost({ postId });

      console.log('[FeedCleanupPostDelete] Cleaned up feed items', {
        postId,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      // Log error but don't throw (prevents stream poisoning)
      console.error('[FeedCleanupPostDelete] Error processing stream record:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: record.eventID,
        eventName: record.eventName
      });
    }
  });

  // Wait for all records to be processed
  await Promise.all(processPromises);
};
