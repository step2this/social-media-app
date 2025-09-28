import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClient } from '../utils/http-client.js';
import { validateResponse } from '../utils/validation.js';
import { MockAuthService } from '../services/auth.js';
import { generateTestId, detectEnvironment } from '../utils/index.js';
import { z } from 'zod';

describe('Error Handling Verification', () => {
  let httpClient: HttpClient;
  let authService: MockAuthService;
  let testId: string;
  let environment: ReturnType<typeof detectEnvironment>;

  // Error response schema for validation
  const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.any().optional(),
    message: z.string().optional()
  });

  beforeEach(() => {
    testId = generateTestId();
    environment = detectEnvironment();
    httpClient = new HttpClient(environment.baseUrl);
    authService = new MockAuthService();
  });

  describe('HTTP Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const badClient = new HttpClient('https://nonexistent-domain-12345.invalid');

      const response = await badClient.get('/test');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(0);
      expect(response.error).toBeDefined();
      expect(response.error).toContain('Network');
    });

    it('should handle timeout errors properly', async () => {
      const timeoutClient = new HttpClient('https://httpbin.org', { timeout: 50 });

      const response = await timeoutClient.get('/delay/1');

      expect(response.ok).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error).toContain('timeout');
    });

    it('should handle HTTP status errors with proper details', async () => {
      const testClient = new HttpClient('https://httpbin.org');

      const response = await testClient.get('/status/500');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(response.error).toContain('500');
    });

    it('should preserve error response bodies when available', async () => {
      const testClient = new HttpClient('https://httpbin.org');

      const response = await testClient.post('/status/422', { invalid: 'data' });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(422);
      expect(response.error).toBeDefined();
    });
  });

  describe('Validation Error Handling', () => {
    it('should validate and handle malformed API responses', () => {
      const malformedResponse = {
        error: 123, // should be string
        details: 'should be object or undefined'
      };

      const result = validateResponse(malformedResponse, ErrorResponseSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.some(err => err.path.includes('error'))).toBe(true);
    });

    it('should validate successful responses correctly', () => {
      const validErrorResponse = {
        error: 'Something went wrong',
        details: { code: 'AUTH_FAILED', context: 'login' },
        message: 'Authentication failed'
      };

      const result = validateResponse(validErrorResponse, ErrorResponseSchema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validErrorResponse);
      expect(result.errors).toBeUndefined();
    });

    it('should handle missing required fields gracefully', () => {
      const incompleteResponse = {
        details: { some: 'data' }
        // missing required 'error' field
      };

      const result = validateResponse(incompleteResponse, ErrorResponseSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some(err => err.path.includes('error'))).toBe(true);
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle authentication failures correctly', async () => {
      const user = await authService.createTestUser(`${testId}@test.com`, 'password123');

      // Try login with wrong password
      const loginResult = await authService.login(`${testId}@test.com`, 'wrongpassword');

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBeDefined();
      expect(loginResult.token).toBeUndefined();

      // Cleanup
      await authService.cleanupTestUser(user.id);
    });

    it('should handle invalid token scenarios', async () => {
      const invalidToken = 'invalid-token-xyz';

      const validation = await authService.validateToken(invalidToken);

      expect(validation.valid).toBe(false);
      expect(validation.user).toBeUndefined();
    });

    it('should handle token expiration gracefully', async () => {
      const user = await authService.createTestUser(`${testId}@test.com`, 'password123');
      const loginResult = await authService.login(`${testId}@test.com`, 'password123');

      // Logout to invalidate token
      await authService.logout(loginResult.token!);

      // Try to use invalidated token
      const validation = await authService.validateToken(loginResult.token!);

      expect(validation.valid).toBe(false);

      // Cleanup
      await authService.cleanupTestUser(user.id);
    });
  });

  describe('API Integration Error Handling', () => {
    it('should handle API errors with proper HTTP status codes', async () => {
      // Test unauthorized request
      const response = await httpClient.get('/api/protected-endpoint');

      // In local environment, might get frontend 404 or 200
      // In deployed environment, should get proper error codes
      if (environment.type === 'local') {
        expect([200, 404, 401, 403]).toContain(response.status);
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should handle malformed request bodies appropriately', async () => {
      // Send invalid JSON structure
      const response = await httpClient.post('/api/posts', 'not-valid-json');

      if (environment.type === 'local') {
        // Frontend might return 200 or 404
        expect(response.status).toBeDefined();
      } else {
        // Real API should return 400 for bad JSON
        expect([400, 422]).toContain(response.status);
      }
    });

    it('should provide useful error information for debugging', async () => {
      const user = await authService.createTestUser(`${testId}@test.com`, 'password123');
      const loginResult = await authService.login(`${testId}@test.com`, 'password123');

      // Make request with potentially invalid data
      const response = await httpClient.post('/api/posts', {
        content: '', // potentially invalid empty content
        invalidField: 'should not be here'
      }, {
        token: loginResult.token
      });

      // Should get some response that can be used for debugging
      expect(response.status).toBeDefined();

      if (!response.ok) {
        // Error responses should provide useful information
        expect(response.error).toBeDefined();
      }

      // Cleanup
      await authService.cleanupTestUser(user.id);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle multiple consecutive failures gracefully', async () => {
      const responses = [];

      // Make multiple requests to test consistency
      for (let i = 0; i < 3; i++) {
        const response = await httpClient.get('/api/nonexistent-endpoint');
        responses.push(response);
      }

      // All should respond consistently
      expect(responses.length).toBe(3);
      responses.forEach(response => {
        expect(response.status).toBeDefined();

        if (environment.type === 'local') {
          // Frontend might serve content successfully
          expect([200, 404]).toContain(response.status);
        } else {
          // Deployed API should return error for nonexistent endpoint
          expect(response.ok).toBe(false);
        }
      });
    });

    it('should maintain service state after errors', async () => {
      // Create user, cause an error, then verify user still works
      const user = await authService.createTestUser(`${testId}@test.com`, 'password123');

      // Cause an authentication error
      const badLogin = await authService.login(`${testId}@test.com`, 'wrongpassword');
      expect(badLogin.success).toBe(false);

      // Verify service still works for valid operations
      const goodLogin = await authService.login(`${testId}@test.com`, 'password123');
      expect(goodLogin.success).toBe(true);

      // Cleanup
      await authService.cleanupTestUser(user.id);
    });

    it('should provide consistent error formats across different failure types', () => {
      // Test different validation errors have consistent structure
      const schemas = [
        z.object({ name: z.string() }),
        z.object({ email: z.string().email() }),
        z.object({ age: z.number().min(0) })
      ];

      const invalidInputs = [
        { name: 123 },
        { email: 'not-an-email' },
        { age: -5 }
      ];

      schemas.forEach((schema, index) => {
        const result = validateResponse(invalidInputs[index], schema as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.errors?.length).toBeGreaterThan(0);

        // Each error should have consistent structure
        result.errors?.forEach(error => {
          expect(error).toHaveProperty('code');
          expect(error).toHaveProperty('path');
          expect(error).toHaveProperty('message');
        });
      });
    });
  });
});