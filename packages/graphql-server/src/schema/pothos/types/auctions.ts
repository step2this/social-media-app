/**
 * Auctions Types - Pothos Implementation
 *
 * This file defines all auction-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Field resolvers co-located with type definition
 * - ✅ DataLoader integration for N+1 prevention
 * - ✅ Refactoring: Rename a field = schema updates automatically
 */

import { builder } from '../builder.js';
import { PublicProfileType, PageInfoType } from './comments.js';
import type { AuctionParent, BidParent, PlaceBidPayloadParent } from '../../../infrastructure/resolvers/helpers/resolverTypes.js';

/**
 * AuctionStatus Enum
 *
 * Possible statuses for an auction lifecycle.
 */
export const AuctionStatusEnum = builder.enumType('AuctionStatus', {
  values: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const,
  description: 'Status of an auction',
});

/**
 * Auction GraphQL Type
 *
 * Represents an auction listing.
 * Includes field resolvers for:
 * - seller: Resolved via DataLoader (batched profile lookups)
 * - winner: Resolved via DataLoader (batched profile lookups)
 */
export const AuctionType = builder.objectRef<AuctionParent>('Auction');

AuctionType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the auction',
    }),
    userId: t.exposeID('userId', {
      description: 'ID of the user who created the auction',
    }),
    title: t.exposeString('title', {
      description: 'Auction title',
    }),
    description: t.exposeString('description', {
      description: 'Auction description',
    }),
    imageUrl: t.exposeString('imageUrl', {
      nullable: true,
      description: 'URL to the auction image',
    }),
    startingPrice: t.exposeFloat('startingPrice', {
      description: 'Starting bid price',
    }),
    reservePrice: t.exposeFloat('reservePrice', {
      nullable: true,
      description: 'Minimum acceptable price (reserve)',
    }),
    currentPrice: t.exposeFloat('currentPrice', {
      description: 'Current highest bid price',
    }),
    startTime: t.exposeString('startTime', {
      description: 'Auction start time (ISO 8601)',
    }),
    endTime: t.exposeString('endTime', {
      description: 'Auction end time (ISO 8601)',
    }),
    status: t.field({
      type: AuctionStatusEnum,
      description: 'Current auction status',
      resolve: (parent) => parent.status as any,
    }),
    winnerId: t.exposeID('winnerId', {
      nullable: true,
      description: 'ID of the winning bidder (null if no winner yet)',
    }),
    bidCount: t.int({
      description: 'Total number of bids placed',
      resolve: (parent: any) => parent.bidCount ?? 0,
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Auction creation timestamp (ISO 8601)',
    }),
    updatedAt: t.exposeString('updatedAt', {
      description: 'Last update timestamp (ISO 8601)',
    }),

    // Field resolver: seller profile loaded via DataLoader
    seller: t.field({
      type: PublicProfileType,
      description: 'Seller profile information',
      resolve: async (parent, _args, context) => {
        // Use DataLoader to batch profile requests (N+1 prevention)
        const profile = await context.loaders.profileLoader.load(parent.userId);
        if (!profile) {
          throw new Error(`Seller profile not found for user ${parent.userId}`);
        }
        return profile as any;
      },
    }),

    // Field resolver: winner profile loaded via DataLoader
    winner: t.field({
      type: PublicProfileType,
      nullable: true,
      description: 'Winner profile information (null if auction not completed)',
      resolve: async (parent, _args, context) => {
        // No winner if winnerId is undefined
        if (!parent.winnerId) {
          return null;
        }

        // Use DataLoader to batch profile requests (N+1 prevention)
        const profile = await context.loaders.profileLoader.load(parent.winnerId);

        return profile ? (profile as any) : null;
      },
    }),
  }),
});

/**
 * Bid GraphQL Type
 *
 * Represents a bid placed on an auction.
 * Includes field resolver for bidder profile.
 */
export const BidType = builder.objectRef<BidParent>('Bid');

BidType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the bid',
    }),
    auctionId: t.exposeID('auctionId', {
      description: 'ID of the auction this bid is for',
    }),
    userId: t.exposeID('userId', {
      description: 'ID of the user who placed the bid',
    }),
    amount: t.exposeFloat('amount', {
      description: 'Bid amount',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Bid creation timestamp (ISO 8601)',
    }),

    // Field resolver: bidder profile loaded via DataLoader
    bidder: t.field({
      type: PublicProfileType,
      description: 'Bidder profile information',
      resolve: async (parent, _args, context) => {
        // Use DataLoader to batch profile requests (N+1 prevention)
        const profile = await context.loaders.profileLoader.load(parent.userId);
        if (!profile) {
          throw new Error(`Bidder profile not found for user ${parent.userId}`);
        }
        return profile as any;
      },
    }),
  }),
});

/**
 * AuctionEdge Type
 *
 * Edge type for Relay-style cursor pagination.
 */
export const AuctionEdgeType = builder.objectRef<any>('AuctionEdge');

AuctionEdgeType.implement({
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: AuctionType,
      description: 'The auction node',
      resolve: (parent: any) => parent.node,
    }),
  }),
});

/**
 * AuctionConnection Type
 *
 * Relay-style connection for paginated auctions.
 */
export const AuctionConnectionType = builder.objectRef<any>('AuctionConnection');

AuctionConnectionType.implement({
  fields: (t) => ({
    edges: t.field({
      type: [AuctionEdgeType],
      description: 'List of auction edges',
      resolve: (parent: any) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent: any) => parent.pageInfo,
    }),
  }),
});

/**
 * BidConnection Type
 *
 * Note: This is NOT a Relay-style connection.
 * It's a simple list with a total count.
 */
export const BidConnectionType = builder.objectRef<any>('BidConnection');

BidConnectionType.implement({
  fields: (t) => ({
    bids: t.field({
      type: [BidType],
      description: 'List of bids',
      resolve: (parent: any) => parent.bids,
    }),
    total: t.exposeInt('total', {
      description: 'Total number of bids',
    }),
  }),
});

/**
 * CreateAuctionPayload Type
 *
 * Response payload for createAuction mutation.
 * Includes the created auction and presigned URL for uploading the image.
 */
export const CreateAuctionPayloadType = builder.objectRef<any>('CreateAuctionPayload');

CreateAuctionPayloadType.implement({
  fields: (t) => ({
    auction: t.field({
      type: AuctionType,
      description: 'The newly created auction',
      resolve: (parent: any) => parent.auction,
    }),
    uploadUrl: t.exposeString('uploadUrl', {
      description: 'Presigned S3 URL for uploading the auction image',
    }),
  }),
});

/**
 * PlaceBidPayload Type
 *
 * Response payload for placeBid mutation.
 * Includes the created bid and updated auction.
 */
export const PlaceBidPayloadType = builder.objectRef<any>('PlaceBidPayload');

PlaceBidPayloadType.implement({
  fields: (t) => ({
    bid: t.field({
      type: BidType,
      description: 'The newly placed bid',
      resolve: (parent: PlaceBidPayloadParent) => parent.bid,
    }),
    auction: t.field({
      type: AuctionType,
      description: 'The updated auction with new current price',
      resolve: (parent: PlaceBidPayloadParent) => parent.auction,
    }),
  }),
});
