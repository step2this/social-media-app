/**
 * exploreFeedResolver - Get Explore Feed
 *
 * Returns paginated posts for discovery using hexagonal architecture.
 * Supports both anonymous and authenticated users.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { GetExploreFeed } from '../../application/use-cases/feed/GetExploreFeed.js';
import { Cursor } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the exploreFeed resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.exploreFeed
 */
export const createExploreFeedResolver = (container: Container): QueryResolvers['exploreFeed'] => {
  return async (_parent: any, args: { first?: number | null; after?: string | null }, context: any) => {
    // Resolve use case from container
    const useCase = container.resolve<GetExploreFeed>('GetExploreFeed');

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
