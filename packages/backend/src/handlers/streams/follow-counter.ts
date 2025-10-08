import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';

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

      // Only process FOLLOW entities
      const entityType = image.entityType?.S;
      if (entityType !== 'FOLLOW') {
        return;
      }

      // Extract follower ID from PK (format: USER#<followerId>)
      const pk = image.PK?.S;
      if (!pk || !pk.startsWith('USER#')) {
        console.warn('Invalid PK format:', pk);
        return;
      }
      const followerPK = pk; // Keep full PK for follower update

      // Extract followee ID from GSI2PK (format: USER#<followeeId>)
      const gsi2pk = image.GSI2PK?.S;
      if (!gsi2pk || !gsi2pk.startsWith('USER#')) {
        console.warn('Invalid GSI2PK format:', gsi2pk);
        return;
      }
      const followeePK = gsi2pk; // Keep full PK for followee update

      // Determine increment or decrement
      const delta = record.eventName === 'INSERT' ? 1 : -1;

      // Update follower's followingCount (wrapped to continue even if it fails)
      try {
        await dynamoClient.send(new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: followerPK,
            SK: 'PROFILE'
          },
          UpdateExpression: delta > 0 ? 'ADD followingCount :inc' : 'ADD followingCount :dec',
          ExpressionAttributeValues: delta > 0 ? {
            ':inc': delta
          } : {
            ':dec': delta
          }
        }));
      } catch (updateError) {
        console.error(`Failed to update followingCount for ${followerPK}:`, updateError);
        // Continue to try updating followee
      }

      // Update followee's followersCount (attempt even if follower update failed)
      try {
        await dynamoClient.send(new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: followeePK,
            SK: 'PROFILE'
          },
          UpdateExpression: delta > 0 ? 'ADD followersCount :inc' : 'ADD followersCount :dec',
          ExpressionAttributeValues: delta > 0 ? {
            ':inc': delta
          } : {
            ':dec': delta
          }
        }));
      } catch (updateError) {
        console.error(`Failed to update followersCount for ${followeePK}:`, updateError);
      }

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
