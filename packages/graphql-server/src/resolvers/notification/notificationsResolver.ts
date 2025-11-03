/**
 * notificationsResolver - Get User Notifications
 *
 * Returns paginated notifications for the authenticated user.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { NotificationAdapter } from '../../infrastructure/adapters/NotificationAdapter';
import type { NotificationService } from '@social-media-app/dal';

/**
 * Create the notifications resolver with DI container
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.notifications
 */
export const createNotificationsResolver = (
  container: Container
): QueryResolvers['notifications'] => {
  return withAuth(async (_parent: any, args: { first?: number | null; after?: string | null }, context: any) => {
    const notificationService = container.resolve<NotificationService>('NotificationService');
    const adapter = new NotificationAdapter(notificationService);

    return adapter.getNotifications({
      userId: context.userId!,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  });
};
