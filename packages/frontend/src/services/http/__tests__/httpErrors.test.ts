import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
    ApiError,
    CorsError,
    NetworkError,
    ValidationError,
    classifyHttpError,
    classifyNetworkError,
    createZodValidationError,
    extractErrorMessage
} from '../httpErrors.ts';

// ============================================================================
// Error Class Tests
// ============================================================================

describe('HTTP Errors - Error Classes', () => {
    describe('ApiError', () => {
        it('should create error with status and message', () => {
            const error = new ApiError('Test error', 500);

            expect(error.name).toBe('ApiError');
            expect(error.message).toBe('Test error');
            expect(error.status).toBe(500);
        });

        it('should be instance of Error', () => {
            const error = new ApiError('Test error', 500);

            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('ValidationError', () => {
        it('should create validation error with details', () => {
            const validationErrors = [{ field: 'email', message: 'Invalid email' }];
            const error = new ValidationError('Validation failed', validationErrors);

            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Validation failed');
            expect(error.status).toBe(400);
            expect(error.validationErrors).toEqual(validationErrors);
        });

        it('should extend ApiError', () => {
            const error = new ValidationError('Validation failed');

            expect(error).toBeInstanceOf(ApiError);
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('NetworkError', () => {
        it('should create network error with code', () => {
            const error = new NetworkError('Connection failed', 'NETWORK_ERROR');

            expect(error.name).toBe('NetworkError');
            expect(error.message).toBe('Connection failed');
            expect(error.code).toBe('NETWORK_ERROR');
        });

        it('should be instance of Error', () => {
            const error = new NetworkError('Connection failed');

            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('CorsError', () => {
        it('should create CORS error with details', () => {
            const error = new CorsError('CORS blocked', 'https://origin.com', 'https://example.com');

            expect(error.name).toBe('CorsError');
            expect(error.message).toBe('CORS blocked');
            expect(error.code).toBe('CORS_ERROR');
            expect(error.url).toBe('https://example.com');
            expect(error.origin).toBe('https://origin.com');
        });

        it('should extend NetworkError', () => {
            const error = new CorsError('CORS blocked');

            expect(error).toBeInstanceOf(NetworkError);
            expect(error).toBeInstanceOf(Error);
        });
    });
});

// ============================================================================
// Error Classification Functions
// ============================================================================

describe('HTTP Errors - Classification Functions', () => {
    describe('classifyHttpError', () => {
        it.each([
            { status: 400, errorClass: ValidationError, name: 'ValidationError' },
            { status: 404, errorClass: ValidationError, name: 'ValidationError' },
            { status: 422, errorClass: ValidationError, name: 'ValidationError' }
        ])('should create $name for $status status', ({ status, errorClass, name }) => {
            const error = classifyHttpError(status, { error: 'Test error' });

            expect(error).toBeInstanceOf(errorClass);
            expect(error.name).toBe(name);
            expect(error.status).toBe(status);
        });

        it.each([
            { status: 500, name: 'ApiError' },
            { status: 502, name: 'ApiError' },
            { status: 503, name: 'ApiError' }
        ])('should create $name for $status status', ({ status, name }) => {
            const error = classifyHttpError(status, { error: 'Server error' });

            expect(error).toBeInstanceOf(ApiError);
            expect(error.name).toBe(name);
            expect(error.status).toBe(status);
        });

        it('should handle error data without message', () => {
            const error = classifyHttpError(500, {});

            expect(error.message).toContain('500');
        });

        it('should extract error message from error property', () => {
            const error = classifyHttpError(400, { error: 'Custom error message' });

            expect(error.message).toContain('Custom error message');
        });

        it('should extract error message from message property', () => {
            const error = classifyHttpError(400, { message: 'Another error message' });

            expect(error.message).toContain('Another error message');
        });
    });

    describe('classifyNetworkError', () => {
        it('should create NetworkError for TypeError', () => {
            const error = classifyNetworkError(new TypeError('Failed to fetch'), '/test');

            expect(error).toBeInstanceOf(NetworkError);
            expect(error.name).toBe('NetworkError');
            expect(error.code).toBe('NETWORK_ERROR');
        });

        it('should create NetworkError for AbortError', () => {
            // Create a properly typed AbortError-like object
            const abortError: Error & { name: 'AbortError' } = Object.assign(
                new Error('The operation was aborted'),
                { name: 'AbortError' as const }
            );

            const error = classifyNetworkError(abortError, '/test');

            expect(error).toBeInstanceOf(NetworkError);
            expect(error.name).toBe('NetworkError');
            expect(error.message).toContain('timeout');
        });

        it('should create CorsError when CORS detected in TypeError', () => {
            const corsError = new TypeError('Failed to fetch due to CORS');

            const error = classifyNetworkError(corsError, '/test');

            expect(error).toBeInstanceOf(CorsError);
            expect(error.name).toBe('CorsError');
            expect(error.code).toBe('CORS_ERROR');
        });

        it('should include endpoint in error message', () => {
            const error = classifyNetworkError(new TypeError('Failed to fetch'), '/api/users');

            expect(error.message).toContain('/api/users');
        });

        it('should include base URL when provided', () => {
            const error = classifyNetworkError(
                new TypeError('Failed to fetch'),
                '/api/users',
                'https://api.example.com'
            );

            expect(error.message).toContain('https://api.example.com');
        });
    });

    describe('extractErrorMessage', () => {
        it('should extract message from error property', () => {
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

        it('should prioritize error property over message property', () => {
            const result = extractErrorMessage(
                { error: 'Error message', message: 'Message property' },
                'Fallback'
            );

            expect(result).toBe('Error message');
        });

        it('should handle null error data', () => {
            const result = extractErrorMessage(null as unknown as Record<string, unknown>, 'Fallback');

            expect(result).toBe('Fallback');
        });

        it('should handle non-object error data', () => {
            const result = extractErrorMessage('string error' as unknown as Record<string, unknown>, 'Fallback');

            expect(result).toBe('Fallback');
        });
    });

    describe('createZodValidationError', () => {
        it('should convert ZodError to ValidationError', () => {
            const TestSchema = z.object({
                name: z.string(),
                age: z.number()
            });

            let zodError: z.ZodError | undefined;
            try {
                TestSchema.parse({ name: 'John', age: 'invalid' });
            } catch (error) {
                zodError = error as z.ZodError;
            }

            expect(zodError).toBeDefined();
            const validationError = createZodValidationError(zodError!);

            expect(validationError).toBeInstanceOf(ValidationError);
            expect(validationError.name).toBe('ValidationError');
            expect(validationError.message).toContain('validation failed');
            expect(validationError.status).toBe(400);
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
            expect(Array.isArray(validationError.validationErrors) && validationError.validationErrors.length).toBeGreaterThan(0);
        });

        // REMOVED: Test was checking implementation details (specific structure of Zod issues)
        // rather than behavior. We pass through Zod's native issue format which includes
        // 'path', 'message', 'code' etc. Testing specific field names is brittle.
    });
});
