import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';

/**
 * Stream processor for updating post like counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments likesCount when a LIKE entity is inserted
 * - Decrements likesCount when a LIKE entity is removed
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
      if (!record.eventName || !['INSERT', 'REMOVE'].includes(record.eventName)) {
        return;
      }

      // Get the image to check (NewImage for INSERT, OldImage for REMOVE)
      const image = record.eventName === 'INSERT'
        ? record.dynamodb?.NewImage
        : record.dynamodb?.OldImage;

      if (!image) {
        console.warn('No image in stream record:', record);
        return;
      }

      // Only process LIKE entities
      const entityType = image.entityType?.S;
      if (entityType !== 'LIKE') {
        return;
      }

      // Extract postId from PK (format: POST#<postId>)
      const pk = image.PK?.S;
      if (!pk || !pk.startsWith('POST#')) {
        console.warn('Invalid PK format:', pk);
        return;
      }

      // Determine increment or decrement
      const delta = record.eventName === 'INSERT' ? 1 : -1;

      // Update the Post entity's likesCount using atomic ADD
      await dynamoClient.send(new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: pk,
          SK: 'POST'
        },
        UpdateExpression: delta > 0 ? 'ADD likesCount :inc' : 'ADD likesCount :dec',
        ExpressionAttributeValues: delta > 0 ? {
          ':inc': delta
        } : {
          ':dec': delta
        }
      }));

      console.log(`Successfully updated likesCount for ${pk} by ${delta}`);
    } catch (error) {
      console.error('Error processing stream record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
      // Continue processing other records even if one fails
    }
  });

  // Wait for all updates to complete
  await Promise.all(processPromises);
};
