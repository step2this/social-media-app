/**
 * Custom Hooks Barrel Export
 *
 * Central export point for all custom hooks
 * Enables clean imports: import { useNotifications, useNotificationActions } from '@/hooks'
 */

// Auth hooks
export { useAuth } from './useAuth';

// Notification hooks
export { useNotifications } from './useNotifications';
export { useNotificationActions } from './useNotificationActions';
export { useNotificationsPage } from './useNotificationsPage';
export type { UseNotificationsReturn } from './useNotifications';
export type { UseNotificationActionsReturn } from './useNotificationActions';
export type { UseNotificationsPageReturn } from './useNotificationsPage';

// Social interaction hooks
export { useLike } from './useLike';
export { useFollow } from './useFollow';

// Auction hooks
export { useAuctions } from './useAuctions';

// Feed hooks
export { useFeedItemAutoRead } from './useFeedItemAutoRead';

// Utility hooks
export { useIntersectionObserver } from './useIntersectionObserver';
export { useImagePreview } from './useImagePreview';
export { useCreatePostForm } from './useCreatePostForm';
