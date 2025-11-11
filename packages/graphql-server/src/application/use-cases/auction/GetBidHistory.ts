/**
 * GetBidHistory Use Case
 *
 * Retrieves paginated bid history for a specific auction.
 * Delegates to repository implementation for data access.
 */

import type { IAuctionRepository, Bid } from '../../../domain/repositories/IAuctionRepository.js';
import type { Result } from '../../../shared/types/result.js';
import type { PaginatedResult } from '../../../shared/types/pagination.js';

export class GetBidHistory {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  async execute(
    auctionId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Bid>, Error>> {
    return this.auctionRepository.getBidHistory(auctionId, limit, cursor);
  }
}
