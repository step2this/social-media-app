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
  UpdateProfileRequestSchema,
  UpdateProfileResponseSchema,
  GetProfileResponseSchema,
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
  type UpdateProfileRequest,
  type UpdateProfileResponse,
  type GetProfileResponse
} from '@social-media-app/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.baseDelay * Math.pow(2, attempt);
  return Math.min(delay + Math.random() * 1000, config.maxDelay);
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

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

  const sendRequest = async <T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = defaultRetryConfig,
    includeAuth: boolean = false
  ): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options.headers as Record<string, string>
        };

        // Add authorization header if needed
        if (includeAuth) {
          const accessToken = tokenStorage.getAccessToken();
          if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
          }
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status}`
          }));

          if (response.status >= 400 && response.status < 500) {
            throw new ValidationError(
              errorData.error || `Client error: ${response.status}`,
              errorData.details
            );
          } else {
            throw new ApiError(
              errorData.error || `Server error: ${response.status}`,
              response.status,
              'SERVER_ERROR',
              errorData
            );
          }
        }

        return response.json();

      } catch (error) {
        lastError = error;

        // Handle network errors and CORS issues
        if (error instanceof TypeError || error.name === 'AbortError') {
          // Check if this is a CORS error
          if (error.message.includes('CORS') || error.message.includes('fetch')) {
            const corsError = new CorsError(
              `Failed to connect to API. This might be a CORS issue. Check that VITE_API_URL (${API_BASE_URL}) is correct and accessible.`,
              window.location.origin,
              `${API_BASE_URL}${endpoint}`
            );
            lastError = corsError;
          } else {
            const networkError = new NetworkError(
              error.name === 'AbortError'
                ? 'Request timeout'
                : 'Network connection failed',
              error
            );
            lastError = networkError;
          }
        }

        // Check if we should retry
        if (attempt < retryConfig.maxRetries && retryConfig.retryCondition(lastError)) {
          const delay = calculateDelay(attempt, retryConfig);
          console.warn(`API request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${delay}ms...`, lastError);
          await sleep(delay);
          continue;
        }

        // No more retries, throw the last error
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
        if (error?.name === 'ZodError') {
          throw new ValidationError('Request validation failed', error.errors);
        }
        throw error;
      }
    },

    /**
     * Health check endpoint
     */
    healthCheck: async (): Promise<{ status: string; timestamp: string; service: string }> => {
      return sendRequest('/health', { method: 'GET' });
    },

    /**
     * Development utilities (only available in development mode)
     */
    dev: import.meta.env.DEV ? {
      /**
       * Clear all mock data (users and tokens)
       */
      clearMockData: async (): Promise<{ message: string; cleared: { users: number; tokens: number } }> => {
        return sendRequest('/dev/reset-mock-data', { method: 'DELETE' });
      },

      /**
       * List all mock users
       */
      listMockUsers: async (): Promise<{ users: Array<{ id: string; email: string; username: string; fullName?: string; createdAt: string }>; count: number }> => {
        return sendRequest('/dev/users', { method: 'GET' });
      }
    } : undefined,

    /**
     * Authentication API methods
     */
    auth: {
      register: async (request: RegisterRequest): Promise<RegisterResponse> => {
        try {
          const validatedRequest = RegisterRequestSchema.parse(request);
          const response = await sendRequest<RegisterResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(validatedRequest)
          });
          return RegisterResponseSchema.parse(response);
        } catch (error) {
          if (error?.name === 'ZodError') {
            throw new ValidationError('Request validation failed', error.errors);
          }
          throw error;
        }
      },

      login: async (request: LoginRequest): Promise<LoginResponse> => {
        try {
          const validatedRequest = LoginRequestSchema.parse(request);
          const response = await sendRequest<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(validatedRequest)
          });
          const validatedResponse = LoginResponseSchema.parse(response);

          // Store tokens after successful login
          tokenStorage.setTokens(
            validatedResponse.tokens.accessToken,
            validatedResponse.tokens.refreshToken
          );

          return validatedResponse;
        } catch (error) {
          if (error?.name === 'ZodError') {
            throw new ValidationError('Request validation failed', error.errors);
          }
          throw error;
        }
      },

      refreshToken: async (request: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
        try {
          const validatedRequest = RefreshTokenRequestSchema.parse(request);
          const response = await sendRequest<RefreshTokenResponse>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify(validatedRequest)
          });
          const validatedResponse = RefreshTokenResponseSchema.parse(response);

          // Update stored tokens
          tokenStorage.setTokens(
            validatedResponse.tokens.accessToken,
            validatedResponse.tokens.refreshToken
          );

          return validatedResponse;
        } catch (error) {
          if (error?.name === 'ZodError') {
            throw new ValidationError('Request validation failed', error.errors);
          }
          throw error;
        }
      },

      logout: async (request: LogoutRequest): Promise<LogoutResponse> => {
        try {
          const validatedRequest = LogoutRequestSchema.parse(request);
          const response = await sendRequest<LogoutResponse>('/auth/logout', {
            method: 'POST',
            body: JSON.stringify(validatedRequest)
          }, defaultRetryConfig, true); // Include auth header

          const validatedResponse = LogoutResponseSchema.parse(response);

          // Clear stored tokens after successful logout
          tokenStorage.clearTokens();

          return validatedResponse;
        } catch (error) {
          // Clear tokens even if logout fails
          tokenStorage.clearTokens();

          if (error?.name === 'ZodError') {
            throw new ValidationError('Request validation failed', error.errors);
          }
          throw error;
        }
      },

      getProfile: async (): Promise<GetProfileResponse> => {
        const response = await sendRequest<GetProfileResponse>('/auth/profile', {
          method: 'GET'
        }, defaultRetryConfig, true); // Include auth header

        return GetProfileResponseSchema.parse(response);
      },

      updateProfile: async (request: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
        try {
          const validatedRequest = UpdateProfileRequestSchema.parse(request);
          const response = await sendRequest<UpdateProfileResponse>('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(validatedRequest)
          }, defaultRetryConfig, true); // Include auth header

          return UpdateProfileResponseSchema.parse(response);
        } catch (error) {
          if (error?.name === 'ZodError') {
            throw new ValidationError('Request validation failed', error.errors);
          }
          throw error;
        }
      }
    }
  };
};

export const apiClient = createApiClient();