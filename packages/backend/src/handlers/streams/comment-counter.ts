import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import {
  shouldProcessRecord,
  getStreamRecordImage,
  calculateCounterDelta,
  createUpdateExpression
} from '../../utils/stream-counter-helpers.js';

/**
 * Stream processor for updating post comment counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments commentsCount when a COMMENT entity is inserted
 * - Decrements commentsCount when a COMMENT entity is removed
 *
 * Event-Driven Design:
 * - Extracts post metadata (postUserId, postSK) directly from COMMENT entities
 * - Updates the actual post entity at PK=USER#<postUserId>, SK=<postSK>
 * - No zombie counter entities (PK=POST#<postId>, SK=POST) are created
 * - Post metadata is embedded in COMMENT entities during creation
 *
 * Uses atomic ADD operation to handle concurrent comments safely
 */
export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();

  // Process all records in parallel for better performance
  const processPromises = event.Records.map(async (record) => {
    try {
      // Only process INSERT and REMOVE events
      if (!shouldProcessRecord(record.eventName)) {
        return;
      }

      // Get the appropriate image based on event type
      const image = getStreamRecordImage(record);
      if (!image) {
        console.warn('No image in stream record:', record);
        return;
      }

      // Only process COMMENT entities
      const entityType = image.entityType?.S;
      if (entityType !== 'COMMENT') {
        return;
      }

      // Extract post metadata from COMMENT entity
      // These fields are embedded during comment creation to enable event-driven updates
      const postUserId = image.postUserId?.S;
      const postSK = image.postSK?.S;

      if (!postUserId || !postSK) {
        console.error('Missing post metadata in COMMENT entity', {
          postUserId,
          postSK,
          commentSK: image.SK?.S,
          commentPK: image.PK?.S
        });
        return; // Skip this record - cannot update post without metadata
      }

      // Calculate counter delta
      const delta = calculateCounterDelta(
        record.eventName!,
        record.dynamodb?.NewImage,
        record.dynamodb?.OldImage
      );

      // Create update expression
      const { UpdateExpression, ExpressionAttributeValues } = createUpdateExpression(
        'commentsCount',
        delta
      );

      // Update the actual Post entity's commentsCount using atomic ADD
      // This updates the real post entity, not a zombie counter
      await dynamoClient.send(new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${postUserId}`,  // Actual post entity key
          SK: postSK                   // Full post SK with timestamp
        },
        UpdateExpression,
        ExpressionAttributeValues
      }));

      console.log(`Successfully updated commentsCount for ${postSK} by ${delta}`);
    } catch (error) {
      console.error('Error processing stream record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
      // Continue processing other records even if one fails
    }
  });

  // Wait for all updates to complete
  await Promise.all(processPromises);
};
