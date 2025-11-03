/**
 * NotificationAdapter
 *
 * Adapter that bridges NotificationService (DAL) and GraphQL notification resolvers.
 * Transforms domain Notification types to GraphQL Notification types using TypeMapper.
 *
 * Following hexagonal architecture adapter pattern.
 */

import { GraphQLError } from 'graphql';
import type { NotificationService } from '@social-media-app/dal';
import type { NotificationConnection } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';
import type { Notification } from '@social-media-app/shared';

interface GetNotificationsArgs {
  userId: string;
  first?: number;
  after?: string;
}

/**
 * NotificationAdapter - Adapts NotificationService to GraphQL notification queries
 */
export class NotificationAdapter {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get paginated notifications for a user
   *
   * Uses NotificationService.getNotifications() to fetch user's notifications.
   *
   * @param args - Query arguments including userId
   * @returns GraphQL NotificationConnection with edges and pageInfo
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getNotifications(args: GetNotificationsArgs): Promise<NotificationConnection> {
    if (!args.userId) {
      throw new GraphQLError('userId is required');
    }

    try {
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.notificationService.getNotifications({
        userId: args.userId,
        limit,
        cursor,
      });

      return TypeMapper.toGraphQLConnection<Notification, any, NotificationConnection>(
        [...response.notifications], // Convert readonly array to mutable array
        TypeMapper.toGraphQLNotification,
        {
          hasNextPage: response.hasMore,
          after: cursor,
        }
      );
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }

  /**
   * Get unread notification count for a user
   *
   * @param userId - The user ID to get unread count for
   * @returns Unread notification count
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) {
      throw new GraphQLError('userId is required');
    }

    try {
      return await this.notificationService.getUnreadCount(userId);
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }
}
