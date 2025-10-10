import { describe, it, expect } from 'vitest';
import {
  ensureUserTimestamps,
  buildUserWithFallbacks,
  extractUserFromProfile,
} from './auth-user-builder.js';
import type { User } from '@social-media-app/shared';

describe('auth-user-builder', () => {
  describe('ensureUserTimestamps', () => {
    it('should preserve existing timestamps when both are present', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      } as User;

      const result = ensureUserTimestamps(user);

      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should use createdAt as updatedAt fallback when updatedAt is missing', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      } as any;

      const result = ensureUserTimestamps(user);

      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle user with all fields present', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
      } as User;

      const result = ensureUserTimestamps(user);

      expect(result).toEqual(user);
    });

    it('should not mutate the original user object', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      } as any;

      const original = { ...user };
      const result = ensureUserTimestamps(user);

      // Original should be unchanged
      expect(user).toEqual(original);
      // Result should have the fallback
      expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('buildUserWithFallbacks', () => {
    it('should build user with all required fields when complete', () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const result = buildUserWithFallbacks(userData);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should use createdAt as updatedAt fallback when missing', () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const result = buildUserWithFallbacks(userData);

      expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle partial user data with type assertions', () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00.000Z',
      } as any;

      const result = buildUserWithFallbacks(userData);

      expect(result).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should not mutate the original data object', () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const original = { ...userData };
      const result = buildUserWithFallbacks(userData);

      expect(userData).toEqual(original);
      expect(result).not.toBe(userData);
    });

    it('should preserve extra fields from userData', () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        extraField: 'should be preserved',
      } as any;

      const result = buildUserWithFallbacks(userData);

      expect(result).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        extraField: 'should be preserved',
      });
    });
  });

  describe('extractUserFromProfile', () => {
    it('should extract user fields from profile response', () => {
      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        displayName: 'Test User',
        bio: 'A test bio',
        followingCount: 10,
        followersCount: 5,
        postsCount: 3,
      };

      const result = extractUserFromProfile(profile);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should only include User type fields, excluding profile-specific fields', () => {
      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        displayName: 'Should be excluded',
        bio: 'Should be excluded',
        followingCount: 100,
        followersCount: 200,
        postsCount: 50,
      };

      const result = extractUserFromProfile(profile);

      expect(result).not.toHaveProperty('displayName');
      expect(result).not.toHaveProperty('bio');
      expect(result).not.toHaveProperty('followingCount');
      expect(result).not.toHaveProperty('followersCount');
      expect(result).not.toHaveProperty('postsCount');
    });

    it('should not mutate the original profile object', () => {
      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        displayName: 'Test User',
      };

      const original = { ...profile };
      const result = extractUserFromProfile(profile);

      expect(profile).toEqual(original);
      expect(result).not.toBe(profile);
    });

    it('should handle profiles with minimal fields', () => {
      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const result = extractUserFromProfile(profile);

      expect(result).toEqual(profile);
    });
  });

  describe('Integration Tests', () => {
    it('should build complete user from registration response', () => {
      const registrationResponse = {
        id: 'new-user',
        email: 'new@example.com',
        username: 'newuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        // No updatedAt from registration
      } as any;

      const user = buildUserWithFallbacks(registrationResponse);

      expect(user).toEqual({
        id: 'new-user',
        email: 'new@example.com',
        username: 'newuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z', // Fallback to createdAt
      });
    });

    it('should extract and normalize user from profile response', () => {
      const profileResponse = {
        id: 'user-1',
        email: 'user@example.com',
        username: 'user1',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-05T00:00:00.000Z',
        displayName: 'User One',
        bio: 'Bio text',
        followingCount: 10,
        followersCount: 20,
        postsCount: 5,
      };

      const user = extractUserFromProfile(profileResponse);
      const normalized = ensureUserTimestamps(user);

      expect(normalized).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        username: 'user1',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-05T00:00:00.000Z',
      });
    });
  });
});
