/**
 * AuthService - Error Handling Behavioral Tests
 *
 * Tests that verify AuthService throws appropriate custom errors.
 * Focus on key behaviors only - not edge cases.
 *
 * Principles:
 * - DRY: Use shared fixtures and test utilities
 * - Behavioral: Test service behavior, not implementation
 * - Minimal mocking: Real service with dependency injection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createAuthService, type AuthServiceDependencies } from '../auth.service';
import { dalErrorScenarios } from '@social-media-app/shared/test-utils';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError
} from '@social-media-app/shared/errors';

describe('AuthService - Error Handling (Behavioral)', () => {
  let authService: ReturnType<typeof createAuthService>;
  let mockDynamoClient: DynamoDBDocumentClient;

  beforeEach(() => {
    // Minimal DynamoDB mock - returns empty by default
    mockDynamoClient = {
      send: async () => ({ Items: [] })
    } as any;

    // Create auth service with test dependencies
    authService = createAuthService({
      dynamoClient: mockDynamoClient,
      tableName: 'test-table',
      timeProvider: () => '2025-01-01T00:00:00.000Z',
      uuidProvider: () => 'test-uuid',
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
    });
  });

  describe('register()', () => {
    it('should throw ConflictError when email already exists', async () => {
      // Arrange: DynamoDB returns existing user
      mockDynamoClient.send = async () => ({
        Items: [{ id: 'existing-user', email: 'existing@example.com' }]
      }) as any;

      // Act & Assert
      const promise = authService.register({
        email: 'existing@example.com',
        username: 'newuser',
        password: 'Password123!'
      });

      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toMatchObject({
        message: dalErrorScenarios.auth.emailAlreadyRegistered.message,
        code: dalErrorScenarios.auth.emailAlreadyRegistered.code,
        context: {
          field: dalErrorScenarios.auth.emailAlreadyRegistered.field,
          value: 'existing@example.com'
        }
      });
    });

    it('should throw ConflictError when username already taken', async () => {
      // Arrange: Email check passes, username check fails
      const responses = [
        { Items: [] },
        { Items: [{ id: 'existing-user', username: 'existinguser' }] }
      ];
      
      let callIndex = 0;
      mockDynamoClient.send = async () => responses[callIndex++] as any;

      // Act & Assert
      await expect(
        authService.register({
          email: 'new@example.com',
          username: 'existinguser',
          password: 'Password123!'
        })
      ).rejects.toMatchObject({
        message: dalErrorScenarios.auth.usernameAlreadyTaken.message,
        context: { field: 'username' }
      });
    });
  });

  describe('login()', () => {
    it('should throw UnauthorizedError for invalid credentials', async () => {
      // Arrange: User exists but password is wrong
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

      // Act & Assert
      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword'
        })
      ).rejects.toMatchObject({
        message: dalErrorScenarios.auth.invalidCredentials.message,
        code: dalErrorScenarios.auth.invalidCredentials.code,
        context: { reason: dalErrorScenarios.auth.invalidCredentials.reason }
      });
    });
  });

  describe('updateUser()', () => {
    it('should throw NotFoundError when user not found', async () => {
      // Arrange: User doesn't exist
      mockDynamoClient.send = async () => ({ Item: undefined }) as any;

      // Act & Assert
      await expect(
        authService.updateUser('nonexistent-id', { fullName: 'New Name' })
      ).rejects.toMatchObject({
        code: dalErrorScenarios.auth.userNotFound.code,
        context: {
          entity: 'User',
          id: 'nonexistent-id'
        }
      });
    });
  });
});
