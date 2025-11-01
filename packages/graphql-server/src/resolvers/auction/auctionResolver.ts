/**
 * Auction Resolver
 *
 * GraphQL resolver for fetching a single auction by ID.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';

export function createAuctionResolver(container: Container): QueryResolvers['auction'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('GetAuction');

    const result = await useCase.execute(args.id);

    if (!result.success) {
      throw result.error;
    }

    return result.value;
  };
}
