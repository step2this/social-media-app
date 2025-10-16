/**
 * PostgreSQL Connection Pool Management
 *
 * Provides a singleton pool instance for PostgreSQL connections.
 * Ensures efficient connection reuse across the application lifecycle.
 *
 * Configuration via environment variables:
 * - POSTGRES_HOST: Database host (default: 'localhost')
 * - POSTGRES_PORT: Database port (default: '5432')
 * - POSTGRES_DB: Database name (default: 'auctions_dev')
 * - POSTGRES_USER: Database user (default: 'postgres')
 * - POSTGRES_PASSWORD: Database password (default: 'postgres')
 *
 * Pool Settings:
 * - max: 20 connections (handles concurrent requests)
 * - idleTimeoutMillis: 30000ms (30s before idle connection cleanup)
 * - connectionTimeoutMillis: 2000ms (2s timeout for acquiring connection)
 *
 * @module auction-dal/utils
 */

import { Pool } from 'pg';

/**
 * Singleton pool instance
 * Reused across all service instances in the application
 */
let poolInstance: Pool | null = null;

/**
 * Create or return existing PostgreSQL connection pool
 *
 * Implements singleton pattern to ensure only one pool exists per process.
 * Multiple calls return the same pool instance for efficient connection reuse.
 *
 * @returns Pool instance configured with environment variables
 *
 * @example
 * ```typescript
 * // First call creates the pool
 * const pool1 = createPostgresPool();
 *
 * // Subsequent calls return the same instance
 * const pool2 = createPostgresPool();
 * console.log(pool1 === pool2); // true
 * ```
 */
export function createPostgresPool(): Pool {
  if (!poolInstance) {
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
  }
  return poolInstance;
}

/**
 * Reset the singleton pool instance
 * Used for testing to ensure clean state between tests
 *
 * @internal
 */
export function resetPoolInstance(): void {
  if (poolInstance) {
    poolInstance.end();
    poolInstance = null;
  }
}
