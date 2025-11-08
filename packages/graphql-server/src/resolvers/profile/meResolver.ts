/**
 * meResolver - Get Current User Profile
 *
 * Returns the profile of the authenticated user using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { UserId } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the me resolver with Awilix DI container.
 *
 * @param container - Awilix container for resolving services
 * @returns GraphQL resolver for Query.me
 */
export const createMeResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['me'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    // Resolve use case from Awilix container using camelCase key
    const useCase = container.resolve('getCurrentUserProfile');

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
