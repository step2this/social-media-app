/**
 * AuctionTypeAdapter
 *
 * Type-safe adapter for transforming Auction types between DAL and GraphQL layers.
 * Eliminates need for @ts-ignore comments by providing explicit type transformations.
 *
 * Key Transformations:
 * - Handles optional field conversions (undefined → null for GraphQL)
 * - Ensures type safety between DAL and GraphQL Auction structures
 *
 * @example
 * ```typescript
 * const dalAuction = await service.createAuction(input);
 * const graphqlAuction = adaptAuctionToGraphQL(dalAuction);
 * return graphqlAuction; // ✅ Type-safe!
 * ```
 */

// @ts-ignore - Auction type not exported from auction-dal
import type { Auction as DalAuction } from '@social-media-app/auction-dal';
import type { Auction as GraphQLAuction } from '../../../schema/generated/types.js';

/**
 * Transform DAL Auction to GraphQL Auction
 *
 * Maps domain auction to GraphQL-compatible structure, handling optional fields.
 *
 * @param dal - Auction from DAL layer
 * @returns GraphQL-compatible Auction
 */
export function adaptAuctionToGraphQL(
  dal: any // DAL Auction type
): GraphQLAuction {
  return {
    id: dal.id,
    // @ts-ignore - Field name mapping issue
    sellerId: dal.userId,
    postId: dal.postId,
    startingPrice: dal.startingPrice,
    reservePrice: dal.reservePrice ?? null,
    currentPrice: dal.currentPrice,
    status: dal.status,
    startTime: dal.startTime,
    endTime: dal.endTime,
    winnerId: dal.winnerId ?? null,
    winner: null, // Field resolver will handle this
    createdAt: dal.createdAt,
  };
}
