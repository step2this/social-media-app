/**
 * Helper utilities for integration tests
 */

/**
 * Standard stream processing delay for LocalStack DynamoDB Streams
 * Use this constant instead of magic numbers throughout tests
 *
 * @example
 * // Wait for stream processor to update counts
 * await delay(STREAM_DELAY);
 */
export const STREAM_DELAY = 3000;

/**
 * Delay execution for a specified number of milliseconds
 * Useful for waiting for eventual consistency in stream processors
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 *
 * @example
 * // Wait for stream processor to update counts
 * await delay(3000);
 * // Or use the constant:
 * await delay(STREAM_DELAY);
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Build authorization header object for HTTP requests
 * Eliminates repetitive inline header construction
 *
 * @param token - JWT access token
 * @returns Header object with Authorization Bearer token
 *
 * @example
 * const response = await httpClient.post(
 *   '/posts',
 *   postData,
 *   authHeader(userToken)
 * );
 */
export const authHeader = (token: string): { headers: { Authorization: string } } => ({
  headers: { Authorization: `Bearer ${token}` }
});

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 1000)
 * @returns Promise with the result of the function
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
};
