import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore.js';
import type { User, AuthTokens } from '@social-media-app/shared';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().clearError();
    useAuthStore.getState().logout();
  });

  it('should have initial state', () => {
    const store = useAuthStore.getState();

    expect(store.user).toBeNull();
    expect(store.tokens).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should set loading state', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('should set error state', () => {
    useAuthStore.getState().setError('Test error');
    expect(useAuthStore.getState().error).toBe('Test error');

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('should handle login correctly', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      fullName: 'Test User',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    const mockTokens: AuthTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600
    };

    useAuthStore.getState().login(mockUser, mockTokens);

    const store = useAuthStore.getState();
    expect(store.user).toEqual(mockUser);
    expect(store.tokens).toEqual(mockTokens);
    expect(store.isAuthenticated).toBe(true);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should handle logout correctly', () => {
    // First login
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
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

    useAuthStore.getState().login(mockUser, mockTokens);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Then logout
    useAuthStore.getState().logout();

    const store = useAuthStore.getState();
    expect(store.user).toBeNull();
    expect(store.tokens).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should update user data', () => {
    const initialUser: User = {
      id: 'user-1',
      email: 'test@example.com',
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

    useAuthStore.getState().login(initialUser, mockTokens);

    const updatedUser: User = {
      ...initialUser,
      fullName: 'Updated Name',
      updatedAt: '2024-01-01T00:30:00.000Z'
    };

    useAuthStore.getState().setUser(updatedUser);

    const store = useAuthStore.getState();
    expect(store.user).toEqual(updatedUser);
    expect(store.user?.fullName).toBe('Updated Name');
  });

  it('should update tokens', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    const initialTokens: AuthTokens = {
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresIn: 3600
    };

    useAuthStore.getState().login(mockUser, initialTokens);

    const newTokens: AuthTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 7200
    };

    useAuthStore.getState().setTokens(newTokens);

    const store = useAuthStore.getState();
    expect(store.tokens).toEqual(newTokens);
    expect(store.tokens?.accessToken).toBe('new-access-token');
  });
});