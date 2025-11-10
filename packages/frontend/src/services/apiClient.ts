import {
  HelloRequestSchema,
  HelloResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RefreshTokenRequestSchema,
  RefreshTokenResponseSchema,
  LogoutRequestSchema,
  LogoutResponseSchema,
  UpdateUserRequestSchema,
  UpdateUserResponseSchema,
  ProfileResponseSchema,
  type HelloRequest,
  type HelloResponse,
  type RegisterRequest,
  type RegisterResponse,
  type LoginRequest,
  type LoginResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type LogoutRequest,
  type LogoutResponse,
  type UpdateUserRequest,
  type UpdateUserResponse,
  type ProfileResponse
} from '@social-media-app/shared';
import {
  ApiError,
  CorsError,
  NetworkError,
  ValidationError,
  classifyHttpError,
  classifyNetworkError,
  createZodValidationError
} from './http/httpErrors.ts';
import {
  parseAuthStorage,
  createRequestHeaders,
  addAuthHeader,
  buildRequestBody,
  parseResponseJson,
  validateWithSchema,
  shouldRetryError,
  calculateDelay,
  sleep,
  type RetryConfig
} from './http/httpHelpers.ts';
import {
  createHttpMethod,
  createAuthMethod,
  type SendRequestFn,
  type TokenStorage,
  type AuthMethodConfig
} from './http/httpFactories.ts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Log API configuration on startup
console.log('🌐 API Client Configuration:', {
  API_BASE_URL,
  environment: import.meta.env.MODE,
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV
});

// ============================================================================
// Re-export classes, functions, and types for backward compatibility
// ============================================================================

export { ApiError, CorsError, NetworkError, ValidationError };
export {
  parseAuthStorage,
  createRequestHeaders,
  addAuthHeader,
  buildRequestBody,
  parseResponseJson,
  validateWithSchema,
  shouldRetryError,
  calculateDelay,
  sleep
};
export { createHttpMethod, createAuthMethod, type SendRequestFn, type TokenStorage, type AuthMethodConfig };

// ============================================================================
// Configuration
// ============================================================================

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryCondition: (error) => {
    if (error instanceof NetworkError) return true;
    if (error instanceof ApiError && error.status && error.status >= 500) return true;
    return false;
  }
};

// ============================================================================
// Token Storage Helper Functions
// ============================================================================

/**
 * Safely get and parse auth-storage from localStorage
 * @returns Parsed auth storage or null
 */
export const safeGetAuthStorage = (): Record<string, any> | null => parseAuthStorage('auth-storage');

/**
 * Get specific token from storage
 * @param key - Token key ('accessToken' or 'refreshToken')
 * @returns Token string or null
 */
export const getTokenFromStorage = (key: 'accessToken' | 'refreshToken'): string | null => {
  const authStorage = safeGetAuthStorage();
  if (!authStorage) return null;
  return authStorage.state?.tokens?.[key] || null;
};

/**
 * Update tokens in localStorage
 * @param accessToken - New access token
 * @param refreshToken - New refresh token
 */
export const updateStorageTokens = (accessToken: string, refreshToken: string): void => {
  try {
    const authStorage = safeGetAuthStorage();
    if (authStorage) {
      authStorage.state.tokens = { accessToken, refreshToken, expiresIn: 900 };
      localStorage.setItem('auth-storage', JSON.stringify(authStorage));
    }
  } catch {
    // Handle storage errors gracefully
  }
};

/**
 * Clear all auth data from localStorage
 */
export const clearStorageAuth = (): void => {
  try {
    const authStorage = safeGetAuthStorage();
    if (authStorage) {
      authStorage.state.tokens = null;
      authStorage.state.user = null;
      authStorage.state.isAuthenticated = false;
      localStorage.setItem('auth-storage', JSON.stringify(authStorage));
    }
  } catch {
    // Handle storage errors gracefully
  }
};

/**
 * Helper to safely read a value from auth storage
 * @param selector - Function to extract value from state
 * @returns Extracted value or null
 */
const getAuthStorageValue = <T>(selector: (state: any) => T | null | undefined): T | null => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;
    const parsed = JSON.parse(authStorage);
    return selector(parsed.state) || null;
  } catch {
    return null;
  }
};

/**
 * Helper to safely update auth storage
 * @param updater - Function that modifies the parsed storage
 */
const updateAuthStorage = (updater: (parsed: any) => void): void => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      updater(parsed);
      localStorage.setItem('auth-storage', JSON.stringify(parsed));
    }
  } catch {
    // Handle storage errors gracefully
  }
};

// ============================================================================
// Token Storage Implementation
// ============================================================================

/**
 * Default token storage using localStorage
 */
const defaultTokenStorage: TokenStorage = {
  getAccessToken: () => getAuthStorageValue((state) => state?.tokens?.accessToken),
  getRefreshToken: () => getAuthStorageValue((state) => state?.tokens?.refreshToken),
  setTokens: (accessToken: string, refreshToken: string) => {
    updateAuthStorage((parsed) => {
      parsed.state.tokens = { accessToken, refreshToken, expiresIn: 900 };
    });
  },
  clearTokens: () => {
    updateAuthStorage((parsed) => {
      parsed.state.tokens = null;
      parsed.state.user = null;
      parsed.state.isAuthenticated = false;
    });
  }
};

// ============================================================================
// API Client Factory
// ============================================================================

/**
 * Functional API client with automatic validation, retry logic, and comprehensive error handling
 */
