/**
 * Notification Test Fixtures
 *
 * Factory functions for creating test notification data.
 * Follows the factory pattern for DRY test data creation.
 */

import type {
  Notification,
  NotificationType,
  NotificationConnection,
  NotificationEdge,
  UnreadCountResult,
  MarkNotificationsAsReadResult,
} from '../../interfaces/INotificationDataService';

/**
 * Create a mock notification with optional overrides
 */
export const createMockNotification = (
  overrides?: Partial<Notification>
): Notification => ({
  id: 'notif-1',
  type: 'like' as NotificationType,
  actorId: 'user-123',
  actorUsername: 'johndoe',
  targetId: 'post-456',
  message: 'johndoe liked your post',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create multiple mock notifications
 */
export const createMockNotifications = (
  count: number,
  overrides?: Partial<Notification>
): Notification[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockNotification({
      id: `notif-${index + 1}`,
      actorUsername: `user${index + 1}`,
      ...overrides,
    })
  );
};

/**
 * Create a mock notification edge (GraphQL Relay pattern)
 */
export const createMockNotificationEdge = (
  notification: Notification,
  cursor?: string
): NotificationEdge => ({
  node: notification,
  cursor: cursor || `cursor-${notification.id}`,
});

/**
 * Create a mock notification connection with pagination info
 */
export const createMockNotificationConnection = (
  notifications: Notification[],
  hasNextPage: boolean = false
): NotificationConnection => ({
  edges: notifications.map((notification, index) =>
    createMockNotificationEdge(notification, `cursor-${index}`)
  ),
  pageInfo: {
    hasNextPage,
    endCursor: notifications.length > 0
      ? `cursor-${notifications.length - 1}`
      : null,
  },
});

/**
 * Create a mock unread count result
 */
export const createMockUnreadCountResult = (
  overrides?: Partial<UnreadCountResult>
): UnreadCountResult => ({
  count: 0,
  ...overrides,
});

/**
 * Create a mock mark notifications as read result
 */
export const createMockMarkNotificationsAsReadResult = (
  overrides?: Partial<MarkNotificationsAsReadResult>
): MarkNotificationsAsReadResult => ({
  success: true,
  markedCount: 0,
  ...overrides,
});

/**
 * Create notification by type
 */
export const createLikeNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'like',
  message: `${overrides?.actorUsername || 'johndoe'} liked your post`,
  ...overrides,
});

export const createCommentNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'comment',
  message: `${overrides?.actorUsername || 'johndoe'} commented on your post`,
  ...overrides,
});

export const createFollowNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'follow',
  message: `${overrides?.actorUsername || 'johndoe'} started following you`,
  ...overrides,
});

export const createMentionNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'mention',
  message: `${overrides?.actorUsername || 'johndoe'} mentioned you in a comment`,
  ...overrides,
});
