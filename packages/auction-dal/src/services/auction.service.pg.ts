/**
 * AuctionService - Data Access Layer for Auction System
 *
 * Provides ACID transaction support for concurrent bid handling using PostgreSQL.
 * Uses row-level locking (FOR UPDATE) to prevent race conditions.
 *
 * @module auction-dal/services
 */

import { Pool } from 'pg';
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

export class AuctionService {
  private pool: Pool;

  constructor(pool: Pool) {
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

    const result = await this.pool.query(
      `
      INSERT INTO auctions (
        user_id, title, description, image_url, start_price, reserve_price,
        current_price, start_time, end_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $5, $7, $8)
      RETURNING *
    `,
      [
        userId,
        request.title,
        request.description || null,
        imageUrl || null,
        request.startPrice,
        request.reservePrice || null,
        request.startTime,
        request.endTime,
      ]
    );

    return this.mapRowToAuction(result.rows[0]);
  }

  /**
   * Activate an auction (change status to 'active')
   */
  async activateAuction(auctionId: string): Promise<Auction> {
    const result = await this.pool.query(
      `
      UPDATE auctions
      SET status = 'active', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
      [auctionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Auction not found');
    }

    return this.mapRowToAuction(result.rows[0]);
  }

  /**
   * Place a bid on an auction with ACID transaction support
   * Uses row-level locking to prevent race conditions
   */
  async placeBid(userId: string, request: PlaceBidRequest): Promise<PlaceBidResponse> {
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
    const result = await this.pool.query('SELECT * FROM auctions WHERE id = $1', [
      auctionId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Auction not found');
    }

    return this.mapRowToAuction(result.rows[0]);
  }

  /**
   * List auctions with filtering and pagination
   */
  async listAuctions(request: ListAuctionsRequest): Promise<ListAuctionsResponse> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (request.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(request.status);
    }

    if (request.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(request.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(request.limit || 24);
    const limitClause = `LIMIT $${paramIndex++}`;

    let offsetClause = '';
    if (request.cursor) {
      offsetClause = `OFFSET $${paramIndex++}`;
      params.push(parseInt(request.cursor, 10));
    }

    const query = `
      SELECT * FROM auctions
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause}
      ${offsetClause}
    `;

    const result = await this.pool.query(query, params);

    return {
      auctions: result.rows.map((row) => this.mapRowToAuction(row)),
      hasMore: result.rows.length === (request.limit || 24),
      nextCursor:
        result.rows.length === (request.limit || 24)
          ? String((parseInt(request.cursor || '0', 10) || 0) + result.rows.length)
          : undefined,
    };
  }

  /**
   * Get bid history for an auction
   */
  async getBidHistory(request: GetBidHistoryRequest): Promise<GetBidHistoryResponse> {
    // Get total count
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM bids WHERE auction_id = $1',
      [request.auctionId]
    );

    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated bids
    const result = await this.pool.query(
      `
      SELECT * FROM bids
      WHERE auction_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [request.auctionId, request.limit, request.offset]
    );

    return {
      bids: result.rows.map((row) => this.mapRowToBid(row)),
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

    // Query with WHERE id = ANY($1) for batch loading
    const query = `
      SELECT * FROM auctions
      WHERE id = ANY($1)
    `;

    const result = await this.pool.query(query, [ids]);

    // Convert to Map for DataLoader
    for (const row of result.rows) {
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
  private mapRowToAuction(row: any): Auction {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description || undefined,
      imageUrl: row.image_url || undefined,
      startPrice: parseFloat(row.start_price),
      reservePrice: row.reserve_price ? parseFloat(row.reserve_price) : undefined,
      currentPrice: parseFloat(row.current_price),
      startTime: row.start_time.toISOString(),
      endTime: row.end_time.toISOString(),
      status: row.status,
      winnerId: row.winner_id || undefined,
      bidCount: row.bid_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Map database row to Bid entity
   */
  private mapRowToBid(row: any): Bid {
    return {
      id: row.id,
      auctionId: row.auction_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      createdAt: row.created_at.toISOString(),
    };
  }
}
