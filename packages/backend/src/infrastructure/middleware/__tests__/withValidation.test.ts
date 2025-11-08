import { describe, it, expect, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z, ZodError } from 'zod';
import { withValidation } from '../withValidation.js';
import type { MiddlewareContext } from '../compose.js';

/**
 * Test suite for withValidation middleware
 * Verifies schema validation and context injection
 */

describe('withValidation middleware', () => {
  let mockEvent: APIGatewayProxyEventV2;
  let middlewareContext: MiddlewareContext;

  beforeEach(() => {
    // Setup mock event
    mockEvent = {
      version: '2.0',
      routeKey: 'POST /test',
      rawPath: '/test',
      rawQueryString: '',
      headers: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        domainName: 'test.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'test',
        http: {
          method: 'POST',
          path: '/test',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent'
        },
        requestId: 'test-request-id',
        routeKey: 'POST /test',
        stage: 'test',
        time: '01/Jan/2025:00:00:00 +0000',
        timeEpoch: 1234567890
      },
      isBase64Encoded: false
    };

    // Setup middleware context
    middlewareContext = { event: mockEvent };
  });

  describe('successful validation', () => {
    it('should validate and add data to context when schema passes', async () => {
      const testSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      });

      mockEvent.body = JSON.stringify({
        email: 'test@example.com',
        age: 25
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({
        email: 'test@example.com',
        age: 25
      });
    });

    it('should handle complex nested schemas', async () => {
      const testSchema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            bio: z.string(),
            age: z.number()
          })
        }),
        tags: z.array(z.string())
      });

      mockEvent.body = JSON.stringify({
        user: {
          name: 'John',
          profile: {
            bio: 'Test bio',
            age: 30
          }
        },
        tags: ['tag1', 'tag2']
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({
        user: {
          name: 'John',
          profile: {
            bio: 'Test bio',
            age: 30
          }
        },
        tags: ['tag1', 'tag2']
      });
    });

    it('should call next() after successful validation', async () => {
      const testSchema = z.object({
        name: z.string()
      });

      mockEvent.body = JSON.stringify({ name: 'Test' });

      let nextCalled = false;
      const mockNext = async () => {
        nextCalled = true;
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Success' })
        };
      };

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should return next() result after validation', async () => {
      const testSchema = z.object({
        name: z.string()
      });

      mockEvent.body = JSON.stringify({ name: 'Test' });

      const expectedResponse = {
        statusCode: 201,
        body: JSON.stringify({ id: '123', name: 'Test' })
      };

      const mockNext = async () => expectedResponse;

      const middleware = withValidation(testSchema);
      const result = await middleware(mockEvent, middlewareContext, mockNext);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('validation failures', () => {
    it('should throw ZodError when validation fails', async () => {
      const testSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      });

      mockEvent.body = JSON.stringify({
        email: 'invalid-email',
        age: 15
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);

      await expect(
        middleware(mockEvent, middlewareContext, mockNext)
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError with proper error details', async () => {
      const testSchema = z.object({
        email: z.string().email()
      });

      mockEvent.body = JSON.stringify({
        email: 'not-an-email'
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);

      try {
        await middleware(mockEvent, middlewareContext, mockNext);
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.errors.length).toBeGreaterThan(0);
        expect(zodError.errors[0].path).toContain('email');
      }
    });

    it('should throw ZodError for missing required fields', async () => {
      const testSchema = z.object({
        name: z.string(),
        email: z.string().email()
      });

      mockEvent.body = JSON.stringify({
        name: 'John'
        // email is missing
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);

      await expect(
        middleware(mockEvent, middlewareContext, mockNext)
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for wrong data types', async () => {
      const testSchema = z.object({
        age: z.number(),
        active: z.boolean()
      });

      mockEvent.body = JSON.stringify({
        age: 'twenty-five',
        active: 'yes'
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);

      await expect(
        middleware(mockEvent, middlewareContext, mockNext)
      ).rejects.toThrow(ZodError);
    });

    it('should not call next() when validation fails', async () => {
      const testSchema = z.object({
        email: z.string().email()
      });

      mockEvent.body = JSON.stringify({
        email: 'invalid'
      });

      let nextCalled = false;
      const mockNext = async () => {
        nextCalled = true;
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Success' })
        };
      };

      const middleware = withValidation(testSchema);

      try {
        await middleware(mockEvent, middlewareContext, mockNext);
      } catch {
        // Expected to throw
      }

      expect(nextCalled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty body as empty object', async () => {
      const testSchema = z.object({
        name: z.string().optional()
      });

      mockEvent.body = undefined;

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({});
    });

    it('should handle null body as empty object', async () => {
      const testSchema = z.object({
        name: z.string().optional()
      });

      mockEvent.body = null as any;

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({});
    });

    it('should handle empty string body as empty object', async () => {
      const testSchema = z.object({
        name: z.string().optional()
      });

      mockEvent.body = '';

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({});
    });

    it('should throw on invalid JSON', async () => {
      const testSchema = z.object({
        name: z.string()
      });

      mockEvent.body = '{invalid json}';

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);

      await expect(
        middleware(mockEvent, middlewareContext, mockNext)
      ).rejects.toThrow();
    });
  });

  describe('schema transformations', () => {
    it('should apply schema transformations', async () => {
      const testSchema = z.object({
        email: z.string().email().toLowerCase(),
        name: z.string().trim()
      });

      mockEvent.body = JSON.stringify({
        email: 'TEST@EXAMPLE.COM',
        name: '  John Doe  '
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({
        email: 'test@example.com',
        name: 'John Doe'
      });
    });

    it('should apply default values', async () => {
      const testSchema = z.object({
        name: z.string(),
        role: z.string().default('user'),
        active: z.boolean().default(true)
      });

      mockEvent.body = JSON.stringify({
        name: 'John'
      });

      const mockNext = async () => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);

      expect(middlewareContext.validatedInput).toEqual({
        name: 'John',
        role: 'user',
        active: true
      });
    });
  });

  describe('type safety', () => {
    it('should maintain type information in context', async () => {
      const testSchema = z.object({
        id: z.string(),
        count: z.number(),
        tags: z.array(z.string())
      });

      mockEvent.body = JSON.stringify({
        id: '123',
        count: 5,
        tags: ['a', 'b', 'c']
      });

      const mockNext = async () => {
        // This should be type-safe based on validatedInput
        const input = middlewareContext.validatedInput as z.infer<typeof testSchema>;
        expect(typeof input.id).toBe('string');
        expect(typeof input.count).toBe('number');
        expect(Array.isArray(input.tags)).toBe(true);

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Success' })
        };
      };

      const middleware = withValidation(testSchema);
      await middleware(mockEvent, middlewareContext, mockNext);
    });
  });
});
