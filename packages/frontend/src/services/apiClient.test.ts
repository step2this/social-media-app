import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiClient,
  parseAuthStorage,
  createRequestHeaders,
  addAuthHeader,
  buildRequestBody,
  parseResponseJson,
  validateWithSchema,
  createZodValidationError,
  classifyHttpError,
  classifyNetworkError,
  shouldRetryError,
  extractErrorMessage,
  calculateDelay,
  sleep,
  safeGetAuthStorage,
  getTokenFromStorage,
  updateStorageTokens,
  clearStorageAuth,
  ApiError,
  NetworkError,
  CorsError,
  ValidationError
} from './apiClient';
import { z } from 'zod';

// Expected API base URL for tests - should match the apiClient's default
const EXPECTED_API_BASE_URL = 'http://localhost:3001';

describe('apiClient HTTP Methods with Token Authentication', () => {
  const createMockStorage = (hasToken = true) => ({
    getItem: vi.fn().mockReturnValue(
      hasToken
        ? JSON.stringify({
            state: {
              tokens: {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token'
              }
            }
          })
        : null
    )
  });

  const mockLocalStorage = (hasToken = true) => {
    Object.defineProperty(window, 'localStorage', {
      value: createMockStorage(hasToken),
      configurable: true
    });
  };

  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  describe('HTTP Methods Availability', () => {
    it('should have all generic HTTP methods available', () => {
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.patch).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
    });

    it('should have auth methods available', () => {
      expect(typeof apiClient.auth.register).toBe('function');
      expect(typeof apiClient.auth.login).toBe('function');
      expect(typeof apiClient.auth.logout).toBe('function');
      expect(typeof apiClient.auth.refreshToken).toBe('function');
      expect(typeof apiClient.auth.getProfile).toBe('function');
      expect(typeof apiClient.auth.updateProfile).toBe('function');
    });
  });

  describe('Token Injection', () => {
    it('should automatically include auth token in GET requests by default', async () => {
      mockLocalStorage(true);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await apiClient.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should automatically include auth token in POST requests by default', async () => {
      mockLocalStorage(true);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await apiClient.post('/test-endpoint', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should not include auth token when includeAuth is false', async () => {
      mockLocalStorage(true);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await apiClient.get('/public-endpoint', false);

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/public-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });

    it('should work with PUT requests', async () => {
      mockLocalStorage(true);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true })
      });

      await apiClient.put('/test-endpoint', { field: 'value' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ field: 'value' }),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should work with DELETE requests', async () => {
      mockLocalStorage(true);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true })
      });

      await apiClient.delete('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should handle requests without token when none is available', async () => {
      mockLocalStorage(false);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await apiClient.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    it('should support all HTTP methods', () => {
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.patch).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
    });

    it('should handle POST requests without data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await apiClient.post('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'POST',
          body: undefined
        })
      );
    });
  });
});

// ============================================================================
// PHASE 1: Pure Helper Functions - Unit Tests
// ============================================================================

