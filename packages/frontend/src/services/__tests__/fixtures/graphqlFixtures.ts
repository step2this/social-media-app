/**
 * GraphQL Test Fixtures
 *
 * Shared GraphQL response creation helpers for testing.
 * Provides type-safe wrappers for all GraphQL operations following Relay patterns.
 *
 * Provides helper functions for wrapping data in GraphQL response structures.
 * Handles AsyncState wrapping, pagination, and common response patterns.
 *
 * @example
 * ```typescript
 * // Success state
 * const response = createSuccessState({ user: mockUser });
 *
 * // Error state
 * const error = createErrorState('User not found', 'NOT_FOUND');
 *
 * // Paginated auctions
 * const response = createListAuctionsResponse(auctions, { hasNextPage: true });
 *
 * // Single auction
 * const response = createGetAuctionResponse(auction);
 * ```
 */

import type { AsyncState } from '../../../graphql/types.js';
import type {
  Auction,
  Bid,
  AuctionConnection,
  AuctionEdge,
  PageInfo,
  BidConnection,
} from '../../../graphql/operations/auctions.js';
import type { LikeResponse, LikeStatus } from '../../../graphql/operations/likes.js';

/**
 * Create success AsyncState wrapper
 *
 * @param data - Data to wrap in success state
 * @returns AsyncState with status='success'
 */
export function createSuccessState<T>(data: T): AsyncState<T> {
  return { status: 'success', data };
}

/**
 * Create error AsyncState wrapper
 *
 * @param message - Error message
 * @param code - Error code (default: 'ERROR')
 * @returns AsyncState with status='error'
 */
export function createErrorState(
  message: string,
  code: string = 'ERROR'
): AsyncState<never> {
  return {
    status: 'error',
    error: {
      message,
      extensions: { code },
    },
  };
}

/**
 * Wrap data in GraphQL success response
 *
 * Generic wrapper for any GraphQL query/mutation success response.
 * Returns AsyncState with status='success'.
 *
 * @param data - Response data
 * @returns AsyncState with success status
 *
 * @example
 * ```typescript
 * mockClient.mockQueryOnce(wrapInGraphQLSuccess({ post: mockPost }));
 * mockClient.mockMutateOnce(wrapInGraphQLSuccess({ createPost: payload }));
 * ```
 */
export function wrapInGraphQLSuccess<T>(data: T): AsyncState<T> {
  return { status: 'success', data };
}

/**
 * Wrap error in GraphQL error response
 *
 * Generic wrapper for any GraphQL query/mutation error response.
 * Returns AsyncState with status='error'.
 *
 * @param message - Error message
 * @param code - Error code (default: 'ERROR')
 * @returns AsyncState with error status
 *
 * @example
 * ```typescript
 * mockClient.mockQueryOnce(wrapInGraphQLError('Not found', 'NOT_FOUND'));
 * mockClient.mockMutateOnce(wrapInGraphQLError('Forbidden', 'FORBIDDEN'));
 * ```
 */
export function wrapInGraphQLError(
  message: string,
  code: string = 'ERROR'
): AsyncState<never> {
  return {
    status: 'error',
    error: {
      message,
      extensions: { code },
    },
  };
}

/**
 * ============================================================================
 * Auction Operation Responses
 * ============================================================================
 */

/**
 * Create paginated auction connection
 *
 * Wraps auctions array in GraphQL connection structure with edges and pageInfo.
 *
 * @param auctions - Array of auctions
 * @param pageInfo - Optional pagination info overrides
 * @returns AuctionConnection with edges and pageInfo
 *
 * @example
 * ```typescript
 * const connection = createAuctionConnection(
 *   [auction1, auction2],
 *   { hasNextPage: true, endCursor: 'cursor-2' }
 * );
 * ```
 */
