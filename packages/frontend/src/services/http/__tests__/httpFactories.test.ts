import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
    createHttpMethod,
    createAuthMethod,
    type SendRequestFn,
    type AuthMethodConfig,
    type TokenStorage,
    type ValidationSchema
} from '../httpFactories.ts';
import { createZodValidationError } from '../httpErrors.ts';
import { type RetryConfig } from '../httpHelpers.ts';

// ============================================================================
// Test Helpers and Mocks
// ============================================================================

const createMockSendRequest = (): SendRequestFn => {
    return vi.fn(async (endpoint: string, options?: RequestInit) => {
        return { success: true, endpoint, method: options?.method };
    }) as SendRequestFn;
};

const createMockTokenStorage = (): TokenStorage => ({
    getAccessToken: vi.fn(() => 'mock-access-token'),
    getRefreshToken: vi.fn(() => 'mock-refresh-token'),
    setTokens: vi.fn(),
    clearTokens: vi.fn()
});

const mockRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryCondition: () => true
};

// Test data
const TEST_ENDPOINT = '/test-endpoint';
const TEST_DATA = { name: 'test', value: 123 };

// ============================================================================
// createHttpMethod Factory Tests
// ============================================================================

describe('HTTP Factories - createHttpMethod', () => {
    describe('GET method', () => {
        it('should create GET method wrapper with auth by default', async () => {
            const mockSendRequest = createMockSendRequest();
            const getMethod = createHttpMethod('GET')<{ success: boolean }>(mockSendRequest, mockRetryConfig);

            await getMethod(TEST_ENDPOINT);

            expect(mockSendRequest).toHaveBeenCalledWith(
                TEST_ENDPOINT,
                { method: 'GET' },
                mockRetryConfig,
                true
            );
        });

        it('should create GET method wrapper without auth when specified', async () => {
            const mockSendRequest = createMockSendRequest();
            const getMethod = createHttpMethod('GET')<{ success: boolean }>(mockSendRequest, mockRetryConfig);

            await getMethod(TEST_ENDPOINT, false);

            expect(mockSendRequest).toHaveBeenCalledWith(
                TEST_ENDPOINT,
                { method: 'GET' },
                mockRetryConfig,
                false
            );
        });

        it('should return response from sendRequest', async () => {
            const mockSendRequest = vi.fn(async () => ({ data: 'test-data' })) as SendRequestFn;
            const getMethod = createHttpMethod('GET')<{ data: string }>(mockSendRequest, mockRetryConfig);

            const result = await getMethod(TEST_ENDPOINT);

            expect(result).toEqual({ data: 'test-data' });
        });
    });

    describe.each<{
        method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        testData: Record<string, unknown>;
    }>([
        { method: 'POST', testData: TEST_DATA },
        { method: 'PUT', testData: { id: 1, name: 'updated' } },
        { method: 'PATCH', testData: { name: 'patched' } },
        { method: 'DELETE', testData: { id: 123 } }
    ])('$method method', ({ method, testData }) => {
        it('should create method wrapper with data and auth by default', async () => {
            const mockSendRequest = createMockSendRequest();
            const httpMethod = createHttpMethod(method)<unknown>(mockSendRequest, mockRetryConfig);

            await httpMethod(TEST_ENDPOINT, testData);

            expect(mockSendRequest).toHaveBeenCalledWith(
                TEST_ENDPOINT,
                {
                    method,
                    body: JSON.stringify(testData)
                },
                mockRetryConfig,
                true
            );
        });

        it('should create method wrapper without auth when specified', async () => {
            const mockSendRequest = createMockSendRequest();
            const httpMethod = createHttpMethod(method)<unknown>(mockSendRequest, mockRetryConfig);

            await httpMethod(TEST_ENDPOINT, testData, false);

            expect(mockSendRequest).toHaveBeenCalledWith(
                TEST_ENDPOINT,
                {
                    method,
                    body: JSON.stringify(testData)
                },
                mockRetryConfig,
                false
            );
        });

        it('should handle undefined data', async () => {
            const mockSendRequest = createMockSendRequest();
            const httpMethod = createHttpMethod(method)<unknown>(mockSendRequest, mockRetryConfig);

            await httpMethod(TEST_ENDPOINT, undefined);

            expect(mockSendRequest).toHaveBeenCalledWith(
                TEST_ENDPOINT,
                {
                    method,
                    body: undefined
                },
                mockRetryConfig,
                true
            );
        });
    });
});

// ============================================================================
// createAuthMethod Factory Tests
// ============================================================================

