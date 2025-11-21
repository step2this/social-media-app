import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { Notification } from '@social-media-app/shared';
import { NotificationTitleField, NotificationMessageField } from '@social-media-app/shared';
import { type NotificationEntity, mapEntityToNotification } from '../utils/notification-mappers.js';
import {
  logDynamoDB,
  logServiceOp,
  logBatch,
  logError,
  logger
} from '../infrastructure/logger.js';

/**
 * Response type for createNotification
 */
interface CreateNotificationResponse {
  readonly notification: Notification;
}

/**
 * Response type for getNotifications
 */
interface GetNotificationsResponse {
  readonly notifications: readonly Notification[];
  readonly totalCount: number;
  readonly unreadCount: number;
  readonly hasMore: boolean;
  readonly nextCursor?: string;
}

/**
 * Response type for markAsRead
 */
interface MarkAsReadResponse {
  readonly notification?: Notification;
  readonly updatedCount?: number;
}

/**
 * Response type for markAllAsRead
 */
interface MarkAllAsReadResponse {
  readonly updatedCount: number;
}

/**
 * Response type for deleteNotification
 */
interface DeleteNotificationResponse {
  readonly success: boolean;
  readonly deletedCount?: number;
}

/**
 * Response type for batchOperation
 */
interface BatchOperationResponse {
  readonly processedCount: number;
  readonly failedCount: number;
  readonly failures?: readonly { readonly id: string; readonly error: string }[];
}

/**
 * NotificationService - Manages user notifications with DynamoDB
 *
 * **Features:**
 * - Create notifications with automatic TTL (30-day expiration)
 * - Sparse GSI2 index for efficient unread notification queries
 * - Query notifications with filters (status, type, priority)
 * - Cursor-based pagination for large result sets
 * - Mark as read (single, batch, all) with ownership validation
 * - Delete notifications with ownership validation
 * - Batch operations (mark-read, delete, archive) with failure tracking
 *
 * **Performance Optimizations:**
 * - Sparse GSI2 index contains only unread notifications
 * - TTL-based auto-cleanup reduces storage costs
 * - Efficient cursor-based pagination
 *
 * @example
 * ```typescript
 * const service = new NotificationService(dynamoClient, 'MyTable');
 *
 * // Create notification
 * const result = await service.createNotification({
 *   userId: 'user-123',
 *   type: 'follow',
 *   title: 'New follower',
 *   message: 'John started following you'
 * });
 *
 * // Get notifications with filters
 * const notifications = await service.getNotifications({
 *   userId: 'user-123',
 *   status: 'unread',
 *   limit: 20
 * });
 *
 * // Mark as read
 * await service.markAsRead({
 *   userId: 'user-123',
 *   notificationId: 'notif-123'
 * });
 * ```
 */