export function createAuctionConnection(
  auctions: Auction[],
  pageInfo: Partial<PageInfo> = {}
): AuctionConnection {
  const edges: AuctionEdge[] = auctions.map((auction, i) => ({
    cursor: `cursor-${i + 1}`,
    node: auction,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
      ...pageInfo,
    },
  };
}

/**
 * Create bid connection
 *
 * Wraps bids array in GraphQL connection structure.
 *
 * @param bids - Array of bids
 * @param total - Total count (defaults to bids.length)
 * @returns BidConnection
 */
export function createBidConnection(
  bids: Bid[],
  total?: number
): BidConnection {
  return {
    bids,
    total: total !== undefined ? total : bids.length,
  };
}

/**
 * Create ListAuctions GraphQL response
 *
 * Complete response for listAuctions query including AsyncState wrapper.
 * Supports both pageInfo object and simple hasMore/nextCursor parameters.
 *
 * @param auctions - Array of auctions to return
 * @param hasMoreOrPageInfo - Either boolean hasMore flag or complete PageInfo object
 * @param nextCursor - Optional cursor for next page (only used if hasMoreOrPageInfo is boolean)
 * @returns AsyncState wrapped ListAuctions response
 *
 * @example
 * ```typescript
 * // Simple usage with hasMore boolean
 * const response = createListAuctionsResponse(auctions, true, 'cursor-10');
 *
 * // Advanced usage with full pageInfo object
 * const response = createListAuctionsResponse(
 *   auctions,
 *   { hasNextPage: true, endCursor: 'cursor-5', hasPreviousPage: false }
 * );
 * ```
 */
export function createListAuctionsResponse(
  auctions: Auction[],
  hasMoreOrPageInfo?: boolean | Partial<PageInfo>,
  nextCursor?: string
): AsyncState<{ auctions: AuctionConnection }> {
  // Support both signatures for backward compatibility
  let pageInfo: Partial<PageInfo>;
  
  if (typeof hasMoreOrPageInfo === 'boolean') {
    // Simple signature: (auctions, hasMore, nextCursor)
    pageInfo = {
      hasNextPage: hasMoreOrPageInfo,
      endCursor: nextCursor ?? null,
    };
  } else {
    // Object signature: (auctions, pageInfo)
    pageInfo = hasMoreOrPageInfo ?? {};
  }
  
  return createSuccessState({
    auctions: createAuctionConnection(auctions, pageInfo),
  });
}

/**
 * Create GetAuction GraphQL response
 *
 * @param auction - Auction to return (or null if not found)
 * @returns AsyncState wrapped GetAuction response
 *
 * @example
 * ```typescript
 * // Found
 * const response = createGetAuctionResponse(auction);
 *
 * // Not found
 * const response = createGetAuctionResponse(null);
 * ```
 */
export function createGetAuctionResponse(
  auction: Auction | null
): AsyncState<{ auction: Auction | null }> {
  return createSuccessState({ auction });
}

/**
 * Create GetBids GraphQL response
 *
 * @param bids - Array of bids
 * @param total - Total bid count (defaults to bids.length)
 * @returns AsyncState wrapped GetBids response
 *
 * @example
 * ```typescript
 * const bids = createMockBids(10, 'auction-1');
 * const response = createGetBidsResponse(bids, 25);
 * ```
 */
export function createGetBidsResponse(
  bids: Bid[],
  total?: number
): AsyncState<{ bids: BidConnection }> {
  return createSuccessState({
    bids: createBidConnection(bids, total),
  });
}

/**
 * Create CreateAuction GraphQL response
 *
 * @param auction - Created auction
 * @param uploadUrl - S3 presigned upload URL (default: test URL)
 * @returns AsyncState wrapped CreateAuction response
 *
 * @example
 * ```typescript
 * const auction = createMockAuction({ status: 'PENDING' });
 * const response = createCreateAuctionResponse(auction);
 * ```
 */
export function createCreateAuctionResponse(
  auction: Auction,
  uploadUrl: string = 'https://s3.example.com/upload'
): AsyncState<{ createAuction: { auction: Auction; uploadUrl: string } }> {
  return createSuccessState({
    createAuction: { auction, uploadUrl },
  });
}

/**
 * Create PlaceBid GraphQL response
 *
 * @param bid - Placed bid
 * @param auction - Updated auction after bid
 * @returns AsyncState wrapped PlaceBid response
 *
 * @example
 * ```typescript
 * const bid = createMockBid({ amount: 150 });
 * const auction = createMockAuction({ currentPrice: 150, bidCount: 6 });
 * const response = createPlaceBidResponse(bid, auction);
 * ```
 */
export function createPlaceBidResponse(
  bid: Bid,
  auction: Auction
): AsyncState<{ placeBid: { bid: Bid; auction: Auction } }> {
  return createSuccessState({
    placeBid: { bid, auction },
  });
}

/**
 * ============================================================================
 * Like Operation Responses
 * Following TypeScript generics pattern (SKILL.md lines 38-53)
 * ============================================================================
 */

/**
 * Create LikePost GraphQL response
 *
 * @param response - Like response data
 * @returns AsyncState wrapped LikePost response
 *
 * @example
 * ```typescript
 * import { createMockLikeResponse } from './likeFixtures.js';
 *
 * const response = createLikeResponse(
 *   createMockLikeResponse({ likesCount: 43 })
 * );
 * ```
 */
export function createLikeResponse(
  response: LikeResponse
): AsyncState<{ likePost: LikeResponse }> {
  return wrapInGraphQLSuccess({ likePost: response });
}

/**
 * Create UnlikePost GraphQL response
 *
 * @param response - Unlike response data
 * @returns AsyncState wrapped UnlikePost response
 *
 * @example
 * ```typescript
 * import { createMockUnlikeResponse } from './likeFixtures.js';
 *
 * const response = createUnlikeResponse(
 *   createMockUnlikeResponse({ likesCount: 41 })
 * );
 * ```
 */
export function createUnlikeResponse(
  response: LikeResponse
): AsyncState<{ unlikePost: LikeResponse }> {
  return wrapInGraphQLSuccess({ unlikePost: response });
}

/**
 * Create GetLikeStatus GraphQL response
 *
 * IMPORTANT: Uses correct field name 'postLikeStatus' to match actual GraphQL query.
 * Previous tests used incorrect 'likeStatus' field name which caused failures.
 *
 * @param status - Like status data
 * @returns AsyncState wrapped GetLikeStatus response with correct field name
 *
 * @example
 * ```typescript
 * import { createMockLikeStatus } from './likeFixtures.js';
 *
 * const response = createLikeStatusResponse(
 *   createMockLikeStatus({ isLiked: true, likesCount: 42 })
 * );
 * ```
 */
export function createLikeStatusResponse(
  status: LikeStatus
): AsyncState<{ postLikeStatus: LikeStatus }> {
  // ✅ Correct field name: 'postLikeStatus' matches GET_LIKE_STATUS_QUERY
  return wrapInGraphQLSuccess({ postLikeStatus: status });
}
