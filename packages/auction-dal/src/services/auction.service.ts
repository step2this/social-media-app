/**
 * AuctionService - Data Access Layer for Auction System (Drizzle ORM)
 *
 * Provides ACID transaction support for concurrent bid handling using PostgreSQL.
 * Uses row-level locking (FOR UPDATE) to prevent race conditions.
 *
 * This version uses Drizzle ORM for type-safe database operations.
 *
 * @module auction-dal/services
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type {
  Auction,
  Bid,
  CreateAuctionRequest,
  PlaceBidRequest,
  GetBidHistoryRequest,
  PlaceBidResponse,
  ListAuctionsRequest,
  ListAuctionsResponse,
  GetBidHistoryResponse,
} from '@social-media-app/shared';
import * as schema from '../db/schema.js';

export class AuctionService {
  private db: NodePgDatabase<typeof schema>;
  private pool: Pool;

  constructor(db: NodePgDatabase<typeof schema>, pool: Pool) {
    this.db = db;
    this.pool = pool;
  }

  /**
   * Create a new auction listing
   */
  async createAuction(
    userId: string,
    request: CreateAuctionRequest,
    imageUrl?: string
  ): Promise<Auction> {
    // Validate dates
    if (new Date(request.endTime) <= new Date(request.startTime)) {
      throw new Error('End time must be after start time');
    }

    const [auction] = await this.db
      .insert(schema.auctions)
      .values({
        userId,
        title: request.title,
        description: request.description || null,
        imageUrl: imageUrl || null,
        startPrice: request.startPrice.toString(),
        reservePrice: request.reservePrice?.toString() || null,
        currentPrice: request.startPrice.toString(),
        startTime: new Date(request.startTime),
        endTime: new Date(request.endTime),
      })
      .returning();

    return this.mapRowToAuction(auction);
  }

  /**
   * Activate an auction (change status to 'active')
   */
  async activateAuction(auctionId: string): Promise<Auction> {
    const [auction] = await this.db
      .update(schema.auctions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(schema.auctions.id, auctionId))
      .returning();

    if (!auction) {
      throw new Error('Auction not found');
    }

    return this.mapRowToAuction(auction);
  }

  /**
   * Place a bid on an auction with ACID transaction support
   * Uses row-level locking to prevent race conditions
   */
  async placeBid(userId: string, request: PlaceBidRequest): Promise<PlaceBidResponse> {
    // Use raw connection for transaction with row-level locking
    // Drizzle doesn't yet support FOR UPDATE, so we use raw SQL here
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Lock auction row and check current price
      const auctionResult = await client.query(
        `
        SELECT * FROM auctions
        WHERE id = $1 AND status = 'active'
        FOR UPDATE
      `,
        [request.auctionId]
      );

      if (auctionResult.rows.length === 0) {
        throw new Error('Auction not found or not active');
      }

      const auction = auctionResult.rows[0];

      if (request.amount <= parseFloat(auction.current_price)) {
        throw new Error('Bid amount must be higher than current price');
      }

      // Insert bid
      const bidResult = await client.query(
        `
        INSERT INTO bids (auction_id, user_id, amount)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [request.auctionId, userId, request.amount]
      );

      // Update auction current price and increment bid count
      const updatedAuctionResult = await client.query(
        `
        UPDATE auctions
        SET current_price = $1, bid_count = bid_count + 1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
        [request.amount, request.auctionId]
      );

      await client.query('COMMIT');

      return {
        bid: this.mapRowToBid(bidResult.rows[0]),
        auction: this.mapRowToAuction(updatedAuctionResult.rows[0]),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get auction details by ID
   */
  async getAuction(auctionId: string): Promise<Auction> {
    const auction = await this.db.query.auctions.findFirst({
      where: eq(schema.auctions.id, auctionId),
    });

    if (!auction) {
      throw new Error('Auction not found');
    }

    return this.mapRowToAuction(auction);
  }

  /**
   * List auctions with filtering and pagination
   */
  async listAuctions(request: ListAuctionsRequest): Promise<ListAuctionsResponse> {
    const conditions = [];

    if (request.status) {
      conditions.push(eq(schema.auctions.status, request.status));
    }

    if (request.userId) {
      conditions.push(eq(schema.auctions.userId, request.userId));
    }

    const limit = request.limit || 24;
    const offset = request.cursor ? parseInt(request.cursor, 10) : 0;

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.db
      .select()
      .from(schema.auctions)
      .where(whereClause)
      .orderBy(desc(schema.auctions.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      auctions: results.map((row) => this.mapRowToAuction(row)),
      hasMore: results.length === limit,
      nextCursor: results.length === limit ? String(offset + results.length) : undefined,
    };
  }

  /**
   * Get bid history for an auction
   */
  async getBidHistory(request: GetBidHistoryRequest): Promise<GetBidHistoryResponse> {
    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.bids)
      .where(eq(schema.bids.auctionId, request.auctionId));

    const total = Number(countResult[0].count);

    // Get paginated bids
    const results = await this.db
      .select()
      .from(schema.bids)
      .where(eq(schema.bids.auctionId, request.auctionId))
      .orderBy(desc(schema.bids.createdAt))
      .limit(request.limit)
      .offset(request.offset);

    return {
      bids: results.map((row) => this.mapRowToBid(row)),
      total,
    };
  }

  /**
   * Get multiple auctions by IDs (for DataLoader batching)
   * Returns Map for efficient lookup, missing IDs return undefined
   *
   * @param ids - Array of auction IDs to fetch
   * @returns Map of auctionId to Auction entity
   *
   * @example
   * ```typescript
   * const auctions = await auctionService.getAuctionsByIds(['id1', 'id2', 'id3']);
   * const auction1 = auctions.get('id1'); // Auction or undefined
   * ```
   */
  async getAuctionsByIds(ids: string[]): Promise<Map<string, Auction>> {
    const auctionMap = new Map<string, Auction>();

    // Return empty map if no IDs provided
    if (ids.length === 0) {
      return auctionMap;
    }

    // Use IN clause for batch loading (Drizzle doesn't support ANY yet)
    const results = await this.db
      .select()
      .from(schema.auctions)
      .where(sql`${schema.auctions.id} = ANY(${ids})`);

    // Convert to Map for DataLoader
    for (const row of results) {
      const auction = this.mapRowToAuction(row);
      auctionMap.set(auction.id, auction);
    }

    return auctionMap;
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Map database row to Auction entity
   */
  private mapRowToAuction(row: typeof schema.auctions.$inferSelect): Auction {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: row.description || undefined,
      imageUrl: row.imageUrl || undefined,
      startPrice: parseFloat(row.startPrice),
      reservePrice: row.reservePrice ? parseFloat(row.reservePrice) : undefined,
      currentPrice: parseFloat(row.currentPrice),
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status as 'pending' | 'active' | 'completed' | 'cancelled',
      winnerId: row.winnerId || undefined,
      bidCount: row.bidCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Map database row to Bid entity
   */
  private mapRowToBid(row: typeof schema.bids.$inferSelect | any): Bid {
    return {
      id: row.id,
      auctionId: row.auctionId || row.auction_id,
      userId: row.userId || row.user_id,
      amount: parseFloat(row.amount),
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date(row.created_at).toISOString(),
    };
  }
}
