/**
 * unreadNotificationsCountResolver - Get Unread Notifications Count
 *
 * Returns the count of unread notifications for the authenticated user using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { GetUnreadNotificationsCount } from '../../application/use-cases/notification/GetUnreadNotificationsCount.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the unreadNotificationsCount resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.unreadNotificationsCount
 */
export const createUnreadNotificationsCountResolver = (
  container: Container
): QueryResolvers['unreadNotificationsCount'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve<GetUnreadNotificationsCount>('GetUnreadNotificationsCount');

    // Execute use case
    const result = await useCase.execute(context.userId!);

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data;
  });
};
