/**
 * Auctions Mutations - Pothos Implementation
 *
 * This file defines all auction-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { AuctionType, CreateAuctionPayloadType, PlaceBidPayloadType } from '../types/auctions.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';
import type { AuctionParent, PlaceBidPayloadParent } from '../../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * Auction Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Create Auction Mutation
   *
   * Creates a new auction listing with image upload.
   * Returns presigned URL for uploading the auction image.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  createAuction: t.field({
    type: CreateAuctionPayloadType,
    description: 'Create a new auction',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      title: t.arg.string({
        required: true,
        description: 'Auction title',
      }),
      description: t.arg.string({
        required: false,
        description: 'Auction description',
      }),
      fileType: t.arg.string({
        required: true,
        description: 'MIME type of the image (e.g., image/jpeg)',
      }),
      startPrice: t.arg.float({
        required: true,
        description: 'Starting bid price',
      }),
      reservePrice: t.arg.float({
        required: false,
        description: 'Minimum acceptable price (reserve)',
      }),
      startTime: t.arg.string({
        required: true,
        description: 'Auction start time (ISO 8601)',
      }),
      endTime: t.arg.string({
        required: true,
        description: 'Auction end time (ISO 8601)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'createAuction',
        {
          userId: UserId(context.userId!),
          title: args.title,
          description: args.description ?? undefined,
          startingPrice: args.startPrice,
          reservePrice: args.reservePrice ?? undefined,
          startTime: args.startTime,
          endTime: args.endTime,
          fileType: args.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | undefined,
        }
      );

      return result;
    },
  }),

  /**
   * Activate Auction Mutation
   *
   * Activates a pending auction, transitioning it to 'active' status.
   * User must be the auction owner.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated and auction owner
   */
  activateAuction: t.field({
    type: AuctionType,
    description: 'Activate a pending auction',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the auction to activate',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'activateAuction',
        {
          auctionId: args.id,
          userId: UserId(context.userId!),
        }
      );

      // Type assertion: Use case returns AuctionParent (without field resolver fields).
      // GraphQL will invoke Auction field resolvers to add seller and winner.
      return result as AuctionParent;
    },
  }),

  /**
   * Place Bid Mutation
   *
   * Places a bid on an active auction.
   * Bid amount must be higher than current price.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  placeBid: t.field({
    type: PlaceBidPayloadType,
    description: 'Place a bid on an auction',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      auctionId: t.arg.id({
        required: true,
        description: 'ID of the auction to bid on',
      }),
      amount: t.arg.float({
        required: true,
        description: 'Bid amount',
      }),
    },

    // @ts-expect-error - Pothos type inference issue with complex return types
    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'placeBid',
        {
          userId: UserId(context.userId!),
          auctionId: args.auctionId,
          amount: args.amount,
        }
      );

      // Type assertion: Use case returns PlaceBidPayloadParent with AuctionParent.
      // GraphQL will invoke Auction field resolvers to add seller and winner.
      return result as PlaceBidPayloadParent;
    },
  }),
}));
