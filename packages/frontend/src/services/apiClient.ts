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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Log API configuration on startup
console.log('🌐 API Client Configuration:', {
  API_BASE_URL,
  environment: import.meta.env.MODE,
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV
});

/**
 * Custom error classes for better error handling
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

export class CorsError extends ApiError {
  constructor(message: string, public origin?: string, public requestedUrl?: string) {
    super(`CORS Error: ${message}`, undefined, 'CORS_ERROR');
    this.name = 'CorsError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, public originalError?: unknown) {
    super(message, undefined, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public validationErrors?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', validationErrors);
    this.name = 'ValidationError';
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition: (error: unknown) => boolean;
}

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

/**
 * Exponential backoff delay
 */
export const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.baseDelay * Math.pow(2, attempt);
  return Math.min(delay + Math.random() * 1000, config.maxDelay);
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// PHASE 1: Pure Helper Functions
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

/**
 * Convert ZodError to ValidationError
 * @param zodError - Zod validation error
 * @returns ValidationError instance
 */
export const createZodValidationError = (zodError: any): ValidationError => new ValidationError('Request validation failed', zodError.issues);

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
 * @returns Appropriate error instance
 */
export const classifyNetworkError = (error: unknown, endpoint: string): NetworkError | CorsError => {
  const errorName = (error as any).name;
  const errorMessage = (error as any).message || '';

  // AbortError = timeout
  if (errorName === 'AbortError') {
    return new NetworkError('Request timeout', error);
  }

  // Check for CORS issues - only if message explicitly mentions CORS
  // Don't trigger on generic "fetch" messages
  if (errorMessage.includes('CORS')) {
    return new CorsError(
      `Failed to connect to API. This might be a CORS issue. Check that VITE_API_URL (${API_BASE_URL}) is correct and accessible.`,
      window.location.origin,
      `${API_BASE_URL}${endpoint}`
    );
  }

  // Default network error
  return new NetworkError('Network connection failed', error);
};

/**
 * Determine if error should be retried
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns True if should retry
 */
export const shouldRetryError = (error: unknown, config: RetryConfig): boolean => config.retryCondition(error);

/**
 * Extract error message from error data
 * @param data - Error response data
 * @param fallback - Fallback message
 * @returns Error message string
 */
export const extractErrorMessage = (data: any, fallback: string): string => data.error || data.message || fallback;

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

// ============================================================================
// PHASE 2: Higher-Order Functions / Factories
// ============================================================================

/**
 * Type for sendRequest function
 */
type SendRequestFn = <T>(
  endpoint: string,
  options?: RequestInit,
  retryConfig?: RetryConfig,
  includeAuth?: boolean
) => Promise<T>;

/**
 * Factory function to create HTTP method wrappers
 * Eliminates duplication across get, post, put, patch, delete methods
 *
 * @param method - HTTP method name
 * @returns Function that performs the HTTP request
 */
export const createHttpMethod = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => <T>(
    sendRequest: SendRequestFn,
    retryConfig: RetryConfig
  ) => {
    // GET method doesn't accept data
    if (method === 'GET') {
      return async (endpoint: string, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method }, retryConfig, includeAuth);
    }

    // Other methods accept optional data
    return async (endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(
        endpoint,
        {
          method,
          body: buildRequestBody(data)
        },
        retryConfig,
        includeAuth
      );
  };

/**
 * Configuration for auth method factory
 */
interface AuthMethodConfig<TReq, TRes> {
  endpoint: string;
  method?: string;
  requestSchema: { parse: (data: unknown) => TReq };
  responseSchema: { parse: (data: unknown) => TRes };
  includeAuth?: boolean;
  onSuccess?: (response: TRes, tokenStorage: TokenStorage) => void;
  onError?: (error: unknown, tokenStorage: TokenStorage) => void;
}

/**
 * Factory function to create authenticated API method wrappers
 * Eliminates duplication across register, login, logout, etc.
 *
 * @param config - Configuration for the auth method
 * @returns Async function that performs the authenticated request
 */
