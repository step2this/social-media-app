/**
 * AuthService - Error Handling Behavioral Tests
 *
 * Tests that verify AuthService throws appropriate custom errors.
 * Uses real AuthService with mocked AWS dependencies (DynamoDB, JWT).
 *
 * Principles:
 * - Test behavior, not implementation
 * - Use real service with dependency injection
 * - Use existing fixtures and error-scenarios
 * - No mocking or spying on service methods
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createAuthService, type AuthServiceDependencies } from '../auth.service';
import { dalErrorScenarios } from '@social-media-app/shared/test-utils';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError
} from '@social-media-app/shared/errors';

describe('AuthService - Error Handling (Behavioral)', () => {
  let authService: ReturnType<typeof createAuthService>;
  let mockDynamoClient: DynamoDBDocumentClient;
  let mockDeps: AuthServiceDependencies;

  beforeEach(() => {
    // Create mock DynamoDB client
    mockDynamoClient = {
      send: async () => ({ Items: [] })
    } as any;

    // Create auth service dependencies
    mockDeps = {
      dynamoClient: mockDynamoClient,
      tableName: 'test-table',
      timeProvider: () => '2025-01-01T00:00:00.000Z',
      uuidProvider: () => 'test-uuid-123',
      jwtProvider: {
        generateAccessToken: async () => 'access-token',
        generateRefreshToken: () => 'refresh-token',
        verifyRefreshToken: async () => ({ userId: 'user-123' })
      },
      hashProvider: {
        hashPassword: (password: string) => `hashed_${password}`,
        generateSalt: () => 'test-salt',
        verifyPassword: (password: string, hash: string) => hash === `hashed_${password}`
      }
    };

    authService = createAuthService(mockDeps);
  });

  describe('register()', () => {
    it('should throw ConflictError when email already exists', async () => {
      // Arrange: Mock DynamoDB to return existing user with email
      mockDynamoClient.send = async () => ({
        Items: [{ id: 'existing-user', email: 'existing@example.com' }]
      }) as any;

      // Act & Assert
      await expect(
        authService.register({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'Password123!'
        })
      ).rejects.toThrow(ConflictError);

      // Verify error details match expected scenario
      try {
        await authService.register({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'Password123!'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        expect((error as ConflictError).message).toBe(dalErrorScenarios.auth.emailAlreadyRegistered.message);
        expect((error as ConflictError).code).toBe(dalErrorScenarios.auth.emailAlreadyRegistered.code);
        expect((error as ConflictError).context?.field).toBe(dalErrorScenarios.auth.emailAlreadyRegistered.field);
        expect((error as ConflictError).context?.value).toBe('existing@example.com');
      }
    });

    it('should throw ConflictError when username already exists', async () => {
      // Arrange: Queue of responses for multiple DynamoDB calls
      const responses = [
        { Items: [] }, // First call: email check - no conflict
        { Items: [{ id: 'existing-user', username: 'existinguser' }] } // Second call: username conflict
      ];
      
      let callIndex = 0;
      mockDynamoClient.send = async () => {
        const response = responses[callIndex++];
        return response as any;
      };

      // Act & Assert
      await expect(
        authService.register({
          email: 'new@example.com',
          username: 'existinguser',
          password: 'Password123!'
        })
      ).rejects.toThrow(ConflictError);

      // Reset for second assertion
      callIndex = 0;
      try {
        await authService.register({
          email: 'new@example.com',
          username: 'existinguser',
          password: 'Password123!'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        expect((error as ConflictError).message).toBe(dalErrorScenarios.auth.usernameAlreadyTaken.message);
        expect((error as ConflictError).context?.field).toBe('username');
      }
    });
  });

  describe('login()', () => {
    it('should throw UnauthorizedError when user not found', async () => {
      // Arrange: No user found
      mockDynamoClient.send = async () => ({ Items: [] }) as any;

      // Act & Assert
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
      ).rejects.toThrow(UnauthorizedError);

      try {
        await authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toBe(dalErrorScenarios.auth.invalidCredentials.message);
        expect((error as UnauthorizedError).code).toBe(dalErrorScenarios.auth.invalidCredentials.code);
      }
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      // Arrange: User exists but password doesn't match
      mockDynamoClient.send = async () => ({
        Items: [{
          id: 'user-123',
          email: 'user@example.com',
          username: 'user',
          passwordHash: 'hashed_CorrectPassword',
          salt: 'test-salt',
          emailVerified: true
        }]
      }) as any;

      // Act & Assert: Password verification will fail
      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword'
        })
      ).rejects.toThrow(UnauthorizedError);

      try {
        await authService.login({
          email: 'user@example.com',
          password: 'WrongPassword'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toBe(dalErrorScenarios.auth.invalidCredentials.message);
        expect((error as UnauthorizedError).context?.reason).toBe(dalErrorScenarios.auth.invalidCredentials.reason);
      }
    });
  });

  describe('refreshToken()', () => {
    it('should throw UnauthorizedError when refresh token not found', async () => {
      // Arrange: No token found
      mockDynamoClient.send = async () => ({ Items: [] }) as any;

      // Act & Assert
      await expect(
        authService.refreshToken({
          refreshToken: 'invalid-token'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when refresh token is expired', async () => {
      // Arrange: Token exists but is expired
      const expiredDate = new Date('2020-01-01').toISOString();
      mockDynamoClient.send = async (command: any) => {
        // First call: find token
        return {
          Items: [{
            PK: 'USER#user-123',
            SK: 'REFRESH_TOKEN#token-123',
            userId: 'user-123',
            hashedToken: 'token',
            expiresAt: expiredDate
          }]
        } as any;
      };

      // Act & Assert
      await expect(
        authService.refreshToken({
          refreshToken: 'expired-token'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when user no longer exists', async () => {
      // Arrange: Token is valid but user doesn't exist
      let callCount = 0;
      mockDynamoClient.send = async () => {
        callCount++;
        if (callCount === 1) {
          // First call: find valid token
          return {
            Items: [{
              PK: 'USER#user-123',
              SK: 'REFRESH_TOKEN#token-123',
              userId: 'user-123',
              hashedToken: 'token',
              expiresAt: new Date(Date.now() + 86400000).toISOString() // Valid token
            }]
          } as any;
        }
        // Second call: user not found
        return { Item: undefined } as any;
      };

      // Act & Assert
      await expect(
        authService.refreshToken({
          refreshToken: 'valid-token'
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUser()', () => {
    it('should throw NotFoundError when user not found', async () => {
      // Arrange: User doesn't exist
      mockDynamoClient.send = async () => ({ Item: undefined }) as any;

      // Act & Assert
      await expect(
        authService.updateUser('nonexistent-id', {
          fullName: 'New Name'
        })
      ).rejects.toThrow(NotFoundError);

      try {
        await authService.updateUser('nonexistent-id', {
          fullName: 'New Name'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).code).toBe(dalErrorScenarios.auth.userNotFound.code);
        expect((error as NotFoundError).context?.entity).toBe('User');
        expect((error as NotFoundError).context?.id).toBe('nonexistent-id');
      }
    });
  });
});
