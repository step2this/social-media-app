/**
 * NotificationServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { NotificationServiceAdapter } from '../NotificationServiceAdapter';
import { createMockNotifications } from '@social-media-app/shared/test-utils/fixtures';

describe('NotificationServiceAdapter', () => {
  describe('getNotifications', () => {
    it('transforms service response to repository format', async () => {
      const mockNotifications = createMockNotifications(3);
      const mockService = {
        getNotifications: async () => ({
          notifications: mockNotifications,
          hasMore: false,
          nextCursor: null,
        }),
        getUnreadCount: async () => 0,
      };
      const adapter = new NotificationServiceAdapter(mockService as any);

      const result = await adapter.getNotifications('user-1', 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toEqual(mockNotifications);
        expect(result.data.hasMore).toBe(false);
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService = {
        getNotifications: async () => {
          throw new Error('Service down');
        },
        getUnreadCount: async () => 0,
      };
      const adapter = new NotificationServiceAdapter(mockService as any);

      const result = await adapter.getNotifications('user-1', 20);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count from service', async () => {
      const mockService = {
        getNotifications: async () => ({ notifications: [], hasMore: false, nextCursor: null }),
        getUnreadCount: async () => 5,
      };
      const adapter = new NotificationServiceAdapter(mockService as any);

      const result = await adapter.getUnreadCount('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService = {
        getNotifications: async () => ({ notifications: [], hasMore: false, nextCursor: null }),
        getUnreadCount: async () => {
          throw new Error('Service down');
        },
      };
      const adapter = new NotificationServiceAdapter(mockService as any);

      const result = await adapter.getUnreadCount('user-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });
});
