/**
 * AuctionServiceAdapter
 *
 * Adapts AuctionService (from auction-dal package) to IAuctionRepository interface.
 * Transforms DAL Auction (userId) to Domain Auction (sellerId, postId, startingPrice).
 *
 * Advanced TypeScript Pattern: Property Mapping & Type Guards
 * Maps userId → sellerId and validates status field
 */

import type { IAuctionRepository, Auction, Bid } from '../../domain/repositories/IAuctionRepository';
import type { AuctionService } from '@social-media-app/auction-dal';
import type { Result, PaginatedResult } from '../../shared/types/index.js';

/**
 * Valid auction status values
 */
type AuctionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/**
 * Type guard to validate auction status
 */
function isValidAuctionStatus(status: string): status is AuctionStatus {
  return ['pending', 'active', 'completed', 'cancelled'].includes(status);
}

export class AuctionServiceAdapter implements IAuctionRepository {
  constructor(private readonly auctionService: AuctionService) {}

  /**
   * Transform DAL Auction to Domain Auction
   * Maps: userId → sellerId, validates status
   */
  private transformToDomain(dalAuction: any): Auction {
    // Validate status at runtime
    if (!isValidAuctionStatus(dalAuction.status)) {
      throw new Error(`Invalid auction status: ${dalAuction.status}`);
    }

    return {
      id: dalAuction.id,
      sellerId: dalAuction.userId, // Property rename: userId → sellerId
      postId: dalAuction.id, // Use auction ID as postId (auctions ARE posts)
      startingPrice: dalAuction.startPrice, // Property rename: startPrice → startingPrice
      currentPrice: dalAuction.currentPrice,
      status: dalAuction.status.toUpperCase() as 'ACTIVE' | 'ENDED' | 'CANCELLED', // Convert to uppercase
      startTime: dalAuction.startTime,
      endTime: dalAuction.endTime,
      createdAt: dalAuction.createdAt || dalAuction.startTime, // Map createdAt with fallback
    };
  }

  async getAuction(id: string): Promise<Result<Auction, Error>> {
    try {
      const dalAuction = await this.auctionService.getAuction(id);
      const domainAuction = this.transformToDomain(dalAuction);
      return { success: true, data: domainAuction };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getAuctions(
    status?: string,
    limit: number = 20,
    cursor?: string
  ): Promise<Result<PaginatedResult<Auction>, Error>> {
    try {
      // Validate and narrow status type if provided
      const validatedStatus: AuctionStatus | undefined = status && isValidAuctionStatus(status)
        ? status
        : undefined;

      const result = await this.auctionService.listAuctions({
        status: validatedStatus,
        limit,
        cursor
      });

      // Transform DAL auctions to domain auctions
      const domainAuctions = result.auctions.map((dalAuction: any) =>
        this.transformToDomain(dalAuction)
      );

      return {
        success: true,
        data: {
          items: domainAuctions,
          hasMore: result.hasMore,
          cursor: result.nextCursor,
        },
      };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getBidHistory(
    auctionId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Bid>, Error>> {
    try {
      const result = await this.auctionService.getBidHistory({
        auctionId,
        limit,
        offset: cursor ? parseInt(cursor, 10) : 0,
      });

      // Transform DAL bids to domain bids (userId → bidderId)
      const domainBids: Bid[] = result.bids.map((dalBid: any) => ({
        id: dalBid.id,
        auctionId: dalBid.auctionId,
        bidderId: dalBid.userId, // Property rename: userId → bidderId
        amount: dalBid.amount,
        createdAt: dalBid.createdAt,
      }));

      return {
        success: true,
        data: {
          items: domainBids,
          hasMore: result.bids.length === limit,
          cursor: result.bids.length === limit ? String(result.bids.length) : undefined,
        },
      };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
