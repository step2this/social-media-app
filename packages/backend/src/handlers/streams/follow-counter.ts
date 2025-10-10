import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import {
  shouldProcessRecord,
  getStreamRecordImage,
  parseSKEntity,
  calculateCounterDelta,
  createUpdateExpression
} from '../../utils/stream-counter-helpers.js';

/**
 * Stream processor for updating user follow counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments followingCount for follower and followersCount for followee when FOLLOW entity is inserted
 * - Decrements followingCount for follower and followersCount for followee when FOLLOW entity is removed
 *
 * Uses atomic ADD operation to handle concurrent follows safely
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

      // Only process FOLLOW entities (SK starts with "FOLLOW#")
      const sk = image.SK?.S;
      if (!sk) {
        return;
      }

      const skEntity = parseSKEntity(sk);
      if (!skEntity || skEntity.entityType !== 'FOLLOW') {
        return;
      }

      // Extract follower PK (format: USER#<followerId>)
      const followerPK = image.PK?.S;
      if (!followerPK || !followerPK.startsWith('USER#')) {
        console.warn('Invalid PK format:', followerPK);
        return;
      }

      // Extract followee PK from GSI2PK (format: USER#<followeeId>)
      const followeePK = image.GSI2PK?.S;
      if (!followeePK || !followeePK.startsWith('USER#')) {
        console.warn('Invalid GSI2PK format:', followeePK);
        return;
      }

      // Calculate counter delta
      const delta = calculateCounterDelta(
        record.eventName!,
        record.dynamodb?.NewImage,
        record.dynamodb?.OldImage
      );

      // Update follower's followingCount
      await updateCounter(
        dynamoClient,
        tableName,
        followerPK,
        'followingCount',
        delta
      );

      // Update followee's followersCount
      await updateCounter(
        dynamoClient,
        tableName,
        followeePK,
        'followersCount',
        delta
      );

      console.log(`Successfully updated follow counts for ${followerPK} → ${followeePK} by ${delta}`);
    } catch (error) {
      console.error('Error processing stream record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
      // Continue processing other records even if one fails
    }
  });

  // Wait for all updates to complete
  await Promise.all(processPromises);
};

/**
 * Update a counter field in DynamoDB using atomic ADD operation
 *
 * @param client - DynamoDB document client
 * @param tableName - DynamoDB table name
 * @param pk - Partition key for the item to update
 * @param counterField - Name of the counter field
 * @param delta - Amount to add (positive or negative)
 */
const updateCounter = async (
  client: any,
  tableName: string,
  pk: string,
  counterField: string,
  delta: number
): Promise<void> => {
  try {
    const { UpdateExpression, ExpressionAttributeValues } = createUpdateExpression(
      counterField,
      delta
    );

    await client.send(new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: pk,
        SK: 'PROFILE'
      },
      UpdateExpression,
      ExpressionAttributeValues
    }));
  } catch (error) {
    console.error(`Failed to update ${counterField} for ${pk}:`, error);
    // Don't throw - allow other updates to continue
  }
};
