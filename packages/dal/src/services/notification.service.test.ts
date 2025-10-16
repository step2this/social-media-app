/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from './notification.service.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createMockDynamoClient, type MockDynamoClient } from '@social-media-app/shared/test-utils';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockDynamoClient: MockDynamoClient;
  const tableName = 'test-table';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    notificationService = new NotificationService(mockDynamoClient as unknown as DynamoDBDocumentClient, tableName);
  });

  describe('createNotification', () => {
    const validNotificationData = {
      userId: 'user-123',
      type: 'like' as const,
      title: 'New like on your post',
      message: 'John Doe liked your photo',
      priority: 'normal' as const,
      actor: {
        userId: 'actor-123',
        handle: 'johndoe',
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg'
      },
      target: {
        type: 'post' as const,
        id: 'post-123',
        url: 'https://example.com/posts/123',
        preview: 'Beautiful sunset photo...'
      },
      metadata: { postType: 'image' },
      deliveryChannels: ['in-app' as const, 'push' as const],
      soundEnabled: true,
      vibrationEnabled: true
    };

    it('should create notification with correct DynamoDB keys', async () => {
      const result = await notificationService.createNotification(validNotificationData);

      expect(result.notification).toBeDefined();
      expect(result.notification.id).toBeDefined();
      expect(result.notification.userId).toBe(validNotificationData.userId);
      expect(result.notification.type).toBe(validNotificationData.type);
      expect(result.notification.status).toBe('unread');
      expect(result.notification.createdAt).toBeDefined();
      expect(result.notification.updatedAt).toBeDefined();

      // Verify entity in DynamoDB
      const allItems = Array.from(mockDynamoClient._getItems().values());
      const entity = allItems.find(item => item.id === result.notification.id);

      expect(entity).toBeDefined();
      expect(entity?.PK).toBe(`USER#${validNotificationData.userId}`);
      expect(entity?.SK).toMatch(/^NOTIFICATION#\d{4}-\d{2}-\d{2}T.*#.+$/);
      expect(entity?.GSI1PK).toBe(`NOTIFICATION#${result.notification.id}`);
      expect(entity?.GSI1SK).toBe(`USER#${validNotificationData.userId}`);
      expect(entity?.entityType).toBe('NOTIFICATION');
    });

    it('should set sparse GSI2 keys for unread notifications', async () => {
      const result = await notificationService.createNotification(validNotificationData);

      const allItems = Array.from(mockDynamoClient._getItems().values());
      const entity = allItems.find(item => item.id === result.notification.id);

      expect(entity?.GSI2PK).toBe(`UNREAD#USER#${validNotificationData.userId}`);
      expect(entity?.GSI2SK).toMatch(/^NOTIFICATION#\d{4}-\d{2}-\d{2}T.*#.+$/);
      expect(entity?.isRead).toBe(false);
    });

    it('should set TTL to 30 days from creation', async () => {
      const beforeCreate = Date.now();
      const result = await notificationService.createNotification(validNotificationData);
      const afterCreate = Date.now();

      const allItems = Array.from(mockDynamoClient._getItems().values());
      const entity = allItems.find(item => item.id === result.notification.id);

      expect(entity?.ttl).toBeDefined();
      const expectedTTL = Math.floor(beforeCreate / 1000) + (30 * 24 * 60 * 60);
      const actualTTL = entity?.ttl as number;

      // Allow for 2 second variance due to test execution time
      expect(actualTTL).toBeGreaterThanOrEqual(expectedTTL - 2);
      expect(actualTTL).toBeLessThanOrEqual(Math.floor(afterCreate / 1000) + (30 * 24 * 60 * 60) + 2);
    });

    it('should generate unique notification IDs', async () => {
      const result1 = await notificationService.createNotification(validNotificationData);
      const result2 = await notificationService.createNotification(validNotificationData);

      expect(result1.notification.id).not.toBe(result2.notification.id);
    });

    it('should validate notification data using schemas', async () => {
      const invalidData = {
        ...validNotificationData,
        title: '', // Empty title should fail validation
      };

      await expect(notificationService.createNotification(invalidData as any))
        .rejects.toThrow();
    });

    it('should handle notification without actor', async () => {
      const dataWithoutActor = {
        ...validNotificationData,
        actor: undefined
      };

      const result = await notificationService.createNotification(dataWithoutActor);

      expect(result.notification).toBeDefined();
      expect(result.notification.actor).toBeUndefined();
    });

    it('should handle notification without target', async () => {
      const dataWithoutTarget = {
        ...validNotificationData,
        target: undefined
      };

      const result = await notificationService.createNotification(dataWithoutTarget);

      expect(result.notification).toBeDefined();
      expect(result.notification.target).toBeUndefined();
    });

    it('should handle notification with groupId', async () => {
      const dataWithGroup = {
        ...validNotificationData,
        groupId: 'group-123'
      };

      const result = await notificationService.createNotification(dataWithGroup);

      expect(result.notification.groupId).toBe('group-123');
    });

    it('should handle notification with expiresAt', async () => {
      const expiresAt = '2024-01-20T10:30:00.000Z';
      const dataWithExpiry = {
        ...validNotificationData,
        expiresAt
      };

      const result = await notificationService.createNotification(dataWithExpiry);

      expect(result.notification.expiresAt).toBe(expiresAt);
    });

    it('should set default priority to normal if not provided', async () => {
      const dataWithoutPriority = {
        userId: 'user-123',
        type: 'system' as const,
        title: 'System notification',
        message: 'System message'
      };

      const result = await notificationService.createNotification(dataWithoutPriority);

      expect(result.notification.priority).toBe('normal');
    });

    it('should set default deliveryChannels to in-app if not provided', async () => {
      const dataWithoutChannels = {
        userId: 'user-123',
        type: 'system' as const,
        title: 'System notification',
        message: 'System message'
      };

      const result = await notificationService.createNotification(dataWithoutChannels);

      expect(result.notification.deliveryChannels).toEqual(['in-app']);
    });

    it('should preserve all notification types', async () => {
      const types = ['like', 'comment', 'follow', 'mention', 'reply', 'repost', 'quote', 'system', 'announcement', 'achievement'] as const;

      for (const type of types) {
        const data = {
          ...validNotificationData,
          type
        };

        const result = await notificationService.createNotification(data);
        expect(result.notification.type).toBe(type);
      }
    });

    it('should preserve all priority levels', async () => {
      const priorities = ['low', 'normal', 'high', 'urgent'] as const;

      for (const priority of priorities) {
        const data = {
          ...validNotificationData,
          priority
        };

        const result = await notificationService.createNotification(data);
        expect(result.notification.priority).toBe(priority);
      }
    });

    it('should validate title length (1-100 characters)', async () => {
      const tooLongTitle = 'a'.repeat(101);
      const dataWithLongTitle = {
        ...validNotificationData,
        title: tooLongTitle
      };

      await expect(notificationService.createNotification(dataWithLongTitle))
        .rejects.toThrow();
    });

    it('should validate message length (1-500 characters)', async () => {
      const tooLongMessage = 'a'.repeat(501);
      const dataWithLongMessage = {
        ...validNotificationData,
        message: tooLongMessage
      };

      await expect(notificationService.createNotification(dataWithLongMessage))
        .rejects.toThrow();
    });
  });

  describe('getNotifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'First notification',
        message: 'First message',
        priority: 'normal'
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'comment',
        title: 'Second notification',
        message: 'Second message',
        priority: 'high'
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'follow',
        title: 'Third notification',
        message: 'Third message',
        priority: 'normal'
      });
    });

    it('should retrieve all notifications for user', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      expect(result.notifications).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });

    it('should return notifications in descending order (newest first)', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      expect(result.notifications[0].title).toBe('Third notification');
      expect(result.notifications[1].title).toBe('Second notification');
      expect(result.notifications[2].title).toBe('First notification');
    });

    it('should respect limit parameter', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 2
      });

      expect(result.notifications).toHaveLength(2);
    });

    it('should filter by status (unread)', async () => {
      // Mark one notification as read
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });
      await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: allNotifs.notifications[0].id
      });

      const result = await notificationService.getNotifications({
        userId: 'user-123',
        status: 'unread',
        limit: 20
      });

      expect(result.notifications.length).toBe(2);
      expect(result.notifications.every(n => n.status === 'unread')).toBe(true);
    });

    it('should filter by status (read)', async () => {
      // Mark one notification as read
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });
      await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: allNotifs.notifications[0].id
      });

      const result = await notificationService.getNotifications({
        userId: 'user-123',
        status: 'read',
        limit: 20
      });

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].status).toBe('read');
    });

    it('should filter by type', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        type: 'comment',
        limit: 20
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('comment');
    });

    it('should filter by priority', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        priority: 'high',
        limit: 20
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].priority).toBe('high');
    });

    it('should return empty array for user with no notifications', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-with-no-notifs',
        limit: 20
      });

      expect(result.notifications).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should validate limit is between 1 and 100', async () => {
      await expect(notificationService.getNotifications({
        userId: 'user-123',
        limit: 0
      })).rejects.toThrow();

      await expect(notificationService.getNotifications({
        userId: 'user-123',
        limit: 101
      })).rejects.toThrow();
    });

    it('should use default limit of 20 if not specified', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123'
      });

      expect(result.notifications.length).toBeLessThanOrEqual(20);
    });

    it('should support pagination with cursor', async () => {
      const firstPage = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 2
      });

      expect(firstPage.notifications).toHaveLength(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();

      const secondPage = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 2,
        cursor: firstPage.nextCursor
      });

      expect(secondPage.notifications).toHaveLength(1);
      expect(secondPage.hasMore).toBe(false);
    });

    it('should handle combined filters (status + type)', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        status: 'unread',
        type: 'like',
        limit: 20
      });

      expect(result.notifications.every(n => n.status === 'unread' && n.type === 'like')).toBe(true);
    });

    it('should return unreadCount', async () => {
      const result = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      expect(result.unreadCount).toBe(3);
    });

    it('should update unreadCount after marking as read', async () => {
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: allNotifs.notifications[0].id
      });

      const result = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      expect(result.unreadCount).toBe(2);
    });
  });

  describe('getUnreadCount', () => {
    beforeEach(async () => {
      // Create unread notifications
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Notification 1',
        message: 'Message 1'
      });

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'comment',
        title: 'Notification 2',
        message: 'Message 2'
      });

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'follow',
        title: 'Notification 3',
        message: 'Message 3'
      });
    });

    it('should count unread notifications for user', async () => {
      const count = await notificationService.getUnreadCount('user-123');

      expect(count).toBe(3);
    });

    it('should use sparse GSI2 index for unread query', async () => {
      await notificationService.getUnreadCount('user-123');

      const calls = mockDynamoClient.send.mock.calls;
      const queryCall = calls.find(call =>
        call[0].constructor.name === 'QueryCommand' &&
        call[0].input.IndexName === 'GSI2'
      );

      expect(queryCall).toBeDefined();
      expect(queryCall![0].input.KeyConditionExpression).toContain('GSI2PK = :gsi2pk');
    });

    it('should return 0 when no unread notifications', async () => {
      const count = await notificationService.getUnreadCount('user-with-no-notifs');

      expect(count).toBe(0);
    });

    it('should update count after marking as read', async () => {
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: allNotifs.notifications[0].id
      });

      const count = await notificationService.getUnreadCount('user-123');

      expect(count).toBe(2);
    });

    it('should handle all notifications marked as read', async () => {
      await notificationService.markAllAsRead({
        userId: 'user-123'
      });

      const count = await notificationService.getUnreadCount('user-123');

      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    let testNotificationId: string;

    beforeEach(async () => {
      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Test notification',
        message: 'Test message'
      });
      testNotificationId = result.notification.id;
    });

    it('should mark single notification as read', async () => {
      const result = await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      expect(result.notification).toBeDefined();
      expect(result.notification.status).toBe('read');
      expect(result.notification.readAt).toBeDefined();
    });

    it('should remove sparse GSI2 keys when marking read', async () => {
      await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      const allItems = Array.from(mockDynamoClient._getItems().values());
      const entity = allItems.find(item => item.id === testNotificationId);

      expect(entity?.GSI2PK).toBeUndefined();
      expect(entity?.GSI2SK).toBeUndefined();
      expect(entity?.isRead).toBe(true);
    });

    it('should set readAt timestamp', async () => {
      const beforeRead = Date.now();

      const result = await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      const afterRead = Date.now();

      expect(result.notification.readAt).toBeDefined();
      // Convert ISO string to timestamp for comparison
      const readAtTime = new Date(result.notification.readAt!).getTime();
      expect(readAtTime).toBeGreaterThanOrEqual(beforeRead);
      expect(readAtTime).toBeLessThanOrEqual(afterRead);
    });

    it('should be idempotent (marking read twice works)', async () => {
      const result1 = await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      const result2 = await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      expect(result1.notification.status).toBe('read');
      expect(result2.notification.status).toBe('read');
      expect(result1.notification.readAt).toBe(result2.notification.readAt);
    });

    it('should validate ownership (user can only mark their own)', async () => {
      await expect(notificationService.markAsRead({
        userId: 'different-user',
        notificationId: testNotificationId
      })).rejects.toThrow('Unauthorized');
    });

    it('should handle non-existent notification', async () => {
      await expect(notificationService.markAsRead({
        userId: 'user-123',
        notificationId: 'non-existent-id'
      })).rejects.toThrow();
    });

    it('should mark multiple notifications as read', async () => {
      const result2 = await notificationService.createNotification({
        userId: 'user-123',
        type: 'comment',
        title: 'Test notification 2',
        message: 'Test message 2'
      });

      const result = await notificationService.markAsRead({
        userId: 'user-123',
        notificationIds: [testNotificationId, result2.notification.id]
      });

      expect(result.updatedCount).toBe(2);
    });

    it('should handle partial ownership in batch (only mark owned notifications)', async () => {
      const otherUserNotif = await notificationService.createNotification({
        userId: 'other-user',
        type: 'like',
        title: 'Other notification',
        message: 'Other message'
      });

      const result = await notificationService.markAsRead({
        userId: 'user-123',
        notificationIds: [testNotificationId, otherUserNotif.notification.id]
      });

      expect(result.updatedCount).toBe(1);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 1
      });
      const originalUpdatedAt = created.notifications[0].updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await notificationService.markAsRead({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      expect(result.notification.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('markAllAsRead', () => {
    beforeEach(async () => {
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Notification 1',
        message: 'Message 1'
      });

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'comment',
        title: 'Notification 2',
        message: 'Message 2'
      });

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'follow',
        title: 'Notification 3',
        message: 'Message 3'
      });
    });

    it('should mark all notifications as read for user', async () => {
      const result = await notificationService.markAllAsRead({
        userId: 'user-123'
      });

      expect(result.updatedCount).toBe(3);

      const unreadCount = await notificationService.getUnreadCount('user-123');
      expect(unreadCount).toBe(0);
    });

    it('should filter by type when marking all', async () => {
      const result = await notificationService.markAllAsRead({
        userId: 'user-123',
        type: 'like'
      });

      expect(result.updatedCount).toBe(1);

      const unreadCount = await notificationService.getUnreadCount('user-123');
      expect(unreadCount).toBe(2);
    });

    it('should filter by date when marking all', async () => {
      const beforeDate = new Date(Date.now() + 1000).toISOString();

      const result = await notificationService.markAllAsRead({
        userId: 'user-123',
        beforeDate
      });

      expect(result.updatedCount).toBe(3);
    });

    it('should remove all sparse GSI2 keys', async () => {
      await notificationService.markAllAsRead({
        userId: 'user-123'
      });

      const allItems = Array.from(mockDynamoClient._getItems().values());
      const userNotifs = allItems.filter(item =>
        String(item.PK).startsWith('USER#user-123') &&
        String(item.SK).startsWith('NOTIFICATION#')
      );

      userNotifs.forEach(entity => {
        expect(entity.GSI2PK).toBeUndefined();
        expect(entity.GSI2SK).toBeUndefined();
        expect(entity.isRead).toBe(true);
      });
    });

    it('should return 0 if no notifications to mark', async () => {
      const result = await notificationService.markAllAsRead({
        userId: 'user-with-no-notifs'
      });

      expect(result.updatedCount).toBe(0);
    });

    it('should be idempotent', async () => {
      const result1 = await notificationService.markAllAsRead({
        userId: 'user-123'
      });

      const result2 = await notificationService.markAllAsRead({
        userId: 'user-123'
      });

      expect(result1.updatedCount).toBe(3);
      expect(result2.updatedCount).toBe(0); // Already all read
    });
  });

  describe('deleteNotification', () => {
    let testNotificationId: string;

    beforeEach(async () => {
      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Test notification',
        message: 'Test message'
      });
      testNotificationId = result.notification.id;
    });

    it('should delete single notification', async () => {
      const result = await notificationService.deleteNotification({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      expect(result.success).toBe(true);

      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      expect(allNotifs.notifications.find(n => n.id === testNotificationId)).toBeUndefined();
    });

    it('should delete multiple notifications', async () => {
      const result2 = await notificationService.createNotification({
        userId: 'user-123',
        type: 'comment',
        title: 'Test notification 2',
        message: 'Test message 2'
      });

      const result = await notificationService.deleteNotification({
        userId: 'user-123',
        notificationIds: [testNotificationId, result2.notification.id]
      });

      expect(result.deletedCount).toBe(2);
    });

    it('should validate ownership', async () => {
      await expect(notificationService.deleteNotification({
        userId: 'different-user',
        notificationId: testNotificationId
      })).rejects.toThrow('Unauthorized');
    });

    it('should be idempotent (deleting twice works)', async () => {
      const result1 = await notificationService.deleteNotification({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      const result2 = await notificationService.deleteNotification({
        userId: 'user-123',
        notificationId: testNotificationId
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle non-existent notification', async () => {
      const result = await notificationService.deleteNotification({
        userId: 'user-123',
        notificationId: 'non-existent-id'
      });

      expect(result.success).toBe(true); // Idempotent
    });

    it('should handle partial ownership in batch', async () => {
      const otherUserNotif = await notificationService.createNotification({
        userId: 'other-user',
        type: 'like',
        title: 'Other notification',
        message: 'Other message'
      });

      const result = await notificationService.deleteNotification({
        userId: 'user-123',
        notificationIds: [testNotificationId, otherUserNotif.notification.id]
      });

      expect(result.deletedCount).toBe(1);
    });
  });

  describe('Batch operations', () => {
    beforeEach(async () => {
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Notification 1',
        message: 'Message 1'
      });

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'comment',
        title: 'Notification 2',
        message: 'Message 2'
      });

      await notificationService.createNotification({
        userId: 'user-123',
        type: 'follow',
        title: 'Notification 3',
        message: 'Message 3'
      });
    });

    it('should handle batch mark-read operation', async () => {
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      const notificationIds = allNotifs.notifications.map(n => n.id);

      const result = await notificationService.batchOperation({
        operation: 'mark-read',
        notificationIds
      });

      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(0);
    });

    it('should handle batch delete operation', async () => {
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      const notificationIds = allNotifs.notifications.map(n => n.id);

      const result = await notificationService.batchOperation({
        operation: 'delete',
        notificationIds
      });

      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(0);
    });

    it('should handle batch archive operation', async () => {
      const allNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      const notificationIds = allNotifs.notifications.map(n => n.id);

      const result = await notificationService.batchOperation({
        operation: 'archive',
        notificationIds
      });

      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(0);

      // Verify notifications are archived
      const archivedNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        status: 'archived',
        limit: 20
      });

      expect(archivedNotifs.notifications).toHaveLength(3);
    });

    it('should handle partial failures in batch', async () => {
      const validNotifs = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 20
      });

      const notificationIds = [
        ...validNotifs.notifications.map(n => n.id),
        'non-existent-1',
        'non-existent-2'
      ];

      const result = await notificationService.batchOperation({
        operation: 'mark-read',
        notificationIds
      });

      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(2);
      expect(result.failures).toHaveLength(2);
    });

    it('should validate batch operation type', async () => {
      await expect(notificationService.batchOperation({
        operation: 'invalid-op' as any,
        notificationIds: ['id1', 'id2']
      })).rejects.toThrow();
    });

    it('should require at least one notification ID', async () => {
      await expect(notificationService.batchOperation({
        operation: 'mark-read',
        notificationIds: []
      })).rejects.toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed notification data', async () => {
      const malformedData = {
        userId: 'not-a-uuid',
        type: 'invalid-type',
        title: '',
        message: ''
      };

      await expect(notificationService.createNotification(malformedData as any))
        .rejects.toThrow();
    });

    it('should handle very long metadata', async () => {
      const largeMetadata = {
        data: 'x'.repeat(10000)
      };

      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'system',
        title: 'Test',
        message: 'Test message',
        metadata: largeMetadata
      });

      expect(result.notification.metadata).toEqual(largeMetadata);
    });

    it('should handle special characters in title and message', async () => {
      const specialChars = 'Test <html> & "quotes" \'apostrophe\' 日本語 🎉';

      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'system',
        title: specialChars,
        message: specialChars
      });

      expect(result.notification.title).toBe(specialChars);
      expect(result.notification.message).toBe(specialChars);
    });

    it('should handle concurrent operations on same notification', async () => {
      const created = await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Test',
        message: 'Test message'
      });

      // Concurrent mark as read operations
      await Promise.all([
        notificationService.markAsRead({
          userId: 'user-123',
          notificationId: created.notification.id
        }),
        notificationService.markAsRead({
          userId: 'user-123',
          notificationId: created.notification.id
        })
      ]);

      const final = await notificationService.getNotifications({
        userId: 'user-123',
        limit: 1
      });

      expect(final.notifications[0].status).toBe('read');
    });

    it('should handle empty delivery channels array', async () => {
      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'system',
        title: 'Test',
        message: 'Test message',
        deliveryChannels: []
      });

      expect(result.notification.deliveryChannels).toEqual([]);
    });

    it('should handle null readAt correctly', async () => {
      const created = await notificationService.createNotification({
        userId: 'user-123',
        type: 'like',
        title: 'Test',
        message: 'Test message'
      });

      expect(created.notification.readAt).toBeUndefined();
    });
  });
});
