/**
 * Result Type Tests
 *
 * Test-Driven Development (TDD) for type-safe error handling.
 * Result<T, E> is a discriminated union inspired by Rust's Result type.
 *
 * Benefits:
 * - Forces explicit error handling (no silent failures)
 * - Type-safe success and error branches
 * - No try/catch needed
 * - Composable error handling
 */

import { describe, it, expect } from 'vitest';

// Import types we're about to create (will fail initially - TDD RED phase)
import {
  Result,
  AsyncResult,
  unwrap,
  unwrapOr,
  isSuccess,
  isFailure,
  map,
  mapError,
  flatMap,
} from '../result.js';

describe('Result Type', () => {
  describe('Result<T, E> discriminated union', () => {
    it('should create success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should create failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Something went wrong'),
      };

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Something went wrong');
      }
    });

    it('should be type-safe with discriminated union', () => {
      const result: Result<string> = {
        success: true,
        data: 'hello',
      };

      // TypeScript knows result.data exists when success === true
      if (result.success) {
        const data: string = result.data;
        expect(data).toBe('hello');
      }

      // TypeScript knows result.error exists when success === false
      if (!result.success) {
        const error: Error = result.error;
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('AsyncResult<T, E>', () => {
    it('should be a Promise of Result', async () => {
      const asyncResult: AsyncResult<number> = Promise.resolve({
        success: true,
        data: 42,
      });

      const result = await asyncResult;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should handle async failures', async () => {
      const asyncResult: AsyncResult<number> = Promise.resolve({
        success: false,
        error: new Error('Async error'),
      });

      const result = await asyncResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Async error');
      }
    });
  });

  describe('unwrap()', () => {
    it('should extract data from success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const data = unwrap(result);
      expect(data).toBe(42);
    });

    it('should throw error from failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Test error'),
      };

      expect(() => unwrap(result)).toThrow('Test error');
    });

    it('should preserve error type when throwing', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
        }
      }

      const result: Result<number, CustomError> = {
        success: false,
        error: new CustomError('Custom error', 'ERR_CUSTOM'),
      };

      try {
        unwrap(result);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect((error as CustomError).code).toBe('ERR_CUSTOM');
      }
    });
  });

  describe('unwrapOr()', () => {
    it('should extract data from success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const data = unwrapOr(result, 0);
      expect(data).toBe(42);
    });

    it('should return default value from failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Test error'),
      };

      const data = unwrapOr(result, 0);
      expect(data).toBe(0);
    });

    it('should work with null as default', () => {
      const result: Result<string> = {
        success: false,
        error: new Error('Test error'),
      };

      const data = unwrapOr(result, null);
      expect(data).toBe(null);
    });
  });

  describe('isSuccess()', () => {
    it('should return true for success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(isSuccess(result)).toBe(true);
    });

    it('should return false for failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Test error'),
      };

      expect(isSuccess(result)).toBe(false);
    });

    it('should narrow type with type guard', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      if (isSuccess(result)) {
        // TypeScript knows result.data exists here
        const data: number = result.data;
        expect(data).toBe(42);
      }
    });
  });

  describe('isFailure()', () => {
    it('should return true for failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Test error'),
      };

      expect(isFailure(result)).toBe(true);
    });

    it('should return false for success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(isFailure(result)).toBe(false);
    });

    it('should narrow type with type guard', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Test error'),
      };

      if (isFailure(result)) {
        // TypeScript knows result.error exists here
        const error: Error = result.error;
        expect(error.message).toBe('Test error');
      }
    });
  });

  describe('map()', () => {
    it('should transform success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const mapped = map(result, (n) => n * 2);

      expect(mapped.success).toBe(true);
      if (mapped.success) {
        expect(mapped.data).toBe(84);
      }
    });

    it('should pass through failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Test error'),
      };

      const mapped = map(result, (n) => n * 2);

      expect(mapped.success).toBe(false);
      if (!mapped.success) {
        expect(mapped.error.message).toBe('Test error');
      }
    });

    it('should change result type', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const mapped = map(result, (n) => n.toString());

      expect(mapped.success).toBe(true);
      if (mapped.success) {
        expect(typeof mapped.data).toBe('string');
        expect(mapped.data).toBe('42');
      }
    });
  });

  describe('mapError()', () => {
    it('should transform failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Original error'),
      };

      const mapped = mapError(result, (err) => new Error(`Wrapped: ${err.message}`));

      expect(mapped.success).toBe(false);
      if (!mapped.success) {
        expect(mapped.error.message).toBe('Wrapped: Original error');
      }
    });

    it('should pass through success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const mapped = mapError(result, (err) => new Error(`Wrapped: ${err.message}`));

      expect(mapped.success).toBe(true);
      if (mapped.success) {
        expect(mapped.data).toBe(42);
      }
    });

    it('should change error type', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
        }
      }

      const result: Result<number> = {
        success: false,
        error: new Error('Original'),
      };

      const mapped = mapError(
        result,
        (err) => new CustomError(err.message, 'ERR_CUSTOM')
      );

      expect(mapped.success).toBe(false);
      if (!mapped.success) {
        expect(mapped.error).toBeInstanceOf(CustomError);
        expect((mapped.error as CustomError).code).toBe('ERR_CUSTOM');
      }
    });
  });

  describe('flatMap()', () => {
    it('should chain success results', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const chained = flatMap(result, (n): Result<string> => ({
        success: true,
        data: n.toString(),
      }));

      expect(chained.success).toBe(true);
      if (chained.success) {
        expect(chained.data).toBe('42');
      }
    });

    it('should short-circuit on first failure', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('First error'),
      };

      const chained = flatMap(result, (n): Result<string> => ({
        success: true,
        data: n.toString(),
      }));

      expect(chained.success).toBe(false);
      if (!chained.success) {
        expect(chained.error.message).toBe('First error');
      }
    });

    it('should propagate failure from inner function', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      const chained = flatMap(result, (_n): Result<string> => ({
        success: false,
        error: new Error('Inner error'),
      }));

      expect(chained.success).toBe(false);
      if (!chained.success) {
        expect(chained.error.message).toBe('Inner error');
      }
    });

    it('should enable complex chaining', () => {
      const divide = (a: number, b: number): Result<number> => {
        if (b === 0) {
          return { success: false, error: new Error('Division by zero') };
        }
        return { success: true, data: a / b };
      };

      const result1 = divide(10, 2);
      const result2 = flatMap(result1, (n) => divide(n, 2));
      const result3 = flatMap(result2, (n) => divide(n, 0));

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(false);
      if (!result3.success) {
        expect(result3.error.message).toBe('Division by zero');
      }
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should handle database query results', async () => {
      // Simulate database query
      const fetchUser = async (id: string): AsyncResult<{ id: string; name: string }> => {
        if (id === 'invalid') {
          return { success: false, error: new Error('User not found') };
        }
        return { success: true, data: { id, name: 'John Doe' } };
      };

      const result = await fetchUser('user-123');
      expect(result.success).toBe(true);

      const failResult = await fetchUser('invalid');
      expect(failResult.success).toBe(false);
    });

    it('should compose multiple operations', async () => {
      const getUser = async (id: string): AsyncResult<{ id: string; email: string }> => {
        return { success: true, data: { id, email: 'john@example.com' } };
      };

      const sendEmail = async (email: string): AsyncResult<boolean> => {
        if (!email.includes('@')) {
          return { success: false, error: new Error('Invalid email') };
        }
        return { success: true, data: true };
      };

      // Compose operations
      const userResult = await getUser('user-123');

      if (userResult.success) {
        const emailResult = await sendEmail(userResult.data.email);
        expect(emailResult.success).toBe(true);
      }
    });

    it('should handle validation errors', () => {
      const validateAge = (age: number): Result<number> => {
        if (age < 0) {
          return { success: false, error: new Error('Age cannot be negative') };
        }
        if (age > 150) {
          return { success: false, error: new Error('Age too high') };
        }
        return { success: true, data: age };
      };

      const valid = validateAge(25);
      expect(valid.success).toBe(true);

      const negative = validateAge(-5);
      expect(negative.success).toBe(false);

      const tooHigh = validateAge(200);
      expect(tooHigh.success).toBe(false);
    });

    it('should avoid try/catch with Result type', () => {
      const parseJSON = <T>(json: string): Result<T> => {
        try {
          const data = JSON.parse(json) as T;
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error as Error };
        }
      };

      const validResult = parseJSON<{ name: string }>('{"name": "John"}');
      expect(validResult.success).toBe(true);

      const invalidResult = parseJSON<unknown>('invalid json');
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle null data', () => {
      const result: Result<null> = {
        success: true,
        data: null,
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(null);
      }
    });

    it('should handle undefined data', () => {
      const result: Result<undefined> = {
        success: true,
        data: undefined,
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(undefined);
      }
    });

    it('should handle custom error types', () => {
      class ValidationError extends Error {
        constructor(message: string, public field: string) {
          super(message);
        }
      }

      const result: Result<string, ValidationError> = {
        success: false,
        error: new ValidationError('Invalid email', 'email'),
      };

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe('email');
      }
    });

    it('should work with complex generic types', () => {
      interface User {
        id: string;
        profile: {
          name: string;
          age: number;
        };
      }

      const result: Result<User> = {
        success: true,
        data: {
          id: 'user-123',
          profile: {
            name: 'John',
            age: 30,
          },
        },
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profile.name).toBe('John');
      }
    });
  });
});
