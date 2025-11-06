import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from './register.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import type { RegisterRequest } from '@social-media-app/shared';

/**
 * Behavior tests for register handler with middleware composition
 * 
 * Tests WHAT the handler does (behavior), not HOW it does it (implementation).
 * No mocks - middleware handles validation, error responses, logging automatically.
 * 
 * Test categories:
 * 1. Successful registration
 * 2. Validation errors (handled by withValidation middleware)
 * 3. Business logic errors (handled by withErrorHandling middleware)
 */
describe('Register Handler - Behavior Tests', () => {
  describe('Successful Registration', () => {
    it('should return 201 with user data for valid registration', async () => {
      const validRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        username: 'newuser'
      };

      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/register',
        routeKey: 'POST /auth/register',
        body: validRequest
      });

      const result = await handler(event);

      // Test behavior: Handler returns successful response
      expect(result.statusCode).toBe(201);
      
      const body = JSON.parse(result.body!);
      expect(body).toHaveProperty('user');
      expect(body.user).toMatchObject({
        email: validRequest.email,
        username: validRequest.username
      });
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'SecurePass123!',
        username: 'validuser'
      };

      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/register',
        routeKey: 'POST /auth/register',
        body: invalidRequest
      });

      const result = await handler(event);

      // Test behavior: withValidation middleware rejects invalid email
      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('should return 400 for weak password', async () => {
      const invalidRequest = {
        email: 'valid@example.com',
        password: 'weak',
        username: 'validuser'
      };

      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/register',
        routeKey: 'POST /auth/register',
        body: invalidRequest
      });

      const result = await handler(event);

      // Test behavior: withValidation middleware rejects weak password
      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/register',
        routeKey: 'POST /auth/register',
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
    it('should include CORS headers in all responses', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/register',
        routeKey: 'POST /auth/register',
        body: {}
      });

      const result = await handler(event);

      // Test behavior: Responses include CORS headers
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    });

    it('should include correlation ID in response headers', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/register',
        routeKey: 'POST /auth/register',
        body: {}
      });

      const result = await handler(event);

      // Test behavior: withLogging middleware adds correlation ID
      expect(result.headers).toHaveProperty('X-Correlation-Id');
      expect(result.headers!['X-Correlation-Id']).toBeDefined();
    });
  });
});
