/**
 * Auction Repository Interface
 *
 * Domain interface for auction data access.
 * Adapter implementations handle the translation from external services.
 */

import type { Result } from '../../shared/types/result.js';
import type { PaginatedResult } from '../../shared/types/pagination.js';

export interface Auction {
  id: string;
  sellerId: string;
  postId: string;
  startingPrice: number;
  currentPrice: number;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  createdAt: string;
}

export interface IAuctionRepository {
  getAuction(id: string): Promise<Result<Auction, Error>>;

  getAuctions(
    status?: string,
    limit?: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Auction>, Error>>;

  getBidHistory(
    auctionId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Bid>, Error>>;
}
