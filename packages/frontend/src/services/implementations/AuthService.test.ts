import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from './AuthService.js';
import { useAuthStore } from '../../stores/authStore.js';
import type { AuthHookResult } from './AuthService.js';
import type { User, AuthTokens } from '@social-media-app/shared';

describe('AuthService Store Subscription Pattern', () => {
  let authService: AuthService;
  let mockAuthHook: AuthHookResult;

  beforeEach(() => {
    // Clear the store before each test
    useAuthStore.getState().reset();

    // Create mock auth hook
    mockAuthHook = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
    };

    authService = new AuthService(mockAuthHook);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Reactive State Access', () => {
    it('should always return current state from store, not stale references', () => {
      // Initially not authenticated
      expect(authService.isAuthenticated).toBe(false);
      expect(authService.user).toBeNull();

      // Update store directly (simulating successful registration)
      const mockUser: User = {
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600
      };

      // Simulate what happens when registration succeeds
      useAuthStore.getState().login(mockUser, mockTokens);

      // AuthService should immediately reflect the new state
      expect(authService.isAuthenticated).toBe(true);
      expect(authService.user).toEqual(mockUser);
      expect(authService.error).toBeNull();
    });

    it('should reflect loading state changes', () => {
      expect(authService.isLoading).toBe(false);

      useAuthStore.getState().setLoading(true);
      expect(authService.isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(authService.isLoading).toBe(false);
    });

    it('should reflect error state changes', () => {
      expect(authService.error).toBeNull();

      const errorMessage = 'Authentication failed';
      useAuthStore.getState().setError(errorMessage);
      expect(authService.error).toBe(errorMessage);

      useAuthStore.getState().clearError();
      expect(authService.error).toBeNull();
    });
  });

  describe('Store Subscription', () => {
    it('should allow components to subscribe to auth state changes', () => {
      const callback = vi.fn();
      const unsubscribe = authService.subscribe(callback);

      // Change auth state
      const mockUser: User = {
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600
      };

      useAuthStore.getState().login(mockUser, mockTokens);

      // Callback should be called with the new state
      expect(callback).toHaveBeenCalled();
      const callbackArg = callback.mock.calls[0][0];
      expect(callbackArg.isAuthenticated).toBe(true);
      expect(callbackArg.user).toEqual(mockUser);
      expect(callbackArg.tokens).toEqual(mockTokens);

      // Clean up subscription
      unsubscribe();
    });

    it('should stop notifications after unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = authService.subscribe(callback);

      // Unsubscribe immediately
      unsubscribe();

      // Change state
      useAuthStore.getState().setLoading(true);

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Persistence Integration', () => {
    it('should work with Zustand persistence', () => {
      // Set up authenticated state
      const mockUser: User = {
        id: 'persisted-user',
        email: 'persisted@example.com',
        username: 'persisteduser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'persisted-access-token',
        refreshToken: 'persisted-refresh-token',
        expiresIn: 3600
      };

      useAuthStore.getState().login(mockUser, mockTokens);

      // Create new AuthService instance (simulating page reload)
      const newAuthService = new AuthService(mockAuthHook);

      // Should immediately have access to persisted state
      expect(newAuthService.isAuthenticated).toBe(true);
      expect(newAuthService.user).toEqual(mockUser);
    });
  });

  describe('Stale Closure Prevention', () => {
    it('should not suffer from stale closure issues', () => {
      // This test verifies the fix for the stale closure problem
      const capturedStates: boolean[] = [];

      // Capture initial state
      capturedStates.push(authService.isAuthenticated);
      expect(capturedStates[0]).toBe(false);

      // Update state
      const mockUser: User = {
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600
      };

      useAuthStore.getState().login(mockUser, mockTokens);

      // Capture state again - should be updated
      capturedStates.push(authService.isAuthenticated);
      expect(capturedStates[1]).toBe(true);

      // Even if we had captured the getter earlier, it should return current state
      const getIsAuthenticated = () => authService.isAuthenticated;

      useAuthStore.getState().logout();
      expect(getIsAuthenticated()).toBe(false);

      useAuthStore.getState().login(mockUser, mockTokens);
      expect(getIsAuthenticated()).toBe(true);
    });
  });

  describe('Method Delegation', () => {
    it('should delegate login to auth hook', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      await authService.login(credentials);
      expect(mockAuthHook.login).toHaveBeenCalledWith(credentials);
    });

    it('should delegate register to auth hook', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };
      await authService.register(userData);
      expect(mockAuthHook.register).toHaveBeenCalledWith(userData);
    });

    it('should delegate logout to auth hook', async () => {
      await authService.logout();
      expect(mockAuthHook.logout).toHaveBeenCalled();
    });

    it('should delegate clearError to auth hook', () => {
      authService.clearError();
      expect(mockAuthHook.clearError).toHaveBeenCalled();
    });
  });
});