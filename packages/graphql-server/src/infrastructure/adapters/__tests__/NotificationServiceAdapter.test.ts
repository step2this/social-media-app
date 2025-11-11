/**
 * NotificationServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { NotificationServiceAdapter, type INotificationService } from '../NotificationServiceAdapter.js';
import type { Notification } from '@social-media-app/shared';

describe('NotificationServiceAdapter', () => {
  describe('getNotifications', () => {
    it('transforms service response to repository format', async () => {
      // Create inline mock that matches INotificationService type exactly - no type assertions!
      const mockNotifications: readonly Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'like',
          title: 'New Like',
          message: 'Someone liked your post',
          status: 'unread',
          actor: { userId: 'actor-1', handle: 'testuser', displayName: 'Test User' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          priority: 'normal',
          deliveryChannels: ['in-app'],
          soundEnabled: true,
          vibrationEnabled: true,
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: 'comment',
          title: 'New Comment',
          message: 'Someone commented on your post',
          status: 'unread',
          actor: { userId: 'actor-2', handle: 'testuser2', displayName: 'Test User 2' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          priority: 'normal',
          deliveryChannels: ['in-app'],
          soundEnabled: true,
          vibrationEnabled: true,
        },
        {
          id: 'notif-3',
          userId: 'user-1',
          type: 'follow',
          title: 'New Follower',
          message: 'Someone followed you',
          status: 'read',
          actor: { userId: 'actor-3', handle: 'testuser3', displayName: 'Test User 3' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          priority: 'normal',
          deliveryChannels: ['in-app'],
          soundEnabled: true,
          vibrationEnabled: true,
        },
      ];

      const mockService: INotificationService = {
        getNotifications: async () => ({
          notifications: mockNotifications, // ✅ Type-safe! No assertions needed
          hasMore: false,
          nextCursor: null,
          totalCount: 3,
          unreadCount: 1,
        }),
        getUnreadCount: async () => 0,
      };
      const adapter = new NotificationServiceAdapter(mockService);

      const result = await adapter.getNotifications('user-1', 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(3);
        expect(result.data.hasMore).toBe(false);
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService: INotificationService = {
        getNotifications: async () => {
          throw new Error('Service down');
        },
        getUnreadCount: async () => 0,
      };
      const adapter = new NotificationServiceAdapter(mockService);

      const result = await adapter.getNotifications('user-1', 20);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count from service', async () => {
      const mockService: INotificationService = {
        getNotifications: async () => ({
          notifications: [],
          hasMore: false,
          nextCursor: null,
          totalCount: 0,
          unreadCount: 0,
        }),
        getUnreadCount: async () => 5,
      };
      const adapter = new NotificationServiceAdapter(mockService);

      const result = await adapter.getUnreadCount('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService: INotificationService = {
        getNotifications: async () => ({
          notifications: [],
          hasMore: false,
          nextCursor: null,
          totalCount: 0,
          unreadCount: 0,
        }),
        getUnreadCount: async () => {
          throw new Error('Service down');
        },
      };
      const adapter = new NotificationServiceAdapter(mockService);

      const result = await adapter.getUnreadCount('user-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });
});
