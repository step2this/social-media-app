/**
 * Notification Data Service Interface
 *
 * Handles backend notification operations (user notifications like likes, follows, comments)
 * This is separate from INotificationService which handles UI toast notifications.
 *
 * Following the AsyncState pattern for consistent error handling across the application.
 */

import type { AsyncState } from '../../graphql/types';
import type { Notification } from '@social-media-app/shared';

/**
 * Notification connection for pagination
 * Following GraphQL Relay connection pattern
 */
export interface NotificationConnection {
  readonly edges: readonly NotificationEdge[];
  readonly pageInfo: {
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly startCursor: string | null;
    readonly endCursor: string | null;
  };
}

export interface NotificationEdge {
  readonly node: Notification;
  readonly cursor: string;
}

/**
 * Notification query options with pagination
 */
export interface NotificationQueryOptions {
  readonly limit?: number;
  readonly cursor?: string;
  readonly unreadOnly?: boolean;
}

/**
 * Unread count response
 */
export interface UnreadCountResult {
  readonly count: number;
}

/**
 * Mark notifications as read input
 */
export interface MarkNotificationsAsReadInput {
  readonly notificationIds: readonly string[];
}

/**
 * Mark notifications as read result
 */
export interface MarkNotificationsAsReadResult {
  readonly success: boolean;
  readonly markedCount: number;
}

/**
 * Notification Data Service Interface
 *
 * All implementations must provide these methods.
 * Returns AsyncState for consistent state management (no throwing).
 */
export interface INotificationDataService {
  /**
   * Get unread notification count
   * Used for badge display in navigation
   *
   * @returns AsyncState with unread count
   */
  getUnreadCount(): Promise<AsyncState<UnreadCountResult>>;

  /**
   * Get notifications for current user
   * Supports pagination and filtering by read status
   *
   * Returns array of Notification objects (GraphQL Connection unwrapped in service layer)
   *
   * @param options - Query options (limit, cursor, unreadOnly filter)
   * @returns AsyncState with array of notifications
   */
  getNotifications(
    options?: NotificationQueryOptions
  ): Promise<AsyncState<Notification[]>>;

  /**
   * Mark specific notification as read
   *
   * @param notificationId - ID of notification to mark as read
   * @returns AsyncState with mark as read result
   */
  markAsRead(
    notificationId: string
  ): Promise<AsyncState<MarkNotificationsAsReadResult>>;

  /**
   * Mark all notifications as read for current user
   *
   * @returns AsyncState with mark all as read result
   */
  markAllAsRead(): Promise<AsyncState<MarkNotificationsAsReadResult>>;

  /**
   * Delete a specific notification
   *
   * @param notificationId - ID of notification to delete
   * @returns AsyncState with delete result
   */
  deleteNotification(notificationId: string): Promise<AsyncState<{ success: boolean }>>;
}
