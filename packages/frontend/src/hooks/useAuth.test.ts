import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { useAuthStore } from '../stores/authStore';
import * as apiClient from '../services/apiClient';
import { ApiError } from '../services/apiClient';
import type { RegisterResponse, LoginResponse, User, AuthTokens } from '@social-media-app/shared';

// Mock the apiClient
vi.mock('../services/apiClient', () => ({
  apiClient: {
    auth: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
    }
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
  NetworkError: class NetworkError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NetworkError';
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public errors?: any[]) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}));

describe('useAuth Hook - Registration Flow Integration', () => {
  beforeEach(() => {
    // Clear store before each test
    useAuthStore.getState().reset();
    // Clear all mocks
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration with Auto-Login', () => {
    it('should handle successful registration with auto-login when tokens are returned', async () => {
      const mockUser: User = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        username: 'newuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      const mockResponse: RegisterResponse = {
        user: mockUser,
        message: 'Registration successful. Welcome!',
        tokens: mockTokens // Tokens included for auto-login
      };

      // Mock successful registration with tokens
      vi.mocked(apiClient.apiClient.auth.register).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      // Initially not authenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();

      // Register new user
      await act(async () => {
        await result.current.register({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          username: 'newuser'
        });
      });

      // Should be authenticated after registration with tokens
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(expect.objectContaining({
          id: 'new-user-id',
          email: 'newuser@example.com',
          username: 'newuser'
        }));
        expect(result.current.tokens).toEqual(mockTokens);
      });
    });

    it('should handle registration without auto-login when no tokens returned', async () => {
      const mockUser: User = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        username: 'newuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockResponse: RegisterResponse = {
        user: mockUser,
        message: 'Registration successful. Please verify your email.',
        // No tokens - user needs to verify email first
      };

      // Mock successful registration without tokens
      vi.mocked(apiClient.apiClient.auth.register).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      // Register new user
      await act(async () => {
        await result.current.register({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          username: 'newuser'
        });
      });

      // Should NOT be authenticated if no tokens returned
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
    });

    it('should handle registration errors properly', async () => {
      const errorMessage = 'Email already exists';
      vi.mocked(apiClient.apiClient.auth.register).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth());

      // Attempt registration and expect it to throw
      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'Password123!',
            username: 'existinguser'
          });
        } catch (error) {
          thrownError = error as Error;
        }
      });

      // Should have thrown the error
      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toBe(errorMessage);

      // Should have error state set by the hook
      expect(result.current.error).toBe('Registration failed. Please try again.');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Store Persistence After Registration', () => {
    it('should persist authentication state after successful registration with tokens', async () => {
      const mockUser: User = {
        id: 'persistent-user',
        email: 'persistent@example.com',
        username: 'persistentuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'persistent-access-token',
        refreshToken: 'persistent-refresh-token',
        expiresIn: 3600
      };

      const mockResponse: RegisterResponse = {
        user: mockUser,
        message: 'Registration successful. Welcome!',
        tokens: mockTokens
      };

      vi.mocked(apiClient.apiClient.auth.register).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      // Register and auto-login
      await act(async () => {
        await result.current.register({
          email: 'persistent@example.com',
          password: 'Password123!',
          username: 'persistentuser'
        });
      });

      // Verify authenticated
      expect(result.current.isAuthenticated).toBe(true);

      // Simulate page reload by creating new hook instance
      const { result: newResult } = renderHook(() => useAuth());

      // Should still be authenticated from persisted store
      expect(newResult.current.isAuthenticated).toBe(true);
      expect(newResult.current.user).toEqual(expect.objectContaining({
        email: 'persistent@example.com',
        username: 'persistentuser'
      }));
      expect(newResult.current.tokens).toEqual(mockTokens);
    });
  });

  describe('Login Flow Comparison', () => {
    it('should have consistent behavior between login and registration with tokens', async () => {
      const mockUser: User = {
        id: 'user-id',
        email: 'user@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      // Test login flow
      const loginResponse: LoginResponse = {
        user: mockUser,
        tokens: mockTokens
      };

      vi.mocked(apiClient.apiClient.auth.login).mockResolvedValue(loginResponse);

      const { result: loginResult } = renderHook(() => useAuth());

      await act(async () => {
        await loginResult.current.login({
          email: 'user@example.com',
          password: 'Password123!'
        });
      });

      const loginState = {
        isAuthenticated: loginResult.current.isAuthenticated,
        user: loginResult.current.user,
        tokens: loginResult.current.tokens
      };

      // Reset for registration test
      useAuthStore.getState().reset();

      // Test registration flow with tokens
      const registerResponse: RegisterResponse = {
        user: mockUser,
        message: 'Registration successful. Welcome!',
        tokens: mockTokens
      };

      vi.mocked(apiClient.apiClient.auth.register).mockResolvedValue(registerResponse);

      const { result: registerResult } = renderHook(() => useAuth());

      await act(async () => {
        await registerResult.current.register({
          email: 'user@example.com',
          password: 'Password123!',
          username: 'testuser'
        });
      });

      const registerState = {
        isAuthenticated: registerResult.current.isAuthenticated,
        user: registerResult.current.user,
        tokens: registerResult.current.tokens
      };

      // Both flows should result in the same authenticated state
      expect(registerState).toEqual(loginState);
    });
  });
});