const createApiClient = (tokenStorage: TokenStorage = defaultTokenStorage) => {
  if (!API_BASE_URL || API_BASE_URL.includes('yourdomain.com')) {
    console.warn('⚠️  API URL not properly configured. Using:', API_BASE_URL);
    console.warn('💡 Set VITE_API_URL environment variable to the correct API Gateway URL');
  }

  /**
   * Core request function with retry logic and error handling
   * Refactored to use pure helper functions for better testability
   */
  const sendRequest: SendRequestFn = async <T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = defaultRetryConfig,
    includeAuth: boolean = false
  ): Promise<T> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`🔵 [${requestId}] API Request:`, {
      endpoint,
      method: options.method || 'GET',
      url: `${API_BASE_URL}${endpoint}`,
      includeAuth,
      hasBody: !!options.body
    });

    let lastError: unknown;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let headers = createRequestHeaders(includeAuth, options.headers as Record<string, string>);
        if (includeAuth) {
          const token = tokenStorage.getAccessToken();
          headers = addAuthHeader(headers, token);
          if (token) console.log(`🔑 [${requestId}] Adding auth token to request`);
        }

        console.log(`📤 [${requestId}] Sending request (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})...`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`📥 [${requestId}] Response received:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await parseResponseJson(response).catch(() => ({
            error: `HTTP ${response.status}`
          }));

          console.error(`❌ [${requestId}] Request failed:`, {
            status: response.status,
            errorData
          });

          throw classifyHttpError(response.status, errorData);
        }

        const responseData = await parseResponseJson<T>(response);
        console.log(`✅ [${requestId}] Request successful:`, responseData);
        return responseData;

      } catch (error) {
        if (error instanceof TypeError || (error as any).name === 'AbortError') {
          lastError = classifyNetworkError(error, endpoint, API_BASE_URL);
        } else {
          lastError = error;
        }

        if (attempt < retryConfig.maxRetries && shouldRetryError(lastError, retryConfig)) {
          const delay = calculateDelay(attempt, retryConfig);
          console.warn(`API request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${delay}ms...`, lastError);
          await sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError;
  };

  return {
    sendHello: async (request: HelloRequest): Promise<HelloResponse> => {
      try {
        const validatedRequest = HelloRequestSchema.parse(request);

        const response = await sendRequest<HelloResponse>('/hello', {
          method: 'POST',
          body: JSON.stringify(validatedRequest)
        });

        return HelloResponseSchema.parse(response);
      } catch (error) {
        if ((error as any)?.name === 'ZodError') {
          throw createZodValidationError(error);
        }
        throw error;
      }
    },

    /**
     * Health check endpoint
     */
    healthCheck: async (): Promise<{ status: string; timestamp: string; service: string }> => sendRequest('/health', { method: 'GET' }),

    /**
     * Development utilities (only available in development mode)
     */
    dev: import.meta.env.DEV ? {
      /**
       * Clear all mock data (users and tokens)
       */
      clearMockData: async (): Promise<{ message: string; cleared: { users: number; tokens: number } }> => sendRequest('/dev/reset-mock-data', { method: 'DELETE' }),

      /**
       * List all mock users
       */
      listMockUsers: async (): Promise<{ users: Array<{ id: string; email: string; username: string; fullName?: string; createdAt: string }>; count: number }> => sendRequest('/dev/users', { method: 'GET' })
    } : undefined,

    /**
     * Generic HTTP methods with automatic token injection
     */
    get: (async <T>(endpoint: string, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'GET' }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, includeAuth?: boolean) => Promise<T>,

    post: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'POST', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    put: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'PUT', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    patch: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'PATCH', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    delete: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'DELETE', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    /**
     * Authentication API methods
     */
    auth: {
      register: createAuthMethod<RegisterRequest, RegisterResponse>({
        endpoint: '/auth/register',
        requestSchema: RegisterRequestSchema,
        responseSchema: RegisterResponseSchema,
        onSuccess: (response, storage) => {
          if (response.tokens) {
            storage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
          }
        }
      })(sendRequest, tokenStorage, defaultRetryConfig),

      login: createAuthMethod<LoginRequest, LoginResponse>({
        endpoint: '/auth/login',
        requestSchema: LoginRequestSchema,
        responseSchema: LoginResponseSchema,
        onSuccess: (response, storage) => {
          storage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        }
      })(sendRequest, tokenStorage, defaultRetryConfig),

      refreshToken: createAuthMethod<RefreshTokenRequest, RefreshTokenResponse>({
        endpoint: '/auth/refresh',
        requestSchema: RefreshTokenRequestSchema,
        responseSchema: RefreshTokenResponseSchema,
        onSuccess: (response, storage) => {
          storage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        }
      })(sendRequest, tokenStorage, defaultRetryConfig),

      logout: createAuthMethod<LogoutRequest, LogoutResponse>({
        endpoint: '/auth/logout',
        requestSchema: LogoutRequestSchema,
        responseSchema: LogoutResponseSchema,
        includeAuth: true,
        onSuccess: (_response, storage) => {
          storage.clearTokens();
        },
        onError: (_error, storage) => {
          storage.clearTokens();
        }
      })(sendRequest, tokenStorage, defaultRetryConfig),

      getProfile: async (): Promise<ProfileResponse> => {
        const response = await sendRequest<ProfileResponse>(
          '/auth/profile',
          { method: 'GET' },
          defaultRetryConfig,
          true
        );
        return validateWithSchema(ProfileResponseSchema, response);
      },

      updateProfile: createAuthMethod<UpdateUserRequest, UpdateUserResponse>({
        endpoint: '/auth/profile',
        method: 'PUT',
        requestSchema: UpdateUserRequestSchema,
        responseSchema: UpdateUserResponseSchema,
        includeAuth: true
      })(sendRequest, tokenStorage, defaultRetryConfig)
    }
  };
};

export const apiClient = createApiClient();
