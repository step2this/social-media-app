/**
 * meResolver - Get Current User Profile
 *
 * Returns the profile of the authenticated user using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { GetCurrentUserProfile } from '../../application/use-cases/profile/GetCurrentUserProfile.js';
import { UserId } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the me resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.me
 */
export const createMeResolver = (container: Container): QueryResolvers['me'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');

    // Execute use case
    const result = await useCase.execute({ userId: UserId(context.userId!) });

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound('Profile', context.userId!);
    }

    return result.data as any;
  });
};
