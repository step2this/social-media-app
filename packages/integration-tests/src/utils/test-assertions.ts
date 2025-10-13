/**
 * Test Assertions Utility
 *
 * Provides DRY (Don't Repeat Yourself) assertion helpers for common test patterns
 * used across integration test files. These higher-order functions encapsulate
 * repetitive error handling and assertion logic.
 *
 * @module test-assertions
 */

import { expect } from 'vitest';

/**
 * Assert that an async operation throws an HTTP 401 Unauthorized error
 *
 * This helper reduces boilerplate for testing authentication failures.
 * Instead of writing try-catch blocks with expect.fail(), use this function
 * to cleanly assert that an operation requires authentication.
 *
 * @param operation - Async function that should throw a 401 error
 * @throws {Error} If the operation does not throw or throws non-401 error
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectUnauthorized(async () => {
 *   await httpClient.post('/likes', { postId: testPostId });
 * });
 * ```
 */
export async function expectUnauthorized(
  operation: () => Promise<any>
): Promise<void> {
  try {
    await operation();
    expect.fail('Expected operation to throw 401 Unauthorized error, but it succeeded');
  } catch (error: any) {
    expect(error.status).toBe(401);
  }
}

/**
 * Assert that an async operation throws an HTTP validation error
 *
 * This helper reduces boilerplate for testing input validation failures.
 * By default, it expects a 400 Bad Request error, but can be configured
 * to expect other error status codes (e.g., 422 Unprocessable Entity).
 *
 * @param operation - Async function that should throw a validation error
 * @param expectedStatus - Expected HTTP status code (defaults to 400)
 * @throws {Error} If the operation does not throw or throws unexpected status
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * // Test 400 Bad Request (default)
 * await expectValidationError(async () => {
 *   await httpClient.post('/comments', { postId: 'invalid', content: '' });
 * });
 *
 * // Test 422 Unprocessable Entity
 * await expectValidationError(async () => {
 *   await httpClient.post('/users', { email: 'invalid-email' });
 * }, 422);
 * ```
 */
export async function expectValidationError(
  operation: () => Promise<any>,
  expectedStatus: number = 400
): Promise<void> {
  try {
    await operation();
    expect.fail(`Expected operation to throw ${expectedStatus} validation error, but it succeeded`);
  } catch (error: any) {
    expect(error.status).toBe(expectedStatus);
  }
}

/**
 * Assert that an operation is idempotent
 *
 * Idempotency is a critical property for many API operations, ensuring that
 * repeated calls with the same parameters produce the same result without
 * side effects. This helper executes the operation twice and asserts both
 * calls succeed, reducing boilerplate for idempotency testing.
 *
 * @param operation - Async function to test for idempotency
 * @returns Promise that resolves when both executions succeed
 *
 * @example
 * ```typescript
 * // Test that liking a post twice is idempotent
 * await expectIdempotent(async () => {
 *   await httpClient.post('/likes',
 *     { postId: testPostId },
 *     { headers: { Authorization: `Bearer ${token}` } }
 *   );
 * });
 *
 * // Test that deleting a comment twice is idempotent
 * await expectIdempotent(async () => {
 *   await httpClient.delete('/comments',
 *     { commentId: testCommentId },
 *     { headers: { Authorization: `Bearer ${token}` } }
 *   );
 * });
 * ```
 */
export async function expectIdempotent(
  operation: () => Promise<any>
): Promise<void> {
  // First execution should succeed
  await operation();

  // Second execution should also succeed (idempotent)
  await operation();
}

/**
 * Assert that an async operation throws a 403 Forbidden error
 *
 * This helper reduces boilerplate for testing authorization failures.
 * Use this when testing operations that require specific permissions
 * or ownership checks.
 *
 * @param operation - Async function that should throw a 403 error
 * @throws {Error} If the operation does not throw or throws non-403 error
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * // Test that non-owner cannot delete comment
 * await expectForbidden(async () => {
 *   await httpClient.delete('/comments',
 *     { commentId: otherUserCommentId },
 *     { headers: { Authorization: `Bearer ${token}` } }
 *   );
 * });
 * ```
 */
export async function expectForbidden(
  operation: () => Promise<any>
): Promise<void> {
  try {
    await operation();
    expect.fail('Expected operation to throw 403 Forbidden error, but it succeeded');
  } catch (error: any) {
    expect(error.status).toBe(403);
  }
}

/**
 * Assert that an async operation throws a 404 Not Found error
 *
 * This helper reduces boilerplate for testing resource not found scenarios.
 * Use this when testing operations on non-existent resources.
 *
 * @param operation - Async function that should throw a 404 error
 * @throws {Error} If the operation does not throw or throws non-404 error
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * // Test that getting non-existent post returns 404
 * await expectNotFound(async () => {
 *   await httpClient.get(`/posts/${nonExistentPostId}`);
 * });
 * ```
 */
export async function expectNotFound(
  operation: () => Promise<any>
): Promise<void> {
  try {
    await operation();
    expect.fail('Expected operation to throw 404 Not Found error, but it succeeded');
  } catch (error: any) {
    expect(error.status).toBe(404);
  }
}