describe('HTTP Factories - createAuthMethod', () => {
    const TestRequestSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
    });

    const TestResponseSchema = z.object({
        success: z.boolean(),
        userId: z.string(),
        tokens: z.object({
            accessToken: z.string(),
            refreshToken: z.string()
        })
    });

    type TestRequest = z.infer<typeof TestRequestSchema>;
    type TestResponse = z.infer<typeof TestResponseSchema>;

    const validRequest: TestRequest = {
        email: 'test@example.com',
        password: 'password123'
    };

    const validResponse: TestResponse = {
        success: true,
        userId: '123',
        tokens: { accessToken: 'token1', refreshToken: 'token2' }
    };

    const mockConfig: AuthMethodConfig<TestRequest, TestResponse> = {
        endpoint: '/auth/test',
        requestSchema: TestRequestSchema,
        responseSchema: TestResponseSchema,
        includeAuth: false
    };

    const createSuccessMockRequest = (): SendRequestFn => {
        return vi.fn(async () => validResponse) as SendRequestFn;
    };

    const createAuthMethodWithMocks = (
        config: AuthMethodConfig<TestRequest, TestResponse> = mockConfig
    ) => {
        const mockSendRequest = createSuccessMockRequest();
        const mockTokenStorage = createMockTokenStorage();
        const authMethod = createAuthMethod(config)(
            mockSendRequest,
            mockTokenStorage,
            mockRetryConfig
        );
        return { authMethod, mockSendRequest, mockTokenStorage };
    };

    it('should validate request with schema', async () => {
        const { authMethod, mockSendRequest } = createAuthMethodWithMocks();

        await authMethod(validRequest);

        expect(mockSendRequest).toHaveBeenCalled();
    });

    it('should throw validation error for invalid request', async () => {
        const { authMethod } = createAuthMethodWithMocks();

        const invalidRequest = {
            email: 'invalid-email',
            password: '123'
        };

        await expect(authMethod(invalidRequest as TestRequest)).rejects.toThrow();
    });

    it('should send request with correct options', async () => {
        const { authMethod, mockSendRequest } = createAuthMethodWithMocks();

        await authMethod(validRequest);

        expect(mockSendRequest).toHaveBeenCalledWith(
            '/auth/test',
            {
                method: 'POST',
                body: JSON.stringify(validRequest)
            },
            mockRetryConfig,
            false
        );
    });

    it('should use custom HTTP method when specified', async () => {
        const customConfig: AuthMethodConfig<TestRequest, TestResponse> = {
            ...mockConfig,
            method: 'PUT'
        };

        const { authMethod, mockSendRequest } = createAuthMethodWithMocks(customConfig);

        await authMethod(validRequest);

        expect(mockSendRequest).toHaveBeenCalledWith(
            '/auth/test',
            {
                method: 'PUT',
                body: JSON.stringify(validRequest)
            },
            mockRetryConfig,
            false
        );
    });

    it('should validate response with schema', async () => {
        const { authMethod } = createAuthMethodWithMocks();

        const result = await authMethod(validRequest);

        expect(result).toEqual(validResponse);
    });

    it('should call onSuccess callback when provided', async () => {
        const onSuccess = vi.fn();
        const configWithCallback: AuthMethodConfig<TestRequest, TestResponse> = {
            ...mockConfig,
            onSuccess
        };

        const { authMethod, mockTokenStorage } = createAuthMethodWithMocks(configWithCallback);

        const result = await authMethod(validRequest);

        expect(onSuccess).toHaveBeenCalledWith(result, mockTokenStorage);
    });

    it('should call onError callback when request fails', async () => {
        const mockError = new Error('Request failed');
        const onError = vi.fn();
        const configWithCallback: AuthMethodConfig<TestRequest, TestResponse> = {
            ...mockConfig,
            onError
        };

        const mockSendRequest = vi.fn(async () => {
            throw mockError;
        }) as SendRequestFn;
        const mockTokenStorage = createMockTokenStorage();
        const authMethod = createAuthMethod(configWithCallback)(
            mockSendRequest,
            mockTokenStorage,
            mockRetryConfig
        );

        await expect(authMethod(validRequest)).rejects.toThrow('Request failed');
        expect(onError).toHaveBeenCalledWith(mockError, mockTokenStorage);
    });

    it('should convert ZodError to ValidationError', async () => {
        const { authMethod } = createAuthMethodWithMocks();

        const invalidRequest = {
            email: 'invalid-email',
            password: '12'
        };

        await expect(authMethod(invalidRequest as TestRequest)).rejects.toThrow();
    });

    it('should include auth when specified', async () => {
        const configWithAuth: AuthMethodConfig<TestRequest, TestResponse> = {
            ...mockConfig,
            includeAuth: true
        };

        const { authMethod, mockSendRequest } = createAuthMethodWithMocks(configWithAuth);

        await authMethod(validRequest);

        expect(mockSendRequest).toHaveBeenCalledWith(
            '/auth/test',
            {
                method: 'POST',
                body: JSON.stringify(validRequest)
            },
            mockRetryConfig,
            true
        );
    });
});
