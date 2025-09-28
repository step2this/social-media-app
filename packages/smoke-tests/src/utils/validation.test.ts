import { describe, it, expect } from 'vitest';
import { validateResponse, validateRequest, type ValidationResult } from './validation.js';
import { z } from 'zod';

describe('Request/Response Validation', () => {
  // Test schemas
  const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().min(1)
  });

  const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });

  const LoginResponseSchema = z.object({
    success: z.boolean(),
    token: z.string().optional(),
    user: UserSchema.optional(),
    error: z.string().optional()
  });

  describe('Response Validation', () => {
    it('should validate correct response data', () => {
      const validResponse = {
        success: true,
        token: 'abc123',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const result = validateResponse(validResponse, LoginResponseSchema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validResponse);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid response data', () => {
      const invalidResponse = {
        success: 'not-boolean', // should be boolean
        token: 123, // should be string
        user: {
          id: 'user-1',
          email: 'invalid-email', // should be valid email
          name: '' // should be non-empty
        }
      };

      const result = validateResponse(invalidResponse, LoginResponseSchema);

      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields', () => {
      const incompleteResponse = {
        // missing success field
        token: 'abc123'
      };

      const result = validateResponse(incompleteResponse, LoginResponseSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some(err => err.path.includes('success'))).toBe(true);
    });

    it('should handle null and undefined responses', () => {
      const nullResult = validateResponse(null, LoginResponseSchema);
      const undefinedResult = validateResponse(undefined, LoginResponseSchema);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
    });
  });

  describe('Request Validation', () => {
    it('should validate correct request data', () => {
      const validRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = validateRequest(validRequest, LoginRequestSchema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validRequest);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid request data', () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: '123' // too short
      };

      const result = validateRequest(invalidRequest, LoginRequestSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(err => err.path.includes('email'))).toBe(true);
      expect(result.errors?.some(err => err.path.includes('password'))).toBe(true);
    });

    it('should handle missing required fields', () => {
      const incompleteRequest = {
        email: 'test@example.com'
        // missing password
      };

      const result = validateRequest(incompleteRequest, LoginRequestSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some(err => err.path.includes('password'))).toBe(true);
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate nested objects correctly', () => {
      const nestedResponse = {
        success: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const result = validateResponse(nestedResponse, LoginResponseSchema);

      expect(result.isValid).toBe(true);
      expect(result.data?.user?.email).toBe('test@example.com');
    });

    it('should handle optional fields correctly', () => {
      const minimalResponse = {
        success: false,
        error: 'Invalid credentials'
      };

      const result = validateResponse(minimalResponse, LoginResponseSchema);

      expect(result.isValid).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.token).toBeUndefined();
      expect(result.data?.user).toBeUndefined();
    });

    it('should provide detailed error information', () => {
      const badResponse = {
        success: 'maybe', // wrong type
        user: {
          id: '', // empty string
          email: 'bad-email',
          name: 123 // wrong type
        }
      };

      const result = validateResponse(badResponse, LoginResponseSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();

      // Should contain specific field errors
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(err => err.path.includes('success'))).toBe(true);
      expect(result.errors?.some(err => err.path.includes('user'))).toBe(true);
    });
  });

  describe('Schema Type Safety', () => {
    it('should enforce type safety at compile time', () => {
      // This test verifies that TypeScript typing works correctly
      const validData = {
        success: true,
        token: 'abc123',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const result = validateResponse(validData, LoginResponseSchema);

      if (result.isValid) {
        // TypeScript should know these fields exist and have correct types
        expect(typeof result.data.success).toBe('boolean');
        expect(typeof result.data.token).toBe('string');
        expect(typeof result.data.user?.email).toBe('string');
      }
    });
  });
});