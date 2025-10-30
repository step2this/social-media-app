/**
 * Notification Test Fixtures
 *
 * Factory functions for creating test notification data.
 * Follows the factory pattern for DRY test data creation.
 */

import type {
  NotificationConnection,
  NotificationEdge,
} from '../../interfaces/INotificationDataService';
import type { Notification, NotificationType } from '@social-media-app/shared';

/**
 * Create a mock notification with optional overrides
 */
export const createMockNotification = (
  overrides?: Partial<Notification>
): Notification => ({
  id: 'notif-1',
  userId: 'user-123',
  type: 'like' as NotificationType,
  status: 'unread',
  title: 'New like',
  message: 'johndoe liked your post',
  priority: 'normal',
  actor: {
    userId: 'actor-123',
    handle: 'johndoe',
    displayName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg'
  },
  target: {
    type: 'post',
    id: 'post-456',
    url: '/posts/post-456',
    preview: 'Check out this post'
  },
  deliveryChannels: ['in-app'],
  soundEnabled: true,
  vibrationEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
      actor: {
        userId: `actor-${index + 1}`,
        handle: `user${index + 1}`,
        displayName: `User ${index + 1}`,
        avatarUrl: `https://example.com/avatar-${index + 1}.jpg`
      },
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
    hasPreviousPage: false,
    startCursor: notifications.length > 0 ? 'cursor-0' : null,
    endCursor: notifications.length > 0
      ? `cursor-${notifications.length - 1}`
      : null,
  },
});


/**
 * Create notification by type
 */
export const createLikeNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'like',
  message: `${overrides?.actor?.handle || 'johndoe'} liked your post`,
  ...overrides,
});

export const createCommentNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'comment',
  message: `${overrides?.actor?.handle || 'johndoe'} commented on your post`,
  ...overrides,
});

export const createFollowNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'follow',
  message: `${overrides?.actor?.handle || 'johndoe'} started following you`,
  ...overrides,
});

export const createMentionNotification = (
  overrides?: Partial<Notification>
): Notification => createMockNotification({
  type: 'mention',
  message: `${overrides?.actor?.handle || 'johndoe'} mentioned you in a comment`,
  ...overrides,
});

/**
 * Create mock unread count result
 */
export const createMockUnreadCountResult = (count: number = 0) => ({
  count
});

/**
 * Create mock mark notifications as read result
 */
export const createMockMarkNotificationsAsReadResult = (markedCount: number = 0) => ({
  success: true,
  markedCount
});
