/**
 * Auctions Queries - Pothos Implementation
 *
 * This file defines all auction-related queries using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth where needed via authScopes
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { AuctionType, AuctionConnectionType, BidConnectionType, AuctionStatusEnum } from '../types/auctions.js';
import { executeUseCase, executeOptionalUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId, Cursor } from '../../../shared/types/index.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Auction Queries
 */
builder.queryFields((t) => ({
  /**
   * Get Auction by ID Query
   *
   * Fetches a single auction by its ID.
   * Public query - no authentication required.
   *
   * Returns null if auction not found.
   */
  auction: t.field({
    type: AuctionType,
    nullable: true,
    description: 'Get an auction by ID',

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the auction to fetch',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      const result = await executeOptionalUseCase(
        context.container,
        'getAuctionById',
        { auctionId: args.id }
      );

      return result as any;
    },
  }),

  /**
   * Get Auctions Query
   *
   * Fetches paginated auctions with optional filtering.
   * Public query - no authentication required.
   *
   * Supports filtering by:
   * - status: Filter by auction status (PENDING, ACTIVE, COMPLETED, CANCELLED)
   * - userId: Filter by seller user ID
   */
  auctions: t.field({
    type: AuctionConnectionType,
    description: 'Get paginated auctions with optional filters',

    args: {
      limit: t.arg.int({
        required: false,
        description: 'Number of auctions to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Cursor for pagination',
      }),
      status: t.arg({
        type: AuctionStatusEnum,
        required: false,
        description: 'Filter by auction status',
      }),
      userId: t.arg.id({
        required: false,
        description: 'Filter by seller user ID',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      const limit = args.limit ?? 20;
      const cursor = args.cursor ?? undefined;

      // Validate pagination parameters
      if (limit <= 0) {
        throw ErrorFactory.badRequest('limit must be greater than 0');
      }

      // Build filters
      const filters: any = {};
      if (args.status) {
        filters.status = args.status;
      }
      if (args.userId) {
        filters.userId = UserId(args.userId);
      }

      const result = await executeUseCase(
        context.container,
        'getAuctions',
        {
          pagination: {
            first: limit,
            after: cursor ? Cursor(cursor) : undefined,
          },
          filters,
        }
      );

      // Type assertion: use case returns Connection<Auction> which is structurally compatible
      return result as any;
    },
  }),

  /**
   * Get Bids for Auction Query
   *
   * Fetches bids for a specific auction.
   * Public query - no authentication required.
   *
   * Uses offset-based pagination (not cursor-based).
   */
  bids: t.field({
    type: BidConnectionType,
    description: 'Get bids for a specific auction',

    args: {
      auctionId: t.arg.id({
        required: true,
        description: 'ID of the auction to fetch bids for',
      }),
      limit: t.arg.int({
        required: false,
        description: 'Number of bids to fetch (default: 20)',
      }),
      offset: t.arg.int({
        required: false,
        description: 'Number of bids to skip (default: 0)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      const limit = args.limit ?? 20;
      const offset = args.offset ?? 0;

      // Validate pagination parameters
      if (limit <= 0) {
        throw ErrorFactory.badRequest('limit must be greater than 0');
      }
      if (offset < 0) {
        throw ErrorFactory.badRequest('offset must be non-negative');
      }

      const result = await executeUseCase(
        context.container,
        'getBids',
        {
          auctionId: args.auctionId,
          pagination: {
            limit,
            offset,
          },
        }
      );

      // Type assertion: use case returns { bids: Bid[], total: number }
      return result as any;
    },
  }),
}));
