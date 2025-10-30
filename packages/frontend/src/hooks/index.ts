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

// Feed hooks
export { useFeed } from './useFeed';
export { useFeedInfiniteScroll } from './useFeedInfiniteScroll';
export { useHomePage } from './useHomePage';
export { useFeedItemAutoRead } from './useFeedItemAutoRead';

// Social interaction hooks
export { useLike } from './useLike';
export { useFollow } from './useFollow';

// Auction hooks
export { useAuctions } from './useAuctions';

// Utility hooks
export { useIntersectionObserver } from './useIntersectionObserver';
export { useImagePreview } from './useImagePreview';
export { useCreatePostForm } from './useCreatePostForm';
