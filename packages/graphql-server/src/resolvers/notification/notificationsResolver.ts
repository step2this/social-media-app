/**
 * Notifications Resolver
 *
 * GraphQL resolver for fetching paginated notifications for a user.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth';
import { requireValidCursor } from '../../infrastructure/resolvers/helpers/validateCursor';
import { buildConnection } from '../../infrastructure/resolvers/helpers/ConnectionBuilder';

export function createNotificationsResolver(container: Container): QueryResolvers['notifications'] {
  return async (_parent, args, context, _info) => {
    const userId = requireAuth(context);
    const useCase = container.resolve('GetNotifications');
    const cursor = requireValidCursor(args.cursor);

    const result = await useCase.execute(userId, args.limit || 20, cursor);

    if (!result.success) {
      throw result.error;
    }

    return buildConnection({
      items: result.value.items,
      hasMore: result.value.hasMore,
      getCursorKeys: (notification) => ({
        PK: `USER#${userId}`,
        SK: `NOTIFICATION#${notification.createdAt}#${notification.id}`,
      }),
    });
  };
}
