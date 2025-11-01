/**
 * AuctionServiceAdapter
 *
 * Adapts external auction service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling and response mapping.
 */

import type {
  IAuctionRepository,
  Auction,
  Bid,
} from '../../domain/repositories/IAuctionRepository';
import type { IAuctionService } from '@social-media-app/auction-dal';
import type { PaginatedResult } from '../../shared/types/pagination';
import type { Result } from '../../shared/types/result';
import { adaptServiceCall, adaptPaginatedResponse } from './shared/AdapterHelpers';

export class AuctionServiceAdapter implements IAuctionRepository {
  constructor(private readonly auctionService: IAuctionService) {}

  async getAuction(id: string): Promise<Result<Auction, Error>> {
    return adaptServiceCall(() => this.auctionService.getAuction(id));
  }

  async getAuctions(
    status?: string,
    limit: number = 20,
    cursor?: string
  ): Promise<Result<PaginatedResult<Auction>, Error>> {
    return adaptServiceCall(async () => {
      const result = await this.auctionService.listAuctions({ status, limit, cursor });
      return adaptPaginatedResponse(result);
    });
  }

  async getBidHistory(
    auctionId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Bid>, Error>> {
    return adaptServiceCall(async () => {
      const result = await this.auctionService.getBidHistory({ auctionId, limit, offset: 0 });
      return adaptPaginatedResponse(result);
    });
  }
}
