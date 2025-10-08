/**
 * Helper utilities for integration tests
 */

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
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

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
