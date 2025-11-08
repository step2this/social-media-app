import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import { withErrorHandling } from '../withErrorHandling.js';
import { compose } from '../compose.js';

/**
 * Behavior tests for withErrorHandling middleware
 * 
 * Tests focus on observable behavior:
 * - Response structure and status codes
 * - Error message content
 * - Response headers
 */

describe('withErrorHandling middleware - behavior', () => {
  describe('successful responses', () => {
    it('passes through successful responses unchanged', async () => {
      const event = createMockAPIGatewayEvent({
        body: { name: 'test' }
      });

      const handler = compose(
        withErrorHandling(),
        async () => ({
          statusCode: 200,
          body: JSON.stringify({ message: 'Success' })
        })
      );

      const response = await handler(event);

      expect(response).toEqual({
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      });
    });
  });

  describe('validation errors', () => {
    it('converts ZodError to 400 response with field details', async () => {
      const event = createMockAPIGatewayEvent({
        body: { email: 'invalid-email' }
      });

      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8)
      });

      const handler = compose(
        withErrorHandling(),
        async (_event, context) => {
          // Simulate validation error
          schema.parse(context.event.body ? JSON.parse(context.event.body) : {});
          return { statusCode: 200, body: '' };
        }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThan(0);
      // ZodError details can have either "field" or "path" format
      expect(body.details[0]).toHaveProperty('message');
    });
  });

  describe('authorization errors', () => {
    it('converts UnauthorizedError to 401 response', async () => {
      const event = createMockAPIGatewayEvent();

      const handler = compose(
        withErrorHandling(),
        async () => {
          // Import UnauthorizedError from the same module
          const { UnauthorizedError } = await import('../withErrorHandling.js');
          throw new UnauthorizedError('Invalid token');
        }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid token');
    });

    it('uses default message for UnauthorizedError without message', async () => {
      const event = createMockAPIGatewayEvent();

      const handler = compose(
        withErrorHandling(),
        async () => {
          const { UnauthorizedError } = await import('../withErrorHandling.js');
          throw new UnauthorizedError();
        }
      );

      const response = await handler(event);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('generic errors', () => {
    it('converts generic errors to 500 response without exposing details', async () => {
      const event = createMockAPIGatewayEvent();

      const handler = compose(
        withErrorHandling(),
        async () => {
          throw new Error('Database connection failed');
        }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      // Should NOT expose internal error details
      expect(body.error).not.toContain('Database');
    });
  });

  describe('response format consistency', () => {
    it('always includes Content-Type header in error responses', async () => {
      const event = createMockAPIGatewayEvent();

      const handler = compose(
        withErrorHandling(),
        async () => {
          throw new Error('Test error');
        }
      );

      const response = await handler(event);

      expect(response.headers).toBeDefined();
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('returns valid JSON body in all error responses', async () => {
      const event = createMockAPIGatewayEvent();

      const handler = compose(
        withErrorHandling(),
        async () => {
          throw new Error('Test error');
        }
      );

      const response = await handler(event);

      expect(() => JSON.parse(response.body)).not.toThrow();
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });
});
