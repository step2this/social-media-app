/**
 * Notification Data Service Interface
 *
 * Handles backend notification operations (user notifications like likes, follows, comments)
 * This is separate from INotificationService which handles UI toast notifications.
 *
 * Following the AsyncState pattern for consistent error handling across the application.
 */

import type { AsyncState } from '../../graphql/types';

/**
 * Notification type discriminated union
 * Ensures type-safe notification handling
 */
export type NotificationType = 'like' | 'comment' | 'follow' | 'mention';

/**
 * Base notification interface
 */
export interface Notification {
  readonly id: string;
  readonly type: NotificationType;
  readonly actorId: string;
  readonly actorUsername: string;
  readonly targetId: string; // Post ID, Comment ID, etc.
  readonly message: string;
  readonly read: boolean;
  readonly createdAt: string;
}

/**
 * Notification connection for pagination
 * Following GraphQL Relay connection pattern
 */
export interface NotificationConnection {
  readonly edges: readonly NotificationEdge[];
  readonly pageInfo: {
    readonly hasNextPage: boolean;
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
   * Get user notifications with pagination
   * Requires authentication
   *
   * @param options - Query options (limit, cursor, unreadOnly filter)
   * @returns AsyncState with notification connection
   */
  getNotifications(
    options?: NotificationQueryOptions
  ): Promise<AsyncState<NotificationConnection>>;

  /**
   * Mark notifications as read
   * Updates the read status for specified notifications
   * Requires authentication
   *
   * @param input - Notification IDs to mark as read
   * @returns AsyncState with result indicating success and count
   */
  markAsRead(
    input: MarkNotificationsAsReadInput
  ): Promise<AsyncState<MarkNotificationsAsReadResult>>;
}
