/**
 * Auction DAL Package Entry Point
 *
 * Exports services for auction data access using PostgreSQL.
 *
 * @module auction-dal
 */

export { AuctionService } from './services/auction.service.js';
export { createPostgresPool } from './utils/postgres.js';
