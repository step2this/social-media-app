/**
 * ActivateAuction Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface ActivateAuctionInput {
  auctionId: string;
  userId: UserId;
}

export interface ActivateAuctionOutput {
  id: string;
  userId: string;
  title: string;
  description: string;
  startingPrice: number;
  reservePrice: number | null;
  currentPrice: number;
  imageUrl: string | null;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivateAuctionServices {
  auctionService: {
    activateAuction(auctionId: string, userId: string): Promise<ActivateAuctionOutput>;
  };
}

export class ActivateAuction {
  constructor(private readonly services: ActivateAuctionServices) {}

  async execute(input: ActivateAuctionInput): AsyncResult<ActivateAuctionOutput> {
    try {
      const auction = await this.services.auctionService.activateAuction(
        input.auctionId,
        input.userId
      );

      return {
        success: true,
        data: auction,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to activate auction'),
      };
    }
  }
}
