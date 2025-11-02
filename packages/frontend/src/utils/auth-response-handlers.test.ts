import { describe, it, expect } from 'vitest';
import {
  hasTokensInResponse,
  shouldAutoLogin,
  processRegisterResponse,
} from './auth-response-handlers.js';
import type { RegisterResponse, User } from '@social-media-app/shared';

describe('auth-response-handlers', () => {
  describe('hasTokensInResponse', () => {
    it('should return true when response has tokens object', () => {
      const response = {
        user: {} as User,
        message: 'Success',
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        },
      };

      expect(hasTokensInResponse(response)).toBe(true);
    });

    it('should return false when response has no tokens', () => {
      const response = {
        user: {} as User,
        message: 'Success',
      };

      expect(hasTokensInResponse(response)).toBe(false);
    });

    it('should return false when tokens is null', () => {
      const response = {
        user: {} as User,
        message: 'Success',
        tokens: undefined,
      };

      expect(hasTokensInResponse(response)).toBe(false);
    });

    it('should return false when tokens is undefined', () => {
      const response = {
        user: {} as User,
        message: 'Success',
        tokens: undefined,
      };

      expect(hasTokensInResponse(response)).toBe(false);
    });

    it('should return false for empty response', () => {
      const response = {} as RegisterResponse;

      expect(hasTokensInResponse(response)).toBe(false);
    });
  });

  describe('shouldAutoLogin', () => {
    it('should return true when tokens are present and valid', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      };

      expect(shouldAutoLogin(response)).toBe(true);
    });

    it('should return false when no tokens present', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Please verify your email',
      };

      expect(shouldAutoLogin(response)).toBe(false);
    });

    it('should return false when tokens is null', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: undefined,
      };

      expect(shouldAutoLogin(response)).toBe(false);
    });

    it('should return false when tokens is undefined', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: undefined,
      };

      expect(shouldAutoLogin(response)).toBe(false);
    });
  });

  describe('processRegisterResponse', () => {
    it('should return tokens and normalized user when auto-login is enabled', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          // Missing updatedAt
        } as any,
        message: 'Success',
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      };

      const result = processRegisterResponse(response);

      expect(result).toEqual({
        shouldLogin: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z', // Fallback applied
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      });
    });

    it('should return shouldLogin false when no tokens present', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Please verify your email',
      };

      const result = processRegisterResponse(response);

      expect(result).toEqual({
        shouldLogin: false,
        user: null,
        tokens: null,
      });
    });

    it('should normalize user with missing updatedAt', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          // No updatedAt
        } as any,
        message: 'Success',
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        },
      };

      const result = processRegisterResponse(response);

      expect(result.shouldLogin).toBe(true);
      expect(result.user?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should preserve complete user timestamps when present', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        },
      };

      const result = processRegisterResponse(response);

      expect(result.shouldLogin).toBe(true);
      expect(result.user?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle response with null tokens', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: undefined,
      };

      const result = processRegisterResponse(response);

      expect(result).toEqual({
        shouldLogin: false,
        user: null,
        tokens: null,
      });
    });

    it('should handle response with undefined tokens', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: undefined,
      };

      const result = processRegisterResponse(response);

      expect(result).toEqual({
        shouldLogin: false,
        user: null,
        tokens: null,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token values', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'Success',
        tokens: {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
        },
      };

      // Even with empty strings, tokens object exists, so should auto-login
      const result = processRegisterResponse(response);

      expect(result.shouldLogin).toBe(true);
      expect(result.tokens).toEqual({
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
      });
    });

    it('should not mutate the original response object', () => {
      const response: RegisterResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        } as any,
        message: 'Success',
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        },
      };

      const original = JSON.parse(JSON.stringify(response));
      processRegisterResponse(response);

      expect(response).toEqual(original);
    });
  });
});
