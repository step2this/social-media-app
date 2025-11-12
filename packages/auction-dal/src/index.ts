/**
 * Auction DAL Package Entry Point
 *
 * Exports services for auction data access using PostgreSQL with Drizzle ORM.
 *
 * @module auction-dal
 */

export { AuctionService } from './services/auction.service.js';
export { getDb, getPool, closeDb } from './db/client.js';
export * as schema from './db/schema.js';

// Re-export for backwards compatibility
export { createPostgresPool } from './utils/postgres.js';
