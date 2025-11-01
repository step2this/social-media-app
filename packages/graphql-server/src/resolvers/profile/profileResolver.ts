/**
 * profileResolver - Get Profile by Handle
 *
 * Returns a user profile by their handle.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';
import type { GetProfileByHandle } from '../../application/use-cases/profile/GetProfileByHandle.js';
import type { QueryResolvers } from '../../../generated/types.js';

/**
 * Create the profile resolver with DI container.
 *
 * @param container - DI container for resolving use cases
 * @returns GraphQL resolver for Query.profile
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 * const profileResolver = createProfileResolver(container);
 * ```
 */
export const createProfileResolver = (container: Container): QueryResolvers['profile'] =>
  async (_parent, args, _context) => {
    const useCase = container.resolve<GetProfileByHandle>('GetProfileByHandle');
    const result = await useCase.execute({ handle: args.handle });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound(`Profile not found: ${args.handle}`);
    }

    return result.data;
  };
