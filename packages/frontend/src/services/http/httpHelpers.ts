/**
 * Pure helper functions for HTTP operations
 * These functions are extracted from apiClient.ts for better testability and reusability
 */

/**
 * Retry configuration interface
 */
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    retryCondition: (error: unknown) => boolean;
}

// ============================================================================
// Request/Response Helper Functions
// ============================================================================

/**
 * Safely parse JSON from localStorage
 * @param key - The localStorage key to parse
 * @returns Parsed object or null if parsing fails
 */
export const parseAuthStorage = (key: string): Record<string, any> | null => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        return JSON.parse(item);
    } catch {
        return null;
    }
};

/**
 * Create base request headers
 * @param includeAuth - Whether to prepare for auth header (doesn't add token yet)
 * @param baseHeaders - Optional custom headers to merge
 * @returns Headers object
 */
export const createRequestHeaders = (
    includeAuth: boolean,
    baseHeaders?: Record<string, string>
): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...baseHeaders
});

/**
 * Add Authorization header to existing headers (pure function)
 * @param headers - Existing headers
 * @param token - Access token or null
 * @returns New headers object with Authorization if token exists
 */
export const addAuthHeader = (
    headers: Record<string, string>,
    token: string | null
): Record<string, string> => {
    if (!token) return { ...headers };
    return {
        ...headers,
        Authorization: `Bearer ${token}`
    };
};

/**
 * Safely stringify request body
 * @param data - Data to stringify
 * @returns JSON string or undefined
 */
export const buildRequestBody = (data?: unknown): string | undefined => {
    if (data === undefined) return undefined;
    return JSON.stringify(data);
};

/**
 * Safely parse JSON response
 * @param response - Fetch Response object
 * @returns Parsed JSON data
 */
export const parseResponseJson = async <T>(response: Response): Promise<T> => await response.json();

/**
 * Validate data with Zod schema
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated and typed data
 */
export const validateWithSchema = <T>(
    schema: { parse: (data: unknown) => T },
    data: unknown
): T => schema.parse(data);

// ============================================================================
// Retry Logic Helper Functions
// ============================================================================

/**
 * Determine if error should be retried
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns True if should retry
 */
export const shouldRetryError = (error: unknown, config: RetryConfig): boolean => config.retryCondition(error);

/**
 * Exponential backoff delay calculation
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds with jitter
 */
export const calculateDelay = (attempt: number, config: RetryConfig): number => {
    const delay = config.baseDelay * Math.pow(2, attempt);
    return Math.min(delay + Math.random() * 1000, config.maxDelay);
};

/**
 * Sleep utility for delays
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));
