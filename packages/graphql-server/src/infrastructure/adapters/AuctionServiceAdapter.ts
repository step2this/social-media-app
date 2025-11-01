/**
 * AuctionServiceAdapter
 *
 * Adapts external auction service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling and response mapping.
 */

import type { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import type { IAuctionService } from '@social-media-app/auction-dal';
import { adaptServiceCall, adaptPaginatedResponse } from './shared/AdapterHelpers';

export class AuctionServiceAdapter implements IAuctionRepository {
  constructor(private readonly auctionService: IAuctionService) {}

  async getAuction(id: string) {
    return adaptServiceCall(() => this.auctionService.getAuction(id));
  }

  async getAuctions(status?: string, limit: number = 20, cursor?: string) {
    return adaptServiceCall(async () => {
      const result = await this.auctionService.getAuctions(status, limit, cursor);
      return adaptPaginatedResponse(result);
    });
  }

  async getBidHistory(auctionId: string, limit: number, cursor?: string) {
    return adaptServiceCall(async () => {
      const result = await this.auctionService.getBidHistory(auctionId, limit, cursor);
      return adaptPaginatedResponse(result);
    });
  }
}