describe('Helper Functions - Request/Response Helpers', () => {
  describe('parseAuthStorage', () => {
    it('should return null when localStorage item is empty', () => {
      const mockStorage = { getItem: vi.fn().mockReturnValue(null) };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      const result = parseAuthStorage('auth-storage');

      expect(result).toBeNull();
      expect(mockStorage.getItem).toHaveBeenCalledWith('auth-storage');
    });

    it('should return null when localStorage contains invalid JSON', () => {
      const mockStorage = { getItem: vi.fn().mockReturnValue('invalid-json-{') };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      const result = parseAuthStorage('auth-storage');

      expect(result).toBeNull();
    });

    it('should return parsed object when localStorage contains valid JSON', () => {
      const validData = { state: { tokens: { accessToken: 'test-token' } } };
      const mockStorage = { getItem: vi.fn().mockReturnValue(JSON.stringify(validData)) };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      const result = parseAuthStorage('auth-storage');

      expect(result).toEqual(validData);
    });
  });

  describe('createRequestHeaders', () => {
    it('should create base headers without auth flag', () => {
      
      const headers = createRequestHeaders(false);

      expect(headers).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('should create base headers with auth flag but not add token yet', () => {
      
      const headers = createRequestHeaders(true);

      expect(headers).toEqual({
        'Content-Type': 'application/json'
      });
      expect(headers.Authorization).toBeUndefined();
    });

    it('should merge custom headers with base headers', () => {
      
      const headers = createRequestHeaders(false, {
        'X-Custom-Header': 'custom-value',
        'X-Another': 'another-value'
      });

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
        'X-Another': 'another-value'
      });
    });
  });

  describe('addAuthHeader', () => {
    it('should add Authorization header when token is provided', () => {
      
      const headers = { 'Content-Type': 'application/json' };
      const result = addAuthHeader(headers, 'test-token-123');

      expect(result).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123'
      });
    });

    it('should not add Authorization header when token is null', () => {
      
      const headers = { 'Content-Type': 'application/json' };
      const result = addAuthHeader(headers, null);

      expect(result).toEqual({
        'Content-Type': 'application/json'
      });
      expect(result.Authorization).toBeUndefined();
    });

    it('should not mutate original headers object', () => {
      
      const headers = { 'Content-Type': 'application/json' };
      const result = addAuthHeader(headers, 'test-token');

      expect(headers).toEqual({ 'Content-Type': 'application/json' });
      expect(headers).not.toBe(result);
    });
  });

  describe('buildRequestBody', () => {
    it('should return undefined when data is undefined', () => {
      
      const result = buildRequestBody(undefined);

      expect(result).toBeUndefined();
    });

    it('should stringify object data', () => {
      
      const data = { name: 'test', value: 123 };
      const result = buildRequestBody(data);

      expect(result).toBe(JSON.stringify(data));
    });

    it('should stringify array data', () => {
      
      const data = [1, 2, 3, { key: 'value' }];
      const result = buildRequestBody(data);

      expect(result).toBe(JSON.stringify(data));
    });
  });

  describe('parseResponseJson', () => {
    it('should parse valid JSON response', async () => {
      
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ success: true, data: 'test' })
      };

      const result = await parseResponseJson(mockResponse as any);

      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should handle response.json() errors gracefully', async () => {
      
      const mockResponse = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      await expect(parseResponseJson(mockResponse as any)).rejects.toThrow();
    });

    it('should handle empty response body', async () => {
      
      const mockResponse = {
        json: vi.fn().mockResolvedValue({})
      };

      const result = await parseResponseJson(mockResponse as any);

      expect(result).toEqual({});
    });
  });

  describe('validateWithSchema', () => {
    const TestSchema = z.object({
      name: z.string(),
      age: z.number()
    });

    it('should validate and return data when schema passes', () => {
      
      const data = { name: 'John', age: 30 };
      const result = validateWithSchema(TestSchema, data);

      expect(result).toEqual(data);
    });

    it('should throw error when schema validation fails', () => {
      
      const invalidData = { name: 'John', age: 'thirty' };

      expect(() => validateWithSchema(TestSchema, invalidData)).toThrow();
    });

    it('should strip extra fields with strict schemas', () => {
      
      const dataWithExtra = { name: 'John', age: 30, extra: 'field' };
      const result = validateWithSchema(TestSchema, dataWithExtra);

      expect(result).toEqual({ name: 'John', age: 30 });
      expect((result as any).extra).toBeUndefined();
    });
  });

  describe('createZodValidationError', () => {
    it('should convert ZodError to ValidationError', () => {
      const TestSchema = z.object({ name: z.string() });

      let zodError: z.ZodError | undefined;
      try {
        TestSchema.parse({ name: 123 });
      } catch (error) {
        zodError = error as z.ZodError;
      }

      expect(zodError).toBeDefined();
      const validationError = createZodValidationError(zodError!);

      expect(validationError.name).toBe('ValidationError');
      expect(validationError.message).toContain('validation failed');
      expect(validationError.validationErrors).toBeDefined();
    });

    it('should include validation error details', () => {
      const TestSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      let zodError: z.ZodError | undefined;
      try {
        TestSchema.parse({ name: 123, age: 'invalid' });
      } catch (error) {
        zodError = error as z.ZodError;
      }

      expect(zodError).toBeDefined();
      const validationError = createZodValidationError(zodError!);

      expect(validationError.validationErrors).toBeInstanceOf(Array);
      expect((validationError.validationErrors as any[]).length).toBeGreaterThan(0);
    });
  });
});

describe('Helper Functions - Error Classification Helpers', () => {
  describe('classifyHttpError', () => {
    it('should create ValidationError for 400 status', () => {
      
      const error = classifyHttpError(400, { error: 'Bad Request' });

      expect(error.name).toBe('ValidationError');
      expect(error.status).toBe(400);
    });

    it('should create ApiError for 500 status', () => {
      
      const error = classifyHttpError(500, { error: 'Internal Server Error' });

      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(500);
    });

    it('should create ValidationError for 404 status', () => {
      
      const error = classifyHttpError(404, { error: 'Not Found' });

      expect(error.name).toBe('ValidationError');
      expect(error.status).toBe(404);
    });

    it('should handle error data without message', () => {
      
      const error = classifyHttpError(500, {});

      expect(error.message).toContain('500');
    });
  });

  describe('classifyNetworkError', () => {
    it('should create NetworkError for TypeError', () => {
      
      const error = classifyNetworkError(new TypeError('Failed to fetch'), '/test');

      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should create NetworkError for AbortError', () => {
      
      const abortError = new Error('The operation was aborted');
      (abortError as any).name = 'AbortError';

      const error = classifyNetworkError(abortError, '/test');

      expect(error.name).toBe('NetworkError');
      expect(error.message).toContain('timeout');
    });

    it('should create CorsError when CORS detected', () => {
      
      const corsError = new TypeError('Failed to fetch due to CORS');

      const error = classifyNetworkError(corsError, '/test');

      expect(error.name).toBe('CorsError');
      expect(error.code).toBe('CORS_ERROR');
    });
  });

  describe('shouldRetryError', () => {
    const mockConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error: unknown) => {
        
        if (error instanceof NetworkError) return true;
        if (error instanceof ApiError && error.status && error.status >= 500) return true;
        return false;
      }
    };

    it('should return true for NetworkError', () => {
      
      const error = new NetworkError('Connection failed');

      const result = shouldRetryError(error, mockConfig);

      expect(result).toBe(true);
    });

    it('should return true for 5xx errors', () => {
      
      const error = new ApiError('Server error', 500);

      const result = shouldRetryError(error, mockConfig);

      expect(result).toBe(true);
    });

    it('should return false for 4xx errors', () => {
      
      const error = new ApiError('Bad request', 400);

      const result = shouldRetryError(error, mockConfig);

      expect(result).toBe(false);
    });

    it('should respect custom retry condition', () => {
      
      const customConfig = {
        ...mockConfig,
        retryCondition: () => false
      };
      
      const error = new NetworkError('Connection failed');

      const result = shouldRetryError(error, customConfig);

      expect(result).toBe(false);
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from error object', () => {
      
      const result = extractErrorMessage({ error: 'Custom error' }, 'Fallback');

      expect(result).toBe('Custom error');
    });

    it('should extract message from message property', () => {
      
      const result = extractErrorMessage({ message: 'Another error' }, 'Fallback');

      expect(result).toBe('Another error');
    });

    it('should return fallback when no message found', () => {
      
      const result = extractErrorMessage({}, 'Fallback message');

      expect(result).toBe('Fallback message');
    });
  });
});

