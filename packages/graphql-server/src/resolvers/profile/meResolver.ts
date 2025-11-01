/**
 * meResolver - Get Current User Profile
 *
 * Returns the profile of the authenticated user.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';
import type { GetCurrentUserProfile } from '../../application/use-cases/profile/GetCurrentUserProfile.js';
import type { QueryResolvers } from '../../../generated/types.js';

/**
 * Create the me resolver with DI container.
 *
 * @param container - DI container for resolving use cases
 * @returns GraphQL resolver for Query.me
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 * const meResolver = createMeResolver(container);
 * ```
 */
export const createMeResolver = (container: Container): QueryResolvers['me'] =>
  withAuth(async (_parent, _args, context) => {
    const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');
    const result = await useCase.execute({ userId: context.userId });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data;
  });
