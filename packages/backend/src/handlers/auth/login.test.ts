import { describe, it, expect } from 'vitest';
import { handler } from './login.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import type { LoginRequest } from '@social-media-app/shared';

/**
 * Behavior tests for login handler with middleware composition
 * 
 * Tests WHAT the handler does (behavior), not HOW it does it (implementation).
 * No mocks - middleware handles validation, error responses, logging automatically.
 */
describe('Login Handler - Behavior Tests', () => {
  describe('Successful Login', () => {
    it('should return 200 with tokens for valid credentials', async () => {
      const validRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Test123!'
      };

      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/login',
        routeKey: 'POST /auth/login',
        body: validRequest
      });

      const result = await handler(event);

      // Test behavior: Handler returns successful response with tokens
      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body!);
      expect(body).toHaveProperty('tokens');
      expect(body.tokens).toHaveProperty('accessToken');
      expect(body.tokens).toHaveProperty('refreshToken');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'ValidPass123!'
      };

      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/login',
        routeKey: 'POST /auth/login',
        body: invalidRequest
      });

      const result = await handler(event);

      // Test behavior: withValidation middleware rejects invalid email
      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/login',
        routeKey: 'POST /auth/login',
        body: {} // Empty body
      });

      const result = await handler(event);

      // Test behavior: withValidation middleware rejects empty body
      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('Response Format', () => {
    it('should include CORS headers', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/login',
        routeKey: 'POST /auth/login',
        body: {}
      });

      const result = await handler(event);

      // Test behavior: Responses include CORS headers
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
    });

    it('should include correlation ID in response headers', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/login',
        routeKey: 'POST /auth/login',
        body: {}
      });

      const result = await handler(event);

      // Test behavior: withLogging middleware adds correlation ID
      expect(result.headers).toHaveProperty('X-Correlation-Id');
    });
  });
});
