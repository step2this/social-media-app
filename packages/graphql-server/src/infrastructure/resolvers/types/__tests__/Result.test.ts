/**
 * Result Type Tests
 * TDD: Write tests first to define the API we want
 */

import { describe, it, expect } from 'vitest';
import { success, failure, isSuccess, isFailure } from '../Result.js';

describe('Result type', () => {
  describe('success', () => {
    it('should create success result with data', () => {
      const result = success({ id: '1', name: 'Test' });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '1', name: 'Test' });
    });

    it('should be identified by isSuccess type guard', () => {
      const result = success('test');
      
      if (isSuccess(result)) {
        expect(result.data).toBe('test');
      } else {
        throw new Error('Expected success result');
      }
    });
  });

  describe('failure', () => {
    it('should create failure result with error', () => {
      const result = failure('UNAUTHENTICATED', 'Must be logged in');
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNAUTHENTICATED');
      expect(result.error.message).toBe('Must be logged in');
    });

    it('should be identified by isFailure type guard', () => {
      const result = failure('BAD_REQUEST', 'Invalid input');
      
      if (isFailure(result)) {
        expect(result.error.code).toBe('BAD_REQUEST');
        expect(result.error.message).toBe('Invalid input');
      } else {
        throw new Error('Expected failure result');
      }
    });
  });
});