export class NotificationService {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  /**
   * Calculates TTL for notification auto-deletion
   * Notifications expire 30 days from creation
   *
   * @private
   * @returns Unix timestamp (seconds) for TTL
   */
  private calculateTTL(): number {
    return Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);
  }

  /**
   * Fetches a notification by ID and verifies ownership
   * Uses GSI1 for efficient lookup
   *
   * @private
   * @param notificationId - Notification ID
   * @returns NotificationEntity or null if not found
   */
  private async getNotificationById(
    notificationId: string
  ): Promise<NotificationEntity | null> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `NOTIFICATION#${notificationId}`
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as NotificationEntity;
  }

  /**
   * Verifies that a user owns a notification
   *
   * @private
   * @param entity - NotificationEntity to check
   * @param userId - User ID claiming ownership
   * @throws Error if user does not own the notification
   */
  private verifyOwnership(entity: NotificationEntity, userId: string): void {
    if (entity.userId !== userId) {
      throw new Error('Unauthorized: You can only modify your own notifications');
    }
  }

  /**
   * Updates a notification to mark it as read
   * Removes GSI2 keys to remove from sparse unread index
   *
   * @private
   * @param entity - NotificationEntity to update
   * @returns Updated NotificationEntity
   */
  private async updateNotificationAsRead(
    entity: NotificationEntity
  ): Promise<NotificationEntity> {
    const now = new Date().toISOString();

    const updateResult = await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: entity.PK,
        SK: entity.SK
      },
      UpdateExpression: 'SET #status = :status, readAt = :readAt, updatedAt = :updatedAt, isRead = :isRead REMOVE GSI2PK, GSI2SK',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'read',
        ':readAt': now,
        ':updatedAt': now,
        ':isRead': true
      },
      ReturnValues: 'ALL_NEW'
    }));

    return updateResult.Attributes as NotificationEntity;
  }

  /**
   * Creates a new notification with validation and TTL
   *
   * **Validation:**
   * - Title: 1-100 characters (trimmed)
   * - Message: 1-500 characters (trimmed)
   *
   * **Defaults:**
   * - priority: 'normal'
   * - deliveryChannels: ['in-app']
   * - soundEnabled: true
   * - vibrationEnabled: true
   * - status: 'unread'
   *
   * **Sparse GSI2:**
   * New notifications are added to GSI2 (unread index) automatically.
   * When marked as read, GSI2 keys are removed to keep index small.
   *
   * @param data - Notification creation data
   * @returns CreateNotificationResponse with the created notification
   * @throws Error if title or message validation fails
   */
  async createNotification(
    data: any
  ): Promise<CreateNotificationResponse> {
    const startTime = Date.now();

    try {
      // Validate title and message using Zod schemas
      const titleValidation = NotificationTitleField.safeParse(data.title);
      if (!titleValidation.success) {
        throw new Error(`Invalid notification title: ${titleValidation.error.message}`);
      }

      const messageValidation = NotificationMessageField.safeParse(data.message);
      if (!messageValidation.success) {
        throw new Error(`Invalid notification message: ${messageValidation.error.message}`);
      }

      const notificationId = randomUUID();
      const now = new Date().toISOString();
      const ttl = this.calculateTTL();

      // Default values
      const priority = data.priority ?? 'normal';
      const deliveryChannels = data.deliveryChannels ?? ['in-app'];
      const soundEnabled = data.soundEnabled ?? true;
      const vibrationEnabled = data.vibrationEnabled ?? true;
      const status = 'unread';
      const isRead = false;

      const notificationEntity: NotificationEntity = {
        // Primary keys
        PK: `USER#${data.userId}`,
        SK: `NOTIFICATION#${now}#${notificationId}`,

        // GSI1 - Notification by ID
        GSI1PK: `NOTIFICATION#${notificationId}`,
        GSI1SK: `USER#${data.userId}`,

        // GSI2 - Sparse index for unread (only set when unread)
        GSI2PK: `UNREAD#USER#${data.userId}`,
        GSI2SK: `NOTIFICATION#${now}#${notificationId}`,

        // Notification fields
        id: notificationId,
        userId: data.userId,
        type: data.type,
        status,
        title: titleValidation.data, // Use validated & trimmed title
        message: messageValidation.data, // Use validated & trimmed message
        priority,
        actor: data.actor,
        target: data.target,
        metadata: data.metadata,
        deliveryChannels,
        soundEnabled,
        vibrationEnabled,
        groupId: data.groupId,
        expiresAt: data.expiresAt,
        createdAt: now,
        updatedAt: now,

        // DynamoDB metadata
        entityType: 'NOTIFICATION',
        ttl,
        isRead
      };

      logDynamoDB('put', { 
        table: this.tableName, 
        notificationId, 
        userId: data.userId, 
        type: data.type 
      });
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: notificationEntity
      }));

      const duration = Date.now() - startTime;
      logServiceOp('NotificationService', 'createNotification', { 
        notificationId, 
        userId: data.userId, 
        type: data.type 
      }, duration);

      return {
        notification: mapEntityToNotification(notificationEntity)
      };
    } catch (error) {
      logError('NotificationService', 'createNotification', error as Error, { userId: data.userId, type: data.type });
      throw error;
    }
  }

  /**
   * Gets notifications for a user with filters and pagination
   *
   * **Query Pattern:**
   * Primary table query: `PK = USER#<userId>`, `SK begins_with NOTIFICATION#`
   * Results are ordered newest-first (descending SK)
   *
   * **Filters:**
   * - status: Filter by 'unread', 'read', or 'archived'
   * - type: Filter by notification type ('follow', 'like', 'comment', etc.)
   * - priority: Filter by 'low', 'normal', or 'high'
   *
   * **Pagination:**
   * - limit: Max results per page (1-100, default varies)
   * - cursor: Base64-encoded pagination token from previous response
   *
   * @param request - Query parameters (userId, filters, pagination)
   * @returns GetNotificationsResponse with notifications, counts, and pagination metadata
   * @throws Error if limit is out of range (1-100)
   *
   * @example
   * ```typescript
   * // Get first page of unread notifications
   * const page1 = await service.getNotifications({
   *   userId: 'user-123',
   *   status: 'unread',
   *   limit: 20
   * });
   *
   * // Get next page using cursor
   * if (page1.hasMore) {
   *   const page2 = await service.getNotifications({
   *     userId: 'user-123',
   *     status: 'unread',
   *     limit: 20,
   *     cursor: page1.nextCursor
   *   });
   * }
   * ```
   */
  async getNotifications(
    request: any
  ): Promise<GetNotificationsResponse> {
    const validatedRequest = request;

    // Basic validation
    if (validatedRequest.limit !== undefined && (validatedRequest.limit < 1 || validatedRequest.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Build filter expression
    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': `USER#${validatedRequest.userId}`,
      ':skPrefix': 'NOTIFICATION#'
    };
    const expressionAttributeNames: Record<string, string> = {};

    // Add status filter
    if (validatedRequest.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = validatedRequest.status;
    }

    // Add type filter
    if (validatedRequest.type) {
      filterExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = validatedRequest.type;
    }

    // Add priority filter
    if (validatedRequest.priority) {
      filterExpressions.push('priority = :priority');
      expressionAttributeValues[':priority'] = validatedRequest.priority;
    }

    // Parse cursor if provided
    let exclusiveStartKey: Record<string, unknown> | undefined;
    if (validatedRequest.cursor) {
      try {
        exclusiveStartKey = JSON.parse(
          Buffer.from(validatedRequest.cursor, 'base64').toString('utf-8')
        );
      } catch {
        // Invalid cursor, ignore it
      }
    }

    // Query notifications
    const queryParams: {
      TableName: string;
      KeyConditionExpression: string;
      ExpressionAttributeValues: Record<string, unknown>;
      ExpressionAttributeNames?: Record<string, string>;
      FilterExpression?: string;
      ScanIndexForward: boolean;
      Limit: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // Descending order (newest first)
      Limit: validatedRequest.limit
    };

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (exclusiveStartKey) {
      queryParams.ExclusiveStartKey = exclusiveStartKey;
    }

    logDynamoDB('query', { 
      table: this.tableName, 
      gsi: 'GSI2', 
      userId: validatedRequest.userId,
      unreadOnly: validatedRequest.status === 'unread'
    });
    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    const notifications = (result.Items || []).map(item =>
      mapEntityToNotification(item as NotificationEntity)
    );

    // Get unread count
    const unreadCount = await this.getUnreadCount(validatedRequest.userId);

    // Generate next cursor if there are more items
    let nextCursor: string | undefined;
    if (result.LastEvaluatedKey) {
      nextCursor = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey),
        'utf-8'
      ).toString('base64');
    }

    logger.debug({
      userId: validatedRequest.userId,
      notificationsReturned: notifications.length,
      unreadCount,
      hasMore: !!result.LastEvaluatedKey
    }, '[NotificationService] Notifications retrieved');

    return {
      notifications,
      totalCount: notifications.length,
      unreadCount,
      hasMore: !!result.LastEvaluatedKey,
      nextCursor
    };
  }

  /**
   * Gets the count of unread notifications for a user
   *
   * **Performance:**
   * Uses sparse GSI2 index which only contains unread notifications.
   * This is much faster than filtering all notifications by status.
   * Uses `Select: 'COUNT'` to avoid fetching full items.
   *
   * @param userId - User ID
   * @returns Number of unread notifications (0 if none)
   *
   * @example
   * ```typescript
   * const count = await service.getUnreadCount('user-123');
   * console.log(`You have ${count} unread notifications`);
   * ```
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk',
      ExpressionAttributeValues: {
        ':gsi2pk': `UNREAD#USER#${userId}`
      },
      Select: 'COUNT'
    }));

    return result.Count || 0;
  }

  /**
   * Marks notification(s) as read
   * Removes notifications from unread index (GSI2) for better performance
   *
   * **Modes:**
   * - Single: Provide `notificationId` for one notification
   * - Batch: Provide `notificationIds` array for multiple notifications
   *
   * **Idempotency:**
   * Safe to call multiple times - already-read notifications are unchanged
   *
   * **Ownership:**
   * Users can only mark their own notifications as read
   *
   * @param request - Mark as read request (userId, notificationId or notificationIds)
   * @returns MarkAsReadResponse with updated notification (single) or count (batch)
   * @throws Error if unauthorized or notification not found (single mode only)
   *
   * @example
   * ```typescript
   * // Mark single notification as read
   * const result = await service.markAsRead({
   *   userId: 'user-123',
   *   notificationId: 'notif-abc'
   * });
   *
   * // Mark multiple notifications as read
   * const batchResult = await service.markAsRead({
   *   userId: 'user-123',
   *   notificationIds: ['notif-1', 'notif-2', 'notif-3']
   * });
   * console.log(`Marked ${batchResult.updatedCount} as read`);
   * ```
   */
  async markAsRead(
    request: any & { userId: string }
  ): Promise<MarkAsReadResponse> {
    const validatedRequest = request;

    // Handle single notification
    if (validatedRequest.notificationId) {
      return await this.markSingleAsRead(
        request.userId,
        validatedRequest.notificationId
      );
    }

    // Handle batch notifications
    if (validatedRequest.notificationIds) {
      const updatedCount = await this.markBatchAsRead(
        request.userId,
        validatedRequest.notificationIds
      );
      return { updatedCount };
    }

    throw new Error('Either notificationId or notificationIds must be provided');
  }

  /**
   * Marks a single notification as read
   * Idempotent - returns success if already read
   *
   * @private
   * @param userId - User ID requesting the operation
   * @param notificationId - Notification ID to mark as read
   * @returns MarkAsReadResponse with updated notification
   * @throws Error if notification not found or unauthorized
   */
  private async markSingleAsRead(
    userId: string,
    notificationId: string
  ): Promise<MarkAsReadResponse> {
    // Get notification and verify ownership
    const notificationEntity = await this.getNotificationById(notificationId);

    if (!notificationEntity) {
      throw new Error('Notification not found');
    }

    this.verifyOwnership(notificationEntity, userId);

    // If already read, return idempotently
    if (notificationEntity.status === 'read') {
      return {
        notification: mapEntityToNotification(notificationEntity)
      };
    }

    // Update to mark as read
    const updatedEntity = await this.updateNotificationAsRead(notificationEntity);

    return {
      notification: mapEntityToNotification(updatedEntity)
    };
  }

  /**
   * Marks multiple notifications as read
   * @private
   */
  private async markBatchAsRead(
    userId: string,
    notificationIds: readonly string[]
  ): Promise<number> {
    let updatedCount = 0;

    for (const notificationId of notificationIds) {
      try {
        await this.markSingleAsRead(userId, notificationId);
        updatedCount++;
      } catch {
        // Skip notifications that fail (ownership or not found)
        continue;
      }
    }

    return updatedCount;
  }

  /**
   * Marks all notifications as read for a user
   * Can be filtered by type or date
   *
   * **Filters:**
   * - type: Only mark notifications of specific type (e.g., 'follow', 'like')
   * - beforeDate: Only mark notifications created before this ISO date
   *
   * **Performance Note:**
   * This queries all user notifications and updates each individually.
   * For large notification sets, consider using batch operations instead.
   *
   * @param request - Mark all as read request (userId, optional filters)
   * @returns MarkAllAsReadResponse with count of updated notifications
   *
   * @example
   * ```typescript
   * // Mark all notifications as read
   * const result = await service.markAllAsRead({
   *   userId: 'user-123'
   * });
   *
   * // Mark all 'follow' notifications as read
   * const followResult = await service.markAllAsRead({
   *   userId: 'user-123',
   *   type: 'follow'
   * });
   *
   * // Mark all notifications before a date as read
   * const dateResult = await service.markAllAsRead({
   *   userId: 'user-123',
   *   beforeDate: '2024-01-01T00:00:00Z'
   * });
   * ```
   */
  async markAllAsRead(
    request: any
  ): Promise<MarkAllAsReadResponse> {
    const validatedRequest = request;

    // Build filter expression
    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': `USER#${validatedRequest.userId}`,
      ':skPrefix': 'NOTIFICATION#',
      ':status': 'unread' // Mock expects :status as the placeholder name
    };
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status'
    };

    // Only mark unread notifications
    filterExpressions.push('#status = :status');

    // Add type filter
    if (validatedRequest.type) {
      filterExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = validatedRequest.type;
    }

    // Add date filter
    if (validatedRequest.beforeDate) {
      filterExpressions.push('createdAt < :beforeDate');
      expressionAttributeValues[':beforeDate'] = validatedRequest.beforeDate;
    }

    // Query all matching notifications
    const queryParams: {
      TableName: string;
      KeyConditionExpression: string;
      ExpressionAttributeValues: Record<string, unknown>;
      ExpressionAttributeNames: Record<string, string>;
      FilterExpression: string;
    } = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      FilterExpression: filterExpressions.join(' AND ')
    };

    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    let updatedCount = 0;

    // Update each notification using helper method
    for (const item of result.Items || []) {
      const entity = item as NotificationEntity;
      await this.updateNotificationAsRead(entity);
      updatedCount++;
    }

    return { updatedCount };
  }

  /**
   * Deletes notification(s)
   * Permanently removes notifications from DynamoDB
   *
   * **Modes:**
   * - Single: Provide `notificationId` for one notification
   * - Batch: Provide `notificationIds` array for multiple notifications
   *
   * **Idempotency:**
   * Safe to call multiple times - missing notifications are skipped silently
   *
   * **Ownership:**
   * Users can only delete their own notifications
   *
   * @param request - Delete request (userId, notificationId or notificationIds)
   * @returns DeleteNotificationResponse with success status and optional count
   * @throws Error if unauthorized or missing notification IDs
   *
   * @example
   * ```typescript
   * // Delete single notification
   * await service.deleteNotification({
   *   userId: 'user-123',
   *   notificationId: 'notif-abc'
   * });
   *
   * // Delete multiple notifications
   * const result = await service.deleteNotification({
   *   userId: 'user-123',
   *   notificationIds: ['notif-1', 'notif-2', 'notif-3']
   * });
   * console.log(`Deleted ${result.deletedCount} notifications`);
   * ```
   */
  async deleteNotification(
    request: any & { userId: string }
  ): Promise<DeleteNotificationResponse> {
    const validatedRequest = request;

    // Handle single notification
    if (validatedRequest.notificationId) {
      await this.deleteSingleNotification(
        request.userId,
        validatedRequest.notificationId
      );
      return { success: true };
    }

    // Handle batch notifications
    if (validatedRequest.notificationIds) {
      const deletedCount = await this.deleteBatchNotifications(
        request.userId,
        validatedRequest.notificationIds
      );
      return { success: true, deletedCount };
    }

    throw new Error('Either notificationId or notificationIds must be provided');
  }

  /**
   * Deletes a single notification
   * Idempotent - succeeds if notification doesn't exist
   *
   * @private
   * @param userId - User ID requesting the operation
   * @param notificationId - Notification ID to delete
   * @throws Error if unauthorized
   */
  private async deleteSingleNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    // Get notification and verify ownership
    const notificationEntity = await this.getNotificationById(notificationId);

    if (!notificationEntity) {
      // Idempotent - notification doesn't exist
      return;
    }

    this.verifyOwnership(notificationEntity, userId);

    // Delete the notification
    await this.dynamoClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: notificationEntity.PK,
        SK: notificationEntity.SK
      }
    }));
  }

  /**
   * Deletes multiple notifications
   * @private
   */
  private async deleteBatchNotifications(
    userId: string,
    notificationIds: readonly string[]
  ): Promise<number> {
    let deletedCount = 0;

    for (const notificationId of notificationIds) {
      try {
        await this.deleteSingleNotification(userId, notificationId);
        deletedCount++;
      } catch {
        // Skip notifications that fail (ownership or not found)
        continue;
      }
    }

    return deletedCount;
  }

  /**
   * Performs batch operations on notifications
   * Supports mark-read, delete, and archive operations
   *
   * **Operations:**
   * - `mark-read`: Marks notifications as read (removes from unread index)
   * - `delete`: Permanently deletes notifications
   * - `archive`: Archives notifications (removes from unread index)
   *
   * **Failure Handling:**
   * - Continues processing if individual operations fail
   * - Returns failures array with IDs and error messages
   * - Does not roll back successful operations
   *
   * @param request - Batch operation request
   * @returns BatchOperationResponse with success/failure counts
   * @throws Error if request validation fails
   */
  async batchOperation(
    request: any
  ): Promise<BatchOperationResponse> {
    const validatedRequest = request;

    // Validate request
    if (!validatedRequest.notificationIds || validatedRequest.notificationIds.length === 0) {
      throw new Error('At least one notification ID is required');
    }

    const validOperations = ['mark-read', 'delete', 'archive'];
    if (!validOperations.includes(validatedRequest.operation)) {
      throw new Error(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
    }

    logBatch('NotificationService', 'batchOperation', validatedRequest.notificationIds.length, validatedRequest.notificationIds.length);

    const failures: { readonly id: string; readonly error: string }[] = [];
    let processedCount = 0;

    for (const notificationId of validatedRequest.notificationIds) {
      try {
        const entity = await this.getNotificationById(notificationId);

        if (!entity) {
          failures.push({
            id: notificationId,
            error: 'Notification not found'
          });
          continue;
        }

        // Perform operation based on type
        await this.executeBatchOperation(validatedRequest.operation, entity);
        processedCount++;
      } catch (error) {
        failures.push({
          id: notificationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.debug({
      operation: validatedRequest.operation,
      totalRequested: validatedRequest.notificationIds.length,
      processedCount,
      failedCount: failures.length
    }, '[NotificationService] Batch operation completed');

    return {
      processedCount,
      failedCount: failures.length,
      failures: failures.length > 0 ? failures : undefined
    };
  }

  /**
   * Executes a specific batch operation on a notification entity
   *
   * @private
   * @param operation - Operation type (mark-read, delete, archive)
   * @param entity - NotificationEntity to operate on
   */
  private async executeBatchOperation(
    operation: string,
    entity: NotificationEntity
  ): Promise<void> {
    switch (operation) {
      case 'mark-read':
        await this.updateNotificationAsRead(entity);
        break;

      case 'delete':
        await this.dynamoClient.send(new DeleteCommand({
          TableName: this.tableName,
          Key: {
            PK: entity.PK,
            SK: entity.SK
          }
        }));
        break;

      case 'archive': {
        const now = new Date().toISOString();
        await this.dynamoClient.send(new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: entity.PK,
            SK: entity.SK
          },
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, isRead = :isRead REMOVE GSI2PK, GSI2SK',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'archived',
            ':updatedAt': now,
            ':isRead': true
          }
        }));
        break;
      }
    }
  }
}
