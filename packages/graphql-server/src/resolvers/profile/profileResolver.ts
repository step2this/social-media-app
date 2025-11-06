/**
 * profileResolver - Get Profile by Handle
 *
 * Fetches a user's public profile by their handle using hexagonal architecture.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { GetProfileByHandle } from '../../application/use-cases/profile/GetProfileByHandle.js';
import { Handle } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the profile resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.profile
 */
export const createProfileResolver = (container: Container): QueryResolvers['profile'] => {
  return async (_parent: any, args: { handle: string }) => {
    // Resolve use case from container
    const useCase = container.resolve<GetProfileByHandle>('GetProfileByHandle');

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
