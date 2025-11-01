/**
 * UnreadNotificationsCount Resolver
 *
 * GraphQL resolver for fetching unread notification count for a user.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';
import { requireAuth } from '../../infrastructure/resolvers/helpers/requireAuth';

export function createUnreadNotificationsCountResolver(
  container: Container
): QueryResolvers['unreadNotificationsCount'] {
  return async (_parent, _args, context, _info) => {
    const userId = requireAuth(context);
    const useCase = container.resolve('GetUnreadNotificationsCount');

    const result = await useCase.execute(userId);

    if (!result.success) {
      throw result.error;
    }

    return result.value;
  };
}
