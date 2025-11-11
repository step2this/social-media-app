/**
 * Custom Hooks Barrel Export
 *
 * Central export point for all custom hooks
 * Enables clean imports: import { useNotifications, useNotificationActions } from '@/hooks'
 */

// Auth hooks
export { useAuth } from './useAuth.js';

// Notification hooks
export { useNotifications } from './useNotifications.js';
export { useNotificationActions } from './useNotificationActions.js';
export { useNotificationsPage } from './useNotificationsPage.js';
export type { UseNotificationsReturn } from './useNotifications.js';
export type { UseNotificationActionsReturn } from './useNotificationActions.js';
export type { UseNotificationsPageReturn } from './useNotificationsPage.js';

// Feed hooks
// export { useFeed } from './useFeed.js';
// export { useFeedInfiniteScroll } from './useFeedInfiniteScroll.js';
// export { useHomePage } from './useHomePage.js';
export { useFeedItemAutoRead } from './useFeedItemAutoRead.js';

// Social interaction hooks
// export { useLike } from './useLike.js';
export { useFollow } from './useFollow.js';

// Auction hooks
export { useAuctions } from './useAuctions.js';

// Utility hooks
export { useIntersectionObserver } from './useIntersectionObserver.js';
export { useImagePreview } from './useImagePreview.js';
export { useCreatePostForm } from './useCreatePostForm.js';
