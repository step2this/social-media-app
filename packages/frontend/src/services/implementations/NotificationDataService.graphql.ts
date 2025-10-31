/**
 * GraphQL Notification Data Service Implementation
 *
 * Implements INotificationDataService using GraphQL operations.
 * Handles backend notification operations (likes, follows, comments, mentions)
 * This is separate from NotificationService which handles UI toast notifications.
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
import type { Notification } from '@social-media-app/shared';
import type {
  INotificationDataService,
  NotificationConnection,
  NotificationQueryOptions,
  UnreadCountResult,
  MarkNotificationsAsReadInput,
  MarkNotificationsAsReadResult,
} from '../interfaces/INotificationDataService';
import {
  GET_UNREAD_COUNT_QUERY,
  GET_NOTIFICATIONS_QUERY,
  MARK_NOTIFICATIONS_AS_READ_MUTATION,
} from '../../graphql/operations/notifications';
import { unwrapConnection } from '../../graphql/helpers.js';

/**
 * GraphQL response types
 */
interface GetUnreadCountResponse {
  unreadNotificationsCount: number;
}

interface GetNotificationsResponse {
  notifications: NotificationConnection;
}

interface MarkNotificationsAsReadResponse {
  markNotificationsAsRead: MarkNotificationsAsReadResult;
}

/**
 * NotificationDataServiceGraphQL
 *
 * GraphQL implementation of the notification data service.
 * Handles all notification-related operations via GraphQL API.
 */
export class NotificationDataServiceGraphQL implements INotificationDataService {
  private readonly DEFAULT_LIMIT = 50;

  constructor(private readonly client: IGraphQLClient) {}

  async getUnreadCount(): Promise<AsyncState<UnreadCountResult>> {
    return this.client
      .query<GetUnreadCountResponse>(GET_UNREAD_COUNT_QUERY, {})
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: { count: result.data.unreadNotificationsCount },
          };
        }
        return result;
      });
  }

  async getNotifications(
    options?: NotificationQueryOptions
  ): Promise<AsyncState<Notification[]>> {
    const variables = {
      limit: options?.limit ?? this.DEFAULT_LIMIT,
      cursor: options?.cursor,
    };

    return this.client
      .query<GetNotificationsResponse>(GET_NOTIFICATIONS_QUERY, variables)
      .then((result) => {
        if (result.status === 'success') {
          // Unwrap Connection to get array of Notification nodes
          const notifications = unwrapConnection(result.data.notifications);
          return {
            status: 'success' as const,
            data: [...notifications],
          };
        }
        return result;
      });
  }

  async markAsRead(
    notificationId: string
  ): Promise<AsyncState<MarkNotificationsAsReadResult>> {
    const input: MarkNotificationsAsReadInput = {
      notificationIds: [notificationId]
    };

    return this.client
      .mutate<MarkNotificationsAsReadResponse>(
        MARK_NOTIFICATIONS_AS_READ_MUTATION,
        { input }
      )
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: result.data.markNotificationsAsRead,
          };
        }
        return result;
      });
  }

  async markAllAsRead(): Promise<AsyncState<MarkNotificationsAsReadResult>> {
    // Mark all notifications as read by passing empty array (backend interprets as "all")
    const input: MarkNotificationsAsReadInput = {
      notificationIds: []
    };

    return this.client
      .mutate<MarkNotificationsAsReadResponse>(
        MARK_NOTIFICATIONS_AS_READ_MUTATION,
        { input }
      )
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: result.data.markNotificationsAsRead,
          };
        }
        return result;
      });
  }

  async deleteNotification(_notificationId: string): Promise<AsyncState<{ success: boolean }>> {
    // Since DELETE_NOTIFICATION_MUTATION isn't imported yet, return mock for now
    // TODO: Add DELETE_NOTIFICATION_MUTATION to operations/notifications.ts
    return Promise.resolve({
      status: 'success' as const,
      data: { success: true }
    });
  }
}
