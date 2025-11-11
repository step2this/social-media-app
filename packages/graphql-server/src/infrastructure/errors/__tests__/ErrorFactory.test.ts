/**
 * ErrorFactory Tests
 *
 * Tests the key behaviors of ErrorFactory:
 * 1. Converts domain AppErrors to GraphQL errors (primary use case)
 * 2. Provides backward-compatible convenience methods
 */

import { describe, it, expect } from 'vitest';
import { ErrorFactory } from '../ErrorFactory.js';
import { GraphQLError } from 'graphql';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ValidationError
} from '@social-media-app/shared/errors';

describe('ErrorFactory', () => {
  describe('fromAppError() - Primary conversion method', () => {
    it('should convert domain errors to GraphQL errors with all context', () => {
      const testCases = [
        {
          appError: new NotFoundError('User', 'user-123', 'corr-123'),
          expectedCode: 'NOT_FOUND',
          expectedMessage: 'User not found: user-123'
        },
        {
          appError: new ConflictError('Email exists', 'email', 'test@example.com', 'corr-456'),
          expectedCode: 'CONFLICT',
          expectedMessage: 'Email exists'
        },
        {
          appError: new UnauthorizedError('Invalid credentials', 'invalid_password', 'corr-789'),
          expectedCode: 'UNAUTHORIZED',
          expectedMessage: 'Invalid credentials'
        },
        {
          appError: new ValidationError('Invalid input', 'corr-999'),
          expectedCode: 'VALIDATION_ERROR',
          expectedMessage: 'Invalid input'
        }
      ];

      testCases.forEach(({ appError, expectedCode, expectedMessage }) => {
        const graphqlError = ErrorFactory.fromAppError(appError);

        expect(graphqlError).toBeInstanceOf(GraphQLError);
        expect(graphqlError.message).toBe(expectedMessage);
        expect(graphqlError.extensions?.code).toBe(expectedCode);
        expect(graphqlError.extensions?.correlationId).toBe(appError.correlationId);
        expect(graphqlError.extensions?.timestamp).toBeDefined();
      });
    });
  });

  describe('Convenience methods (backward compatibility)', () => {
    it('should create expected error types with legacy GraphQL codes', () => {
      const methods = [
        { fn: () => ErrorFactory.unauthenticated(), expectedCode: 'UNAUTHENTICATED' },
        { fn: () => ErrorFactory.unauthorized(), expectedCode: 'UNAUTHORIZED' },
        { fn: () => ErrorFactory.notFound('User', 'id-123'), expectedCode: 'NOT_FOUND' },
        { fn: () => ErrorFactory.badRequest('Invalid'), expectedCode: 'BAD_REQUEST' },
        { fn: () => ErrorFactory.internalServerError(), expectedCode: 'INTERNAL_SERVER_ERROR' }
      ];

      methods.forEach(({ fn, expectedCode }) => {
        const error = fn();
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.extensions?.code).toBe(expectedCode);
        expect(error.message).toBeTruthy();
      });
    });
  });
});
