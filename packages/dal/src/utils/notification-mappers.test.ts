/* eslint-disable max-lines-per-function, max-statements */
import { describe, it, expect } from 'vitest';
import type { NotificationEntity } from './notification-mappers.js';
import { mapEntityToNotification } from './notification-mappers.js';

describe('NotificationEntity and Mappers', () => {
  const mockNotificationEntity: NotificationEntity = {
    // DynamoDB keys
    PK: 'USER#user-123',
    SK: 'NOTIFICATION#2024-01-15T10:30:00.000Z#notif-123',
    GSI1PK: 'NOTIFICATION#notif-123',
    GSI1SK: 'USER#user-123',
    GSI2PK: 'UNREAD#USER#user-123',
    GSI2SK: 'NOTIFICATION#2024-01-15T10:30:00.000Z#notif-123',

    // Notification fields
    id: 'notif-123',
    userId: 'user-123',
    type: 'like',
    status: 'unread',
    title: 'New like on your post',
    message: 'John Doe liked your photo',
    priority: 'normal',
    actor: {
      userId: 'actor-123',
      handle: 'johndoe',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg'
    },
    target: {
      type: 'post',
      id: 'post-123',
      url: 'https://example.com/posts/123',
      preview: 'Beautiful sunset photo...'
    },
    metadata: { postType: 'image' },
    deliveryChannels: ['in-app', 'push'],
    soundEnabled: true,
    vibrationEnabled: true,
    isRead: false,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
    entityType: 'NOTIFICATION',
    ttl: 1739620200
  };

  describe('NotificationEntity interface', () => {
    it('should have all required DynamoDB keys', () => {
      expect(mockNotificationEntity.PK).toBeDefined();
      expect(mockNotificationEntity.SK).toBeDefined();
      expect(mockNotificationEntity.GSI1PK).toBeDefined();
      expect(mockNotificationEntity.GSI1SK).toBeDefined();
      expect(mockNotificationEntity.GSI2PK).toBeDefined();
      expect(mockNotificationEntity.GSI2SK).toBeDefined();
      expect(mockNotificationEntity.entityType).toBe('NOTIFICATION');
    });

    it('should have proper PK format for user notifications', () => {
      expect(mockNotificationEntity.PK).toMatch(/^USER#.+$/);
    });

    it('should have proper SK format with timestamp and ID', () => {
      expect(mockNotificationEntity.SK).toMatch(/^NOTIFICATION#\d{4}-\d{2}-\d{2}T.*#.+$/);
    });

    it('should have proper GSI1PK for notification lookup', () => {
      expect(mockNotificationEntity.GSI1PK).toMatch(/^NOTIFICATION#.+$/);
    });

    it('should have GSI2PK only when unread (sparse index)', () => {
      expect(mockNotificationEntity.GSI2PK).toMatch(/^UNREAD#USER#.+$/);
      expect(mockNotificationEntity.isRead).toBe(false);
    });

    it('should have TTL field for auto-deletion', () => {
      expect(mockNotificationEntity.ttl).toBeDefined();
      expect(typeof mockNotificationEntity.ttl).toBe('number');
      expect(mockNotificationEntity.ttl).toBeGreaterThan(0);
    });
  });

  describe('mapEntityToNotification', () => {
    it('should map entity to notification domain object', () => {
      const notification = mapEntityToNotification(mockNotificationEntity);

      expect(notification).toBeDefined();
      expect(notification.id).toBe(mockNotificationEntity.id);
      expect(notification.userId).toBe(mockNotificationEntity.userId);
      expect(notification.type).toBe(mockNotificationEntity.type);
      expect(notification.status).toBe(mockNotificationEntity.status);
      expect(notification.title).toBe(mockNotificationEntity.title);
      expect(notification.message).toBe(mockNotificationEntity.message);
    });

    it('should remove all DynamoDB keys from mapped object', () => {
      const notification = mapEntityToNotification(mockNotificationEntity);

      expect(notification).not.toHaveProperty('PK');
      expect(notification).not.toHaveProperty('SK');
      expect(notification).not.toHaveProperty('GSI1PK');
      expect(notification).not.toHaveProperty('GSI1SK');
      expect(notification).not.toHaveProperty('GSI2PK');
      expect(notification).not.toHaveProperty('GSI2SK');
      expect(notification).not.toHaveProperty('entityType');
      expect(notification).not.toHaveProperty('ttl');
      expect(notification).not.toHaveProperty('isRead');
    });

    it('should preserve actor information', () => {
      const notification = mapEntityToNotification(mockNotificationEntity);

      expect(notification.actor).toBeDefined();
      expect(notification.actor?.userId).toBe('actor-123');
      expect(notification.actor?.handle).toBe('johndoe');
      expect(notification.actor?.displayName).toBe('John Doe');
      expect(notification.actor?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should preserve target information', () => {
      const notification = mapEntityToNotification(mockNotificationEntity);

      expect(notification.target).toBeDefined();
      expect(notification.target?.type).toBe('post');
      expect(notification.target?.id).toBe('post-123');
      expect(notification.target?.url).toBe('https://example.com/posts/123');
      expect(notification.target?.preview).toBe('Beautiful sunset photo...');
    });

    it('should handle notification without actor', () => {
      const entityWithoutActor: NotificationEntity = {
        ...mockNotificationEntity,
        actor: undefined
      };

      const notification = mapEntityToNotification(entityWithoutActor);

      expect(notification.actor).toBeUndefined();
    });

    it('should handle notification without target', () => {
      const entityWithoutTarget: NotificationEntity = {
        ...mockNotificationEntity,
        target: undefined
      };

      const notification = mapEntityToNotification(entityWithoutTarget);

      expect(notification.target).toBeUndefined();
    });

    it('should preserve metadata', () => {
      const notification = mapEntityToNotification(mockNotificationEntity);

      expect(notification.metadata).toBeDefined();
      expect(notification.metadata).toEqual({ postType: 'image' });
    });

    it('should preserve delivery channels', () => {
      const notification = mapEntityToNotification(mockNotificationEntity);

      expect(notification.deliveryChannels).toBeDefined();
      expect(notification.deliveryChannels).toEqual(['in-app', 'push']);
    });

    it('should preserve readAt timestamp when present', () => {
      const readEntity: NotificationEntity = {
        ...mockNotificationEntity,
        readAt: '2024-01-15T11:00:00.000Z'
      };

      const notification = mapEntityToNotification(readEntity);

      expect(notification.readAt).toBe('2024-01-15T11:00:00.000Z');
    });

    it('should handle notification with groupId', () => {
      const groupedEntity: NotificationEntity = {
        ...mockNotificationEntity,
        groupId: 'group-123'
      };

      const notification = mapEntityToNotification(groupedEntity);

      expect(notification.groupId).toBe('group-123');
    });

    it('should handle notification with expiresAt', () => {
      const expiringEntity: NotificationEntity = {
        ...mockNotificationEntity,
        expiresAt: '2024-01-20T10:30:00.000Z'
      };

      const notification = mapEntityToNotification(expiringEntity);

      expect(notification.expiresAt).toBe('2024-01-20T10:30:00.000Z');
    });
  });

  describe('Edge cases', () => {
    it('should handle notification with minimal fields', () => {
      const minimalEntity: NotificationEntity = {
        PK: 'USER#user-123',
        SK: 'NOTIFICATION#2024-01-15T10:30:00.000Z#notif-123',
        GSI1PK: 'NOTIFICATION#notif-123',
        GSI1SK: 'USER#user-123',
        id: 'notif-123',
        userId: 'user-123',
        type: 'system',
        status: 'unread',
        title: 'System notification',
        message: 'System message',
        priority: 'normal',
        deliveryChannels: ['in-app'],
        soundEnabled: true,
        vibrationEnabled: true,
        isRead: false,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        entityType: 'NOTIFICATION',
        ttl: 1739620200
      };

      const notification = mapEntityToNotification(minimalEntity);

      expect(notification.id).toBe('notif-123');
      expect(notification.actor).toBeUndefined();
      expect(notification.target).toBeUndefined();
      expect(notification.metadata).toBeUndefined();
    });

    it('should handle notification with all optional fields', () => {
      const fullEntity: NotificationEntity = {
        ...mockNotificationEntity,
        groupId: 'group-123',
        expiresAt: '2024-01-20T10:30:00.000Z',
        scheduledFor: '2024-01-15T09:00:00.000Z',
        readAt: '2024-01-15T11:00:00.000Z'
      };

      const notification = mapEntityToNotification(fullEntity);

      expect(notification.groupId).toBe('group-123');
      expect(notification.expiresAt).toBe('2024-01-20T10:30:00.000Z');
      expect(notification.scheduledFor).toBe('2024-01-15T09:00:00.000Z');
      expect(notification.readAt).toBe('2024-01-15T11:00:00.000Z');
    });
  });
});
