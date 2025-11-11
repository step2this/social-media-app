/**
 * NotificationsPage Utils Tests
 *
 * TDD approach: Write tests first, then implement utilities
 * Tests for helper functions extracted from NotificationsPage
 */

import { describe, it, expect } from 'vitest';
import {
  groupNotificationsByTime,
  getNotificationText,
  formatTimestamp,
  getNotificationIcon,
  getNotificationColor
} from './NotificationsPage.utils.js';
import { createMockNotification } from '../services/__tests__/fixtures/notificationFixtures.js';
import type { NotificationType } from '@social-media-app/shared';

describe('NotificationsPage Utils', () => {
  describe('groupNotificationsByTime', () => {
    it('should group notifications into today', () => {
      const now = new Date();
      const notification = createMockNotification({
        createdAt: now.toISOString()
      });

      const groups = groupNotificationsByTime([notification]);

      expect(groups.today).toHaveLength(1);
      expect(groups.today[0].id).toBe(notification.id);
      expect(groups.yesterday).toHaveLength(0);
      expect(groups.thisWeek).toHaveLength(0);
      expect(groups.thisMonth).toHaveLength(0);
      expect(groups.earlier).toHaveLength(0);
    });

    it('should group notifications into yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const notification = createMockNotification({
        createdAt: yesterday.toISOString()
      });

      const groups = groupNotificationsByTime([notification]);

      expect(groups.today).toHaveLength(0);
      expect(groups.yesterday).toHaveLength(1);
      expect(groups.yesterday[0].id).toBe(notification.id);
    });

    it('should group notifications into this week', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const notification = createMockNotification({
        createdAt: threeDaysAgo.toISOString()
      });

      const groups = groupNotificationsByTime([notification]);

      expect(groups.thisWeek).toHaveLength(1);
      expect(groups.thisWeek[0].id).toBe(notification.id);
    });

    it('should group notifications into this month', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const notification = createMockNotification({
        createdAt: twoWeeksAgo.toISOString()
      });

      const groups = groupNotificationsByTime([notification]);

      expect(groups.thisMonth).toHaveLength(1);
      expect(groups.thisMonth[0].id).toBe(notification.id);
    });

    it('should group notifications into earlier', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const notification = createMockNotification({
        createdAt: twoMonthsAgo.toISOString()
      });

      const groups = groupNotificationsByTime([notification]);

      expect(groups.earlier).toHaveLength(1);
      expect(groups.earlier[0].id).toBe(notification.id);
    });

    it('should handle empty notifications array', () => {
      const groups = groupNotificationsByTime([]);

      expect(groups.today).toHaveLength(0);
      expect(groups.yesterday).toHaveLength(0);
      expect(groups.thisWeek).toHaveLength(0);
      expect(groups.thisMonth).toHaveLength(0);
      expect(groups.earlier).toHaveLength(0);
    });

    it('should group multiple notifications correctly', () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 5);

      const notifications = [
        createMockNotification({ id: '1', createdAt: today.toISOString() }),
        createMockNotification({ id: '2', createdAt: yesterday.toISOString() }),
        createMockNotification({ id: '3', createdAt: lastWeek.toISOString() }),
      ];

      const groups = groupNotificationsByTime(notifications);

      expect(groups.today).toHaveLength(1);
      expect(groups.yesterday).toHaveLength(1);
      expect(groups.thisWeek).toHaveLength(1);
    });
  });

  describe('getNotificationText', () => {
    it('should format like notification with actor displayName', () => {
      const notification = createMockNotification({
        type: 'like',
        actor: {
          userId: 'user-1',
          handle: 'john',
          displayName: 'John Doe'
        },
        target: {
          type: 'post',
          id: 'post-1'
        }
      });

      const text = getNotificationText(notification);

      expect(text).toBe('John Doe liked your post');
    });

    it('should format comment notification', () => {
      const notification = createMockNotification({
        type: 'comment',
        actor: {
          userId: 'user-1',
          handle: 'sarah',
          displayName: 'Sarah Smith'
        }
      });

      const text = getNotificationText(notification);

      expect(text).toBe('Sarah Smith commented on your post');
    });

    it('should format follow notification', () => {
      const notification = createMockNotification({
        type: 'follow',
        actor: {
          userId: 'user-1',
          handle: 'mike',
          displayName: 'Mike Johnson'
        }
      });

      const text = getNotificationText(notification);

      expect(text).toBe('Mike Johnson started following you');
    });

    it('should format mention notification', () => {
      const notification = createMockNotification({
        type: 'mention',
        actor: {
          userId: 'user-1',
          handle: 'alice',
          displayName: 'Alice Brown'
        }
      });

      const text = getNotificationText(notification);

      expect(text).toBe('Alice Brown mentioned you in a comment');
    });

    it('should use handle if displayName is not available', () => {
      const notification = createMockNotification({
        type: 'like',
        actor: {
          userId: 'user-1',
          handle: 'johndoe'
        }
      });

      const text = getNotificationText(notification);

      expect(text).toBe('johndoe liked your post');
    });

    it('should use "Someone" if no actor info available', () => {
      const notification = createMockNotification({
        type: 'like',
        actor: undefined
      });

      const text = getNotificationText(notification);

      expect(text).toBe('Someone liked your post');
    });

    it('should fallback to message field for unknown types', () => {
      const notification = createMockNotification({
        type: 'system' as NotificationType,
        message: 'System notification message'
      });

      const text = getNotificationText(notification);

      expect(text).toBe('System notification message');
    });
  });

  describe('formatTimestamp', () => {
    it('should return "just now" for timestamps less than 1 minute old', () => {
      const now = new Date().toISOString();

      expect(formatTimestamp(now)).toBe('just now');
    });

    it('should return minutes for timestamps less than 1 hour old', () => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      expect(formatTimestamp(fiveMinutesAgo.toISOString())).toBe('5m');
    });

    it('should return hours for timestamps less than 24 hours old', () => {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      expect(formatTimestamp(threeHoursAgo.toISOString())).toBe('3h');
    });

    it('should return days for timestamps less than 7 days old', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      expect(formatTimestamp(twoDaysAgo.toISOString())).toBe('2d');
    });

    it('should return weeks for timestamps less than 4 weeks old', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      expect(formatTimestamp(twoWeeksAgo.toISOString())).toBe('2w');
    });

    it('should return months for timestamps older than 4 weeks', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      expect(formatTimestamp(twoMonthsAgo.toISOString())).toBe('2mo');
    });
  });

  describe('getNotificationIcon', () => {
    it('should return correct icon for like', () => {
      expect(getNotificationIcon('like')).toBe('favorite');
    });

    it('should return correct icon for comment', () => {
      expect(getNotificationIcon('comment')).toBe('chat_bubble');
    });

    it('should return correct icon for follow', () => {
      expect(getNotificationIcon('follow')).toBe('person_add');
    });

    it('should return correct icon for mention', () => {
      expect(getNotificationIcon('mention')).toBe('alternate_email');
    });

    it('should return correct icon for reply', () => {
      expect(getNotificationIcon('reply')).toBe('reply');
    });

    it('should return correct icon for repost', () => {
      expect(getNotificationIcon('repost')).toBe('repeat');
    });

    it('should return correct icon for quote', () => {
      expect(getNotificationIcon('quote')).toBe('format_quote');
    });

    it('should return correct icon for system', () => {
      expect(getNotificationIcon('system')).toBe('info');
    });

    it('should return correct icon for announcement', () => {
      expect(getNotificationIcon('announcement')).toBe('campaign');
    });

    it('should return correct icon for achievement', () => {
      expect(getNotificationIcon('achievement')).toBe('emoji_events');
    });

    it('should return default icon for unknown type', () => {
      expect(getNotificationIcon('unknown' as NotificationType)).toBe('notifications');
    });
  });

  describe('getNotificationColor', () => {
    it('should return correct color class for like', () => {
      expect(getNotificationColor('like')).toBe('notification-icon--like');
    });

    it('should return correct color class for comment', () => {
      expect(getNotificationColor('comment')).toBe('notification-icon--comment');
    });

    it('should return correct color class for follow', () => {
      expect(getNotificationColor('follow')).toBe('notification-icon--follow');
    });

    it('should return correct color class for mention', () => {
      expect(getNotificationColor('mention')).toBe('notification-icon--mention');
    });

    it('should return empty string for unknown types', () => {
      expect(getNotificationColor('system')).toBe('');
      expect(getNotificationColor('unknown' as NotificationType)).toBe('');
    });
  });
});
