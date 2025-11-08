/**
 * Auction Resolver
 *
 * GraphQL resolver for fetching a single auction by ID.
 * Uses dependency injection pattern for testability.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';

export function createAuctionResolver(container: AwilixContainer<GraphQLContainer>): QueryResolvers['auction'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('getAuction');

    const result = await useCase.execute(args.id);

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  };
}
