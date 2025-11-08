/**
 * Bids Resolver
 *
 * GraphQL resolver for fetching paginated bid history for an auction.
 * Uses dependency injection pattern for testability.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { requireValidCursor } from '../../infrastructure/resolvers/helpers/validateCursor';
import { buildConnection } from '../../infrastructure/resolvers/helpers/ConnectionBuilder';

export function createBidsResolver(container: AwilixContainer<GraphQLContainer>): QueryResolvers['bids'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('getBidHistory');
    const cursor = requireValidCursor(args.cursor);

    const result = await useCase.execute(args.auctionId, args.limit || 20, cursor);

    if (!result.success) {
      throw result.error;
    }

    return buildConnection({
      items: result.data!.items,
      hasMore: result.data!.hasMore,
      getCursorKeys: (bid) => ({
        PK: `AUCTION#${args.auctionId}`,
        SK: `BID#${bid.createdAt}#${bid.id}`,
      }),
    });
  };
}
