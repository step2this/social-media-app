/**
 * Behavioral Tests for Login Use Case
 *
 * Testing Principles:
 * ✅ No mocks - use real in-memory service implementations
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test authentication outcomes
 * ✅ Type-safe throughout
 * ✅ Test core use cases + key edge cases
 *
 * What we're testing:
 * - Successful authentication
 * - Invalid credentials handling
 * - Token generation on login
 * - Profile retrieval
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Login } from '../Login.js';
import { createFakeServices } from '../../../../__tests__/helpers/fake-services.js';

describe('Login Use Case', () => {
  let services: ReturnType<typeof createFakeServices>;
  let useCase: Login;

  beforeEach(() => {
    // Create fresh services for each test
    services = createFakeServices();
    useCase = new Login({
      authService: services.authService,
      profileService: services.profileService,
    });
  });

  /**
   * Helper to create a test user
   */
  async function createTestUser(email: string, password: string, username: string) {
    return await services.authService.register({ email, password, username });
  }

  describe('Successful Login', () => {
    it('should authenticate user with valid credentials', async () => {
      // ARRANGE - Create user
      await createTestUser('user@example.com', 'correctpass', 'testuser');

      // ACT - Login
      const result = await useCase.execute({
        email: 'user@example.com',
        password: 'correctpass',
      });

      // ASSERT - Behavior: Authentication succeeds
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toBeDefined();
        expect(result.data.user.email).toBe('user@example.com');
        expect(result.data.user.username).toBe('testuser');
      }
    });

    it('should return authentication tokens on successful login', async () => {
      // ARRANGE
      await createTestUser('tokens@example.com', 'mypass', 'tokenuser');

      // ACT
      const result = await useCase.execute({
        email: 'tokens@example.com',
        password: 'mypass',
      });

      // ASSERT - Behavior: New tokens generated
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toBeDefined();
        expect(result.data.tokens.accessToken).toBeDefined();
        expect(result.data.tokens.refreshToken).toBeDefined();
        expect(typeof result.data.tokens.accessToken).toBe('string');
        expect(typeof result.data.tokens.refreshToken).toBe('string');
      }
    });

    it('should return complete user profile on login', async () => {
      // ARRANGE
      await createTestUser('profile@example.com', 'pass', 'profileuser');

      // ACT
      const result = await useCase.execute({
        email: 'profile@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: Full profile returned
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.id).toBeDefined();
        expect(result.data.user.email).toBe('profile@example.com');
        expect(result.data.user.username).toBe('profileuser');
        expect(result.data.user.handle).toBe('@profileuser');
        expect(result.data.user).toHaveProperty('postsCount');
        expect(result.data.user).toHaveProperty('followersCount');
        expect(result.data.user).toHaveProperty('followingCount');
        expect(result.data.user).toHaveProperty('createdAt');
        expect(result.data.user).toHaveProperty('updatedAt');
      }
    });

    it('should allow login immediately after registration', async () => {
      // ARRANGE - Register user
      await createTestUser('newreg@example.com', 'newpass', 'newuser');

      // ACT - Login immediately
      const result = await useCase.execute({
        email: 'newreg@example.com',
        password: 'newpass',
      });

      // ASSERT - Behavior: Can login right after registration
      expect(result.success).toBe(true);
    });

    it('should allow multiple successive logins', async () => {
      // ARRANGE
      await createTestUser('multi@example.com', 'pass', 'multiuser');

      // ACT - Login multiple times
      const login1 = await useCase.execute({
        email: 'multi@example.com',
        password: 'pass',
      });
      const login2 = await useCase.execute({
        email: 'multi@example.com',
        password: 'pass',
      });
      const login3 = await useCase.execute({
        email: 'multi@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: All logins succeed
      expect(login1.success).toBe(true);
      expect(login2.success).toBe(true);
      expect(login3.success).toBe(true);

      // Each login gets different tokens
      if (login1.success && login2.success) {
        expect(login1.data.tokens.accessToken).not.toBe(
          login2.data.tokens.accessToken
        );
      }
    });
  });

  describe('Invalid Credentials', () => {
    it('should reject login with non-existent email', async () => {
      // ARRANGE - No user created

      // ACT
      const result = await useCase.execute({
        email: 'nonexistent@example.com',
        password: 'anypass',
      });

      // ASSERT - Behavior: Authentication fails
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid email or password');
      }
    });

    it('should reject login with wrong password', async () => {
      // ARRANGE
      await createTestUser('user@example.com', 'correctpass', 'user');

      // ACT - Login with wrong password
      const result = await useCase.execute({
        email: 'user@example.com',
        password: 'wrongpass',
      });

      // ASSERT - Behavior: Authentication fails
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid email or password');
      }
    });

    it('should not reveal whether email or password was incorrect', async () => {
      // ARRANGE
      await createTestUser('secure@example.com', 'pass123', 'secure');

      // ACT - Try with wrong email and wrong password
      const wrongEmail = await useCase.execute({
        email: 'notfound@example.com',
        password: 'pass123',
      });
      const wrongPassword = await useCase.execute({
        email: 'secure@example.com',
        password: 'wrongpass',
      });

      // ASSERT - Behavior: Same error message (security)
      expect(wrongEmail.success).toBe(false);
      expect(wrongPassword.success).toBe(false);

      if (!wrongEmail.success && !wrongPassword.success) {
        expect(wrongEmail.error.message).toBe(wrongPassword.error.message);
        expect(wrongEmail.error.message).toContain('Invalid email or password');
      }
    });

    it('should handle empty password', async () => {
      // ARRANGE
      await createTestUser('user@example.com', 'realpass', 'user');

      // ACT
      const result = await useCase.execute({
        email: 'user@example.com',
        password: '',
      });

      // ASSERT - Behavior: Empty password rejected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid email or password');
      }
    });

    it('should handle empty email', async () => {
      // ARRANGE
      await createTestUser('user@example.com', 'pass', 'user');

      // ACT
      const result = await useCase.execute({
        email: '',
        password: 'pass',
      });

      // ASSERT - Behavior: Empty email rejected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid email or password');
      }
    });
  });

  describe('Token Generation', () => {
    it('should generate unique tokens for each login', async () => {
      // ARRANGE
      await createTestUser('tokens@example.com', 'pass', 'tokenuser');

      // ACT - Login twice
      const login1 = await useCase.execute({
        email: 'tokens@example.com',
        password: 'pass',
      });
      const login2 = await useCase.execute({
        email: 'tokens@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: Each login gets new tokens
      expect(login1.success && login2.success).toBe(true);
      if (login1.success && login2.success) {
        expect(login1.data.tokens.accessToken).not.toBe(
          login2.data.tokens.accessToken
        );
        expect(login1.data.tokens.refreshToken).not.toBe(
          login2.data.tokens.refreshToken
        );
      }
    });

    it('should generate different tokens than registration', async () => {
      // ARRANGE - Register user (gets tokens)
      const registerResult = await createTestUser(
        'compare@example.com',
        'pass',
        'compareuser'
      );

      // ACT - Login (gets new tokens)
      const loginResult = await useCase.execute({
        email: 'compare@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: Login tokens differ from registration tokens
      expect(loginResult.success).toBe(true);
      if (loginResult.success && registerResult.tokens) {
        expect(loginResult.data.tokens.accessToken).not.toBe(
          registerResult.tokens.accessToken
        );
        expect(loginResult.data.tokens.refreshToken).not.toBe(
          registerResult.tokens.refreshToken
        );
      }
    });
  });

  describe('Profile Retrieval', () => {
    it('should retrieve correct user profile after authentication', async () => {
      // ARRANGE - Create multiple users
      await createTestUser('alice@example.com', 'pass1', 'alice');
      await createTestUser('bob@example.com', 'pass2', 'bob');
      await createTestUser('carol@example.com', 'pass3', 'carol');

      // ACT - Login as Bob
      const result = await useCase.execute({
        email: 'bob@example.com',
        password: 'pass2',
      });

      // ASSERT - Behavior: Correct profile returned
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.email).toBe('bob@example.com');
        expect(result.data.user.username).toBe('bob');
        expect(result.data.user.handle).toBe('@bob');
      }
    });

    it('should fail if profile not found after authentication', async () => {
      // ARRANGE - Create auth service that succeeds but profile service fails
      await createTestUser('orphan@example.com', 'pass', 'orphan');

      const brokenProfileService = {
        getProfileById: async () => null, // Profile not found
      };

      const brokenUseCase = new Login({
        authService: services.authService,
        profileService: brokenProfileService as any,
      });

      // ACT
      const result = await brokenUseCase.execute({
        email: 'orphan@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: Error when profile missing
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('User profile not found');
      }
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle email case correctly', async () => {
      // ARRANGE - Register with lowercase email
      await createTestUser('user@example.com', 'pass', 'user');

      // ACT - Try login with different case (depends on implementation)
      const result = await useCase.execute({
        email: 'User@Example.Com',
        password: 'pass',
      });

      // ASSERT - Behavior: Case handling is consistent
      // This test documents current behavior
      // In production, emails might be normalized to lowercase
      expect(result.success).toBe(false); // Current implementation: case-sensitive
    });
  });

  describe('Integration Scenarios', () => {
    it('should support login after failed login attempts', async () => {
      // ARRANGE
      await createTestUser('retry@example.com', 'correctpass', 'retry');

      // ACT - Failed attempts
      await useCase.execute({
        email: 'retry@example.com',
        password: 'wrong1',
      });
      await useCase.execute({
        email: 'retry@example.com',
        password: 'wrong2',
      });

      // Successful attempt
      const result = await useCase.execute({
        email: 'retry@example.com',
        password: 'correctpass',
      });

      // ASSERT - Behavior: Can succeed after failures
      expect(result.success).toBe(true);
    });

    it('should support concurrent logins for different users', async () => {
      // ARRANGE - Create multiple users
      await createTestUser('user1@example.com', 'pass1', 'user1');
      await createTestUser('user2@example.com', 'pass2', 'user2');
      await createTestUser('user3@example.com', 'pass3', 'user3');

      // ACT - Concurrent logins
      const results = await Promise.all([
        useCase.execute({
          email: 'user1@example.com',
          password: 'pass1',
        }),
        useCase.execute({
          email: 'user2@example.com',
          password: 'pass2',
        }),
        useCase.execute({
          email: 'user3@example.com',
          password: 'pass3',
        }),
      ]);

      // ASSERT - Behavior: All succeed independently
      expect(results.every((r) => r.success)).toBe(true);
      if (results.every((r) => r.success)) {
        expect((results[0] as any).data.user.username).toBe('user1');
        expect((results[1] as any).data.user.username).toBe('user2');
        expect((results[2] as any).data.user.username).toBe('user3');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle auth service errors gracefully', async () => {
      // ARRANGE - Break auth service
      const brokenAuthService = {
        login: async () => {
          throw new Error('Service unavailable');
        },
      };

      const brokenUseCase = new Login({
        authService: brokenAuthService as any,
        profileService: services.profileService,
      });

      // ACT
      const result = await brokenUseCase.execute({
        email: 'test@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: Errors propagated
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle unknown errors as generic login failure', async () => {
      // ARRANGE - Auth service throws non-standard error
      const weirdAuthService = {
        login: async () => {
          throw 'Not an Error object'; // String throw
        },
      };

      const brokenUseCase = new Login({
        authService: weirdAuthService as any,
        profileService: services.profileService,
      });

      // ACT
      const result = await brokenUseCase.execute({
        email: 'test@example.com',
        password: 'pass',
      });

      // ASSERT - Behavior: Handled gracefully
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to login');
      }
    });
  });
});
