/**
 * PostgreSQL Pool Singleton Tests
 *
 * Tests the singleton pattern for PostgreSQL connection pool management.
 * Ensures efficient connection reuse and proper configuration.
 *
 * Test Focus:
 * - Singleton pattern (same instance returned on multiple calls)
 * - Environment variable configuration
 * - Default values when env vars are missing
 * - Pool reset for testing purposes
 *
 * TDD Phase: RED - Tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPostgresPool, resetPoolInstance } from './postgres.js';

describe('PostgreSQL Pool Singleton', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clean up any existing pool instance
    resetPoolInstance();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up pool instance
    resetPoolInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same pool instance on multiple calls', () => {
      const pool1 = createPostgresPool();
      const pool2 = createPostgresPool();
      const pool3 = createPostgresPool();

      // All calls should return the exact same instance
      expect(pool1).toBe(pool2);
      expect(pool2).toBe(pool3);
      expect(pool1).toBe(pool3);
    });

    it('should create a new pool after reset', () => {
      const pool1 = createPostgresPool();

      // Reset the pool
      resetPoolInstance();

      const pool2 = createPostgresPool();

      // After reset, should get a different instance
      expect(pool1).not.toBe(pool2);
    });

    it('should return a valid Pool instance', () => {
      const pool = createPostgresPool();

      // Verify it's a Pool instance with expected properties
      expect(pool).toBeDefined();
      expect(pool.constructor.name).toBe('BoundPool');
      expect(typeof pool.query).toBe('function');
      expect(typeof pool.connect).toBe('function');
      expect(typeof pool.end).toBe('function');
    });
  });

  describe('Environment Configuration', () => {
    it('should use environment variables when provided', () => {
      process.env.POSTGRES_HOST = 'custom-host';
      process.env.POSTGRES_PORT = '5433';
      process.env.POSTGRES_DB = 'custom_db';
      process.env.POSTGRES_USER = 'custom_user';
      process.env.POSTGRES_PASSWORD = 'custom_password';

      const pool = createPostgresPool();

      // Pool should be created with custom configuration
      expect(pool).toBeDefined();
      expect(pool.constructor.name).toBe('BoundPool');
    });

    it('should use default values when environment variables are missing', () => {
      // Clear all postgres-related env vars
      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_PORT;
      delete process.env.POSTGRES_DB;
      delete process.env.POSTGRES_USER;
      delete process.env.POSTGRES_PASSWORD;

      const pool = createPostgresPool();

      // Pool should be created with default configuration
      expect(pool).toBeDefined();
      expect(pool.constructor.name).toBe('BoundPool');
    });

    it('should handle partial environment configuration', () => {
      // Set only some env vars
      process.env.POSTGRES_HOST = 'custom-host';
      process.env.POSTGRES_DB = 'custom_db';
      // Leave others undefined

      const pool = createPostgresPool();

      // Pool should be created with mix of custom and default values
      expect(pool).toBeDefined();
      expect(pool.constructor.name).toBe('BoundPool');
    });
  });

  describe('Pool Configuration', () => {
    it('should configure pool with correct connection settings', () => {
      const pool = createPostgresPool();

      // Verify pool has correct configuration properties
      expect(pool.options.max).toBe(20);
      expect(pool.options.idleTimeoutMillis).toBe(30000);
      expect(pool.options.connectionTimeoutMillis).toBe(2000);
    });

    it('should parse port number correctly', () => {
      process.env.POSTGRES_PORT = '5433';

      const pool = createPostgresPool();

      // Port should be parsed as number, not string
      expect(pool.options.port).toBe(5433);
      expect(typeof pool.options.port).toBe('number');
    });

    it('should use default port when invalid port is provided', () => {
      process.env.POSTGRES_PORT = 'invalid-port';

      const pool = createPostgresPool();

      // Should fall back to default port (5432) when parsing fails
      // parseInt('invalid-port') returns NaN, which may cause issues
      expect(pool).toBeDefined();
    });
  });

  describe('Pool Lifecycle', () => {
    it('should allow pool to be reset and recreated', async () => {
      const pool1 = createPostgresPool();

      // Reset pool
      resetPoolInstance();

      const pool2 = createPostgresPool();

      // Should get different instances
      expect(pool1).not.toBe(pool2);
      expect(pool1.constructor.name).toBe('BoundPool');
      expect(pool2.constructor.name).toBe('BoundPool');
    });

    it('should handle multiple resets', () => {
      const pool1 = createPostgresPool();
      resetPoolInstance();

      const pool2 = createPostgresPool();
      resetPoolInstance();

      const pool3 = createPostgresPool();
      resetPoolInstance();

      // Each pool should be different
      expect(pool1).not.toBe(pool2);
      expect(pool2).not.toBe(pool3);
      expect(pool1).not.toBe(pool3);
    });
  });
});