describe('Helper Functions - Retry Logic Helpers', () => {
  describe('calculateDelay', () => {
    const mockConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: () => true
    };

    it('should calculate exponential backoff delay', () => {
      
      const delay0 = calculateDelay(0, mockConfig);
      const delay1 = calculateDelay(1, mockConfig);

      // First attempt: baseDelay * 2^0 = 1000
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThan(2000); // + random < 1000

      // Second attempt: baseDelay * 2^1 = 2000
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThan(3000);
    });

    it('should respect maxDelay limit', () => {
      
      const delay = calculateDelay(10, mockConfig); // Would be 1024000 without limit

      expect(delay).toBeLessThanOrEqual(mockConfig.maxDelay + 1000); // + random
    });

    it('should add randomness to prevent thundering herd', () => {
      
      const delays = Array.from({ length: 10 }, () => calculateDelay(0, mockConfig));
      const uniqueDelays = new Set(delays);

      // With randomness, we should get multiple different values
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small margin
      expect(elapsed).toBeLessThan(150);
    });
  });
});

describe('Helper Functions - Token Storage Helpers', () => {
  describe('safeGetAuthStorage', () => {
    it('should safely parse auth-storage from localStorage', () => {
      const validData = { state: { tokens: { accessToken: 'test' } } };
      const mockStorage = { getItem: vi.fn().mockReturnValue(JSON.stringify(validData)) };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      const result = safeGetAuthStorage();

      expect(result).toEqual(validData);
    });

    it('should return null on invalid JSON', () => {
      const mockStorage = { getItem: vi.fn().mockReturnValue('invalid-{') };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      const result = safeGetAuthStorage();

      expect(result).toBeNull();
    });
  });

  describe('getTokenFromStorage', () => {
    it('should extract accessToken from storage', () => {
      const validData = { state: { tokens: { accessToken: 'access-123', refreshToken: 'refresh-456' } } };
      const mockStorage = { getItem: vi.fn().mockReturnValue(JSON.stringify(validData)) };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      const result = getTokenFromStorage('accessToken');

      expect(result).toBe('access-123');
    });

    it('should extract refreshToken from storage', () => {
      const validData = { state: { tokens: { accessToken: 'access-123', refreshToken: 'refresh-456' } } };
      const mockStorage = { getItem: vi.fn().mockReturnValue(JSON.stringify(validData)) };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      const result = getTokenFromStorage('refreshToken');

      expect(result).toBe('refresh-456');
    });

    it('should return null when tokens not present', () => {
      const mockStorage = { getItem: vi.fn().mockReturnValue(null) };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      const result = getTokenFromStorage('accessToken');

      expect(result).toBeNull();
    });
  });

  describe('updateStorageTokens', () => {
    it('should update tokens in localStorage', () => {
      const initialData = { state: { tokens: null } };
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(initialData)),
        setItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      updateStorageTokens('new-access', 'new-refresh');

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'auth-storage',
        expect.stringContaining('new-access')
      );
    });
  });

  describe('clearStorageAuth', () => {
    it('should clear auth data from localStorage', () => {
      const initialData = {
        state: {
          tokens: { accessToken: 'test', refreshToken: 'test' },
          user: { id: '123' },
          isAuthenticated: true
        }
      };
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(initialData)),
        setItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true
      });

      
      clearStorageAuth();

      expect(mockStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
      expect(savedData.state.tokens).toBeNull();
      expect(savedData.state.user).toBeNull();
      expect(savedData.state.isAuthenticated).toBe(false);
    });
  });
});