/**
 * GetAuction Use Case
 *
 * Retrieves a single auction by ID.
 * Delegates to repository implementation for data access.
 */

import type { IAuctionRepository, Auction } from '../../../domain/repositories/IAuctionRepository.js';
import type { Result } from '../../../shared/types/result.js';

export class GetAuction {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  async execute(id: string): Promise<Result<Auction, Error>> {
    return this.auctionRepository.getAuction(id);
  }
}
