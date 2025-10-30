/**
 * Notifications Components Barrel Export
 * 
 * Central export point for all notification-related components
 * Enables clean imports: import { NotificationItem, NotificationsList } from '@/components/notifications'
 */

// Atomic Components
export { NotificationAvatar } from './NotificationAvatar';
export { NotificationContent } from './NotificationContent';
export { NotificationThumbnail } from './NotificationThumbnail';
export { NotificationUnreadDot } from './NotificationUnreadDot';

// Composite Components
export { NotificationItem } from './NotificationItem';
export { NotificationGroup } from './NotificationGroup';
export { NotificationsHeader } from './NotificationsHeader';

// State Components
export { NotificationsLoading } from './NotificationsLoading';
export { NotificationsError } from './NotificationsError';
export { NotificationsEmpty } from './NotificationsEmpty';

// Container Components
export { NotificationsList } from './NotificationsList';
export { LoadMoreButton } from './LoadMoreButton';

// Types
export type { NotificationGroupProps } from './NotificationGroup';
export type { NotificationsHeaderProps } from './NotificationsHeader';
export type { NotificationsErrorProps } from './NotificationsError';
export type { NotificationsEmptyProps } from './NotificationsEmpty';
export type { NotificationsListProps } from './NotificationsList';
export type { LoadMoreButtonProps } from './LoadMoreButton';
