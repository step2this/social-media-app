/**
 * profileResolver - Get Profile by Handle
 *
 * Fetches a user's public profile by their handle using hexagonal architecture.
 * Public operation - no authentication required.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { Handle } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the profile resolver with Awilix DI container.
 *
 * @param container - Awilix container for resolving services
 * @returns GraphQL resolver for Query.profile
 */
export const createProfileResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['profile'] => {
  return async (_parent: any, args: { handle: string }) => {
    // Resolve use case from Awilix container using camelCase key
    const useCase = container.resolve('getProfileByHandle');

    // Execute use case
    const result = await useCase.execute({ handle: Handle(args.handle) });

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound('Profile', args.handle);
    }

    return result.data as any;
  };
};
