/**
 * ErrorCodes Tests
 * TDD: Write tests first to define the API we want
 */

import { describe, it, expect } from 'vitest';
import { ERROR_CODES, ERROR_MESSAGES } from '../ErrorCodes.js';

describe('ErrorCodes', () => {
  describe('ERROR_CODES', () => {
    it('should define all error codes as const', () => {
      expect(ERROR_CODES.UNAUTHENTICATED).toBe('UNAUTHENTICATED');
      expect(ERROR_CODES.BAD_REQUEST).toBe('BAD_REQUEST');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
      expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should provide default message for UNAUTHENTICATED', () => {
      const message = ERROR_MESSAGES.UNAUTHENTICATED();

      expect(message).toContain('authenticated');
      expect(message).toContain('perform this action');
    });

    it('should accept custom action for UNAUTHENTICATED', () => {
      const message = ERROR_MESSAGES.UNAUTHENTICATED('view feed');

      expect(message).toBe('You must be authenticated to view feed');
    });

    it('should provide default message for BAD_REQUEST', () => {
      const message = ERROR_MESSAGES.BAD_REQUEST();

      expect(message).toBe('Invalid request');
    });

    it('should accept custom context for BAD_REQUEST', () => {
      const message = ERROR_MESSAGES.BAD_REQUEST('Invalid cursor format');

      expect(message).toBe('Invalid cursor format');
    });
  });
});
