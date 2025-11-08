import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import {
  shouldProcessRecord,
  getStreamRecordImage,
  calculateCounterDelta,
  createUpdateExpression
} from '../../utils/stream-counter-helpers.js';
import { createStreamLogger } from '../../infrastructure/middleware/streamLogger.js';

const logger = createStreamLogger('LikeCounter');

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
          logger.logError('Missing post metadata in LIKE entity', undefined, {
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

        logger.logInfo('Successfully updated likesCount', {
          postSK,
          delta,
          operation: delta > 0 ? 'like' : 'unlike'
        });
      })
    )
  );

  logger.endBatch(context, results);
};
