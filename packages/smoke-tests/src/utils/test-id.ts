/**
 * Generate unique test IDs for data isolation
 */

/**
 * Generate a unique test ID for isolating test data
 * Format: smoke-test-{timestamp}-{random}
 *
 * @returns A unique test identifier safe for use in emails, usernames, etc.
 */
export function generateTestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `smoke-test-${timestamp}-${random}`;
}