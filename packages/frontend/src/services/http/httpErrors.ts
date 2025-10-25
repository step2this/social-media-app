/**
 * HTTP Error Classes and Classification
 *
 * Custom error types for better error handling and classification.
 * These errors are used throughout the HTTP client for consistent error handling.
 */

/**
 * Base API error class
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Network/connectivity error
 */
export class NetworkError extends ApiError {
    constructor(message: string, public originalError?: unknown) {
        super(message, undefined, 'NETWORK_ERROR');
        this.name = 'NetworkError';
    }
}

/**
 * CORS-specific error
 */
export class CorsError extends NetworkError {
    constructor(message: string, public origin?: string, public requestedUrl?: string) {
        super(message, undefined);
        this.name = 'CorsError';
        this.code = 'CORS_ERROR';
    }

    // Add url getter for backwards compatibility
    get url(): string | undefined {
        return this.requestedUrl;
    }
}

/**
 * Validation error (400-level errors)
 */
export class ValidationError extends ApiError {
    constructor(message: string, public validationErrors?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', validationErrors);
        this.name = 'ValidationError';
    }
}

/**
 * Classify HTTP error based on status code
 * @param status - HTTP status code
 * @param data - Error response data
 * @returns Appropriate error instance
 */
export const classifyHttpError = (status: number, data: any): ApiError => {
    const message = data.error || data.message || `HTTP ${status}`;

    if (status >= 400 && status < 500) {
        const error = new ValidationError(message, data.details);
        // Manually set status since ValidationError constructor doesn't accept it
        (error as any).status = status;
        return error;
    }

    return new ApiError(message, status, 'SERVER_ERROR', data);
};

/**
 * Classify network/fetch errors
 * @param error - Original error
 * @param endpoint - API endpoint
 * @param apiBaseUrl - Base URL for API (defaults to localhost:3001)
 * @returns Appropriate error instance
 */
export const classifyNetworkError = (
    error: unknown,
    endpoint: string,
    apiBaseUrl: string = 'http://localhost:3001'
): NetworkError | CorsError => {
    const errorName = (error as any).name;
    const errorMessage = (error as any).message || '';
    const fullUrl = `${apiBaseUrl}${endpoint}`;

    // AbortError = timeout
    if (errorName === 'AbortError') {
        return new NetworkError(`Request timeout for ${fullUrl}`, error);
    }

    // Check for CORS issues - only if message explicitly mentions CORS
    // Don't trigger on generic "fetch" messages
    if (errorMessage.includes('CORS')) {
        return new CorsError(
            `Failed to connect to API. This might be a CORS issue. Check that VITE_API_URL (${apiBaseUrl}) is correct and accessible.`,
            typeof window !== 'undefined' ? window.location.origin : undefined,
            fullUrl
        );
    }

    // Default network error - include URL for debugging
    return new NetworkError(`Network connection failed for ${fullUrl}`, error);
};

/**
 * Convert ZodError to ValidationError
 * @param zodError - Zod validation error
 * @returns ValidationError instance
 */
export const createZodValidationError = (zodError: any): ValidationError =>
    new ValidationError('Request validation failed', zodError.issues);

/**
 * Extract error message from error data
 * @param data - Error response data
 * @param fallback - Fallback message
 * @returns Error message string
 */
export const extractErrorMessage = (data: any, fallback: string): string =>
    data?.error || data?.message || fallback;
