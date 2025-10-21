/**
 * Type-safe GraphQL operations for auctions
 *
 * This file defines all GraphQL queries and mutations for auction-related operations.
 * Each operation includes:
 * - The GraphQL query/mutation string (with const assertion for type safety)
 * - TypeScript type definition for the operation
 * - Type aliases for variables and response data
 *
 * Benefits:
 * ✅ Compile-time query validation with const assertions
 * ✅ Type-safe variables and responses
 * ✅ Single source of truth for GraphQL operations
 * ✅ Easy to test (just TypeScript, no GraphQL execution needed)
 */

import type { GraphQLQuery, GraphQLMutation } from '../types.js';

// ============================================================================
// Type Definitions (matching GraphQL schema)
// ============================================================================

export interface Profile {
  id: string;
  handle: string;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
}

export interface Auction {
  id: string;
  userId: string;
  seller: Profile;
  title: string;
  description: string | null;
  imageUrl: string;
  startPrice: number;
  reservePrice: number | null;
  currentPrice: number;
  startTime: string;
  endTime: string;
  status: AuctionStatus;
  winnerId: string | null;
  winner: Profile | null;
  bidCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  bidder: Profile;
  amount: number;
  createdAt: string;
}

export type AuctionStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface AuctionEdge {
  cursor: string;
  node: Auction;
}

export interface AuctionConnection {
  edges: AuctionEdge[];
  pageInfo: PageInfo;
}

export interface BidConnection {
  bids: Bid[];
  total: number;
}

// ============================================================================
// Query: Get Single Auction
// ============================================================================

/**
 * Get single auction by ID
 *
 * @example
 * ```typescript
 * const result = await client.query<GetAuctionResponse>(
 *   GET_AUCTION,
 *   { id: 'auction-123' }
 * );
 * ```
 */
export const GET_AUCTION = `
  query GetAuction($id: ID!) {
    auction(id: $id) {
      id
      userId
      seller {
        id
        handle
        username
        displayName
        profilePictureUrl
      }
      title
      description
      imageUrl
      startPrice
      reservePrice
      currentPrice
      startTime
      endTime
      status
      winnerId
      winner {
        id
        handle
        username
        displayName
        profilePictureUrl
      }
      bidCount
      createdAt
      updatedAt
    }
  }
` as const;

export type GetAuctionVariables = {
  id: string;
};

export type GetAuctionResponse = {
  auction: Auction | null;
};

export type GetAuctionOperation = GraphQLQuery<
  'GetAuction',
  GetAuctionVariables,
  GetAuctionResponse
>;

// ============================================================================
// Query: List Auctions (with pagination)
// ============================================================================

/**
 * List auctions with optional filtering and cursor-based pagination
 *
 * @example
 * ```typescript
 * const result = await client.query<ListAuctionsResponse>(
 *   LIST_AUCTIONS,
 *   { limit: 20, status: 'ACTIVE' }
 * );
 * ```
 */
export const LIST_AUCTIONS = `
  query ListAuctions($limit: Int, $cursor: String, $status: AuctionStatus, $userId: ID) {
    auctions(limit: $limit, cursor: $cursor, status: $status, userId: $userId) {
      edges {
        cursor
        node {
          id
          userId
          seller {
            id
            handle
            username
            displayName
            profilePictureUrl
          }
          title
          description
          imageUrl
          startPrice
          reservePrice
          currentPrice
          startTime
          endTime
          status
          winnerId
          winner {
            id
            handle
            username
            displayName
            profilePictureUrl
          }
          bidCount
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

export type ListAuctionsVariables = {
  limit?: number;
  cursor?: string;
  status?: AuctionStatus;
  userId?: string;
};

export type ListAuctionsResponse = {
  auctions: AuctionConnection;
};

export type ListAuctionsOperation = GraphQLQuery<
  'ListAuctions',
  ListAuctionsVariables,
  ListAuctionsResponse
>;

// ============================================================================
// Query: Get Bids for Auction
// ============================================================================

/**
 * Get bids for a specific auction
 *
 * @example
 * ```typescript
 * const result = await client.query<GetBidsResponse>(
 *   GET_BIDS,
 *   { auctionId: 'auction-123', limit: 10 }
 * );
 * ```
 */
export const GET_BIDS = `
  query GetBids($auctionId: ID!, $limit: Int, $offset: Int) {
    bids(auctionId: $auctionId, limit: $limit, offset: $offset) {
      bids {
        id
        auctionId
        userId
        bidder {
          id
          handle
          username
          displayName
          profilePictureUrl
        }
        amount
        createdAt
      }
      total
    }
  }
