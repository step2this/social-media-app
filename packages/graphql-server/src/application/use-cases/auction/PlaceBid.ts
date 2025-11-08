/**
 * PlaceBid Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface PlaceBidInput {
  userId: UserId;
  auctionId: string;
  amount: number;
}

export interface PlaceBidOutput {
  bid: {
    id: string;
    auctionId: string;
    userId: string;
    amount: number;
    createdAt: string;
  };
  auction: {
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
  };
}

export interface PlaceBidServices {
  auctionService: {
    placeBid(
      userId: string,
      input: { auctionId: string; amount: number }
    ): Promise<PlaceBidOutput>;
  };
}

export class PlaceBid {
  constructor(private readonly services: PlaceBidServices) {}

  async execute(input: PlaceBidInput): AsyncResult<PlaceBidOutput> {
    try {
      const result = await this.services.auctionService.placeBid(
        input.userId,
        {
          auctionId: input.auctionId,
          amount: input.amount,
        }
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to place bid'),
      };
    }
  }
}
