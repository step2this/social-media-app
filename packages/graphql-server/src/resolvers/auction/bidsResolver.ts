/**
 * Bids Resolver
 *
 * GraphQL resolver for fetching paginated bid history for an auction.
 * Uses dependency injection pattern for testability.
 */

import type { QueryResolvers } from '../../schema/generated/types';
import type { Container } from '../../infrastructure/di/Container';
import { requireValidCursor } from '../../infrastructure/resolvers/helpers/validateCursor';
import { buildConnection } from '../../infrastructure/resolvers/helpers/ConnectionBuilder';

export function createBidsResolver(container: Container): QueryResolvers['bids'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('GetBidHistory');
    const cursor = requireValidCursor(args.cursor);

    const result = await useCase.execute(args.auctionId, args.limit || 20, cursor);

    if (!result.success) {
      throw result.error;
    }

    return buildConnection({
      items: result.value.items,
      hasMore: result.value.hasMore,
      getCursorKeys: (bid) => ({
        PK: `AUCTION#${args.auctionId}`,
        SK: `BID#${bid.createdAt}#${bid.id}`,
      }),
    });
  };
}
