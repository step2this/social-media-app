/**
 * NotificationsPage Utility Functions
 *
 * Pure helper functions extracted from NotificationsPage component
 * Following Single Responsibility Principle and using advanced TypeScript types
 */

import type { Notification, NotificationType } from '@social-media-app/shared';
import type {
  NotificationGroups,
  NotificationIconColor,
  GroupNotificationsFn,
  FormatNotificationTextFn,
  FormatTimestampFn,
  GetIconNameFn,
  GetIconColorFn
} from './NotificationsPage.types';

/**
 * Group notifications by time periods
 *
 * @param notifications - Array of notifications to group
 * @returns Notifications organized by time period (today, yesterday, etc.)
 *
 * @example
 * ```ts
 * const groups = groupNotificationsByTime(notifications);
 * console.log(groups.today.length); // Number of notifications from today
 * ```
 */
export const groupNotificationsByTime: GroupNotificationsFn = (notifications) => {
  const now = new Date();
  const groups: NotificationGroups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    earlier: []
  };

  notifications.forEach(notif => {
    const age = now.getTime() - new Date(notif.createdAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);

    if (days < 1) {
      groups.today = [...groups.today, notif];
    } else if (days < 2) {
      groups.yesterday = [...groups.yesterday, notif];
    } else if (days < 7) {
      groups.thisWeek = [...groups.thisWeek, notif];
    } else if (days < 30) {
      groups.thisMonth = [...groups.thisMonth, notif];
    } else {
      groups.earlier = [...groups.earlier, notif];
    }
  });

  return groups;
};

/**
 * Get human-readable notification text based on notification type
 *
 * Applies type-specific formatting using actor information
 * Falls back to message/title if actor is unavailable
 *
 * @param notification - Notification to format
 * @returns Formatted human-readable text
 *
 * @example
 * ```ts
 * const text = getNotificationText(notification);
 * // "John Doe liked your post"
 * ```
 */
export const getNotificationText: FormatNotificationTextFn = (notification) => {
  const actorName = notification.actor?.displayName || notification.actor?.handle || 'Someone';

  switch (notification.type) {
    case 'like':
      return `${actorName} liked your ${notification.target?.type || 'post'}`;
    case 'comment':
      return `${actorName} commented on your post`;
    case 'follow':
      return `${actorName} started following you`;
    case 'mention':
      return `${actorName} mentioned you in a comment`;
    case 'reply':
      return `${actorName} replied to your comment`;
    case 'repost':
      return `${actorName} reposted your post`;
    case 'quote':
      return `${actorName} quoted your post`;
    default:
      return notification.message || notification.title;
  }
};

/**
 * Format timestamp to human-readable format
 *
 * Returns relative time strings like "5m", "3h", "2d", etc.
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Human-readable relative time string
 *
 * @example
 * ```ts
 * formatTimestamp(new Date().toISOString()); // "just now"
 * formatTimestamp(fiveMinutesAgo); // "5m"
 * ```
 */
export const formatTimestamp: FormatTimestampFn = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 4) return `${diffWeeks}w`;
  return `${Math.floor(diffDays / 30)}mo`;
};

/**
 * Get Material Icon name for notification type
 *
 * Maps notification types to appropriate Material Design icon names
 *
 * @param type - Notification type
 * @returns Material Icon name string
 *
 * @example
 * ```ts
 * getNotificationIcon('like'); // "favorite"
 * getNotificationIcon('follow'); // "person_add"
 * ```
 */
export const getNotificationIcon: GetIconNameFn = (type) => {
  switch (type) {
    case 'like':
      return 'favorite';
    case 'comment':
      return 'chat_bubble';
    case 'follow':
      return 'person_add';
    case 'mention':
      return 'alternate_email';
    case 'reply':
      return 'reply';
    case 'repost':
      return 'repeat';
    case 'quote':
      return 'format_quote';
    case 'system':
      return 'info';
    case 'announcement':
      return 'campaign';
    case 'achievement':
      return 'emoji_events';
    default:
      return 'notifications';
  }
};

/**
 * Get CSS color class for notification type
 *
 * Returns BEM-style CSS class names for styling notification icons
 * Uses template literal type for type safety
 *
 * @param type - Notification type
 * @returns CSS class name or empty string
 *
 * @example
 * ```ts
 * getNotificationColor('like'); // "notification-icon--like"
 * getNotificationColor('system'); // ""
 * ```
 */
export const getNotificationColor: GetIconColorFn = (type) => {
  switch (type) {
    case 'like':
      return 'notification-icon--like';
    case 'comment':
      return 'notification-icon--comment';
    case 'follow':
      return 'notification-icon--follow';
    case 'mention':
      return 'notification-icon--mention';
    default:
      return '';
  }
};
