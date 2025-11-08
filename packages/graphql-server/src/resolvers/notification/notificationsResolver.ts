/**
 * notificationsResolver - Get User Notifications
 *
 * Returns paginated notifications for the authenticated user using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the notifications resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.notifications
 */
export const createNotificationsResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['notifications'] => {
  return withAuth(async (_parent: any, args: any, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve('getNotifications');

    // Execute use case
    const result = await useCase.execute(
      context.userId!,
      args.first ?? 20,
      args.after ?? undefined
    );

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data as any;
  });
};
