/**
 * @fileoverview Test helper utilities for robust, maintainable tests
 * @module integration-tests/test-helpers
 *
 * This module provides utilities to eliminate brittle test patterns:
 * - Dynamic waiting with conditions instead of fixed delays
 * - UUID generation and validation helpers
 * - Fixed timestamps for deterministic time-based tests
 */

import { randomUUID } from 'crypto';

/**
 * Options for waitForCondition
 */
export interface WaitForConditionOptions {
  /** Maximum time to wait in milliseconds (default: 5000) */
  timeout?: number;
  /** Interval between condition checks in milliseconds (default: 100) */
  interval?: number;
  /** Label for error messages (default: 'condition') */
  label?: string;
}

/**
 * Wait for a condition to become true with timeout
 *
 * This is a robust alternative to fixed delays that:
 * - Polls the condition at regular intervals
 * - Fails fast when condition is met (no unnecessary waiting)
 * - Provides clear error messages on timeout
 * - Prevents race conditions in async tests
 *
 * @param condition - Async function that returns true when condition is met
 * @param options - Configuration options
 * @returns Promise that resolves when condition is met
 * @throws Error if timeout is reached before condition becomes true
 *
 * @example
 * // Wait for event to appear in stream
 * await waitForCondition(
 *   async () => {
 *     const events = await getAllEventsFromStream(...);
 *     return events.some(e => e.postId === expectedPostId);
 *   },
 *   { timeout: 5000, label: 'POST_CREATED event in stream' }
 * );
 *
 * @example
 * // Wait for cache to update
 * await waitForCondition(
 *   async () => {
 *     const cached = await cacheService.getCachedPost(postId);
 *     return cached !== null;
 *   },
 *   { timeout: 3000, interval: 200, label: 'post cached' }
 * );
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  options: WaitForConditionOptions = {}
): Promise<void> {
  const {
    timeout = 5000,
    interval = 100,
    label = 'condition'
  } = options;

  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(
    `Timeout waiting for ${label} after ${timeout}ms`
  );
}

/**
 * Generate valid UUID v4 for tests
 *
 * Provides a consistent interface for UUID generation in tests.
 * Optional seed parameter is ignored (kept for API compatibility)
 * but documents intent when creating related test data.
 *
 * @param seed - Optional label/seed for documentation (not used in generation)
 * @returns Valid UUID v4 string
 *
 * @example
 * const userId = testUUID('test-user');
 * const postId = testUUID('test-post');
 */
export function testUUID(seed?: string): string {
  // Seed parameter is for documentation only
  // We always generate a true random UUID to avoid collisions
  void seed; // Explicitly mark as intentionally unused
  return randomUUID();
}

/**
 * Create fixed timestamp for tests (not relative to now)
 *
 * Uses a fixed base date to ensure deterministic timestamps
 * that don't change between test runs. This prevents tests
 * from breaking due to time-based assertions.
 *
 * Base date: 2025-01-01T00:00:00Z
 *
 * @param offsetMinutes - Minutes to add/subtract from base date (default: 0)
 * @returns ISO 8601 timestamp string
 *
 * @example
 * // Create deterministic timestamps
 * const posts = [
 *   { id: 1, createdAt: fixedTimestamp(0) },    // 2025-01-01 00:00
 *   { id: 2, createdAt: fixedTimestamp(-60) },  // 2025-01-01 00:00 - 1 hour
 *   { id: 3, createdAt: fixedTimestamp(-120) }  // 2025-01-01 00:00 - 2 hours
 * ];
 */
export function fixedTimestamp(offsetMinutes: number = 0): string {
  const BASE = new Date('2025-01-01T00:00:00Z');
  return new Date(BASE.getTime() + offsetMinutes * 60000).toISOString();
}

/**
 * Validate UUID v4 format
 *
 * Checks if a string matches the UUID v4 format specification.
 * Useful for asserting that generated IDs are valid without
 * hardcoding specific values.
 *
 * @param uuid - String to validate
 * @returns True if valid UUID v4 format
 *
 * @example
 * // Assert format instead of exact value
 * expect(isValidUUID(event.eventId)).toBe(true);
 * expect(isValidUUID(post.id)).toBe(true);
 *
 * // Invalid formats
 * expect(isValidUUID('not-a-uuid')).toBe(false);
 * expect(isValidUUID('')).toBe(false);
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Delay execution for a specified number of milliseconds
 *
 * NOTE: Prefer waitForCondition() over this function for test synchronization.
 * Only use delay() when you specifically need a fixed delay (e.g., testing timeouts).
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 *
 * @deprecated Use waitForCondition() for test synchronization
 *
 * @example
 * // ❌ BAD: Fixed delay causes slow, flaky tests
 * await delay(3000);
 * const result = await getResult();
 *
 * // ✅ GOOD: Condition-based waiting
 * await waitForCondition(
 *   async () => (await getResult()) !== null,
 *   { timeout: 5000 }
 * );
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
