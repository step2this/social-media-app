/**
 * Auctions Resolver
 *
 * GraphQL resolver for fetching paginated list of auctions with optional status filtering.
 * Uses dependency injection pattern for testability.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { requireValidCursor } from '../../infrastructure/resolvers/helpers/validateCursor';
import { buildConnection } from '../../infrastructure/resolvers/helpers/ConnectionBuilder';

export function createAuctionsResolver(container: AwilixContainer<GraphQLContainer>): QueryResolvers['auctions'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('getAuctions');
    const cursor = requireValidCursor(args.cursor);

    const result = await useCase.execute(args.status, args.limit || 20, cursor);

    if (!result.success) {
      throw result.error;
    }

    return buildConnection({
      items: result.data!.items,
      hasMore: result.data!.hasMore,
      getCursorKeys: (auction) => ({
        PK: 'AUCTIONS',
        SK: `AUCTION#${auction.createdAt}#${auction.id}`,
      }),
    });
  };
}
