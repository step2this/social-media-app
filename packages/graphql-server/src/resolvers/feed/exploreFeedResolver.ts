/**
 * exploreFeedResolver - Get Explore Feed
 *
 * Returns paginated posts for discovery using hexagonal architecture.
 * Supports both anonymous and authenticated users.
 * Public operation - no authentication required.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { Cursor } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the exploreFeed resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.exploreFeed
 */
export const createExploreFeedResolver = (container: AwilixContainer<GraphQLContainer>): QueryResolvers['exploreFeed'] => {
  return async (_parent: any, args: { first?: number | null; after?: string | null }, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve('getExploreFeed');

    // Execute use case with optional viewer ID for personalization
    const result = await useCase.execute({
      pagination: {
        first: args.first ?? 20,
        after: args.after ? Cursor(args.after) : undefined,
      },
      viewerId: context.userId || undefined, // Pass viewer ID if authenticated
    });

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data;
  };
};
