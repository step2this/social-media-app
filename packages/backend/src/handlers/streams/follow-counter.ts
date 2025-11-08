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
import { createStreamLogger } from '../../infrastructure/middleware/streamLogger.js';

const logger = createStreamLogger('FollowCounter');

/**
 * Stream processor for updating user follow counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments followingCount for follower and followersCount for followee when FOLLOW entity is inserted
 * - Decrements followingCount for follower and followersCount for followee when FOLLOW entity is removed
 *
 * Uses atomic ADD operation to handle concurrent follows safely
 *
 * Features structured logging with batch metrics and performance tracking
 */
export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();

  const context = logger.startBatch(event.Records.length);

  // Process all records in parallel for better performance
  const results = await Promise.all(
    event.Records.map((record) =>
      logger.processRecord(record, async () => {
        // Only process INSERT and REMOVE events
        if (!shouldProcessRecord(record.eventName)) {
          return;
        }

        // Get the appropriate image based on event type
        const image = getStreamRecordImage(record);
        if (!image) {
          logger.logWarn('No image in stream record');
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
          logger.logWarn('Invalid PK format', { followerPK });
          return;
        }

        // Extract followee PK from GSI2PK (format: USER#<followeeId>)
        const followeePK = image.GSI2PK?.S;
        if (!followeePK || !followeePK.startsWith('USER#')) {
          logger.logWarn('Invalid GSI2PK format', { followeePK });
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

        logger.logInfo('Successfully updated follow counts', {
          follower: followerPK,
          followee: followeePK,
          delta,
          operation: delta > 0 ? 'follow' : 'unfollow'
        });
      })
    )
  );

  logger.endBatch(context, results);
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
    logger.logError(`Failed to update ${counterField} for ${pk}`, error instanceof Error ? error : undefined);
    // Don't throw - allow other updates to continue
  }
};
