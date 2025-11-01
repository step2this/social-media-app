/**
 * validateCursor Helper Tests
 * TDD: Write tests first to define the API we want
 *
 * Pattern from SKILL.md: Result Type (Pattern 6: Discriminated Unions)
 */

import { describe, it, expect } from 'vitest';
import { GraphQLError } from 'graphql';
import { validateCursor, requireValidCursor } from '../validateCursor.js';
import { isSuccess, isFailure } from '../../types/Result.js';
import { ERROR_CODES } from '../../types/ErrorCodes.js';

describe('validateCursor', () => {
  describe('with valid base64 cursor', () => {
    it('should return success with cursor', () => {
      const cursor = Buffer.from('test-cursor').toString('base64');
      
      const result = validateCursor(cursor);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(cursor);
      }
    });

    it('should return success with complex JSON cursor', () => {
      const cursorData = { PK: 'USER#123', SK: 'POST#2024-01-01' };
      const cursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
      
      const result = validateCursor(cursor);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(cursor);
      }
    });
  });

  describe('with null/undefined cursor', () => {
    it('should return success with undefined for null', () => {
      const result = validateCursor(null);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBeUndefined();
      }
    });

    it('should return success with undefined for undefined', () => {
      const result = validateCursor(undefined);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('with invalid cursor', () => {
    it('should return failure with BAD_REQUEST code', () => {
      const result = validateCursor('not-valid-base64!!!');
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe(ERROR_CODES.BAD_REQUEST);
        expect(result.error.message).toContain('Invalid cursor');
      }
    });

    it('should return failure for malformed base64', () => {
      const result = validateCursor('%%%invalid%%%');
      
      expect(isFailure(result)).toBe(true);
    });
  });
});

describe('requireValidCursor', () => {
  describe('with valid cursor', () => {
    it('should return cursor when valid', () => {
      const cursor = Buffer.from('test').toString('base64');
      
      const result = requireValidCursor(cursor);
      
      expect(result).toBe(cursor);
    });

    it('should return undefined for null', () => {
      const result = requireValidCursor(null);
      
      expect(result).toBeUndefined();
    });
  });

  describe('with invalid cursor', () => {
    it('should throw GraphQLError with BAD_REQUEST code', () => {
      expect(() => requireValidCursor('invalid!!!')).toThrow(GraphQLError);
      
      try {
        requireValidCursor('invalid!!!');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions.code).toBe(
          ERROR_CODES.BAD_REQUEST
        );
      }
    });

    it('should include error message in GraphQLError', () => {
      try {
        requireValidCursor('malformed');
      } catch (error) {
        expect((error as GraphQLError).message).toContain('Invalid cursor');
      }
    });
  });
});
