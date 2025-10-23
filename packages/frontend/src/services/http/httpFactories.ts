/**
 * Factory functions for creating HTTP method wrappers and auth methods
 * These higher-order functions eliminate code duplication in API client creation
 */

import { buildRequestBody, validateWithSchema, type RetryConfig } from './httpHelpers.ts';
import { createZodValidationError } from './httpErrors.ts';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is a Zod validation error
 * Following best practice: use type guards instead of type assertions
 */
function isZodError(error: unknown): error is { name: 'ZodError' } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'ZodError'
    );
}

// ============================================================================
// Type Definitions
// =====================================================================

/**
 * Type for sendRequest function used by factories
 */
export type SendRequestFn = <T>(
    endpoint: string,
    options?: RequestInit,
    retryConfig?: RetryConfig,
    includeAuth?: boolean
) => Promise<T>;

/**
 * Token storage interface for managing authentication tokens
 */
export interface TokenStorage {
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
    setTokens: (accessToken: string, refreshToken: string) => void;
    clearTokens: () => void;
}

/**
 * Schema interface for validation - matches Zod's parse signature
 */
export interface ValidationSchema<T> {
    parse: (data: unknown) => T;
}

/**
 * Configuration for authenticated API method factory
 */
export interface AuthMethodConfig<TReq, TRes> {
    endpoint: string;
    method?: string;
    requestSchema: ValidationSchema<TReq>;
    responseSchema: ValidationSchema<TRes>;
    includeAuth?: boolean;
    onSuccess?: (response: TRes, tokenStorage: TokenStorage) => void;
    onError?: (error: unknown, tokenStorage: TokenStorage) => void;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Factory function to create HTTP method wrappers
 * Eliminates duplication across get, post, put, patch, delete methods
 *
 * Uses function overloads for proper type narrowing based on HTTP method
 *
 * @param method - HTTP method name
 * @returns Function that creates method wrapper with sendRequest and retryConfig
 *
 * @example
 * // GET method - no data parameter
 * const get = createHttpMethod('GET')(sendRequest, retryConfig);
 * const data = await get<User>('/users/123', true);
 *
 * @example
 * // POST method - includes data parameter
 * const post = createHttpMethod('POST')(sendRequest, retryConfig);
 * const result = await post<User>('/users', { name: 'John' }, true);
 */

// Overload signature for GET method (no data parameter)
export function createHttpMethod(method: 'GET'): <T>(
  sendRequest: SendRequestFn,
  retryConfig: RetryConfig
) => (endpoint: string, includeAuth?: boolean) => Promise<T>;

// Overload signature for POST/PUT/PATCH/DELETE methods (includes data parameter)
export function createHttpMethod(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'): <T>(
  sendRequest: SendRequestFn,
  retryConfig: RetryConfig
) => (endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>;

// Implementation signature
export function createHttpMethod(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') {
  return <T>(sendRequest: SendRequestFn, retryConfig: RetryConfig) => {
    if (method === 'GET') {
      return async (endpoint: string, includeAuth: boolean = true): Promise<T> =>
        sendRequest<T>(endpoint, { method }, retryConfig, includeAuth);
    }

    return async (endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> =>
      sendRequest<T>(
        endpoint,
        {
          method,
          body: buildRequestBody(data)
        },
        retryConfig,
        includeAuth
      );
  };
}

/**
 * Factory function to create authenticated API method wrappers
 * Eliminates duplication across register, login, logout, etc.
 *
 * @param config - Configuration for the auth method
 * @returns Curried function that accepts sendRequest, tokenStorage, and retryConfig
 *
 * @example
 * const login = createAuthMethod({
 *   endpoint: '/auth/login',
 *   requestSchema: LoginRequestSchema,
 *   responseSchema: LoginResponseSchema,
 *   onSuccess: (response, storage) => storage.setTokens(response.tokens)
 * })(sendRequest, tokenStorage, retryConfig);
 *
 * const result = await login({ email: 'user@example.com', password: 'pass' });
 */
export const createAuthMethod = <TReq, TRes>(config: AuthMethodConfig<TReq, TRes>) => (
    sendRequest: SendRequestFn,
    tokenStorage: TokenStorage,
    retryConfig: RetryConfig
) => async (request: TReq): Promise<TRes> => {
    try {
        const validatedRequest = validateWithSchema(config.requestSchema, request);

        const response = await sendRequest<TRes>(
            config.endpoint,
            {
                method: config.method || 'POST',
                body: buildRequestBody(validatedRequest)
            },
            retryConfig,
            config.includeAuth || false
        );

        const validatedResponse = validateWithSchema(config.responseSchema, response);

        if (config.onSuccess) {
            config.onSuccess(validatedResponse, tokenStorage);
        }

        return validatedResponse;
    } catch (error) {
        if (config.onError) {
            config.onError(error, tokenStorage);
        }

        if (isZodError(error)) {
            throw createZodValidationError(error);
        }

        throw error;
    }
};
