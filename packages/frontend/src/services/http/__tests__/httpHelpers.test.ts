import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
    parseAuthStorage,
    createRequestHeaders,
    addAuthHeader,
    buildRequestBody,
    parseResponseJson,
    validateWithSchema,
    shouldRetryError,
    calculateDelay,
    sleep
} from '../httpHelpers.ts';
import { NetworkError, ApiError } from '../httpErrors.ts';

// ============================================================================
// Test Helpers and Constants
// ============================================================================

const STORAGE_KEY = 'auth-storage';
const BASE_HEADERS = { 'Content-Type': 'application/json' };
const TEST_TOKEN = 'test-token-123';

const createMockLocalStorage = (returnValue: string | null) => ({
    getItem: vi.fn().mockReturnValue(returnValue)
});

const setupLocalStorageMock = (returnValue: string | null) => {
    Object.defineProperty(window, 'localStorage', {
        value: createMockLocalStorage(returnValue),
        configurable: true
    });
};

const createMockResponse = (jsonValue: unknown, shouldReject = false) => ({
    json: shouldReject
        ? vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        : vi.fn().mockResolvedValue(jsonValue)
});

// ============================================================================
// Request/Response Helper Functions
// ============================================================================

describe('HTTP Helpers - Request/Response Helpers', () => {
    describe('parseAuthStorage', () => {
        it.each([
            { scenario: 'empty localStorage', returnValue: null, expected: null },
            { scenario: 'invalid JSON', returnValue: 'invalid-json-{', expected: null }
        ])('should return null when $scenario', ({ returnValue, expected }) => {
            setupLocalStorageMock(returnValue);

            const result = parseAuthStorage(STORAGE_KEY);

            expect(result).toBe(expected);
        });

        it('should return parsed object when localStorage contains valid JSON', () => {
            const validData = { state: { tokens: { accessToken: TEST_TOKEN } } };
            setupLocalStorageMock(JSON.stringify(validData));

            const result = parseAuthStorage(STORAGE_KEY);

            expect(result).toEqual(validData);
        });

        it('should call localStorage.getItem with correct key', () => {
            const mockStorage = createMockLocalStorage(null);
            Object.defineProperty(window, 'localStorage', {
                value: mockStorage,
                configurable: true
            });

            parseAuthStorage(STORAGE_KEY);

            expect(mockStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
        });
    });

    describe('createRequestHeaders', () => {
        it.each([
            { includeAuth: false, description: 'without auth flag' },
            { includeAuth: true, description: 'with auth flag but not add token yet' }
        ])('should create base headers $description', ({ includeAuth }) => {
            const headers = createRequestHeaders(includeAuth);

            expect(headers).toEqual(BASE_HEADERS);
            expect(headers.Authorization).toBeUndefined();
        });

        it('should merge custom headers with base headers', () => {
            const customHeaders = {
                'X-Custom-Header': 'custom-value',
                'X-Another': 'another-value'
            };

            const headers = createRequestHeaders(false, customHeaders);

            expect(headers).toEqual({
                ...BASE_HEADERS,
                ...customHeaders
            });
        });
    });

    describe('addAuthHeader', () => {
        it('should add Authorization header when token is provided', () => {
            const result = addAuthHeader(BASE_HEADERS, TEST_TOKEN);

            expect(result).toEqual({
                ...BASE_HEADERS,
                Authorization: `Bearer ${TEST_TOKEN}`
            });
        });

        it('should not add Authorization header when token is null', () => {
            const result = addAuthHeader(BASE_HEADERS, null);

            expect(result).toEqual(BASE_HEADERS);
            expect(result.Authorization).toBeUndefined();
        });

        it('should not mutate original headers object', () => {
            const originalHeaders = { ...BASE_HEADERS };
            const result = addAuthHeader(originalHeaders, TEST_TOKEN);

            expect(originalHeaders).toEqual(BASE_HEADERS);
            expect(originalHeaders).not.toBe(result);
        });
    });

    describe('buildRequestBody', () => {
        it('should return undefined when data is undefined', () => {
            const result = buildRequestBody(undefined);

            expect(result).toBeUndefined();
        });

        it.each([
            { type: 'object', data: { name: 'test', value: 123 } },
            { type: 'array', data: [1, 2, 3, { key: 'value' }] }
        ])('should stringify $type data', ({ data }) => {
            const result = buildRequestBody(data);

            expect(result).toBe(JSON.stringify(data));
        });
    });

    describe('parseResponseJson', () => {
        it.each([
            { scenario: 'valid JSON response', data: { success: true, data: 'test' }, shouldReject: false },
            { scenario: 'empty response body', data: {}, shouldReject: false }
        ])('should parse $scenario', async ({ data, shouldReject }) => {
            const mockResponse = createMockResponse(data, shouldReject);

            const result = await parseResponseJson(mockResponse as any);

            expect(result).toEqual(data);
        });

        it('should handle response.json() errors gracefully', async () => {
            const mockResponse = createMockResponse(null, true);

            await expect(parseResponseJson(mockResponse as any)).rejects.toThrow();
        });
    });

    describe('validateWithSchema', () => {
        const TestSchema = z.object({
            name: z.string(),
            age: z.number()
        });

        const validData = { name: 'John', age: 30 };

        it('should validate and return data when schema passes', () => {
            const result = validateWithSchema(TestSchema, validData);

            expect(result).toEqual(validData);
        });

        it('should throw error when schema validation fails', () => {
            const invalidData = { name: 'John', age: 'thirty' };

            expect(() => validateWithSchema(TestSchema, invalidData)).toThrow();
        });

        it('should strip extra fields with strict schemas', () => {
            const dataWithExtra = { ...validData, extra: 'field' };
            const result = validateWithSchema(TestSchema, dataWithExtra);

            expect(result).toEqual(validData);
            expect((result as any).extra).toBeUndefined();
        });
    });
});

// ============================================================================
// Retry Logic Helper Functions
// ============================================================================

describe('HTTP Helpers - Retry Logic Helpers', () => {
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

    describe('shouldRetryError', () => {
        it.each([
            {
                scenario: 'NetworkError',
                error: new NetworkError('Connection failed'),
                expected: true
            },
            {
                scenario: '5xx errors',
                error: new ApiError('Server error', 500),
                expected: true
            },
            {
                scenario: '4xx errors',
                error: new ApiError('Bad request', 400),
                expected: false
            }
        ])('should return $expected for $scenario', ({ error, expected }) => {
            const result = shouldRetryError(error, mockConfig);

            expect(result).toBe(expected);
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

    describe('calculateDelay', () => {
        it('should calculate exponential backoff delay', () => {
            const delay0 = calculateDelay(0, mockConfig);
            const delay1 = calculateDelay(1, mockConfig);

            // Attempt 0: baseDelay * 2^0 = 1000, with jitter [1000, 2000)
            expect(delay0).toBeGreaterThanOrEqual(1000);
            expect(delay0).toBeLessThan(2000);

            // Attempt 1: baseDelay * 2^1 = 2000, with jitter [2000, 3000)
            expect(delay1).toBeGreaterThanOrEqual(2000);
            expect(delay1).toBeLessThan(3000);
        });

        it('should respect maxDelay limit', () => {
            const delay = calculateDelay(10, mockConfig);

            // Even with high attempt number, should not exceed maxDelay + jitter
            expect(delay).toBeLessThanOrEqual(mockConfig.maxDelay + 1000);
        });

        it('should add randomness to prevent thundering herd', () => {
            const delays = Array.from({ length: 10 }, () => calculateDelay(0, mockConfig));
            const uniqueDelays = new Set(delays);

            // With randomness, we should get different values
            expect(uniqueDelays.size).toBeGreaterThan(1);
        });
    });

    describe('sleep', () => {
        it('should resolve after specified milliseconds', async () => {
            const start = Date.now();
            const sleepDuration = 100;

            await sleep(sleepDuration);

            const elapsed = Date.now() - start;

            // Allow 5ms tolerance for timing variations
            expect(elapsed).toBeGreaterThanOrEqual(sleepDuration - 5);
            expect(elapsed).toBeLessThan(sleepDuration + 50);
        });
    });
});
