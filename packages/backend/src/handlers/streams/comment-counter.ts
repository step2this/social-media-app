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

      // Extract postId from PK (format: POST#<postId>)
      const pk = image.PK?.S;
      if (!pk || !pk.startsWith('POST#')) {
        console.warn('Invalid PK format:', pk);
        return;
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

      // Update the Post entity's commentsCount using atomic ADD
      await dynamoClient.send(new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: pk,
          SK: 'POST'
        },
        UpdateExpression,
        ExpressionAttributeValues
      }));

      console.log(`Successfully updated commentsCount for ${pk} by ${delta}`);
    } catch (error) {
      console.error('Error processing stream record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
      // Continue processing other records even if one fails
    }
  });

  // Wait for all updates to complete
  await Promise.all(processPromises);
};
