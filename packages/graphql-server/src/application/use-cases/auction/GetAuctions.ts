/**
 * GetAuctions Use Case
 *
 * Retrieves paginated list of auctions with optional status filtering.
 * Delegates to repository implementation for data access.
 */

import type { IAuctionRepository, Auction } from '../../../domain/repositories/IAuctionRepository.js';
import type { Result } from '../../../shared/types/result.js';
import type { PaginatedResult } from '../../../shared/types/pagination.js';

export class GetAuctions {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  async execute(
    status?: string,
    limit: number = 20,
    cursor?: string
  ): Promise<Result<PaginatedResult<Auction>, Error>> {
    return this.auctionRepository.getAuctions(status, limit, cursor);
  }
}
