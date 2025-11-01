/**
 * Test Assertion Helpers
 *
 * Lean assertion helpers for behavior-focused testing.
 * Focus on verifying outputs, not implementation details.
 */

import { expect } from 'vitest';
import type { Result } from '../../src/shared/types/result';

/**
 * Asserts that a connection has the expected structure and optional length.
 */
export function expectValidConnection(connection: any, expectedLength?: number) {
  expect(connection).toHaveProperty('edges');
  expect(connection).toHaveProperty('pageInfo');
  expect(Array.isArray(connection.edges)).toBe(true);

  if (expectedLength !== undefined) {
    expect(connection.edges).toHaveLength(expectedLength);
  }
}

/**
 * Asserts that pageInfo has the required boolean fields.
 */
export function expectValidPageInfo(pageInfo: any) {
  expect(pageInfo).toHaveProperty('hasNextPage');
  expect(pageInfo).toHaveProperty('hasPreviousPage');
  expect(typeof pageInfo.hasNextPage).toBe('boolean');
  expect(typeof pageInfo.hasPreviousPage).toBe('boolean');
}

/**
 * Type guard assertion for successful Result type.
 */
export function expectSuccess<T>(result: Result<T, Error>): asserts result is { success: true; value: T } {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error('Expected success but got failure');
  }
}

/**
 * Type guard assertion for failed Result type.
 */
export function expectFailure<T>(result: Result<T, Error>): asserts result is { success: false; error: Error } {
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error('Expected failure but got success');
  }
  expect(result.error).toBeInstanceOf(Error);
}
