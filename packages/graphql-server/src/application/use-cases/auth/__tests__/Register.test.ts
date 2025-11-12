/**
 * Behavioral Tests for Register Use Case
 *
 * Testing Principles:
 * ✅ No mocks - use real in-memory service implementations
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test outcomes, not implementation details
 * ✅ Type-safe throughout
 * ✅ Test core use cases + key edge cases
 *
 * What we're testing:
 * - Successful user registration
 * - Email uniqueness validation
 * - Username uniqueness validation
 * - Token generation
 * - Profile creation
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Register } from '../Register.js';
import { createFakeServices } from '../../../../__tests__/helpers/fake-services.js';

describe('Register Use Case', () => {
  let services: ReturnType<typeof createFakeServices>;
  let useCase: Register;

  beforeEach(() => {
    // Create fresh services for each test
    services = createFakeServices();
    useCase = new Register({
      authService: services.authService,
      profileService: services.profileService,
    });
  });

  describe('Successful Registration', () => {
    it('should register new user with valid credentials', async () => {
      // ARRANGE
      const input = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        username: 'newuser',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: User is created successfully
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toBeDefined();
        expect(result.data.user.email).toBe(input.email);
        expect(result.data.user.username).toBe(input.username);
        expect(result.data.user.id).toBeDefined();
      }
    });

    it('should return authentication tokens on successful registration', async () => {
      // ARRANGE
      const input = {
        email: 'user@example.com',
        password: 'password123',
        username: 'testuser',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: Tokens are generated
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toBeDefined();
        expect(result.data.tokens.accessToken).toBeDefined();
        expect(result.data.tokens.refreshToken).toBeDefined();
        expect(typeof result.data.tokens.accessToken).toBe('string');
        expect(typeof result.data.tokens.refreshToken).toBe('string');
      }
    });

    it('should create user profile with correct handle', async () => {
      // ARRANGE
      const input = {
        email: 'alice@example.com',
        password: 'alicepass',
        username: 'alice',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: Profile has handle based on username
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.handle).toBe('@alice');
      }
    });

    it('should initialize profile with zero counts', async () => {
      // ARRANGE
      const input = {
        email: 'bob@example.com',
        password: 'bobpass',
        username: 'bob',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: New user starts with zero counts
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.postsCount).toBe(0);
        expect(result.data.user.followersCount).toBe(0);
        expect(result.data.user.followingCount).toBe(0);
      }
    });

    it('should set emailVerified to false for new users', async () => {
      // ARRANGE
      const input = {
        email: 'carol@example.com',
        password: 'carolpass',
        username: 'carol',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: Email not verified initially
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.emailVerified).toBe(false);
      }
    });

    it('should include timestamps in user profile', async () => {
      // ARRANGE
      const input = {
        email: 'dave@example.com',
        password: 'davepass',
        username: 'dave',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: Timestamps are set
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.createdAt).toBeDefined();
        expect(result.data.user.updatedAt).toBeDefined();
        expect(() => new Date(result.data.user.createdAt)).not.toThrow();
      }
    });
  });

  describe('Email Validation', () => {
    it('should reject registration with existing email', async () => {
      // ARRANGE - Register first user
      const existingUser = {
        email: 'existing@example.com',
        password: 'pass123',
        username: 'existing',
      };
      await useCase.execute(existingUser);

      // Try to register with same email but different username
      const duplicateEmail = {
        email: 'existing@example.com', // Same email
        password: 'differentpass',
        username: 'different', // Different username
      };

      // ACT
      const result = await useCase.execute(duplicateEmail);

      // ASSERT - Behavior: Email must be unique
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Email already registered');
      }
    });

    it('should allow registration after failed attempt with duplicate email', async () => {
      // ARRANGE - Register first user
      await useCase.execute({
        email: 'taken@example.com',
        password: 'pass',
        username: 'user1',
      });

      // Try duplicate (will fail)
      await useCase.execute({
        email: 'taken@example.com',
        password: 'pass',
        username: 'user2',
      });

      // ACT - Register with different email (should succeed)
      const result = await useCase.execute({
        email: 'available@example.com',
        password: 'pass',
        username: 'user3',
      });

      // ASSERT - Behavior: System recovers from validation errors
      expect(result.success).toBe(true);
    });
  });

  describe('Username Validation', () => {
    it('should reject registration with existing username', async () => {
      // ARRANGE - Register first user
      const existingUser = {
        email: 'user1@example.com',
        password: 'pass123',
        username: 'cooluser',
      };
      await useCase.execute(existingUser);

      // Try to register with same username but different email
      const duplicateUsername = {
        email: 'user2@example.com', // Different email
        password: 'differentpass',
        username: 'cooluser', // Same username
      };

      // ACT
      const result = await useCase.execute(duplicateUsername);

      // ASSERT - Behavior: Username must be unique
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Username already taken');
      }
    });

    it('should allow registration with similar but different usernames', async () => {
      // ARRANGE - Register first user
      await useCase.execute({
        email: 'user1@example.com',
        password: 'pass',
        username: 'john',
      });

      // ACT - Register with similar username
      const result = await useCase.execute({
        email: 'user2@example.com',
        password: 'pass',
        username: 'john123', // Different username
      });

      // ASSERT - Behavior: Similar usernames are allowed
      expect(result.success).toBe(true);
    });
  });

  describe('Token Generation', () => {
    it('should generate unique access tokens for different users', async () => {
      // ARRANGE & ACT - Register two users
      const result1 = await useCase.execute({
        email: 'user1@example.com',
        password: 'pass1',
        username: 'user1',
      });

      const result2 = await useCase.execute({
        email: 'user2@example.com',
        password: 'pass2',
        username: 'user2',
      });

      // ASSERT - Behavior: Each user gets unique tokens
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.tokens.accessToken).not.toBe(
          result2.data.tokens.accessToken
        );
        expect(result1.data.tokens.refreshToken).not.toBe(
          result2.data.tokens.refreshToken
        );
      }
    });

    it('should generate tokens that can be used for authentication', async () => {
      // ARRANGE & ACT
      const result = await useCase.execute({
        email: 'test@example.com',
        password: 'testpass',
        username: 'testuser',
      });

      // ASSERT - Behavior: Tokens are valid format
      expect(result.success).toBe(true);
      if (result.success) {
        // Tokens should be non-empty strings
        expect(result.data.tokens.accessToken.length).toBeGreaterThan(0);
        expect(result.data.tokens.refreshToken.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Profile Creation', () => {
    it('should create profile accessible by user ID', async () => {
      // ARRANGE & ACT - Register user
      const result = await useCase.execute({
        email: 'findme@example.com',
        password: 'pass',
        username: 'findme',
      });

      // ASSERT - Behavior: Profile can be retrieved
      expect(result.success).toBe(true);
      if (result.success) {
        const userId = result.data.user.id;
        const profile = await services.profileService.getProfileById(userId);
        expect(profile).toBeDefined();
        expect(profile?.id).toBe(userId);
        expect(profile?.email).toBe('findme@example.com');
      }
    });

    it('should fail gracefully if profile creation fails', async () => {
      // ARRANGE - Break profile service
      const brokenProfileService = {
        getProfileById: async () => null, // Always returns null
      };

      const brokenUseCase = new Register({
        authService: services.authService,
        profileService: brokenProfileService as any,
      });

      // ACT
      const result = await brokenUseCase.execute({
        email: 'test@example.com',
        password: 'pass',
        username: 'test',
      });

      // ASSERT - Behavior: Error when profile not found
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create user profile');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple concurrent registrations', async () => {
      // ARRANGE - Multiple registration requests
      const registrations = [
        {
          email: 'user1@example.com',
          password: 'pass1',
          username: 'user1',
        },
        {
          email: 'user2@example.com',
          password: 'pass2',
          username: 'user2',
        },
        {
          email: 'user3@example.com',
          password: 'pass3',
          username: 'user3',
        },
      ];

      // ACT - Execute concurrently
      const results = await Promise.all(
        registrations.map((input) => useCase.execute(input))
      );

      // ASSERT - Behavior: All succeed independently
      expect(results.every((r) => r.success)).toBe(true);
      if (results.every((r) => r.success)) {
        const userIds = results.map((r) => (r as any).data.user.id);
        const uniqueIds = new Set(userIds);
        expect(uniqueIds.size).toBe(3); // All unique IDs
      }
    });

    it('should preserve user data through registration process', async () => {
      // ARRANGE
      const input = {
        email: 'preserve@example.com',
        password: 'mypassword',
        username: 'preserve',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: All input data preserved in output
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.email).toBe(input.email);
        expect(result.data.user.username).toBe(input.username);
        // Password should NOT be in user object (security)
        expect(result.data.user).not.toHaveProperty('password');
      }
    });

    it('should allow registration with special characters in email', async () => {
      // ARRANGE
      const input = {
        email: 'user+tag@sub.example.com',
        password: 'pass',
        username: 'special',
      };

      // ACT
      const result = await useCase.execute(input);

      // ASSERT - Behavior: Valid emails accepted
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.email).toBe(input.email);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return error for auth service failures', async () => {
      // ARRANGE - Break auth service
      const brokenAuthService = {
        register: async () => {
          throw new Error('Database connection failed');
        },
      };

      const brokenUseCase = new Register({
        authService: brokenAuthService as any,
        profileService: services.profileService,
      });

      // ACT
      const result = await brokenUseCase.execute({
        email: 'test@example.com',
        password: 'pass',
        username: 'test',
      });

      // ASSERT - Behavior: Errors propagated correctly
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle missing token generation', async () => {
      // ARRANGE - Auth service that doesn't return tokens
      const noTokensAuthService = {
        register: async () => ({
          user: { id: 'user-123' },
          tokens: undefined, // Missing tokens
        }),
      };

      // Seed profile so we can test the token generation error path
      services.profileService.seedProfile({
        id: 'user-123',
        email: 'test@example.com',
        username: 'test',
        password: 'pass',
        handle: '@test',
        fullName: null,
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false,
      });

      const brokenUseCase = new Register({
        authService: noTokensAuthService as any,
        profileService: services.profileService,
      });

      // ACT
      const result = await brokenUseCase.execute({
        email: 'test@example.com',
        password: 'pass',
        username: 'test',
      });

      // ASSERT - Behavior: Missing tokens detected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to generate authentication tokens');
      }
    });
  });
});
