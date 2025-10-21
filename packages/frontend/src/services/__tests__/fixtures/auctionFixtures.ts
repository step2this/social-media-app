/**
 * Test fixtures for Auction and Bid objects
 * 
 * Provides factory functions for creating mock Auction and Bid objects with sensible defaults.
 * Automatically generates related Profile objects (seller, winner, bidder).
 * 
 * @example
 * ```typescript
 * // Basic auction
 * const auction = createMockAuction();
 * 
 * // Auction with specific fields
 * const activeAuction = createMockAuction({
 *   id: 'auction-123',
 *   title: 'Vintage Watch',
 *   status: 'ACTIVE',
 *   currentPrice: 150
 * });
 * 
 * // Multiple auctions
 * const auctions = createMockAuctions(5);
 * 
 * // Basic bid
 * const bid = createMockBid();
 * 
 * // Multiple bids for an auction
 * const bids = createMockBids(10, 'auction-1');
 * ```
 */

import type { Auction, Bid, AuctionStatus } from '../../../graphql/operations/auctions.js';
import { createMockSeller, createMockBidder } from './profileFixtures.js';

/**
 * Create a mock Auction with sensible defaults
 * 
 * Automatically generates seller profile if not provided.
 * All fields can be overridden.
 * 
 * @param overrides - Partial Auction to override defaults
 * @returns Complete Auction object
 */
export function createMockAuction(
  overrides: Partial<Auction> = {}
): Auction {
  const sellerId = overrides.userId || 'seller-1';
  const seller = overrides.seller || createMockSeller({ id: sellerId });

  return {
    id: 'auction-1',
    userId: sellerId,
    seller,
    title: 'Test Auction',
    description: null,
    imageUrl: 'https://example.com/image.jpg',
    startPrice: 100,
    reservePrice: null,
    currentPrice: 100,
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-08T00:00:00Z',
    status: 'PENDING',
    winnerId: null,
    winner: null,
    bidCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock Bid with sensible defaults
 * 
 * Automatically generates bidder profile if not provided.
 * All fields can be overridden.
 * 
 * @param overrides - Partial Bid to override defaults
 * @returns Complete Bid object
 */
export function createMockBid(
  overrides: Partial<Bid> = {}
): Bid {
  const bidderId = overrides.userId || 'bidder-1';
  const bidder = overrides.bidder || createMockBidder({ id: bidderId });

  return {
    id: 'bid-1',
    auctionId: 'auction-1',
    userId: bidderId,
    bidder,
    amount: 150,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create multiple auctions with unique IDs
 * 
 * Useful for pagination and list tests.
 * 
 * @param count - Number of auctions to create
 * @param baseOverrides - Base overrides applied to all auctions
 * @returns Array of Auction objects
 * 
 * @example
 * ```typescript
 * const auctions = createMockAuctions(5);
 * // Creates: auction-1, auction-2, ..., auction-5
 * 
 * const activeAuctions = createMockAuctions(3, { status: 'ACTIVE' });
 * ```
 */
export function createMockAuctions(
  count: number,
  baseOverrides: Partial<Auction> = {}
): Auction[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAuction({
      ...baseOverrides,
      id: `auction-${i + 1}`,
      title: `Auction ${i + 1}`,
    })
  );
}

/**
 * Create multiple bids with unique IDs and incrementing amounts
 * 
 * Useful for bid history tests.
 * 
 * @param count - Number of bids to create
 * @param auctionId - Auction ID these bids belong to
 * @param baseOverrides - Base overrides applied to all bids
 * @returns Array of Bid objects
 * 
 * @example
 * ```typescript
 * const bids = createMockBids(10, 'auction-1');
 * // Creates 10 bids with amounts: 125, 150, 175, ..., 350
 * ```
 */
export function createMockBids(
  count: number,
  auctionId: string = 'auction-1',
  baseOverrides: Partial<Bid> = {}
): Bid[] {
  return Array.from({ length: count }, (_, i) =>
    createMockBid({
      ...baseOverrides,
      id: `bid-${i + 1}`,
      auctionId,
      userId: `user-${i + 1}`,
      bidder: createMockBidder({
        id: `user-${i + 1}`,
        handle: `bidder${i + 1}`,
        username: `bidder${i + 1}`,
      }),
      amount: 100 + (i + 1) * 25,
    })
  );
}

/**
 * Create an active auction with bids
 * 
 * Helper for common test scenario.
 * 
 * @param bidCount - Number of bids
 * @param overrides - Auction overrides
 * @returns Auction with status='ACTIVE' and specified bidCount
 */
export function createActiveAuctionWithBids(
  bidCount: number = 5,
  overrides: Partial<Auction> = {}
): Auction {
  return createMockAuction({
    status: 'ACTIVE',
    bidCount,
    currentPrice: 100 + bidCount * 25,
    ...overrides,
  });
}

/**
 * Create a completed auction with winner
 * 
 * Helper for common test scenario.
 * 
 * @param overrides - Auction overrides
 * @returns Auction with status='COMPLETED' and winner set
 */
export function createCompletedAuction(
  overrides: Partial<Auction> = {}
): Auction {
  const winnerId = overrides.winnerId || 'winner-1';
  const winner = overrides.winner || createMockBidder({
    id: winnerId,
    handle: 'winner',
    username: 'winner',
  });

  return createMockAuction({
    status: 'COMPLETED',
    winnerId,
    winner,
    ...overrides,
  });
}
