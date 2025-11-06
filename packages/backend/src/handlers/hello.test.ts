import { describe, it, expect } from 'vitest';
import { handler } from './hello.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import type { HelloRequest } from '@social-media-app/shared';

/**
 * Behavior tests for hello handler with middleware composition
 * 
 * Tests WHAT the handler does (behavior), not HOW it does it (implementation).
 * No mocks - middleware handles validation, error responses, logging automatically.
 */
describe('Hello Handler - Behavior Tests', () => {
  describe('Successful Greeting', () => {
    it('should return 200 with greeting message', async () => {
      const validRequest: HelloRequest = {
        name: 'Alice'
      };

      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/hello',
        routeKey: 'POST /hello',
        body: validRequest
      });

      const result = await handler(event);

      // Test behavior: Handler returns greeting
      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Alice');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid request body', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/hello',
        routeKey: 'POST /hello',
        body: { name: 123 } // Invalid - name should be string
      });

      const result = await handler(event);

      // Test behavior: withValidation middleware rejects invalid types
      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('Response Format', () => {
    it('should include CORS headers', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/hello',
        routeKey: 'POST /hello',
        body: { name: 'Test' }
      });

      const result = await handler(event);

      // Test behavior: Responses include CORS headers
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
    });
  });
});
