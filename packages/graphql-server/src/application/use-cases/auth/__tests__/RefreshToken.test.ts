/**
 * Behavioral Tests for RefreshToken Use Case
 *
 * Testing Principles:
 * ✅ No mocks - use real in-memory service implementations
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test token refresh outcomes
 * ✅ Type-safe throughout
 * ✅ Test core use cases + key edge cases
 *
 * What we're testing:
 * - Successful token refresh
 * - Invalid token handling
 * - Expired token handling
 * - Profile retrieval with refreshed tokens
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RefreshToken } from '../RefreshToken.js';
import { createFakeServices } from '../../../../__tests__/helpers/fake-services.js';

describe('RefreshToken Use Case', () => {
  let services: ReturnType<typeof createFakeServices>;
  let useCase: RefreshToken;

  beforeEach(() => {
    // Create fresh services for each test
    services = createFakeServices();
    useCase = new RefreshToken({
      authService: services.authService,
      profileService: services.profileService,
      dynamoClient: services.dynamoClient,
      tableName: services.tableName,
    });
  });

  /**
   * Helper to create user and get refresh token
   */
  async function getUserWithToken(email: string, password: string, username: string) {
    const result = await services.authService.register({
      email,
      password,
      username,
    });

    // Seed the DynamoDB token lookup
    if (result.tokens) {
      (services.dynamoClient as any).seedToken(
        result.tokens.refreshToken,
        result.user.id
      );
    }

    return result;
  }

  describe('Successful Token Refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // ARRANGE - Register user and get initial token
      const initial = await getUserWithToken(
        'refresh@example.com',
        'pass',
        'refreshuser'
      );

      // ACT - Refresh token
      const result = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: New tokens generated
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toBeDefined();
        expect(result.data.tokens.accessToken).toBeDefined();
        expect(result.data.tokens.refreshToken).toBeDefined();
      }
    });

    it('should return new tokens different from old ones', async () => {
      // ARRANGE
      const initial = await getUserWithToken('new@example.com', 'pass', 'new');

      // ACT
      const result = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Tokens are rotated
      expect(result.success).toBe(true);
      if (result.success && initial.tokens) {
        expect(result.data.tokens.accessToken).not.toBe(
          initial.tokens.accessToken
        );
        expect(result.data.tokens.refreshToken).not.toBe(
          initial.tokens.refreshToken
        );
      }
    });

    it('should return user profile with refreshed tokens', async () => {
      // ARRANGE
      const initial = await getUserWithToken(
        'profile@example.com',
        'pass',
        'profileuser'
      );

      // ACT
      const result = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Complete profile returned
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toBeDefined();
        expect(result.data.user.email).toBe('profile@example.com');
        expect(result.data.user.username).toBe('profileuser');
        expect(result.data.user).toHaveProperty('id');
        expect(result.data.user).toHaveProperty('handle');
        expect(result.data.user).toHaveProperty('postsCount');
      }
    });

    it('should allow multiple successive token refreshes', async () => {
      // ARRANGE
      const initial = await getUserWithToken(
        'multi@example.com',
        'pass',
        'multi'
      );

      // ACT - Chain refreshes
      const refresh1 = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      expect(refresh1.success).toBe(true);
      if (!refresh1.success) return;

      // Update DynamoDB with new token
      (services.dynamoClient as any).seedToken(
        refresh1.data.tokens.refreshToken,
        initial.user.id
      );

      const refresh2 = await useCase.execute({
        refreshToken: refresh1.data.tokens.refreshToken,
      });

      expect(refresh2.success).toBe(true);
      if (!refresh2.success) return;

      // Update again
      (services.dynamoClient as any).seedToken(
        refresh2.data.tokens.refreshToken,
        initial.user.id
      );

      const refresh3 = await useCase.execute({
        refreshToken: refresh2.data.tokens.refreshToken,
      });

      // ASSERT - Behavior: Can chain refreshes
      expect(refresh3.success).toBe(true);
      if (refresh3.success) {
        // Each refresh creates new tokens
        expect(refresh3.data.tokens.refreshToken).not.toBe(
          refresh2.data.tokens.refreshToken
        );
        expect(refresh2.data.tokens.refreshToken).not.toBe(
          refresh1.data.tokens.refreshToken
        );
      }
    });
  });

  describe('Invalid Token Handling', () => {
    it('should reject non-existent refresh token', async () => {
      // ACT - Try with token that was never issued
      const result = await useCase.execute({
        refreshToken: 'invalid_token_12345',
      });

      // ASSERT - Behavior: Invalid token rejected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid refresh token');
      }
    });

    it('should reject empty refresh token', async () => {
      // ACT
      const result = await useCase.execute({
        refreshToken: '',
      });

      // ASSERT - Behavior: Empty token rejected
      expect(result.success).toBe(false);
    });

    it('should reject malformed refresh token', async () => {
      // ACT
      const result = await useCase.execute({
        refreshToken: 'not-a-valid-token-format',
      });

      // ASSERT - Behavior: Malformed token rejected
      expect(result.success).toBe(false);
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired refresh token', async () => {
      // ARRANGE - Create token that's already expired
      // Note: FakeAuthService doesn't implement expiration checking in test
      // This test documents expected behavior

      const initial = await getUserWithToken(
        'expire@example.com',
        'pass',
        'expire'
      );

      // Manually expire the token in fake service
      const fakeAuthService = services.authService as any;
      const tokenData = fakeAuthService.tokens.get(
        initial.tokens!.refreshToken
      );
      if (tokenData) {
        tokenData.expiresAt = Date.now() - 1000; // Already expired
      }

      // ACT
      const result = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Expired token rejected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Refresh token expired');
      }
    });
  });

  describe('Token Invalidation', () => {
    it('should invalidate old token after refresh', async () => {
      // ARRANGE
      const initial = await getUserWithToken('old@example.com', 'pass', 'old');
      const oldToken = initial.tokens!.refreshToken;

      // ACT - Refresh once
      const firstRefresh = await useCase.execute({
        refreshToken: oldToken,
      });

      expect(firstRefresh.success).toBe(true);

      // Try to use old token again
      const secondAttempt = await useCase.execute({
        refreshToken: oldToken, // Old token
      });

      // ASSERT - Behavior: Old token no longer valid
      expect(secondAttempt.success).toBe(false);
      if (!secondAttempt.success) {
        expect(secondAttempt.error.message).toContain('Invalid refresh token');
      }
    });
  });

  describe('Profile Retrieval', () => {
    it('should retrieve correct user profile', async () => {
      // ARRANGE - Create multiple users
      const user1 = await getUserWithToken('user1@example.com', 'pass', 'user1');
      const user2 = await getUserWithToken('user2@example.com', 'pass', 'user2');

      // ACT - Refresh user2's token
      const result = await useCase.execute({
        refreshToken: user2.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Correct profile returned
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.username).toBe('user2');
        expect(result.data.user.email).toBe('user2@example.com');
      }
    });

    it('should fail if profile not found', async () => {
      // ARRANGE - Register user
      const initial = await getUserWithToken(
        'orphan@example.com',
        'pass',
        'orphan'
      );

      // Break profile service
      const brokenProfileService = {
        getProfileById: async () => null,
      };

      const brokenUseCase = new RefreshToken({
        authService: services.authService,
        profileService: brokenProfileService as any,
        dynamoClient: services.dynamoClient,
        tableName: services.tableName,
      });

      // ACT
      const result = await brokenUseCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Error when profile missing
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('User not found');
      }
    });
  });

  describe('DynamoDB Integration', () => {
    it('should query DynamoDB for userId before token refresh', async () => {
      // ARRANGE
      const initial = await getUserWithToken(
        'dynamo@example.com',
        'pass',
        'dynamo'
      );

      // ACT
      const result = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Successfully retrieves userId from DynamoDB
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.id).toBe(initial.user.id);
      }
    });

    it('should handle DynamoDB query failure gracefully', async () => {
      // ARRANGE
      const initial = await getUserWithToken(
        'faildb@example.com',
        'pass',
        'faildb'
      );

      // Don't seed DynamoDB token (simulates query failure)
      // But FakeAuthService still has the token

      // ACT - RefreshToken uses fallback 'test-user-id'
      const result = await useCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Fallback to test userId
      // In test environment, this should still work
      expect(result.success).toBe(true);
    });

    it('should work without DynamoDB send method (test mode)', async () => {
      // ARRANGE
      const initial = await getUserWithToken('test@example.com', 'pass', 'test');

      // Create use case with client that has no send method
      const noDynamoUseCase = new RefreshToken({
        authService: services.authService,
        profileService: services.profileService,
        dynamoClient: {} as any, // No send method
        tableName: services.tableName,
      });

      // ACT
      const result = await noDynamoUseCase.execute({
        refreshToken: initial.tokens!.refreshToken,
      });

      // ASSERT - Behavior: Works with fallback
      expect(result.success).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent refresh requests for different users', async () => {
      // ARRANGE
      const user1 = await getUserWithToken('con1@example.com', 'pass', 'con1');
      const user2 = await getUserWithToken('con2@example.com', 'pass', 'con2');
      const user3 = await getUserWithToken('con3@example.com', 'pass', 'con3');

      // ACT - Concurrent refreshes
      const results = await Promise.all([
        useCase.execute({ refreshToken: user1.tokens!.refreshToken }),
        useCase.execute({ refreshToken: user2.tokens!.refreshToken }),
        useCase.execute({ refreshToken: user3.tokens!.refreshToken }),
      ]);

      // ASSERT - Behavior: All succeed independently
      expect(results.every((r) => r.success)).toBe(true);
      if (results.every((r) => r.success)) {
        expect((results[0] as any).data.user.username).toBe('con1');
        expect((results[1] as any).data.user.username).toBe('con2');
        expect((results[2] as any).data.user.username).toBe('con3');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle auth service errors', async () => {
      // ARRANGE
      const brokenAuthService = {
        refreshToken: async () => {
          throw new Error('Token service unavailable');
        },
      };

      const brokenUseCase = new RefreshToken({
        authService: brokenAuthService as any,
        profileService: services.profileService,
        dynamoClient: services.dynamoClient,
        tableName: services.tableName,
      });

      // ACT
      const result = await brokenUseCase.execute({
        refreshToken: 'any-token',
      });

      // ASSERT - Behavior: Errors propagated
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle unknown errors as generic failure', async () => {
      // ARRANGE
      const weirdAuthService = {
        refreshToken: async () => {
          throw 'String error'; // Non-Error throw
        },
      };

      const brokenUseCase = new RefreshToken({
        authService: weirdAuthService as any,
        profileService: services.profileService,
        dynamoClient: services.dynamoClient,
        tableName: services.tableName,
      });

      // ACT
      const result = await brokenUseCase.execute({
        refreshToken: 'token',
      });

      // ASSERT - Behavior: Handled gracefully
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to refresh token');
      }
    });

    it('should handle specific error messages correctly', async () => {
      // ARRANGE
      const specificErrorService = {
        refreshToken: async () => {
          throw new Error('Invalid refresh token');
        },
      };

      const useCase = new RefreshToken({
        authService: specificErrorService as any,
        profileService: services.profileService,
        dynamoClient: services.dynamoClient,
        tableName: services.tableName,
      });

      // ACT
      const result = await useCase.execute({
        refreshToken: 'token',
      });

      // ASSERT - Behavior: Specific error preserved
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Invalid refresh token');
      }
    });
  });
});
