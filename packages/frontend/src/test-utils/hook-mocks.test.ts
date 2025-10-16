import { describe, it, expect, vi } from 'vitest';
import {
  createMockAuthenticatedUser,
  createMockAuthTokens,
  createMockUseAuthReturn,
  mockUseAuthAuthenticated,
  mockUseAuthUnauthenticated,
  createMockUseFollowReturn,
  createMockUseLikeReturn,
  type UseAuthReturn,
  type UseFollowReturn,
  type UseLikeReturn
} from './hook-mocks.js';

describe('hook-mocks', () => {
  describe('createMockAuthenticatedUser', () => {
    it('creates a default authenticated user', () => {
      const user = createMockAuthenticatedUser();

      expect(user).toEqual({
        id: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('accepts overrides', () => {
      const user = createMockAuthenticatedUser({
        id: 'custom-id',
        username: 'customuser'
      });

      expect(user.id).toBe('custom-id');
      expect(user.username).toBe('customuser');
      expect(user.email).toBe('test@example.com'); // Default preserved
    });
  });

  describe('createMockAuthTokens', () => {
    it('creates default auth tokens', () => {
      const tokens = createMockAuthTokens();

      expect(tokens).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600
      });
    });

    it('accepts overrides', () => {
      const tokens = createMockAuthTokens({
        accessToken: 'custom-token',
        expiresIn: 7200
      });

      expect(tokens.accessToken).toBe('custom-token');
      expect(tokens.expiresIn).toBe(7200);
    });
  });

  describe('createMockUseAuthReturn', () => {
    it('creates default unauthenticated state', () => {
      const authReturn = createMockUseAuthReturn();

      expect(authReturn.user).toBeNull();
      expect(authReturn.tokens).toBeNull();
      expect(authReturn.isAuthenticated).toBe(false);
      expect(authReturn.isLoading).toBe(false);
      expect(authReturn.error).toBeNull();
      expect(authReturn.isHydrated).toBe(true);
    });

    it('includes mock functions', () => {
      const authReturn = createMockUseAuthReturn();

      expect(vi.isMockFunction(authReturn.register)).toBe(true);
      expect(vi.isMockFunction(authReturn.login)).toBe(true);
      expect(vi.isMockFunction(authReturn.logout)).toBe(true);
      expect(vi.isMockFunction(authReturn.clearError)).toBe(true);
    });

    it('accepts overrides', () => {
      const authReturn = createMockUseAuthReturn({
        isLoading: true,
        error: 'Test error'
      });

      expect(authReturn.isLoading).toBe(true);
      expect(authReturn.error).toBe('Test error');
    });
  });

  describe('mockUseAuthAuthenticated', () => {
    it('creates authenticated state with user and tokens', () => {
      const authReturn = mockUseAuthAuthenticated();

      expect(authReturn.user).not.toBeNull();
      expect(authReturn.tokens).not.toBeNull();
      expect(authReturn.isAuthenticated).toBe(true);
      expect(authReturn.user?.id).toBe('test-user-123');
    });

    it('accepts user overrides', () => {
      const authReturn = mockUseAuthAuthenticated({ username: 'customuser' });

      expect(authReturn.user?.username).toBe('customuser');
      expect(authReturn.isAuthenticated).toBe(true);
    });
  });

  describe('mockUseAuthUnauthenticated', () => {
    it('creates unauthenticated state', () => {
      const authReturn = mockUseAuthUnauthenticated();

      expect(authReturn.user).toBeNull();
      expect(authReturn.tokens).toBeNull();
      expect(authReturn.isAuthenticated).toBe(false);
    });
  });

  describe('createMockUseFollowReturn', () => {
    it('creates default follow state', () => {
      const followReturn = createMockUseFollowReturn();

      expect(followReturn.isFollowing).toBe(false);
      expect(followReturn.followersCount).toBe(0);
      expect(followReturn.followingCount).toBe(0);
      expect(followReturn.isLoading).toBe(false);
      expect(followReturn.error).toBeNull();
    });

    it('includes mock functions', () => {
      const followReturn = createMockUseFollowReturn();

      expect(vi.isMockFunction(followReturn.followUser)).toBe(true);
      expect(vi.isMockFunction(followReturn.unfollowUser)).toBe(true);
      expect(vi.isMockFunction(followReturn.toggleFollow)).toBe(true);
    });

    it('accepts overrides', () => {
      const followReturn = createMockUseFollowReturn({
        isFollowing: true,
        followersCount: 100
      });

      expect(followReturn.isFollowing).toBe(true);
      expect(followReturn.followersCount).toBe(100);
    });
  });

  describe('createMockUseLikeReturn', () => {
    it('creates default like state', () => {
      const likeReturn = createMockUseLikeReturn();

      expect(likeReturn.isLiked).toBe(false);
      expect(likeReturn.likesCount).toBe(0);
      expect(likeReturn.isLoading).toBe(false);
      expect(likeReturn.error).toBeNull();
    });

    it('includes mock functions', () => {
      const likeReturn = createMockUseLikeReturn();

      expect(vi.isMockFunction(likeReturn.likePost)).toBe(true);
      expect(vi.isMockFunction(likeReturn.unlikePost)).toBe(true);
      expect(vi.isMockFunction(likeReturn.toggleLike)).toBe(true);
    });

    it('accepts overrides', () => {
      const likeReturn = createMockUseLikeReturn({
        isLiked: true,
        likesCount: 42
      });

      expect(likeReturn.isLiked).toBe(true);
      expect(likeReturn.likesCount).toBe(42);
    });
  });

  describe('TypeScript type checking', () => {
    it('UseAuthReturn type is correctly structured', () => {
      const authReturn: UseAuthReturn = createMockUseAuthReturn();

      // This test passes if TypeScript compiles without errors
      expect(authReturn).toBeDefined();
    });

    it('UseFollowReturn type is correctly structured', () => {
      const followReturn: UseFollowReturn = createMockUseFollowReturn();

      // This test passes if TypeScript compiles without errors
      expect(followReturn).toBeDefined();
    });

    it('UseLikeReturn type is correctly structured', () => {
      const likeReturn: UseLikeReturn = createMockUseLikeReturn();

      // This test passes if TypeScript compiles without errors
      expect(likeReturn).toBeDefined();
    });
  });
});