export const createAuthMethod = <TReq, TRes>(config: AuthMethodConfig<TReq, TRes>) => (sendRequest: SendRequestFn, tokenStorage: TokenStorage, retryConfig: RetryConfig) => async (request: TReq): Promise<TRes> => {
      try {
        // Validate request
        const validatedRequest = validateWithSchema(config.requestSchema, request);

        // Send request
        const response = await sendRequest<TRes>(
          config.endpoint,
          {
            method: config.method || 'POST',
            body: buildRequestBody(validatedRequest)
          },
          retryConfig,
          config.includeAuth || false
        );

        // Validate response
        const validatedResponse = validateWithSchema(config.responseSchema, response);

        // Handle success callback (e.g., token storage)
        if (config.onSuccess) {
          config.onSuccess(validatedResponse, tokenStorage);
        }

        return validatedResponse;
      } catch (error) {
        // Handle error callback (e.g., clear tokens on logout failure)
        if (config.onError) {
          config.onError(error, tokenStorage);
        }

        // Convert Zod errors
        if ((error as any)?.name === 'ZodError') {
          throw createZodValidationError(error);
        }

        throw error;
      }
    };

/**
 * Token storage interface
 */
interface TokenStorage {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

/**
 * Default token storage using localStorage
 */
const defaultTokenStorage: TokenStorage = {
  getAccessToken: () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return null;
      const parsed = JSON.parse(authStorage);
      return parsed.state?.tokens?.accessToken || null;
    } catch {
      return null;
    }
  },
  getRefreshToken: () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return null;
      const parsed = JSON.parse(authStorage);
      return parsed.state?.tokens?.refreshToken || null;
    } catch {
      return null;
    }
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        parsed.state.tokens = { accessToken, refreshToken, expiresIn: 900 };
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }
    } catch {
      // Handle storage errors gracefully
    }
  },
  clearTokens: () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        parsed.state.tokens = null;
        parsed.state.user = null;
        parsed.state.isAuthenticated = false;
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }
    } catch {
      // Handle storage errors gracefully
    }
  }
};

/**
 * Functional API client with automatic validation, retry logic, and comprehensive error handling
 */
const createApiClient = (tokenStorage: TokenStorage = defaultTokenStorage) => {
  // Validate API configuration at startup
  if (!API_BASE_URL || API_BASE_URL.includes('yourdomain.com')) {
    console.warn('⚠️  API URL not properly configured. Using:', API_BASE_URL);
    console.warn('💡 Set VITE_API_URL environment variable to the correct API Gateway URL');
  }

  /**
   * Core request function with retry logic and error handling
   * Refactored to use pure helper functions for better testability
   */
  const sendRequest = async <T>(
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

        // Use helper functions for headers
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

        // Handle error responses
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
        // Classify network/fetch errors using helper
        if (error instanceof TypeError || (error as any).name === 'AbortError') {
          lastError = classifyNetworkError(error, endpoint);
        } else {
          lastError = error;
        }

        // Check if we should retry
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
        // Validate request
        const validatedRequest = HelloRequestSchema.parse(request);

        // Send request
        const response = await sendRequest<HelloResponse>('/hello', {
          method: 'POST',
          body: JSON.stringify(validatedRequest)
        });

        // Validate response
        return HelloResponseSchema.parse(response);
      } catch (error) {
        // Convert Zod validation errors to our custom ValidationError
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
     * Generated using createHttpMethod factory to eliminate duplication
     */
    get: (async <T>(endpoint: string, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'GET' }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, includeAuth?: boolean) => Promise<T>,

    post: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'POST', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    put: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'PUT', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    patch: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'PATCH', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    delete: (async <T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => sendRequest<T>(endpoint, { method: 'DELETE', body: buildRequestBody(data) }, defaultRetryConfig, includeAuth)) as <T>(endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>,

    /**
     * Authentication API methods
     * Generated using createAuthMethod factory to eliminate duplication
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
        onSuccess: (response, storage) => {
          storage.clearTokens();
        },
        onError: (error, storage) => {
          // Clear tokens even if logout fails
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