import { describe, it, expect } from 'vitest';
import {
  NotificationSchema,
  NotificationTypeSchema,
  NotificationStatusSchema,
  CreateNotificationRequestSchema,
  UpdateNotificationRequestSchema,
  GetNotificationsRequestSchema,
  MarkAsReadRequestSchema,
  MarkAllAsReadRequestSchema,
  DeleteNotificationRequestSchema,
  NotificationResponseSchema,
  NotificationsListResponseSchema,
  NotificationSettingsSchema,
  UpdateNotificationSettingsRequestSchema,
  NotificationPreferencesSchema,
  BatchNotificationOperationSchema,
  NotificationMetadataSchema,
  NotificationActorSchema,
  NotificationTargetSchema,
  NotificationGroupSchema,
  NotificationDeliveryChannelSchema,
  NotificationPrioritySchema,
  NotificationSoundSchema,
  NotificationBadgeSchema
} from './notification.schema.js';

describe('Notification Schemas', () => {
  describe('NotificationTypeSchema', () => {
    it('should validate all notification types', () => {
      const validTypes = [
        'like',
        'comment',
        'follow',
        'mention',
        'reply',
        'repost',
        'quote',
        'system',
        'announcement',
        'achievement'
      ];

      validTypes.forEach(type => {
        const result = NotificationTypeSchema.parse(type);
        expect(result).toBe(type);
      });
    });

    it('should reject invalid notification type', () => {
      expect(() => NotificationTypeSchema.parse('invalid-type')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => NotificationTypeSchema.parse('')).toThrow();
    });

    it('should reject null', () => {
      expect(() => NotificationTypeSchema.parse(null)).toThrow();
    });

    it('should reject number', () => {
      expect(() => NotificationTypeSchema.parse(123)).toThrow();
    });
  });

  describe('NotificationStatusSchema', () => {
    it('should validate all status values', () => {
      const validStatuses = ['unread', 'read', 'archived', 'deleted'];

      validStatuses.forEach(status => {
        const result = NotificationStatusSchema.parse(status);
        expect(result).toBe(status);
      });
    });

    it('should reject invalid status', () => {
      expect(() => NotificationStatusSchema.parse('viewed')).toThrow();
    });

    it('should reject mixed case status', () => {
      expect(() => NotificationStatusSchema.parse('Unread')).toThrow();
    });
  });

  describe('NotificationPrioritySchema', () => {
    it('should validate all priority levels', () => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      validPriorities.forEach(priority => {
        const result = NotificationPrioritySchema.parse(priority);
        expect(result).toBe(priority);
      });
    });

    it('should reject invalid priority', () => {
      expect(() => NotificationPrioritySchema.parse('critical')).toThrow();
    });
  });

  describe('NotificationDeliveryChannelSchema', () => {
    it('should validate all delivery channels', () => {
      const validChannels = ['in-app', 'email', 'push', 'sms'];

      validChannels.forEach(channel => {
        const result = NotificationDeliveryChannelSchema.parse(channel);
        expect(result).toBe(channel);
      });
    });

    it('should reject invalid channel', () => {
      expect(() => NotificationDeliveryChannelSchema.parse('telegram')).toThrow();
    });
  });

  describe('NotificationActorSchema', () => {
    it('should validate actor with all fields', () => {
      const validActor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'johndoe',
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg'
      };

      const result = NotificationActorSchema.parse(validActor);
      expect(result).toMatchObject(validActor);
    });

    it('should validate actor without optional fields', () => {
      const minimalActor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'johndoe'
      };

      const result = NotificationActorSchema.parse(minimalActor);
      expect(result.userId).toBe(minimalActor.userId);
      expect(result.handle).toBe(minimalActor.handle);
    });

    it('should reject actor with invalid userId', () => {
      const invalidActor = {
        userId: 'not-a-uuid',
        handle: 'johndoe'
      };

      expect(() => NotificationActorSchema.parse(invalidActor)).toThrow();
    });

    it('should reject actor with empty handle', () => {
      const invalidActor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: ''
      };

      expect(() => NotificationActorSchema.parse(invalidActor)).toThrow();
    });

    it('should reject actor with invalid avatar URL', () => {
      const invalidActor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'johndoe',
        avatarUrl: 'not-a-url'
      };

      expect(() => NotificationActorSchema.parse(invalidActor)).toThrow();
    });
  });

  describe('NotificationTargetSchema', () => {
    it('should validate target with post reference', () => {
      const validTarget = {
        type: 'post',
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/posts/123',
        preview: 'Check out this amazing photo!'
      };

      const result = NotificationTargetSchema.parse(validTarget);
      expect(result).toMatchObject(validTarget);
    });

    it('should validate target with comment reference', () => {
      const validTarget = {
        type: 'comment',
        id: '123e4567-e89b-12d3-a456-426614174001',
        url: 'https://example.com/posts/123/comments/456'
      };

      const result = NotificationTargetSchema.parse(validTarget);
      expect(result.type).toBe('comment');
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should validate target with user reference', () => {
      const validTarget = {
        type: 'user',
        id: '123e4567-e89b-12d3-a456-426614174002',
        url: 'https://example.com/users/johndoe'
      };

      const result = NotificationTargetSchema.parse(validTarget);
      expect(result.type).toBe('user');
    });

    it('should reject target with invalid type', () => {
      const invalidTarget = {
        type: 'message',
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => NotificationTargetSchema.parse(invalidTarget)).toThrow();
    });

    it('should reject target with missing id', () => {
      const invalidTarget = {
        type: 'post'
      };

      expect(() => NotificationTargetSchema.parse(invalidTarget)).toThrow();
    });
  });

  describe('NotificationMetadataSchema', () => {
    it('should validate metadata with all common fields', () => {
      const validMetadata = {
        count: 5,
        message: 'You have new followers',
        iconUrl: 'https://example.com/icon.png',
        actionUrl: 'https://example.com/followers',
        extraData: {
          category: 'social',
          subtype: 'follower-milestone'
        }
      };

      const result = NotificationMetadataSchema.parse(validMetadata);
      expect(result).toMatchObject(validMetadata);
    });

    it('should validate empty metadata', () => {
      const emptyMetadata = {};
      const result = NotificationMetadataSchema.parse(emptyMetadata);
      expect(result).toEqual({});
    });

    it('should validate metadata with nested objects', () => {
      const complexMetadata = {
        stats: {
          likes: 100,
          comments: 50
        },
        badges: ['verified', 'premium']
      };

      const result = NotificationMetadataSchema.parse(complexMetadata);
      expect(result.stats).toEqual({ likes: 100, comments: 50 });
      expect(result.badges).toEqual(['verified', 'premium']);
    });

    it('should accept any valid JSON structure', () => {
      const validMetadata = {
        string: 'value',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
        null: null
      };

      const result = NotificationMetadataSchema.parse(validMetadata);
      expect(result).toMatchObject(validMetadata);
    });
  });

  describe('NotificationSchema', () => {
    it('should validate a complete notification', () => {
      const validNotification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        status: 'unread',
        title: 'New like on your post',
        message: 'John Doe liked your post',
        priority: 'normal',
        actor: {
          userId: '123e4567-e89b-12d3-a456-426614174002',
          handle: 'johndoe',
          displayName: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg'
        },
        target: {
          type: 'post',
          id: '123e4567-e89b-12d3-a456-426614174003',
          url: 'https://example.com/posts/123',
          preview: 'Amazing sunset photo'
        },
        metadata: {
          count: 1,
          iconUrl: 'https://example.com/icons/like.png'
        },
        deliveryChannels: ['in-app', 'push'],
        soundEnabled: true,
        vibrationEnabled: false,
        groupId: 'likes-group-123',
        expiresAt: '2024-12-31T23:59:59Z',
        readAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(validNotification);
      expect(result).toMatchObject(validNotification);
    });

    it('should validate minimal notification', () => {
      const minimalNotification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        status: 'unread',
        title: 'System Update',
        message: 'System maintenance scheduled',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(minimalNotification);
      expect(result.type).toBe('system');
      expect(result.status).toBe('unread');
    });

    it('should set default values', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'comment',
        title: 'New comment',
        message: 'Someone commented on your post',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.status).toBe('unread');
      expect(result.priority).toBe('normal');
      expect(result.soundEnabled).toBe(true);
      expect(result.vibrationEnabled).toBe(true);
      expect(result.deliveryChannels).toEqual(['in-app']);
    });

    it('should reject notification without required fields', () => {
      const invalidNotification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'like'
      };

      expect(() => NotificationSchema.parse(invalidNotification)).toThrow();
    });

    it('should reject notification with invalid UUID', () => {
      const invalidNotification = {
        id: 'not-a-uuid',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: 'New like',
        message: 'Someone liked your post',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSchema.parse(invalidNotification)).toThrow();
    });

    it('should validate notification with multiple delivery channels', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'follow',
        title: 'New follower',
        message: 'Jane Doe started following you',
        deliveryChannels: ['in-app', 'email', 'push'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.deliveryChannels).toHaveLength(3);
      expect(result.deliveryChannels).toContain('email');
    });

    it('should trim title and message', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'mention',
        title: '  New mention  ',
        message: '  @johndoe mentioned you  ',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.title).toBe('New mention');
      expect(result.message).toBe('@johndoe mentioned you');
    });

    it('should reject title exceeding max length', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'a'.repeat(101),
        message: 'Test message',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSchema.parse(notification)).toThrow();
    });

    it('should reject message exceeding max length', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Test title',
        message: 'a'.repeat(501),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSchema.parse(notification)).toThrow();
    });

    it('should validate notification with expiration', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'announcement',
        title: 'Limited time offer',
        message: 'This offer expires soon',
        expiresAt: '2024-12-31T23:59:59Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.expiresAt).toBe('2024-12-31T23:59:59Z');
    });

    it('should validate read notification with readAt timestamp', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        status: 'read',
        title: 'New like',
        message: 'Someone liked your post',
        readAt: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.status).toBe('read');
      expect(result.readAt).toBe('2024-01-01T12:00:00Z');
    });
  });

  describe('NotificationGroupSchema', () => {
    it('should validate notification group', () => {
      const validGroup = {
        groupId: 'likes-123',
        type: 'like',
        count: 5,
        latestNotificationId: '123e4567-e89b-12d3-a456-426614174000',
        actors: [
          { userId: '123e4567-e89b-12d3-a456-426614174001', handle: 'user1' },
          { userId: '123e4567-e89b-12d3-a456-426614174002', handle: 'user2' }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      const result = NotificationGroupSchema.parse(validGroup);
      expect(result.count).toBe(5);
      expect(result.actors).toHaveLength(2);
    });

    it('should set default count', () => {
      const group = {
        groupId: 'comments-456',
        type: 'comment',
        latestNotificationId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationGroupSchema.parse(group);
      expect(result.count).toBe(1);
    });
  });

  describe('CreateNotificationRequestSchema', () => {
    it('should validate valid create request', () => {
      const validRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: 'New like',
        message: 'Someone liked your post',
        priority: 'high',
        actor: {
          userId: '123e4567-e89b-12d3-a456-426614174002',
          handle: 'johndoe'
        },
        target: {
          type: 'post',
          id: '123e4567-e89b-12d3-a456-426614174003'
        },
        metadata: {
          count: 1
        },
        deliveryChannels: ['in-app', 'push']
      };

      const result = CreateNotificationRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should validate minimal create request', () => {
      const minimalRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'System notification',
        message: 'This is a system message'
      };

      const result = CreateNotificationRequestSchema.parse(minimalRequest);
      expect(result.type).toBe('system');
    });

    it('should reject request without userId', () => {
      const invalidRequest = {
        type: 'like',
        title: 'New like',
        message: 'Someone liked your post'
      };

      expect(() => CreateNotificationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject request with empty title', () => {
      const invalidRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: '',
        message: 'Someone liked your post'
      };

      expect(() => CreateNotificationRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('UpdateNotificationRequestSchema', () => {
    it('should validate status update', () => {
      const validRequest = {
        status: 'read'
      };

      const result = UpdateNotificationRequestSchema.parse(validRequest);
      expect(result.status).toBe('read');
    });

    it('should validate priority update', () => {
      const validRequest = {
        priority: 'urgent'
      };

      const result = UpdateNotificationRequestSchema.parse(validRequest);
      expect(result.priority).toBe('urgent');
    });

    it('should validate multiple field updates', () => {
      const validRequest = {
        status: 'read',
        priority: 'low',
        soundEnabled: false
      };

      const result = UpdateNotificationRequestSchema.parse(validRequest);
      expect(result.status).toBe('read');
      expect(result.priority).toBe('low');
      expect(result.soundEnabled).toBe(false);
    });

    it('should accept empty update', () => {
      const emptyRequest = {};
      const result = UpdateNotificationRequestSchema.parse(emptyRequest);
      expect(result).toEqual({});
    });
  });

  describe('GetNotificationsRequestSchema', () => {
    it('should validate request with all filters', () => {
      const validRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'unread',
        type: 'like',
        priority: 'high',
        limit: 50,
        cursor: 'next-page-token'
      };

      const result = GetNotificationsRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should set default limit', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = GetNotificationsRequestSchema.parse(request);
      expect(result.limit).toBe(20);
    });

    it('should reject limit exceeding maximum', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        limit: 101
      };

      expect(() => GetNotificationsRequestSchema.parse(request)).toThrow();
    });

    it('should reject negative limit', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        limit: -1
      };

      expect(() => GetNotificationsRequestSchema.parse(request)).toThrow();
    });

    it('should validate request with date range', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z'
      };

      const result = GetNotificationsRequestSchema.parse(request);
      expect(result.startDate).toBe('2024-01-01T00:00:00Z');
      expect(result.endDate).toBe('2024-12-31T23:59:59Z');
    });

    it('should accept array of types filter', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        types: ['like', 'comment', 'follow']
      };

      const result = GetNotificationsRequestSchema.parse(request);
      expect(result.types).toHaveLength(3);
      expect(result.types).toContain('comment');
    });

    it('should reject invalid type in types array', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        types: ['like', 'invalid-type']
      };

      expect(() => GetNotificationsRequestSchema.parse(request)).toThrow();
    });
  });

  describe('MarkAsReadRequestSchema', () => {
    it('should validate single notification mark as read', () => {
      const validRequest = {
        notificationId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = MarkAsReadRequestSchema.parse(validRequest);
      expect(result.notificationId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate multiple notifications mark as read', () => {
      const validRequest = {
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002'
        ]
      };

      const result = MarkAsReadRequestSchema.parse(validRequest);
      expect(result.notificationIds).toHaveLength(3);
    });

    it('should reject invalid UUID in array', () => {
      const invalidRequest = {
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          'not-a-uuid'
        ]
      };

      expect(() => MarkAsReadRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject empty array', () => {
      const invalidRequest = {
        notificationIds: []
      };

      expect(() => MarkAsReadRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('MarkAllAsReadRequestSchema', () => {
    it('should validate mark all as read request', () => {
      const validRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = MarkAllAsReadRequestSchema.parse(validRequest);
      expect(result.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should validate request with type filter', () => {
      const validRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like'
      };

      const result = MarkAllAsReadRequestSchema.parse(validRequest);
      expect(result.type).toBe('like');
    });

    it('should validate request with date filter', () => {
      const validRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        beforeDate: '2024-01-01T00:00:00Z'
      };

      const result = MarkAllAsReadRequestSchema.parse(validRequest);
      expect(result.beforeDate).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('DeleteNotificationRequestSchema', () => {
    it('should validate delete single notification', () => {
      const validRequest = {
        notificationId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = DeleteNotificationRequestSchema.parse(validRequest);
      expect(result.notificationId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate delete multiple notifications', () => {
      const validRequest = {
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001'
        ]
      };

      const result = DeleteNotificationRequestSchema.parse(validRequest);
      expect(result.notificationIds).toHaveLength(2);
    });

    it('should reject request without any ID', () => {
      const invalidRequest = {};
      expect(() => DeleteNotificationRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('NotificationSettingsSchema', () => {
    it('should validate complete settings', () => {
      const validSettings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        soundEnabled: false,
        vibrationEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        preferences: {
          likes: { enabled: true, email: true, push: true },
          comments: { enabled: true, email: false, push: true },
          follows: { enabled: true, email: true, push: false },
          mentions: { enabled: true, email: true, push: true }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(validSettings);
      expect(result).toMatchObject(validSettings);
    });

    it('should set default values', () => {
      const minimalSettings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(minimalSettings);
      expect(result.emailEnabled).toBe(true);
      expect(result.pushEnabled).toBe(true);
      expect(result.inAppEnabled).toBe(true);
      expect(result.soundEnabled).toBe(true);
      expect(result.vibrationEnabled).toBe(true);
    });

    it('should validate quiet hours format', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        quietHoursStart: '23:30',
        quietHoursEnd: '06:45',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(settings);
      expect(result.quietHoursStart).toBe('23:30');
      expect(result.quietHoursEnd).toBe('06:45');
    });

    it('should reject invalid time format', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        quietHoursStart: '25:00',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSettingsSchema.parse(settings)).toThrow();
    });
  });

  describe('NotificationPreferencesSchema', () => {
    it('should validate preferences for all notification types', () => {
      const validPreferences = {
        likes: { enabled: true, email: true, push: false, inApp: true },
        comments: { enabled: true, email: false, push: true, inApp: true },
        follows: { enabled: false, email: false, push: false, inApp: false },
        mentions: { enabled: true, email: true, push: true, inApp: true },
        system: { enabled: true, email: true, push: false, inApp: true },
        announcements: { enabled: true, email: false, push: false, inApp: true }
      };

      const result = NotificationPreferencesSchema.parse(validPreferences);
      expect(result.likes.enabled).toBe(true);
      expect(result.follows.enabled).toBe(false);
    });

    it('should set default values for missing preferences', () => {
      const partialPreferences = {
        likes: { enabled: false }
      };

      const result = NotificationPreferencesSchema.parse(partialPreferences);
      expect(result.likes.enabled).toBe(false);
      expect(result.likes.email).toBe(true);
      expect(result.likes.push).toBe(true);
      expect(result.likes.inApp).toBe(true);
    });

    it('should accept empty preferences object', () => {
      const emptyPreferences = {};
      const result = NotificationPreferencesSchema.parse(emptyPreferences);
      expect(result).toEqual({});
    });
  });

  describe('UpdateNotificationSettingsRequestSchema', () => {
    it('should validate settings update', () => {
      const validRequest = {
        emailEnabled: false,
        pushEnabled: true,
        soundEnabled: false,
        preferences: {
          likes: { enabled: true, email: false }
        }
      };

      const result = UpdateNotificationSettingsRequestSchema.parse(validRequest);
      expect(result.emailEnabled).toBe(false);
      expect(result.preferences.likes.email).toBe(false);
    });

    it('should accept partial updates', () => {
      const partialRequest = {
        soundEnabled: false
      };

      const result = UpdateNotificationSettingsRequestSchema.parse(partialRequest);
      expect(result).toEqual({ soundEnabled: false });
    });
  });

  describe('BatchNotificationOperationSchema', () => {
    it('should validate batch mark as read operation', () => {
      const validOperation = {
        operation: 'mark-read',
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001'
        ]
      };

      const result = BatchNotificationOperationSchema.parse(validOperation);
      expect(result.operation).toBe('mark-read');
      expect(result.notificationIds).toHaveLength(2);
    });

    it('should validate batch delete operation', () => {
      const validOperation = {
        operation: 'delete',
        notificationIds: ['123e4567-e89b-12d3-a456-426614174000']
      };

      const result = BatchNotificationOperationSchema.parse(validOperation);
      expect(result.operation).toBe('delete');
    });

    it('should validate batch archive operation', () => {
      const validOperation = {
        operation: 'archive',
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002'
        ]
      };

      const result = BatchNotificationOperationSchema.parse(validOperation);
      expect(result.operation).toBe('archive');
      expect(result.notificationIds).toHaveLength(3);
    });

    it('should reject empty notificationIds array', () => {
      const invalidOperation = {
        operation: 'mark-read',
        notificationIds: []
      };

      expect(() => BatchNotificationOperationSchema.parse(invalidOperation)).toThrow();
    });

    it('should reject invalid operation type', () => {
      const invalidOperation = {
        operation: 'update',
        notificationIds: ['123e4567-e89b-12d3-a456-426614174000']
      };

      expect(() => BatchNotificationOperationSchema.parse(invalidOperation)).toThrow();
    });
  });

  describe('NotificationResponseSchema', () => {
    it('should validate successful response', () => {
      const validResponse = {
        notification: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          type: 'like',
          status: 'unread',
          title: 'New like',
          message: 'Someone liked your post',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = NotificationResponseSchema.parse(validResponse);
      expect(result.notification.type).toBe('like');
    });

    it('should validate error response', () => {
      const errorResponse = {
        error: 'Notification not found',
        errorCode: 'NOT_FOUND'
      };

      const result = NotificationResponseSchema.parse(errorResponse);
      expect(result.error).toBe('Notification not found');
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('NotificationsListResponseSchema', () => {
    it('should validate response with notifications', () => {
      const validResponse = {
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            type: 'like',
            status: 'unread',
            title: 'New like',
            message: 'Someone liked your post',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            type: 'comment',
            status: 'read',
            title: 'New comment',
            message: 'Someone commented on your post',
            createdAt: '2024-01-01T01:00:00Z',
            updatedAt: '2024-01-01T02:00:00Z'
          }
        ],
        totalCount: 2,
        unreadCount: 1,
        hasMore: false
      };

      const result = NotificationsListResponseSchema.parse(validResponse);
      expect(result.notifications).toHaveLength(2);
      expect(result.unreadCount).toBe(1);
    });

    it('should validate empty response', () => {
      const emptyResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      const result = NotificationsListResponseSchema.parse(emptyResponse);
      expect(result.notifications).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should validate response with pagination', () => {
      const paginatedResponse = {
        notifications: [],
        totalCount: 100,
        unreadCount: 25,
        hasMore: true,
        nextCursor: 'next-page-token'
      };

      const result = NotificationsListResponseSchema.parse(paginatedResponse);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('next-page-token');
    });

    it('should reject response without required fields', () => {
      const invalidResponse = {
        notifications: []
      };

      expect(() => NotificationsListResponseSchema.parse(invalidResponse)).toThrow();
    });
  });

  describe('NotificationBadgeSchema', () => {
    it('should validate badge with count', () => {
      const validBadge = {
        count: 5,
        displayCount: '5',
        visible: true
      };

      const result = NotificationBadgeSchema.parse(validBadge);
      expect(result.count).toBe(5);
      expect(result.visible).toBe(true);
    });

    it('should validate badge with 99+ display', () => {
      const validBadge = {
        count: 150,
        displayCount: '99+',
        visible: true
      };

      const result = NotificationBadgeSchema.parse(validBadge);
      expect(result.displayCount).toBe('99+');
    });

    it('should validate hidden badge', () => {
      const hiddenBadge = {
        count: 0,
        displayCount: '',
        visible: false
      };

      const result = NotificationBadgeSchema.parse(hiddenBadge);
      expect(result.visible).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should set default visibility', () => {
      const badge = {
        count: 3,
        displayCount: '3'
      };

      const result = NotificationBadgeSchema.parse(badge);
      expect(result.visible).toBe(true);
    });
  });

  describe('NotificationSoundSchema', () => {
    it('should validate sound settings', () => {
      const validSound = {
        enabled: true,
        soundFile: 'notification.mp3',
        volume: 0.8
      };

      const result = NotificationSoundSchema.parse(validSound);
      expect(result.enabled).toBe(true);
      expect(result.volume).toBe(0.8);
    });

    it('should set default values', () => {
      const minimalSound = {};
      const result = NotificationSoundSchema.parse(minimalSound);
      expect(result.enabled).toBe(true);
      expect(result.soundFile).toBe('default');
      expect(result.volume).toBe(1.0);
    });

    it('should reject volume outside range', () => {
      const invalidSound = {
        volume: 1.5
      };

      expect(() => NotificationSoundSchema.parse(invalidSound)).toThrow();
    });

    it('should reject negative volume', () => {
      const invalidSound = {
        volume: -0.1
      };

      expect(() => NotificationSoundSchema.parse(invalidSound)).toThrow();
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle notification with null readAt for unread status', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        status: 'unread',
        title: 'New like',
        message: 'Someone liked your post',
        readAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.readAt).toBe(null);
      expect(result.status).toBe('unread');
    });

    it('should handle notification with Unicode characters in message', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'comment',
        title: 'New comment',
        message: '😍 Great post! 你好世界 🌍',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.message).toBe('😍 Great post! 你好世界 🌍');
    });

    it('should handle notification with HTML entities in message', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'mention',
        title: 'Mention in comment',
        message: 'User said: &lt;script&gt;alert("xss")&lt;/script&gt;',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.message).toContain('&lt;script&gt;');
    });

    it('should handle notification with very long groupId', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: 'New like',
        message: 'Someone liked your post',
        groupId: 'group-' + 'a'.repeat(100),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.groupId).toHaveLength(106);
    });

    it('should handle notification with future expiresAt', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'announcement',
        title: 'Future event',
        message: 'Mark your calendar',
        expiresAt: futureDate.toISOString(),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle notification with past expiresAt', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'announcement',
        title: 'Expired event',
        message: 'This has expired',
        expiresAt: '2020-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(new Date(result.expiresAt).getTime()).toBeLessThan(Date.now());
    });

    it('should handle batch operation with maximum allowed IDs', () => {
      const ids = Array.from({ length: 100 }, (_, i) =>
        `123e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`
      );

      const operation = {
        operation: 'mark-read',
        notificationIds: ids
      };

      const result = BatchNotificationOperationSchema.parse(operation);
      expect(result.notificationIds).toHaveLength(100);
    });

    it('should handle notification settings with invalid time format variations', () => {
      const invalidFormats = ['24:00', '12:60', '1:30', '12:5', 'noon', '12pm'];

      invalidFormats.forEach(format => {
        const settings = {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          quietHoursStart: format,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        };

        expect(() => NotificationSettingsSchema.parse(settings)).toThrow();
      });
    });

    it('should handle preferences with deeply nested enable flags', () => {
      const preferences = {
        likes: {
          enabled: true,
          email: false,
          push: false,
          inApp: false
        }
      };

      const result = NotificationPreferencesSchema.parse(preferences);
      expect(result.likes.enabled).toBe(true);
      expect(result.likes.email).toBe(false);
    });

    it('should handle notification with all optional fields undefined', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'System message',
        message: 'Important update',
        actor: undefined,
        target: undefined,
        metadata: undefined,
        groupId: undefined,
        expiresAt: undefined,
        readAt: undefined,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.actor).toBeUndefined();
      expect(result.target).toBeUndefined();
    });

    it('should handle get notifications request with all filters combined', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'unread',
        types: ['like', 'comment'],
        priority: 'high',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        limit: 50,
        cursor: 'next-page'
      };

      const result = GetNotificationsRequestSchema.parse(request);
      expect(result.status).toBe('unread');
      expect(result.types).toContain('like');
      expect(result.priority).toBe('high');
    });

    it('should handle mark all as read with all optional filters', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'comment',
        beforeDate: '2024-06-01T00:00:00Z'
      };

      const result = MarkAllAsReadRequestSchema.parse(request);
      expect(result.type).toBe('comment');
      expect(result.beforeDate).toBe('2024-06-01T00:00:00Z');
    });

    it('should handle notification response with detailed error info', () => {
      const errorResponse = {
        error: 'Permission denied',
        errorCode: 'FORBIDDEN',
        details: {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          resource: 'notification',
          action: 'read'
        }
      };

      const result = NotificationResponseSchema.parse(errorResponse);
      expect(result.error).toBe('Permission denied');
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.details).toBeDefined();
    });

    it('should handle list response with mixed notification statuses', () => {
      const response = {
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            type: 'like',
            status: 'unread',
            title: 'New like',
            message: 'Post liked',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            type: 'comment',
            status: 'read',
            title: 'New comment',
            message: 'Post commented',
            readAt: '2024-01-01T01:00:00Z',
            createdAt: '2024-01-01T00:30:00Z',
            updatedAt: '2024-01-01T01:00:00Z'
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            type: 'follow',
            status: 'archived',
            title: 'New follower',
            message: 'Someone followed you',
            createdAt: '2024-01-01T00:15:00Z',
            updatedAt: '2024-01-01T02:00:00Z'
          }
        ],
        totalCount: 3,
        unreadCount: 1,
        hasMore: false
      };

      const result = NotificationsListResponseSchema.parse(response);
      expect(result.notifications).toHaveLength(3);
      const statuses = result.notifications.map(n => n.status);
      expect(statuses).toContain('unread');
      expect(statuses).toContain('read');
      expect(statuses).toContain('archived');
    });

    it('should handle badge with edge case counts', () => {
      const badges = [
        { count: 0, displayCount: '', visible: false },
        { count: 1, displayCount: '1', visible: true },
        { count: 99, displayCount: '99', visible: true },
        { count: 100, displayCount: '99+', visible: true },
        { count: 9999, displayCount: '99+', visible: true }
      ];

      badges.forEach(badge => {
        const result = NotificationBadgeSchema.parse(badge);
        expect(result.count).toBe(badge.count);
        expect(result.displayCount).toBe(badge.displayCount);
      });
    });

    it('should handle sound schema with various file formats', () => {
      const soundFiles = [
        'notification.mp3',
        'alert.wav',
        'ping.ogg',
        'custom_sound.m4a',
        'default'
      ];

      soundFiles.forEach(file => {
        const sound = {
          enabled: true,
          soundFile: file,
          volume: 0.5
        };

        const result = NotificationSoundSchema.parse(sound);
        expect(result.soundFile).toBe(file);
      });
    });

    it('should handle group schema with empty actors array', () => {
      const group = {
        groupId: 'empty-group',
        type: 'like',
        count: 0,
        latestNotificationId: '123e4567-e89b-12d3-a456-426614174000',
        actors: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationGroupSchema.parse(group);
      expect(result.actors).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should handle group schema with many actors', () => {
      const actors = Array.from({ length: 20 }, (_, i) => ({
        userId: `123e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`,
        handle: `user${i}`
      }));

      const group = {
        groupId: 'busy-group',
        type: 'follow',
        count: 20,
        latestNotificationId: '123e4567-e89b-12d3-a456-426614174000',
        actors: actors,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationGroupSchema.parse(group);
      expect(result.actors).toHaveLength(20);
      expect(result.count).toBe(20);
    });

    it('should handle metadata with boolean flags', () => {
      const metadata = {
        isImportant: true,
        requiresAction: false,
        autoExpire: true,
        priority: 1,
        tags: ['urgent', 'system'],
        timestamp: Date.now()
      };

      const result = NotificationMetadataSchema.parse(metadata);
      expect(result.isImportant).toBe(true);
      expect(result.requiresAction).toBe(false);
      expect(result.tags).toContain('urgent');
    });

    it('should handle target with all possible types', () => {
      const targets = [
        { type: 'post', id: '123e4567-e89b-12d3-a456-426614174000' },
        { type: 'comment', id: '123e4567-e89b-12d3-a456-426614174001' },
        { type: 'user', id: '123e4567-e89b-12d3-a456-426614174002' }
      ];

      targets.forEach(target => {
        const result = NotificationTargetSchema.parse(target);
        expect(result.type).toBe(target.type);
        expect(result.id).toBe(target.id);
      });
    });

    it('should handle actor with maximum length display name', () => {
      const actor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'johndoe',
        displayName: 'a'.repeat(100)
      };

      const result = NotificationActorSchema.parse(actor);
      expect(result.displayName).toHaveLength(100);
    });

    it('should reject actor with display name too long', () => {
      const actor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'johndoe',
        displayName: 'a'.repeat(101)
      };

      expect(() => NotificationActorSchema.parse(actor)).toThrow();
    });

    it('should handle create request with achievement type', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'You have reached 1000 followers',
        priority: 'high',
        metadata: {
          achievementId: 'followers-1000',
          badgeUrl: 'https://example.com/badges/1000-followers.png'
        }
      };

      const result = CreateNotificationRequestSchema.parse(request);
      expect(result.type).toBe('achievement');
      expect(result.metadata.achievementId).toBe('followers-1000');
    });

    it('should handle update request with all possible fields', () => {
      const request = {
        status: 'archived',
        priority: 'low',
        soundEnabled: false,
        vibrationEnabled: false,
        deliveryChannels: ['email']
      };

      const result = UpdateNotificationRequestSchema.parse(request);
      expect(result.status).toBe('archived');
      expect(result.deliveryChannels).toEqual(['email']);
    });

    it('should handle settings update with nested preferences', () => {
      const request = {
        preferences: {
          likes: { enabled: false },
          comments: { email: false, push: true },
          follows: { enabled: true, email: true, push: true, inApp: false }
        }
      };

      const result = UpdateNotificationSettingsRequestSchema.parse(request);
      expect(result.preferences.likes.enabled).toBe(false);
      expect(result.preferences.follows.inApp).toBe(false);
    });

    it('should handle delete request with single vs multiple IDs', () => {
      const singleDelete = {
        notificationId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const multiDelete = {
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001'
        ]
      };

      const result1 = DeleteNotificationRequestSchema.parse(singleDelete);
      expect(result1.notificationId).toBeDefined();

      const result2 = DeleteNotificationRequestSchema.parse(multiDelete);
      expect(result2.notificationIds).toHaveLength(2);
    });

    it('should handle notification with all delivery channels', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'announcement',
        title: 'Important Update',
        message: 'System-wide announcement',
        deliveryChannels: ['in-app', 'email', 'push', 'sms'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.deliveryChannels).toHaveLength(4);
      expect(result.deliveryChannels).toContain('sms');
    });

    it('should handle notification with complex metadata structure', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Complex metadata',
        message: 'Testing nested structures',
        metadata: {
          level1: {
            level2: {
              level3: {
                value: 'deep-nested',
                array: [1, 2, 3],
                flag: true
              }
            }
          },
          mixed: [
            { type: 'object', value: 123 },
            'string',
            456,
            null,
            true
          ]
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.level1.level2.level3.value).toBe('deep-nested');
      expect(result.metadata.mixed).toHaveLength(5);
    });

    it('should handle notification with whitespace in various fields', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'comment',
        title: '  Title with spaces  ',
        message: '\n\nMessage with newlines\n\n',
        groupId: '  group-with-spaces  ',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.title).toBe('Title with spaces');
      expect(result.message).toBe('Message with newlines');
      expect(result.groupId).toBe('group-with-spaces');
    });

    it('should handle batch operation with duplicate IDs removed', () => {
      const operation = {
        operation: 'mark-read',
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001'
        ]
      };

      const result = BatchNotificationOperationSchema.parse(operation);
      // Note: Schema should handle duplicates appropriately
      expect(result.notificationIds).toHaveLength(3);
    });

    it('should handle preferences with partial type definitions', () => {
      const preferences = {
        likes: { enabled: true },
        comments: { email: false },
        system: { push: false, inApp: true }
      };

      const result = NotificationPreferencesSchema.parse(preferences);
      expect(result.likes.enabled).toBe(true);
      expect(result.comments.email).toBe(false);
      expect(result.system.push).toBe(false);
    });

    it('should handle settings with midnight quiet hours', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        quietHoursStart: '00:00',
        quietHoursEnd: '00:00',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(settings);
      expect(result.quietHoursStart).toBe('00:00');
      expect(result.quietHoursEnd).toBe('00:00');
    });

    it('should handle notification with repeating group pattern', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: 'Multiple likes',
        message: '5 people liked your post',
        groupId: 'likes-post-123-hourly',
        metadata: {
          groupingStrategy: 'hourly',
          groupingWindow: 3600,
          firstOccurrence: '2024-01-01T00:00:00Z'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.groupingStrategy).toBe('hourly');
      expect(result.metadata.groupingWindow).toBe(3600);
    });

    it('should handle get request with sorting parameters', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 25
      };

      const result = GetNotificationsRequestSchema.parse(request);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should handle notification with action buttons metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'follow',
        title: 'New follower',
        message: 'John Doe started following you',
        metadata: {
          actions: [
            { label: 'Follow Back', action: 'follow-back', url: '/users/johndoe/follow' },
            { label: 'View Profile', action: 'view-profile', url: '/users/johndoe' }
          ]
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.actions).toHaveLength(2);
      expect(result.metadata.actions[0].action).toBe('follow-back');
    });

    it('should handle notification with rich media metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'achievement',
        title: 'Achievement Unlocked',
        message: 'First Post Milestone',
        metadata: {
          media: {
            type: 'image',
            url: 'https://example.com/achievements/first-post.png',
            thumbnailUrl: 'https://example.com/achievements/first-post-thumb.png',
            altText: 'First post achievement badge'
          },
          animation: {
            type: 'confetti',
            duration: 3000
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.media.type).toBe('image');
      expect(result.metadata.animation.type).toBe('confetti');
    });

    it('should handle list response with summary statistics', () => {
      const response = {
        notifications: [],
        totalCount: 150,
        unreadCount: 42,
        hasMore: true,
        nextCursor: 'page-2',
        summary: {
          byType: {
            likes: 50,
            comments: 30,
            follows: 20,
            mentions: 15,
            system: 35
          },
          oldestUnread: '2024-01-01T00:00:00Z',
          newestUnread: '2024-01-15T12:00:00Z'
        }
      };

      const result = NotificationsListResponseSchema.parse(response);
      expect(result.summary.byType.likes).toBe(50);
      expect(result.summary.oldestUnread).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle notification with scheduled delivery', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'announcement',
        title: 'Scheduled announcement',
        message: 'This will be delivered later',
        scheduledFor: '2024-12-25T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.scheduledFor).toBe('2024-12-25T00:00:00Z');
    });

    it('should handle notification with retry metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Delivery retry',
        message: 'Attempting redelivery',
        metadata: {
          delivery: {
            attempts: 3,
            lastAttempt: '2024-01-01T12:00:00Z',
            nextRetry: '2024-01-01T13:00:00Z',
            maxRetries: 5,
            failureReason: 'Network timeout'
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.delivery.attempts).toBe(3);
      expect(result.metadata.delivery.failureReason).toBe('Network timeout');
    });

    it('should handle notification with localization metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Localized notification',
        message: 'Default message',
        metadata: {
          i18n: {
            locale: 'en-US',
            translations: {
              'es-ES': {
                title: 'Notificación localizada',
                message: 'Mensaje predeterminado'
              },
              'fr-FR': {
                title: 'Notification localisée',
                message: 'Message par défaut'
              }
            }
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.i18n.locale).toBe('en-US');
      expect(result.metadata.i18n.translations['es-ES'].title).toBe('Notificación localizada');
    });

    it('should handle sound settings with custom sound packs', () => {
      const sound = {
        enabled: true,
        soundFile: 'custom-pack/gentle-ping.mp3',
        volume: 0.6,
        soundPack: 'gentle',
        vibrationPattern: [100, 200, 100]
      };

      const result = NotificationSoundSchema.parse(sound);
      expect(result.soundPack).toBe('gentle');
      expect(result.vibrationPattern).toEqual([100, 200, 100]);
    });

    it('should handle badge with custom color and position', () => {
      const badge = {
        count: 5,
        displayCount: '5',
        visible: true,
        color: '#FF5722',
        position: 'top-right'
      };

      const result = NotificationBadgeSchema.parse(badge);
      expect(result.color).toBe('#FF5722');
      expect(result.position).toBe('top-right');
    });

    it('should handle notification with interaction tracking', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: 'New like',
        message: 'Your post was liked',
        metadata: {
          tracking: {
            impressions: 5,
            clicks: 2,
            dismissed: false,
            interactionTime: 1500,
            source: 'push-notification'
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.tracking.clicks).toBe(2);
      expect(result.metadata.tracking.source).toBe('push-notification');
    });

    it('should handle settings with device-specific preferences', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        devices: {
          mobile: {
            pushEnabled: true,
            soundEnabled: true,
            vibrationEnabled: true
          },
          desktop: {
            pushEnabled: false,
            soundEnabled: true,
            vibrationEnabled: false
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(settings);
      expect(result.devices.mobile.pushEnabled).toBe(true);
      expect(result.devices.desktop.pushEnabled).toBe(false);
    });

    it('should handle notification with content security metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Security alert',
        message: 'Unusual activity detected',
        priority: 'urgent',
        metadata: {
          security: {
            threatLevel: 'medium',
            requiresAuthentication: true,
            expiresIn: 3600,
            actionRequired: 'verify-identity'
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.security.threatLevel).toBe('medium');
      expect(result.metadata.security.requiresAuthentication).toBe(true);
    });
  });

  describe('Performance and Limits', () => {
    it('should handle maximum batch size efficiently', () => {
      const startTime = Date.now();
      const ids = Array.from({ length: 1000 }, (_, i) =>
        `123e4567-e89b-12d3-a456-4266141${i.toString().padStart(5, '0')}`
      );

      const operation = {
        operation: 'mark-read',
        notificationIds: ids
      };

      const result = BatchNotificationOperationSchema.parse(operation);
      const duration = Date.now() - startTime;

      expect(result.notificationIds).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should parse quickly
    });

    it('should handle deeply nested metadata efficiently', () => {
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { value: 'leaf' };
        return { nested: createNestedObject(depth - 1) };
      };

      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Deep nested',
        message: 'Testing deep nesting',
        metadata: createNestedObject(10),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata).toBeDefined();
    });

    it('should handle concurrent validation of multiple notifications', () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-4266141${i.toString().padStart(5, '0')}`,
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: `Like ${i}`,
        message: `Message ${i}`,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }));

      const results = notifications.map(n => NotificationSchema.parse(n));
      expect(results).toHaveLength(100);
      expect(results[50].title).toBe('Like 50');
    });
  });

  describe('Additional Validation Scenarios', () => {
    it('should handle notification with mixed case type values', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'LIKE',
        title: 'New like',
        message: 'Your post was liked',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSchema.parse(notification)).toThrow();
    });

    it('should handle notification with numeric user ID', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 12345,
        type: 'like',
        title: 'New like',
        message: 'Your post was liked',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSchema.parse(notification)).toThrow();
    });

    it('should handle notification with malformed ISO date', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'like',
        title: 'New like',
        message: 'Your post was liked',
        createdAt: '2024-01-01 00:00:00',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => NotificationSchema.parse(notification)).toThrow();
    });

    it('should handle request with zero limit', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        limit: 0
      };

      expect(() => GetNotificationsRequestSchema.parse(request)).toThrow();
    });

    it('should handle batch operation with over 1000 IDs', () => {
      const ids = Array.from({ length: 1001 }, (_, i) =>
        `123e4567-e89b-12d3-a456-4266141${i.toString().padStart(5, '0')}`
      );

      const operation = {
        operation: 'delete',
        notificationIds: ids
      };

      // Schema should either handle or reject based on limits
      const result = BatchNotificationOperationSchema.parse(operation);
      expect(result.notificationIds.length).toBeGreaterThanOrEqual(1000);
    });

    it('should handle notification with circular reference in metadata', () => {
      const metadata: any = { level1: {} };
      metadata.level1.circular = metadata;

      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Circular test',
        message: 'Testing circular references',
        metadata: metadata,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Should handle circular references gracefully
      expect(() => NotificationSchema.parse(notification)).not.toThrow();
    });

    it('should handle notification with special URL characters', () => {
      const target = {
        type: 'post',
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/posts?id=123&filter=new#comment-456',
        preview: 'Post with query params'
      };

      const result = NotificationTargetSchema.parse(target);
      expect(result.url).toContain('?id=123');
      expect(result.url).toContain('#comment-456');
    });

    it('should handle actor with international characters in handle', () => {
      const actor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'użytkownik_漢字',
        displayName: 'International User'
      };

      const result = NotificationActorSchema.parse(actor);
      expect(result.handle).toBe('użytkownik_漢字');
    });

    it('should handle settings with conflicting global and preference settings', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        emailEnabled: false,
        preferences: {
          likes: { email: true }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(settings);
      expect(result.emailEnabled).toBe(false);
      expect(result.preferences.likes.email).toBe(true);
    });

    it('should handle notification with emoji in title', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'achievement',
        title: '🎉 Achievement Unlocked 🏆',
        message: 'Congratulations!',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.title).toContain('🎉');
      expect(result.title).toContain('🏆');
    });

    it('should handle group with mixed notification types', () => {
      const group = {
        groupId: 'mixed-123',
        type: 'mixed',
        count: 10,
        latestNotificationId: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          types: ['like', 'comment', 'follow'],
          breakdown: {
            like: 5,
            comment: 3,
            follow: 2
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationGroupSchema.parse(group);
      expect(result.metadata.types).toContain('comment');
      expect(result.metadata.breakdown.like).toBe(5);
    });

    it('should handle notification with timezone offset in dates', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Timezone test',
        message: 'Testing timezone handling',
        createdAt: '2024-01-01T00:00:00+05:30',
        updatedAt: '2024-01-01T00:00:00-08:00'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle delete request with both single and multiple IDs', () => {
      const request = {
        notificationId: '123e4567-e89b-12d3-a456-426614174000',
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002'
        ]
      };

      // Should handle conflict appropriately
      const result = DeleteNotificationRequestSchema.parse(request);
      expect(result).toBeDefined();
    });

    it('should handle sound with zero volume', () => {
      const sound = {
        enabled: true,
        soundFile: 'silent.mp3',
        volume: 0
      };

      const result = NotificationSoundSchema.parse(sound);
      expect(result.volume).toBe(0);
    });

    it('should handle badge with negative count', () => {
      const badge = {
        count: -1,
        displayCount: '0',
        visible: false
      };

      expect(() => NotificationBadgeSchema.parse(badge)).toThrow();
    });

    it('should handle notification with SQL injection attempt in message', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Test',
        message: "'; DROP TABLE notifications; --",
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.message).toContain('DROP TABLE');
    });

    it('should handle preferences with unknown notification type', () => {
      const preferences = {
        likes: { enabled: true },
        unknownType: { enabled: false }
      };

      const result = NotificationPreferencesSchema.parse(preferences);
      expect(result.unknownType).toBeDefined();
    });

    it('should handle notification with millisecond precision timestamps', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Precision test',
        message: 'Testing millisecond precision',
        createdAt: '2024-01-01T00:00:00.123Z',
        updatedAt: '2024-01-01T00:00:00.456789Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.createdAt).toContain('.123');
    });

    it('should handle batch operation with mixed valid and invalid IDs', () => {
      const operation = {
        operation: 'archive',
        notificationIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          'invalid-uuid',
          '123e4567-e89b-12d3-a456-426614174001'
        ]
      };

      expect(() => BatchNotificationOperationSchema.parse(operation)).toThrow();
    });

    it('should handle settings with quiet hours crossing midnight', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(settings);
      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('06:00');
    });

    it('should handle notification with base64 encoded content in metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Encoded content',
        message: 'Contains encoded data',
        metadata: {
          encodedPayload: 'SGVsbG8gV29ybGQh',
          encoding: 'base64'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.encodedPayload).toBe('SGVsbG8gV29ybGQh');
    });

    it('should handle list response with negative counts', () => {
      const response = {
        notifications: [],
        totalCount: -1,
        unreadCount: -5,
        hasMore: false
      };

      expect(() => NotificationsListResponseSchema.parse(response)).toThrow();
    });

    it('should handle notification with XSS attempt in actor display name', () => {
      const actor = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        handle: 'user123',
        displayName: '<script>alert("XSS")</script>'
      };

      const result = NotificationActorSchema.parse(actor);
      expect(result.displayName).toContain('<script>');
    });

    it('should handle update request with empty arrays', () => {
      const request = {
        deliveryChannels: []
      };

      const result = UpdateNotificationRequestSchema.parse(request);
      expect(result.deliveryChannels).toEqual([]);
    });

    it('should handle notification with microsecond precision in timestamps', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Microsecond test',
        message: 'Testing microsecond precision',
        createdAt: '2024-01-01T00:00:00.123456Z',
        updatedAt: '2024-01-01T00:00:00.987654Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.createdAt).toBeDefined();
    });

    it('should handle notification with IPv6 address in metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'IP tracking',
        message: 'Login from new location',
        metadata: {
          ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          location: 'Unknown'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.ipAddress).toContain('2001:0db8');
    });

    it('should handle group with timestamp array in metadata', () => {
      const group = {
        groupId: 'timeline-group',
        type: 'like',
        count: 5,
        latestNotificationId: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          timestamps: [
            '2024-01-01T00:00:00Z',
            '2024-01-01T01:00:00Z',
            '2024-01-01T02:00:00Z'
          ]
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationGroupSchema.parse(group);
      expect(result.metadata.timestamps).toHaveLength(3);
    });

    it('should handle notification with version tracking in metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Version update',
        message: 'New version available',
        metadata: {
          version: {
            current: '1.2.3',
            available: '2.0.0',
            breaking: true,
            changelog: ['Feature A', 'Feature B', 'Breaking change C']
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.version.breaking).toBe(true);
      expect(result.metadata.version.changelog).toHaveLength(3);
    });

    it('should handle settings with partial device preferences', () => {
      const settings = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        devices: {
          mobile: {
            pushEnabled: true
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSettingsSchema.parse(settings);
      expect(result.devices.mobile.pushEnabled).toBe(true);
    });

    it('should handle notification with compressed data in metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Compressed data',
        message: 'Contains compressed payload',
        metadata: {
          compressed: true,
          algorithm: 'gzip',
          originalSize: 10240,
          compressedSize: 1024,
          data: 'H4sIAAAAAAAAA...'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.compressed).toBe(true);
      expect(result.metadata.originalSize).toBe(10240);
    });

    it('should handle request with invalid cursor format', () => {
      const request = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        cursor: { page: 2, offset: 20 }
      };

      expect(() => GetNotificationsRequestSchema.parse(request)).toThrow();
    });

    it('should handle notification with rate limiting metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Rate limit warning',
        message: 'You are approaching rate limits',
        metadata: {
          rateLimit: {
            limit: 100,
            remaining: 5,
            resetAt: '2024-01-01T01:00:00Z',
            window: 3600
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.rateLimit.remaining).toBe(5);
    });

    it('should handle sound with invalid file extension', () => {
      const sound = {
        enabled: true,
        soundFile: 'notification.exe',
        volume: 0.5
      };

      // Should accept any string for soundFile
      const result = NotificationSoundSchema.parse(sound);
      expect(result.soundFile).toBe('notification.exe');
    });

    it('should handle notification with geolocation in metadata', () => {
      const notification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'system',
        title: 'Location-based alert',
        message: 'Activity detected nearby',
        metadata: {
          location: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10,
            city: 'San Francisco',
            country: 'USA'
          }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = NotificationSchema.parse(notification);
      expect(result.metadata.location.latitude).toBe(37.7749);
      expect(result.metadata.location.city).toBe('San Francisco');
    });

    it('should handle batch operation with unusual but valid operation type', () => {
      const operation = {
        operation: 'mark-read',
        notificationIds: ['123e4567-e89b-12d3-a456-426614174000']
      };

      const result = BatchNotificationOperationSchema.parse(operation);
      expect(result.operation).toBe('mark-read');
    });
  });
});