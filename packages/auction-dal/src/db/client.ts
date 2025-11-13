/**
 * Drizzle Database Client
 *
 * Provides a singleton Drizzle client instance configured with PostgreSQL connection pool.
 * This replaces the manual Pool usage with type-safe Drizzle ORM operations.
 *
 * @module auction-dal/db/client
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

/**
 * Singleton Drizzle database instance
 */
let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Singleton PostgreSQL connection pool
 */
let poolInstance: Pool | null = null;

/**
 * Create or return existing Drizzle database client
 *
 * Implements singleton pattern to ensure only one database client exists per process.
 * Multiple calls return the same client instance for efficient connection reuse.
 *
 * @returns Drizzle database client configured with schema
 *
 * @example
 * ```typescript
 * import { getDb } from './db/client.js';
 *
 * const db = getDb();
 * const auctions = await db.select().from(schema.auctions);
 * ```
 */
export function getDb() {
  if (!dbInstance) {
    // Create PostgreSQL connection pool
    poolInstance = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'auctions_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Create Drizzle client with schema
    dbInstance = drizzle(poolInstance, { schema });
  }

  return dbInstance;
}

/**
 * Get the underlying PostgreSQL connection pool
 *
 * Use this when you need direct pool access (e.g., for transactions with existing code).
 *
 * @returns PostgreSQL connection pool
 *
 * @example
 * ```typescript
 * import { getPool } from './db/client.js';
 *
 * const pool = getPool();
 * const client = await pool.connect();
 * // ... use client for transactions
 * client.release();
 * ```
 */
export function getPool(): Pool {
  if (!poolInstance) {
    // Initialize pool by calling getDb()
    getDb();
  }
  return poolInstance!;
}

/**
 * Close the database connection pool
 *
 * Used for graceful shutdown and testing cleanup.
 *
 * @example
 * ```typescript
 * import { closeDb } from './db/client.js';
 *
 * // During app shutdown
 * await closeDb();
 * ```
 */
export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}

/**
 * Reset the singleton instances
 *
 * Used for testing to ensure clean state between tests.
 *
 * @internal
 */
export function resetDbInstance(): void {
  if (poolInstance) {
    poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}
