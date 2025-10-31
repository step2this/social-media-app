/**
 * ErrorFactory Tests
 *
 * Test-Driven Development (TDD) for standardized GraphQL error creation.
 * The ErrorFactory creates consistent GraphQL errors with proper error codes.
 *
 * This replaces scattered error creation across resolvers:
 * - Before: throw new GraphQLError('...', { extensions: { code: '...' }})
 * - After: throw ErrorFactory.unauthenticated()
 */

import { describe, it, expect } from 'vitest';
import { GraphQLError } from 'graphql';

// Import types and classes we're about to create (will fail initially - TDD RED phase)
import { ErrorFactory, ErrorCode } from '../ErrorFactory.js';

describe('ErrorFactory', () => {
  describe('ErrorCode type', () => {
    it('should define standard error codes', () => {
      const codes: ErrorCode[] = [
        'UNAUTHENTICATED',
        'UNAUTHORIZED',
        'NOT_FOUND',
        'BAD_REQUEST',
        'INTERNAL_SERVER_ERROR',
      ];

      // Type check - if this compiles, ErrorCode type is correct
      codes.forEach((code) => {
        expect(typeof code).toBe('string');
      });
    });
  });

  describe('create()', () => {
    it('should create GraphQLError with message and code', () => {
      const error = ErrorFactory.create('Test error', 'BAD_REQUEST');

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toBe('Test error');
      expect(error.extensions?.code).toBe('BAD_REQUEST');
    });

    it('should create errors with different codes', () => {
      const codes: ErrorCode[] = [
        'UNAUTHENTICATED',
        'UNAUTHORIZED',
        'NOT_FOUND',
        'BAD_REQUEST',
        'INTERNAL_SERVER_ERROR',
      ];

      codes.forEach((code) => {
        const error = ErrorFactory.create(`Test ${code}`, code);
        expect(error.extensions?.code).toBe(code);
      });
    });

    it('should include extensions in error', () => {
      const error = ErrorFactory.create('Test', 'BAD_REQUEST');

      expect(error.extensions).toBeDefined();
      expect(error.extensions?.code).toBeTruthy();
    });

    it('should handle long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = ErrorFactory.create(longMessage, 'BAD_REQUEST');

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it('should handle special characters in message', () => {
      const message = 'Error with "quotes" and \'apostrophes\' and <html>';
      const error = ErrorFactory.create(message, 'BAD_REQUEST');

      expect(error.message).toBe(message);
    });
  });

  describe('unauthenticated()', () => {
    it('should create UNAUTHENTICATED error with default message', () => {
      const error = ErrorFactory.unauthenticated();

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.extensions?.code).toBe('UNAUTHENTICATED');
      expect(error.message).toBeTruthy();
      expect(error.message).toContain('authenticated');
    });

    it('should create UNAUTHENTICATED error with custom message', () => {
      const message = 'Please log in to continue';
      const error = ErrorFactory.unauthenticated(message);

      expect(error.message).toBe(message);
      expect(error.extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('should have descriptive default message', () => {
      const error = ErrorFactory.unauthenticated();

      expect(error.message.length).toBeGreaterThan(10);
      expect(error.message.toLowerCase()).toContain('authenticated');
    });
  });

  describe('unauthorized()', () => {
    it('should create UNAUTHORIZED error with default message', () => {
      const error = ErrorFactory.unauthorized();

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.extensions?.code).toBe('UNAUTHORIZED');
      expect(error.message).toBeTruthy();
    });

    it('should create UNAUTHORIZED error with custom message', () => {
      const message = 'You do not have permission to perform this action';
      const error = ErrorFactory.unauthorized(message);

      expect(error.message).toBe(message);
      expect(error.extensions?.code).toBe('UNAUTHORIZED');
    });

    it('should differentiate from unauthenticated', () => {
      const unauthenticated = ErrorFactory.unauthenticated();
      const unauthorized = ErrorFactory.unauthorized();

      expect(unauthenticated.extensions?.code).toBe('UNAUTHENTICATED');
      expect(unauthorized.extensions?.code).toBe('UNAUTHORIZED');
      expect(unauthenticated.message).not.toBe(unauthorized.message);
    });
  });

  describe('notFound()', () => {
    it('should create NOT_FOUND error with entity and id', () => {
      const error = ErrorFactory.notFound('User', 'user-123');

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.extensions?.code).toBe('NOT_FOUND');
      expect(error.message).toContain('User');
      expect(error.message).toContain('user-123');
    });

    it('should handle different entity types', () => {
      const entities = ['Post', 'Comment', 'Profile', 'Auction'];

      entities.forEach((entity) => {
        const error = ErrorFactory.notFound(entity, 'test-id');
        expect(error.message).toContain(entity);
      });
    });

    it('should handle special characters in id', () => {
      const error = ErrorFactory.notFound('User', 'user-!@#$%');

      expect(error.message).toContain('user-!@#$%');
    });

    it('should have consistent message format', () => {
      const error1 = ErrorFactory.notFound('Post', 'post-1');
      const error2 = ErrorFactory.notFound('User', 'user-1');

      // Both should follow same format: "{Entity} not found: {id}"
      expect(error1.message).toMatch(/Post.*not found.*post-1/);
      expect(error2.message).toMatch(/User.*not found.*user-1/);
    });
  });

  describe('badRequest()', () => {
    it('should create BAD_REQUEST error', () => {
      const message = 'Invalid input';
      const error = ErrorFactory.badRequest(message);

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toBe(message);
      expect(error.extensions?.code).toBe('BAD_REQUEST');
    });

    it('should handle validation error messages', () => {
      const message = 'Email must be a valid email address';
      const error = ErrorFactory.badRequest(message);

      expect(error.message).toBe(message);
    });

    it('should handle multiple validation errors', () => {
      const message = 'Validation failed: email is required, password must be at least 8 characters';
      const error = ErrorFactory.badRequest(message);

      expect(error.message).toBe(message);
    });
  });

  describe('internalServerError()', () => {
    it('should create INTERNAL_SERVER_ERROR with default message', () => {
      const error = ErrorFactory.internalServerError();

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBeTruthy();
    });

    it('should create INTERNAL_SERVER_ERROR with custom message', () => {
      const message = 'Database connection failed';
      const error = ErrorFactory.internalServerError(message);

      expect(error.message).toBe(message);
      expect(error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should have generic default message for security', () => {
      const error = ErrorFactory.internalServerError();

      // Should not expose internal details
      expect(error.message.toLowerCase()).toContain('internal');
      expect(error.message.toLowerCase()).toContain('error');
    });
  });

  describe('Real-world resolver scenarios', () => {
    it('should create authentication error for protected resolver', () => {
      // Simulate resolver with no userId
      const error = ErrorFactory.unauthenticated();

      expect(error.extensions?.code).toBe('UNAUTHENTICATED');
      expect(error).toBeInstanceOf(GraphQLError);
    });

    it('should create not found error for missing entity', () => {
      const postId = 'post-nonexistent';
      const error = ErrorFactory.notFound('Post', postId);

      expect(error.message).toContain('Post');
      expect(error.message).toContain(postId);
      expect(error.extensions?.code).toBe('NOT_FOUND');
    });

    it('should create validation error for invalid input', () => {
      const error = ErrorFactory.badRequest('Email is required');

      expect(error.extensions?.code).toBe('BAD_REQUEST');
      expect(error.message).toContain('Email');
    });

    it('should create authorization error for insufficient permissions', () => {
      const error = ErrorFactory.unauthorized('You cannot delete this post');

      expect(error.extensions?.code).toBe('UNAUTHORIZED');
      expect(error.message).toContain('cannot delete');
    });

    it('should create internal error for unexpected failures', () => {
      const error = ErrorFactory.internalServerError();

      expect(error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Error throwing in resolvers', () => {
    it('should be throwable in resolver', () => {
      const resolver = () => {
        throw ErrorFactory.unauthenticated();
      };

      expect(resolver).toThrow(GraphQLError);
      try {
        resolver();
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should work with different error types', () => {
      const errorTypes = [
        ErrorFactory.unauthenticated(),
        ErrorFactory.unauthorized(),
        ErrorFactory.notFound('User', 'user-1'),
        ErrorFactory.badRequest('Invalid input'),
        ErrorFactory.internalServerError(),
      ];

      errorTypes.forEach((error) => {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.extensions?.code).toBeTruthy();
      });
    });
  });

  describe('Type safety', () => {
    it('should only accept valid error codes in create()', () => {
      const validCodes: ErrorCode[] = [
        'UNAUTHENTICATED',
        'UNAUTHORIZED',
        'NOT_FOUND',
        'BAD_REQUEST',
        'INTERNAL_SERVER_ERROR',
      ];

      validCodes.forEach((code) => {
        const error = ErrorFactory.create('Test', code);
        expect(error.extensions?.code).toBe(code);
      });

      // TypeScript should prevent this:
      // ErrorFactory.create('Test', 'INVALID_CODE'); // Compile error
    });

    it('should return GraphQLError type', () => {
      const error: GraphQLError = ErrorFactory.unauthenticated();

      // Should have GraphQLError properties
      expect(error.message).toBeDefined();
      expect(error.extensions).toBeDefined();
      expect(error.name).toBe('GraphQLError');
    });
  });

  describe('Consistency', () => {
    it('should create errors with consistent structure', () => {
      const errors = [
        ErrorFactory.unauthenticated(),
        ErrorFactory.unauthorized(),
        ErrorFactory.notFound('User', 'user-1'),
        ErrorFactory.badRequest('Invalid'),
        ErrorFactory.internalServerError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.message).toBeTruthy();
        expect(error.extensions).toBeDefined();
        expect(error.extensions?.code).toBeTruthy();
      });
    });

    it('should have predictable error codes', () => {
      const errorCodeMap = [
        { factory: ErrorFactory.unauthenticated(), code: 'UNAUTHENTICATED' },
        { factory: ErrorFactory.unauthorized(), code: 'UNAUTHORIZED' },
        { factory: ErrorFactory.notFound('User', '1'), code: 'NOT_FOUND' },
        { factory: ErrorFactory.badRequest('Bad'), code: 'BAD_REQUEST' },
        { factory: ErrorFactory.internalServerError(), code: 'INTERNAL_SERVER_ERROR' },
      ];

      errorCodeMap.forEach(({ factory, code }) => {
        expect(factory.extensions?.code).toBe(code);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string messages', () => {
      const error = ErrorFactory.badRequest('');

      expect(error.message).toBe('');
      expect(error.extensions?.code).toBe('BAD_REQUEST');
    });

    it('should handle unicode characters', () => {
      const message = '错误：用户未找到';
      const error = ErrorFactory.badRequest(message);

      expect(error.message).toBe(message);
    });

    it('should handle null in notFound() id', () => {
      const error = ErrorFactory.notFound('User', 'null');

      expect(error.message).toContain('null');
    });

    it('should be stateless (no side effects)', () => {
      const error1 = ErrorFactory.unauthenticated();
      const error2 = ErrorFactory.unauthenticated();

      // Should create new instances
      expect(error1).not.toBe(error2);
      expect(error1.message).toBe(error2.message);
      expect(error1.extensions?.code).toBe(error2.extensions?.code);
    });
  });

  describe('Performance', () => {
    it('should create errors efficiently', () => {
      const startTime = Date.now();

      // Create 10,000 errors
      for (let i = 0; i < 10000; i++) {
        ErrorFactory.unauthenticated();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid error creation', () => {
      const errors = Array.from({ length: 1000 }, (_, i) =>
        ErrorFactory.notFound('User', `user-${i}`)
      );

      expect(errors).toHaveLength(1000);
      errors.forEach((error, i) => {
        expect(error.message).toContain(`user-${i}`);
      });
    });
  });
});