` as const;

export type GetBidsVariables = {
  auctionId: string;
  limit?: number;
  offset?: number;
};

export type GetBidsResponse = {
  bids: BidConnection;
};

export type GetBidsOperation = GraphQLQuery<
  'GetBids',
  GetBidsVariables,
  GetBidsResponse
>;

// ============================================================================
// Mutation: Create Auction
// ============================================================================

/**
 * Create a new auction
 *
 * @example
 * ```typescript
 * const result = await client.mutate<CreateAuctionResponse>(
 *   CREATE_AUCTION,
 *   {
 *     input: {
 *       title: 'Vintage Watch',
 *       description: 'Rare collectible',
 *       fileType: 'image/jpeg',
 *       startPrice: 100,
 *       startTime: '2024-01-01T00:00:00Z',
 *       endTime: '2024-01-08T00:00:00Z'
 *     }
 *   }
 * );
 * ```
 */
export const CREATE_AUCTION = `
  mutation CreateAuction($input: CreateAuctionInput!) {
    createAuction(input: $input) {
      auction {
        id
        userId
        seller {
          id
          handle
          username
          displayName
          profilePictureUrl
        }
        title
        description
        imageUrl
        startPrice
        reservePrice
        currentPrice
        startTime
        endTime
        status
        winnerId
        winner {
          id
          handle
          username
          displayName
          profilePictureUrl
        }
        bidCount
        createdAt
        updatedAt
      }
      uploadUrl
    }
  }
` as const;

export type CreateAuctionInput = {
  title: string;
  description?: string;
  fileType: string;
  startPrice: number;
  reservePrice?: number;
  startTime: string;
  endTime: string;
};

export type CreateAuctionVariables = {
  input: CreateAuctionInput;
};

export type CreateAuctionResponse = {
  createAuction: {
    auction: Auction;
    uploadUrl: string;
  };
};

export type CreateAuctionOperation = GraphQLMutation<
  'CreateAuction',
  CreateAuctionVariables,
  CreateAuctionResponse
>;

// ============================================================================
// Mutation: Activate Auction
// ============================================================================

/**
 * Activate a pending auction
 *
 * @example
 * ```typescript
 * const result = await client.mutate<ActivateAuctionResponse>(
 *   ACTIVATE_AUCTION,
 *   { id: 'auction-123' }
 * );
 * ```
 */
export const ACTIVATE_AUCTION = `
  mutation ActivateAuction($id: ID!) {
    activateAuction(id: $id) {
      id
      userId
      seller {
        id
        handle
        username
        displayName
        profilePictureUrl
      }
      title
      description
      imageUrl
      startPrice
      reservePrice
      currentPrice
      startTime
      endTime
      status
      winnerId
      winner {
        id
        handle
        username
        displayName
        profilePictureUrl
      }
      bidCount
      createdAt
      updatedAt
    }
  }
` as const;

export type ActivateAuctionVariables = {
  id: string;
};

export type ActivateAuctionResponse = {
  activateAuction: Auction;
};

export type ActivateAuctionOperation = GraphQLMutation<
  'ActivateAuction',
  ActivateAuctionVariables,
  ActivateAuctionResponse
>;

// ============================================================================
// Mutation: Place Bid
// ============================================================================

/**
 * Place a bid on an auction
 *
 * @example
 * ```typescript
 * const result = await client.mutate<PlaceBidResponse>(
 *   PLACE_BID,
 *   {
 *     input: {
 *       auctionId: 'auction-123',
 *       amount: 150
 *     }
 *   }
 * );
 * ```
 */
export const PLACE_BID = `
  mutation PlaceBid($input: PlaceBidInput!) {
    placeBid(input: $input) {
      bid {
        id
        auctionId
        userId
        bidder {
          id
          handle
          username
          displayName
          profilePictureUrl
        }
        amount
        createdAt
      }
      auction {
        id
        userId
        seller {
          id
          handle
          username
          displayName
          profilePictureUrl
        }
        title
        description
        imageUrl
        startPrice
        reservePrice
        currentPrice
        startTime
        endTime
        status
        winnerId
        winner {
          id
          handle
          username
          displayName
          profilePictureUrl
        }
        bidCount
        createdAt
        updatedAt
      }
    }
  }
` as const;

export type PlaceBidInput = {
  auctionId: string;
  amount: number;
};

export type PlaceBidVariables = {
  input: PlaceBidInput;
};

export type PlaceBidResponse = {
  placeBid: {
    bid: Bid;
    auction: Auction;
  };
};

export type PlaceBidOperation = GraphQLMutation<
  'PlaceBid',
  PlaceBidVariables,
  PlaceBidResponse
>;
