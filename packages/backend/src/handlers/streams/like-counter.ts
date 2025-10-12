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
 * Stream processor for updating post like counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments likesCount when a LIKE entity is inserted
 * - Decrements likesCount when a LIKE entity is removed
 *
 * Event-Driven Design:
 * - Extracts post metadata (postUserId, postSK) directly from LIKE entities
 * - Updates the actual post entity at PK=USER#<postUserId>, SK=<postSK>
 * - No zombie counter entities (PK=POST#<postId>, SK=POST) are created
 * - Post metadata is embedded in LIKE entities during creation
 *
 * Uses atomic ADD operation to handle concurrent likes safely
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

      // Only process LIKE entities
      const entityType = image.entityType?.S;
      if (entityType !== 'LIKE') {
        return;
      }

      // Extract post metadata from LIKE entity
      // These fields are embedded during like creation to enable event-driven updates
      const postUserId = image.postUserId?.S;
      const postSK = image.postSK?.S;

      if (!postUserId || !postSK) {
        console.error('Missing post metadata in LIKE entity', {
          postUserId,
          postSK,
          likeSK: image.SK?.S,
          likePK: image.PK?.S
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
        'likesCount',
        delta
      );

      // Update the actual Post entity's likesCount using atomic ADD
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

      console.log(`Successfully updated likesCount for ${postSK} by ${delta}`);
    } catch (error) {
      console.error('Error processing stream record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
      // Continue processing other records even if one fails
    }
  });

  // Wait for all updates to complete
  await Promise.all(processPromises);
};
