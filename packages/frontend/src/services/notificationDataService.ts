/**
 * NotificationDataService Barrel Export
 *
 * Re-exports the notification data service singleton for data fetching operations.
 * This is separate from notificationService.ts which handles UI toast notifications.
 *
 * NotificationDataService provides:
 * - getNotifications(): Fetch notification list
 * - getUnreadCount(): Get count of unread notifications
 * - markAsRead(): Mark specific notification as read
 * - markAllAsRead(): Mark all notifications as read
 * - deleteNotification(): Delete a notification
 *
 * @example
 * ```typescript
 * import { notificationDataService } from './notificationDataService';
 *
 * const response = await notificationDataService.getNotifications(20);
 * await notificationDataService.markAsRead(notificationId);
 * ```
 */

import { NotificationDataServiceGraphQL } from './implementations/NotificationDataService.graphql.js';
import { getGraphQLClient } from '../graphql/clientManager.js';

/**
 * Singleton instance of NotificationDataService
 * Follows same pattern as postService, profileService, etc.
 */
export const notificationDataService = new NotificationDataServiceGraphQL(
  getGraphQLClient()
);
