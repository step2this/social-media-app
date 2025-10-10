import { describe, it, expect } from 'vitest';
import {
  extractAuthErrorMessage,
  createRegisterErrorMessage,
  createLoginErrorMessage,
  createProfileErrorMessage,
  createUpdateProfileErrorMessage,
  isAuthError,
} from './auth-error-handler.js';

// Mock error classes for testing
class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public errors?: any[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

describe('auth-error-handler', () => {
  describe('isAuthError', () => {
    it('should return true for ApiError', () => {
      const error = new ApiError('API failed', 500);
      expect(isAuthError(error)).toBe(true);
    });

    it('should return true for NetworkError', () => {
      const error = new NetworkError('Network failed');
      expect(isAuthError(error)).toBe(true);
    });

    it('should return true for ValidationError', () => {
      const error = new ValidationError('Validation failed');
      expect(isAuthError(error)).toBe(true);
    });

    it('should return false for generic Error', () => {
      const error = new Error('Generic error');
      expect(isAuthError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isAuthError({ message: 'Not an error' })).toBe(false);
      expect(isAuthError('string error')).toBe(false);
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
    });
  });

  describe('extractAuthErrorMessage', () => {
    it('should extract message from ApiError', () => {
      const error = new ApiError('User not found', 404);
      expect(extractAuthErrorMessage(error)).toBe('User not found');
    });

    it('should extract message from NetworkError', () => {
      const error = new NetworkError('Connection timeout');
      expect(extractAuthErrorMessage(error)).toBe('Connection timeout');
    });

    it('should extract message from ValidationError', () => {
      const error = new ValidationError('Invalid email format');
      expect(extractAuthErrorMessage(error)).toBe('Invalid email format');
    });

    it('should extract message from generic Error with message', () => {
      const error = new Error('Something went wrong');
      expect(extractAuthErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return null for errors without message', () => {
      const error = new Error();
      expect(extractAuthErrorMessage(error)).toBeNull();
    });

    it('should return null for non-Error objects', () => {
      expect(extractAuthErrorMessage({ foo: 'bar' })).toBeNull();
      expect(extractAuthErrorMessage('string error')).toBeNull();
      expect(extractAuthErrorMessage(null)).toBeNull();
      expect(extractAuthErrorMessage(undefined)).toBeNull();
    });
  });

  describe('createRegisterErrorMessage', () => {
    it('should use specific error message for auth errors', () => {
      const error = new ApiError('Email already exists', 409);
      const message = createRegisterErrorMessage(error);
      expect(message).toBe('Email already exists');
    });

    it('should use specific error message for network errors', () => {
      const error = new NetworkError('Network connection failed');
      const message = createRegisterErrorMessage(error);
      expect(message).toBe('Network connection failed');
    });

    it('should use specific error message for validation errors', () => {
      const error = new ValidationError('Password too weak');
      const message = createRegisterErrorMessage(error);
      expect(message).toBe('Password too weak');
    });

    it('should use fallback message for generic errors', () => {
      const error = new Error('Unknown error');
      const message = createRegisterErrorMessage(error);
      expect(message).toBe('Registration failed. Please try again.');
    });

    it('should use fallback message for errors without messages', () => {
      const error = new Error();
      const message = createRegisterErrorMessage(error);
      expect(message).toBe('Registration failed. Please try again.');
    });

    it('should use fallback message for non-Error objects', () => {
      const message = createRegisterErrorMessage({ foo: 'bar' });
      expect(message).toBe('Registration failed. Please try again.');
    });
  });

  describe('createLoginErrorMessage', () => {
    it('should use specific error message for auth errors', () => {
      const error = new ApiError('Invalid credentials', 401);
      const message = createLoginErrorMessage(error);
      expect(message).toBe('Invalid credentials');
    });

    it('should use specific error message for network errors', () => {
      const error = new NetworkError('Server unreachable');
      const message = createLoginErrorMessage(error);
      expect(message).toBe('Server unreachable');
    });

    it('should use fallback message for generic errors', () => {
      const error = new Error('Unknown error');
      const message = createLoginErrorMessage(error);
      expect(message).toBe('Login failed. Please check your credentials.');
    });

    it('should use fallback message for errors without messages', () => {
      const error = new Error();
      const message = createLoginErrorMessage(error);
      expect(message).toBe('Login failed. Please check your credentials.');
    });
  });

  describe('createProfileErrorMessage', () => {
    it('should use specific error message for auth errors', () => {
      const error = new ApiError('Token expired', 401);
      const message = createProfileErrorMessage(error);
      expect(message).toBe('Token expired');
    });

    it('should use specific error message for network errors', () => {
      const error = new NetworkError('Request timeout');
      const message = createProfileErrorMessage(error);
      expect(message).toBe('Request timeout');
    });

    it('should use fallback message for generic errors', () => {
      const error = new Error('Unknown error');
      const message = createProfileErrorMessage(error);
      expect(message).toBe('Failed to get profile. Please try again.');
    });

    it('should use fallback message for errors without messages', () => {
      const error = new Error();
      const message = createProfileErrorMessage(error);
      expect(message).toBe('Failed to get profile. Please try again.');
    });
  });

  describe('createUpdateProfileErrorMessage', () => {
    it('should use specific error message for auth errors', () => {
      const error = new ApiError('Username already taken', 409);
      const message = createUpdateProfileErrorMessage(error);
      expect(message).toBe('Username already taken');
    });

    it('should use specific error message for network errors', () => {
      const error = new NetworkError('Network error');
      const message = createUpdateProfileErrorMessage(error);
      expect(message).toBe('Network error');
    });

    it('should use specific error message for validation errors', () => {
      const error = new ValidationError('Invalid profile data');
      const message = createUpdateProfileErrorMessage(error);
      expect(message).toBe('Invalid profile data');
    });

    it('should use fallback message for generic errors', () => {
      const error = new Error('Unknown error');
      const message = createUpdateProfileErrorMessage(error);
      expect(message).toBe('Failed to update profile. Please try again.');
    });

    it('should use fallback message for errors without messages', () => {
      const error = new Error();
      const message = createUpdateProfileErrorMessage(error);
      expect(message).toBe('Failed to update profile. Please try again.');
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors with empty string messages', () => {
      const error = new Error('');
      expect(extractAuthErrorMessage(error)).toBeNull();
      expect(createRegisterErrorMessage(error)).toBe('Registration failed. Please try again.');
      expect(createLoginErrorMessage(error)).toBe('Login failed. Please check your credentials.');
    });

    it('should handle errors with whitespace-only messages', () => {
      const error = new Error('   ');
      // Whitespace-only messages are treated as empty (trimmed)
      expect(extractAuthErrorMessage(error)).toBeNull();
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new ApiError(longMessage);
      expect(createRegisterErrorMessage(error)).toBe(longMessage);
      expect(extractAuthErrorMessage(error)).toBe(longMessage);
    });

    it('should handle errors with special characters in messages', () => {
      const specialMessage = 'Error: <script>alert("xss")</script>';
      const error = new ApiError(specialMessage);
      expect(extractAuthErrorMessage(error)).toBe(specialMessage);
      expect(createLoginErrorMessage(error)).toBe(specialMessage);
    });
  });
});
