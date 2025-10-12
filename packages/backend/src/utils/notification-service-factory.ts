import { NotificationService } from '@social-media-app/dal';
import { createDynamoDBClient, getTableName } from './dynamodb.js';

/**
 * Factory function to create and initialize NotificationService
 * Encapsulates DynamoDB client creation and table name retrieval
 *
 * @returns Initialized NotificationService instance
 *
 * @example
 * const notificationService = initializeNotificationService();
 * const notifications = await notificationService.getNotifications({ userId, limit: 20 });
 */
export const initializeNotificationService = (): NotificationService => {
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();
  return new NotificationService(dynamoClient, tableName);
};
