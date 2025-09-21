import { HelloRequestSchema, HelloResponseSchema, type HelloRequest, type HelloResponse } from '@social-media-app/shared';

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
 * Functional API client with automatic validation, retry logic, and comprehensive error handling
 */
const createApiClient = () => {
  const sendRequest = async <T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = defaultRetryConfig
  ): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
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

        // Handle network errors
        if (error instanceof TypeError || error.name === 'AbortError') {
          const networkError = new NetworkError(
            error.name === 'AbortError'
              ? 'Request timeout'
              : 'Network connection failed',
            error
          );
          lastError = networkError;
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
    }
  };
};

export const apiClient = createApiClient();