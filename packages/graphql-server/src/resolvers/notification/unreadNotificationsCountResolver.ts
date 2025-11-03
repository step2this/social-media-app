/**
 * unreadNotificationsCountResolver - Get Unread Notifications Count
 *
 * Returns the count of unread notifications for the authenticated user.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { NotificationAdapter } from '../../infrastructure/adapters/NotificationAdapter';
import type { NotificationService } from '@social-media-app/dal';

/**
 * Create the unreadNotificationsCount resolver with DI container
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.unreadNotificationsCount
 */
export const createUnreadNotificationsCountResolver = (
  container: Container
): QueryResolvers['unreadNotificationsCount'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    const notificationService = container.resolve<NotificationService>('NotificationService');
    const adapter = new NotificationAdapter(notificationService);

    return adapter.getUnreadCount(context.userId!);
  });
};
