import { describe, it, expect } from 'vitest';
import {
  createFollowErrorMessage,
  createUnfollowErrorMessage,
  createFetchStatusErrorMessage,
  extractFollowErrorMessage,
  isNetworkError,
  isAuthenticationError,
  formatFollowOperationError,
  type FollowErrorContext,
} from './follow-error-handler.js';

describe('follow-error-handler', () => {
  describe('createFollowErrorMessage', () => {
    it('should return default follow error message', () => {
      expect(createFollowErrorMessage()).toBe('Failed to follow user');
    });

    it('should accept custom error message', () => {
      expect(createFollowErrorMessage('Custom follow error')).toBe('Custom follow error');
    });
  });

  describe('createUnfollowErrorMessage', () => {
    it('should return default unfollow error message', () => {
      expect(createUnfollowErrorMessage()).toBe('Failed to unfollow user');
    });

    it('should accept custom error message', () => {
      expect(createUnfollowErrorMessage('Custom unfollow error')).toBe('Custom unfollow error');
    });
  });

  describe('createFetchStatusErrorMessage', () => {
    it('should return default fetch status error message', () => {
      expect(createFetchStatusErrorMessage()).toBe('Failed to fetch follow status');
    });

    it('should accept custom error message', () => {
      expect(createFetchStatusErrorMessage('Custom fetch error')).toBe('Custom fetch error');
    });
  });

  describe('extractFollowErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Network timeout');
      expect(extractFollowErrorMessage(error)).toBe('Network timeout');
    });

    it('should handle error with response data', () => {
      const error = {
        message: 'API Error',
        response: {
          data: {
            message: 'User not found',
          },
        },
      };
      expect(extractFollowErrorMessage(error)).toBe('User not found');
    });

    it('should handle string errors', () => {
      expect(extractFollowErrorMessage('Simple error string')).toBe('Simple error string');
    });

    it('should handle unknown error types', () => {
      expect(extractFollowErrorMessage(null)).toBe('Unknown error occurred');
      expect(extractFollowErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(extractFollowErrorMessage({})).toBe('Unknown error occurred');
      expect(extractFollowErrorMessage(123)).toBe('Unknown error occurred');
    });

    it('should handle axios-style errors', () => {
      const axiosError = {
        message: 'Request failed',
        response: {
          data: {
            error: 'Unauthorized access',
          },
        },
      };
      expect(extractFollowErrorMessage(axiosError)).toBe('Unauthorized access');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      expect(isNetworkError(new Error('Network Error'))).toBe(true);
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isNetworkError(new Error('timeout'))).toBe(true);
    });

    it('should not identify non-network errors', () => {
      expect(isNetworkError(new Error('User not found'))).toBe(false);
      expect(isNetworkError(new Error('Invalid input'))).toBe(false);
      expect(isNetworkError('Network Error')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
      expect(isNetworkError({})).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should identify authentication errors by status code', () => {
      const error401 = {
        response: { status: 401 },
      };
      expect(isAuthenticationError(error401)).toBe(true);

      const error403 = {
        response: { status: 403 },
      };
      expect(isAuthenticationError(error403)).toBe(true);
    });

    it('should identify authentication errors by message', () => {
      expect(isAuthenticationError(new Error('Unauthorized'))).toBe(true);
      expect(isAuthenticationError(new Error('Not authenticated'))).toBe(true);
      expect(isAuthenticationError(new Error('Authentication required'))).toBe(true);
    });

    it('should not identify non-authentication errors', () => {
      const error500 = {
        response: { status: 500 },
      };
      expect(isAuthenticationError(error500)).toBe(false);
      expect(isAuthenticationError(new Error('Server error'))).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isAuthenticationError(null)).toBe(false);
      expect(isAuthenticationError(undefined)).toBe(false);
      expect(isAuthenticationError({})).toBe(false);
    });
  });

  describe('formatFollowOperationError', () => {
    it('should format follow operation error with context', () => {
      const context: FollowErrorContext = {
        operation: 'follow',
        userId: 'user-123',
        error: new Error('Network Error'),
      };

      const formatted = formatFollowOperationError(context);
      expect(formatted).toContain('follow');
      expect(formatted).toContain('user-123');
    });

    it('should format unfollow operation error with context', () => {
      const context: FollowErrorContext = {
        operation: 'unfollow',
        userId: 'user-456',
        error: new Error('API Error'),
      };

      const formatted = formatFollowOperationError(context);
      expect(formatted).toContain('unfollow');
      expect(formatted).toContain('user-456');
    });

    it('should format fetch status operation error', () => {
      const context: FollowErrorContext = {
        operation: 'fetch',
        userId: 'user-789',
        error: new Error('Timeout'),
      };

      const formatted = formatFollowOperationError(context);
      expect(formatted).toContain('fetch');
      expect(formatted).toContain('user-789');
    });

    it('should provide user-friendly messages for network errors', () => {
      const context: FollowErrorContext = {
        operation: 'follow',
        userId: 'user-123',
        error: new Error('Network Error'),
      };

      const formatted = formatFollowOperationError(context);
      expect(formatted.toLowerCase()).toContain('network');
    });

    it('should provide user-friendly messages for auth errors', () => {
      const context: FollowErrorContext = {
        operation: 'follow',
        userId: 'user-123',
        error: { response: { status: 401 } },
      };

      const formatted = formatFollowOperationError(context);
      expect(formatted.toLowerCase()).toMatch(/auth|login|session/);
    });

    it('should handle missing error gracefully', () => {
      const context: FollowErrorContext = {
        operation: 'follow',
        userId: 'user-123',
        error: undefined,
      };

      const formatted = formatFollowOperationError(context);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('error message consistency', () => {
    it('should return consistent default messages', () => {
      const follow1 = createFollowErrorMessage();
      const follow2 = createFollowErrorMessage();
      expect(follow1).toBe(follow2);

      const unfollow1 = createUnfollowErrorMessage();
      const unfollow2 = createUnfollowErrorMessage();
      expect(unfollow1).toBe(unfollow2);
    });

    it('should preserve custom messages exactly', () => {
      const customMsg = 'Very specific error message!';
      expect(createFollowErrorMessage(customMsg)).toBe(customMsg);
      expect(createUnfollowErrorMessage(customMsg)).toBe(customMsg);
      expect(createFetchStatusErrorMessage(customMsg)).toBe(customMsg);
    });
  });

  describe('error extraction edge cases', () => {
    it('should handle nested error structures', () => {
      const nestedError = {
        response: {
          data: {
            error: {
              message: 'Deeply nested error',
            },
          },
        },
      };

      const message = extractFollowErrorMessage(nestedError);
      expect(typeof message).toBe('string');
      expect(message).toBeTruthy();
    });

    it('should handle circular references safely', () => {
      const circularError: any = { message: 'Circular' };
      circularError.self = circularError;

      expect(() => extractFollowErrorMessage(circularError)).not.toThrow();
    });

    it('should handle empty error objects', () => {
      expect(extractFollowErrorMessage({})).toBe('Unknown error occurred');
    });
  });
});
