/**
 * Notifications Components Barrel Export
 *
 * Central export point for all notification-related components
 * Enables clean imports: import { NotificationItem, NotificationsList } from '@/components/notifications'
 */

// Atomic Components
export { NotificationAvatar } from './NotificationAvatar.js';
export { NotificationContent } from './NotificationContent.js';
export { NotificationThumbnail } from './NotificationThumbnail.js';
export { NotificationUnreadDot } from './NotificationUnreadDot.js';

// Composite Components
export { NotificationItem } from './NotificationItem.js';
export { NotificationGroup } from './NotificationGroup.js';
export { NotificationsHeader } from './NotificationsHeader.js';

// State Components
export { NotificationsLoading } from './NotificationsLoading.js';
export { NotificationsError } from './NotificationsError.js';
export { NotificationsEmpty } from './NotificationsEmpty.js';

// Container Components
export { NotificationsList } from './NotificationsList.js';
export { LoadMoreButton } from './LoadMoreButton.js';

// Types
export type { NotificationGroupProps } from './NotificationGroup.js';
export type { NotificationsHeaderProps } from './NotificationsHeader.js';
export type { NotificationsErrorProps } from './NotificationsError.js';
export type { NotificationsEmptyProps } from './NotificationsEmpty.js';
export type { NotificationsListProps } from './NotificationsList.js';
export type { LoadMoreButtonProps } from './LoadMoreButton.js';
