/**
 * GraphQL Notification Data Service Implementation
 *
 * Implements INotificationDataService using GraphQL operations.
 * Handles backend notification operations (likes, follows, comments, mentions)
 * This is separate from NotificationService which handles UI toast notifications.
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
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

/**
 * GraphQL response types
 */
interface GetUnreadCountResponse {
  unreadCount: UnreadCountResult;
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
            data: result.data.unreadCount,
          };
        }
        return result;
      });
  }

  async getNotifications(
    options?: NotificationQueryOptions
  ): Promise<AsyncState<NotificationConnection>> {
    const variables = {
      limit: options?.limit ?? this.DEFAULT_LIMIT,
      cursor: options?.cursor,
      unreadOnly: options?.unreadOnly,
    };

    return this.client
      .query<GetNotificationsResponse>(GET_NOTIFICATIONS_QUERY, variables)
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: result.data.notifications,
          };
        }
        return result;
      });
  }

  async markAsRead(
    input: MarkNotificationsAsReadInput
  ): Promise<AsyncState<MarkNotificationsAsReadResult>> {
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
}
