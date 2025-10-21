/**
 * Auction service interface for dependency injection
 *
 * This interface defines the contract for auction service implementations.
 * Components and hooks depend on THIS interface, not concrete implementations.
 *
 * Benefits of this approach:
 * ✅ Easy testing - inject MockAuctionService in tests
 * ✅ Easy swapping - change from REST to GraphQL without changing consumers
 * ✅ No implementation details leak to consumers
 * ✅ Future-proof - can switch GraphQL clients without breaking code
 *
 * @example
 * ```typescript
 * // Hook depends on interface
 * function useAuctions(services: IServiceContainer) {
 *   const { auctionService } = services;
 *   const result = await auctionService.listAuctions();
 * }
 *
 * // Production: inject GraphQL service
 * const service = new AuctionService(graphqlClient);
 *
 * // Testing: inject mock service
 * const mockService = new MockAuctionService();
 * ```
 */

import type { AsyncState } from '../../graphql/types.js';
import type { Auction, Bid } from '../../graphql/operations/auctions.js';

/**
 * Options for listing auctions
 */
export interface ListAuctionsOptions {
  limit?: number;
  cursor?: string;
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  userId?: string;
}

/**
 * Paginated list of auctions
 */
export interface AuctionsList {
  auctions: Auction[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Options for fetching bid history
 */
export interface GetBidHistoryOptions {
  limit?: number;
  offset?: number;
}

/**
 * Bid history response
 */
export interface BidHistory {
  bids: Bid[];
  total: number;
}

/**
 * Input for creating an auction
 */
export interface CreateAuctionInput {
  title: string;
  description?: string;
  fileType: string;
  startPrice: number;
  reservePrice?: number;
  startTime: string;
  endTime: string;
}

/**
 * Result of creating an auction
 */
export interface CreateAuctionResult {
  auction: Auction;
  uploadUrl: string;
}

/**
 * Result of placing a bid
 */
export interface PlaceBidResult {
  bid: Bid;
  auction: Auction;
}

/**
 * Auction service interface
 */
export interface IAuctionService {
  /**
   * List auctions with optional filtering and pagination
   *
   * @param options - Filtering and pagination options
   * @returns Promise resolving to AsyncState with paginated auctions
   *
   * @example
   * ```typescript
   * const result = await service.listAuctions({
   *   limit: 20,
   *   status: 'ACTIVE'
   * });
   *
   * if (isSuccess(result)) {
   *   console.log(`Found ${result.data.auctions.length} auctions`);
   *   console.log(`Has more: ${result.data.hasMore}`);
   * }
   * ```
   */
  listAuctions(
    options?: ListAuctionsOptions
  ): Promise<AsyncState<AuctionsList>>;

  /**
   * Get a single auction by ID
   *
   * @param auctionId - Auction ID
   * @returns Promise resolving to AsyncState with auction data
   *
   * @example
   * ```typescript
   * const result = await service.getAuction('auction-123');
   *
   * if (isSuccess(result)) {
   *   console.log(`Auction: ${result.data.title}`);
   * } else if (isError(result)) {
   *   console.log(`Error: ${result.error.message}`);
   * }
   * ```
   */
  getAuction(auctionId: string): Promise<AsyncState<Auction>>;

  /**
   * Create a new auction
   *
   * @param input - Auction creation data
   * @param imageFile - Image file to upload
   * @returns Promise resolving to AsyncState with created auction and upload URL
   *
   * @example
   * ```typescript
   * const result = await service.createAuction(
   *   {
   *     title: 'Vintage Watch',
   *     fileType: 'image/jpeg',
   *     startPrice: 100,
   *     startTime: '2024-01-01T00:00:00Z',
   *     endTime: '2024-01-08T00:00:00Z'
   *   },
   *   imageFile
   * );
   *
   * if (isSuccess(result)) {
   *   console.log(`Created auction: ${result.data.auction.id}`);
   *   // Upload to S3 using result.data.uploadUrl
   * }
   * ```
   */
  createAuction(
    input: CreateAuctionInput,
    imageFile: File
  ): Promise<AsyncState<CreateAuctionResult>>;

  /**
   * Place a bid on an auction
   *
   * @param auctionId - Auction ID
   * @param amount - Bid amount
   * @returns Promise resolving to AsyncState with bid and updated auction
   *
   * @example
   * ```typescript
   * const result = await service.placeBid('auction-123', 150);
   *
   * if (isSuccess(result)) {
   *   console.log(`Bid placed: ${result.data.bid.amount}`);
   *   console.log(`New price: ${result.data.auction.currentPrice}`);
   * }
   * ```
   */
  placeBid(
    auctionId: string,
    amount: number
  ): Promise<AsyncState<PlaceBidResult>>;

  /**
   * Get bid history for an auction
   *
   * @param auctionId - Auction ID
   * @param options - Pagination options
   * @returns Promise resolving to AsyncState with bid history
   *
   * @example
   * ```typescript
   * const result = await service.getBidHistory('auction-123', {
   *   limit: 50,
   *   offset: 0
   * });
   *
   * if (isSuccess(result)) {
   *   console.log(`Total bids: ${result.data.total}`);
   *   console.log(`Showing: ${result.data.bids.length}`);
   * }
   * ```
   */
  getBidHistory(
    auctionId: string,
    options?: GetBidHistoryOptions
  ): Promise<AsyncState<BidHistory>>;
}
