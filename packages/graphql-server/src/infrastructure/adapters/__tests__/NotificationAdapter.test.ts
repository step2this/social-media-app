/**
 * NotificationAdapter Tests (TDD RED → GREEN)
 *
 * Minimal behavior-focused tests using dependency injection.
 * Tests that NotificationAdapter correctly uses NotificationService and transforms to GraphQL types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationAdapter } from '../NotificationAdapter';
import { GraphQLError } from 'graphql';
import type { NotificationService } from '@social-media-app/dal';
import type { Notification } from '@social-media-app/shared';

describe('NotificationAdapter', () => {
  let adapter: NotificationAdapter;
  let mockNotificationService: NotificationService;

  beforeEach(() => {
    // Inject mock service - no spies needed
    mockNotificationService = {
      getNotifications: async () => ({ notifications: [], hasMore: false, totalCount: 0, unreadCount: 0 }),
      getUnreadCount: async () => 0,
    } as any;

    adapter = new NotificationAdapter(mockNotificationService);
  });

  const createMockNotification = (id: string): Notification => ({
    id,
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
  });

  describe('getNotifications', () => {
    it('transforms Notifications to GraphQL NotificationConnection', async () => {
      const notifications = [createMockNotification('notif-1'), createMockNotification('notif-2')];
      mockNotificationService.getNotifications = async () => ({
        notifications,
        hasMore: false,
        totalCount: 2,
        unreadCount: 1,
      });

      const result = await adapter.getNotifications({ userId: 'user-1', first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('notif-1');
      expect(result.edges[0].cursor).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('handles pagination with cursor', async () => {
      const notifications = [createMockNotification('notif-1')];
      mockNotificationService.getNotifications = async () => ({
        notifications,
        hasMore: true,
        totalCount: 10,
        unreadCount: 5,
      });

      const result = await adapter.getNotifications({ userId: 'user-1', first: 1, after: 'cursor-abc' });

      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('validates userId parameter', async () => {
      await expect(adapter.getNotifications({ userId: '', first: 10 })).rejects.toThrow(
        'userId is required'
      );
    });

    it('throws GraphQLError on service error', async () => {
      mockNotificationService.getNotifications = async () => {
        throw new Error('Database error');
      };

      await expect(adapter.getNotifications({ userId: 'user-1', first: 10 })).rejects.toThrow(GraphQLError);
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread notification count', async () => {
      mockNotificationService.getUnreadCount = async () => 5;

      const result = await adapter.getUnreadCount('user-1');

      expect(result).toBe(5);
    });

    it('validates userId parameter', async () => {
      await expect(adapter.getUnreadCount('')).rejects.toThrow('userId is required');
    });
  });
});
